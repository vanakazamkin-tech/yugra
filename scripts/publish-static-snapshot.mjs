import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fetchOfficialData, mergeOfficialDataSnapshots } from '../src/lib/officialData.js';
import { fetchMunicipalities } from '../src/lib/municipalities.js';

const DATASETS = [
  'municipalities', 'sources', 'forecastScenarios', 'indicators',
  'investmentSites', 'investmentProjects', 'industrialEnterprises',
  'infrastructureObjects', 'landParcels', 'programExecution',
  'fuelPrices', 'facilities', 'externalRatings',
];
const CHUNK_ROWS = 4000;
const MAX_COMPRESSED_FILE_BYTES = 90 * 1024 * 1024;
const EXPECTED_MUNICIPALITIES = 22;
const STORE_ROOT = path.resolve(process.env.SNAPSHOT_WORKDIR || '../data-store');
const SNAPSHOT_ROOT = path.join(STORE_ROOT, 'snapshots');
const mode = process.env.SNAPSHOT_MODE === 'full' ? 'full' : 'incremental';

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function writeOutput(name, value) {
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    return writeFile(output, `${name}=${value}\n`, { flag: 'a' });
  }
  return Promise.resolve();
}

async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function safeSnapshotPath(key) {
  if (typeof key !== 'string' || !/^snapshots\/chunks\/[a-zA-Z0-9_-]+\/[a-f0-9]{64}\.json\.gz$/.test(key)) {
    throw new Error(`Invalid snapshot chunk path: ${String(key)}`);
  }
  const absolute = path.resolve(STORE_ROOT, key);
  if (!absolute.startsWith(STORE_ROOT + path.sep)) throw new Error('Snapshot path escapes data branch root');
  return absolute;
}

function partition(row) {
  return String(row?.municipality_id ?? row?.id_municipality ?? '__shared__');
}

function groupRows(rows) {
  const grouped = new Map();
  for (const row of rows || []) {
    const key = partition(row);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  }
  return grouped;
}

async function readShard(shard) {
  const file = safeSnapshotPath(shard.key);
  const compressed = await readFile(file);
  const raw = gunzipSync(compressed);
  const actualHash = sha256(raw);
  if (actualHash !== shard.sha256) throw new Error(`Checksum mismatch: ${shard.key}`);
  const rows = JSON.parse(raw.toString('utf8'));
  if (!Array.isArray(rows) || rows.length !== Number(shard.rows)) {
    throw new Error(`Row count mismatch in ${shard.key}`);
  }
  return rows;
}

async function readPartition(shards) {
  const ordered = [...shards].sort((a, b) => Number(a.partIndex) - Number(b.partIndex));
  const rows = [];
  for (const shard of ordered) rows.push(...await readShard(shard));
  return rows;
}

function mergeMunicipalities(previousRows = [], updateRows = []) {
  const rows = new Map((previousRows || []).map((row) => [String(row.id), row]));
  for (const update of updateRows || []) {
    const previous = rows.get(String(update.id)) || {};
    const oldInvestments = previous.investments || {};
    const newInvestments = update.investments || {};
    rows.set(String(update.id), {
      ...previous,
      ...update,
      group2024: update.group2024 ?? previous.group2024 ?? null,
      rank2024: update.rank2024 ?? previous.rank2024 ?? null,
      score: update.score ?? previous.score ?? null,
      investments: {
        ...oldInvestments,
        ...newInvestments,
        volumeBillion: newInvestments.volumeBillion ?? oldInvestments.volumeBillion ?? null,
        growthPercent: newInvestments.growthPercent ?? oldInvestments.growthPercent ?? null,
      },
      smeCount: update.smeCount ?? previous.smeCount ?? null,
      assessmentScore: update.assessmentScore ?? previous.assessmentScore ?? null,
    });
  }
  return [...rows.values()].sort((a, b) => {
    const rankA = Number(a.rank2024);
    const rankB = Number(b.rank2024);
    if (Number.isFinite(rankA) && Number.isFinite(rankB)) return rankA - rankB;
    if (Number.isFinite(rankA)) return -1;
    if (Number.isFinite(rankB)) return 1;
    return String(a.name).localeCompare(String(b.name), 'ru');
  });
}

function mergeSnapshotDataset(key, previousRows = [], updateRows = []) {
  const previousById = new Map((previousRows || [])
    .filter((row) => row?.id != null)
    .map((row) => [String(row.id), row]));
  const nonDestructiveUpdates = (updateRows || []).map((update) => {
    const previous = update?.id != null ? previousById.get(String(update.id)) : null;
    if (!previous) return update;
    const merged = { ...previous };
    for (const [field, value] of Object.entries(update || {})) {
      // Empty DB2 cells never erase populated values already retained from DB1.
      if (value !== null && value !== undefined && value !== '') merged[field] = value;
    }
    return merged;
  });
  return mergeOfficialDataSnapshots(
    { [key]: previousRows },
    { [key]: nonDestructiveUpdates },
  )[key] || nonDestructiveUpdates;
}

async function writePartition(dataset, part, rows, knownKeys) {
  const shards = [];
  for (let offset = 0; offset < rows.length; offset += CHUNK_ROWS) {
    const chunk = rows.slice(offset, offset + CHUNK_ROWS);
    const raw = Buffer.from(JSON.stringify(chunk));
    const digest = sha256(raw);
    const key = `snapshots/chunks/${dataset}/${digest}.json.gz`;
    const file = safeSnapshotPath(key);
    const compressed = gzipSync(raw, { level: 6 });
    if (compressed.byteLength > MAX_COMPRESSED_FILE_BYTES) {
      throw new Error(`Chunk exceeds safe GitHub file limit: ${key} (${compressed.byteLength} bytes)`);
    }

    if (knownKeys.has(key) && existsSync(file)) {
      const existing = gunzipSync(await readFile(file));
      if (sha256(existing) !== digest) throw new Error(`Existing immutable chunk is corrupt: ${key}`);
    } else {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, compressed, { flag: 'wx' }).catch(async (error) => {
        if (error?.code !== 'EEXIST') throw error;
        const existing = gunzipSync(await readFile(file));
        if (sha256(existing) !== digest) throw new Error(`Concurrent immutable chunk conflict: ${key}`);
      });
    }

    shards.push({
      key,
      sha256: digest,
      partition: part,
      partIndex: Math.floor(offset / CHUNK_ROWS),
      rows: chunk.length,
      compressedBytes: compressed.byteLength,
      uncompressedBytes: raw.byteLength,
    });
  }
  return shards;
}

function sameDatasetReferences(next, previous) {
  if (!previous?.datasets) return false;
  return DATASETS.every((key) => {
    const left = next.datasets[key];
    const right = previous.datasets[key];
    if (!left || !right || Number(left.rows) !== Number(right.rows)) return false;
    if (left.shards.length !== right.shards.length) return false;
    return left.shards.every((shard, index) => {
      const old = right.shards[index];
      return old && shard.key === old.key && shard.sha256 === old.sha256
        && Number(shard.rows) === Number(old.rows);
    });
  });
}

function validateManifest(manifest) {
  if (!manifest?.version || !manifest.datasets || typeof manifest.datasets !== 'object') {
    throw new Error('Snapshot manifest is incomplete');
  }
  for (const key of DATASETS) {
    const dataset = manifest.datasets[key];
    if (!dataset || !Array.isArray(dataset.shards)) {
      throw new Error(`Required dataset is missing from manifest: ${key}`);
    }
    const shardRows = dataset.shards.reduce((sum, item) => sum + Number(item.rows || 0), 0);
    if (shardRows !== Number(dataset.rows)) throw new Error(`Manifest row count mismatch: ${key}`);
  }
  return true;
}

async function prepareDatasets(incoming, oldManifest, full) {
  const oldDatasets = oldManifest?.datasets || {};
  const allOldKeys = new Set(DATASETS.flatMap((key) => (oldDatasets[key]?.shards || []).map((item) => item.key)));
  const datasets = {};
  let createdChunks = 0;
  let maxCompressedChunkBytes = 0;
  let maxUncompressedChunkBytes = 0;

  for (const key of DATASETS) {
    const oldShards = oldDatasets[key]?.shards || [];
    const oldGroups = new Map();
    for (const shard of oldShards) {
      if (!oldGroups.has(shard.partition)) oldGroups.set(shard.partition, []);
      oldGroups.get(shard.partition).push(shard);
    }

    const nextGroups = groupRows(Array.isArray(incoming[key]) ? incoming[key] : []);
    const replace = full
      ? new Set([...nextGroups.keys(), ...oldGroups.keys()])
      : new Set(nextGroups.keys());
    if (key === 'municipalities' && !full) replace.add('__shared__');

    const shards = [];
    if (!full) {
      for (const [part, items] of oldGroups) {
        if (!replace.has(part)) shards.push(...items);
      }
    }

    for (const part of replace) {
      let rows = nextGroups.get(part) || [];
      if (!full && oldGroups.has(part)) {
        const oldRows = await readPartition(oldGroups.get(part));
        rows = key === 'municipalities'
          ? mergeMunicipalities(oldRows, rows)
          : mergeSnapshotDataset(key, oldRows, rows);
      }
      const created = await writePartition(key, part, rows, allOldKeys);
      for (const shard of created) {
        if (!allOldKeys.has(shard.key)) createdChunks += 1;
        maxCompressedChunkBytes = Math.max(maxCompressedChunkBytes, shard.compressedBytes);
        maxUncompressedChunkBytes = Math.max(maxUncompressedChunkBytes, shard.uncompressedBytes);
      }
      shards.push(...created);
    }

    shards.sort((a, b) => String(a.partition).localeCompare(String(b.partition), 'en', { numeric: true })
      || Number(a.partIndex) - Number(b.partIndex));
    datasets[key] = {
      rows: shards.reduce((sum, shard) => sum + shard.rows, 0),
      shards,
    };
  }

  const allShards = DATASETS.flatMap((key) => datasets[key].shards);
  return {
    datasets,
    createdChunks,
    shardCount: allShards.length,
    compressedBytes: allShards.reduce((sum, shard) => sum + shard.compressedBytes, 0),
    uncompressedBytes: allShards.reduce((sum, shard) => sum + shard.uncompressedBytes, 0),
    maxCompressedChunkBytes,
    maxUncompressedChunkBytes,
  };
}

async function pruneUnreferencedFiles(currentManifest, previousManifest) {
  const referenced = new Set(DATASETS.flatMap((key) => [
    ...(currentManifest.datasets[key]?.shards || []),
    ...(previousManifest?.datasets?.[key]?.shards || []),
  ].map((shard) => shard.key)));

  for (const dataset of DATASETS) {
    const directory = path.join(SNAPSHOT_ROOT, 'chunks', dataset);
    let files = [];
    try { files = await readdir(directory); } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    for (const filename of files) {
      if (!filename.endsWith('.json.gz')) continue;
      const key = `snapshots/chunks/${dataset}/${filename}`;
      if (!referenced.has(key)) await rm(path.join(directory, filename), { force: true });
    }
  }

  const manifestDir = path.join(SNAPSHOT_ROOT, 'manifests');
  let manifests = [];
  try { manifests = await readdir(manifestDir); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const keep = new Set([currentManifest.version, previousManifest?.version].filter(Boolean).map((version) => `${version}.json`));
  for (const filename of manifests) {
    if (filename.endsWith('.json') && !keep.has(filename)) await rm(path.join(manifestDir, filename), { force: true });
  }
}

function createClients() {
  const coreUrl = process.env.SUPABASE_CORE_URL || 'https://dmbikidqikjupkghywbz.supabase.co';
  const coreKey = process.env.SUPABASE_CORE_PUBLISHABLE_KEY;
  const dataUrl = process.env.SUPABASE_DATA_URL || 'https://zhywrpguzbtvjnmslwvs.supabase.co';
  const dataKey = process.env.SUPABASE_DATA_PUBLISHABLE_KEY;
  if (!coreKey || !dataKey) throw new Error('Missing Supabase publishable keys for controlled snapshot export');
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  return {
    core: createClient(coreUrl, coreKey, options),
    data: createClient(dataUrl, dataKey, options),
  };
}

async function main() {
  await mkdir(SNAPSHOT_ROOT, { recursive: true });
  const currentPointer = await readJson(path.join(SNAPSHOT_ROOT, 'current.json'));
  const currentManifest = currentPointer?.manifestPath
    ? await readJson(path.join(STORE_ROOT, currentPointer.manifestPath))
    : null;
  if (currentManifest) validateManifest(currentManifest);

  if (!currentManifest && mode !== 'full') {
    console.log('No published baseline exists. Incremental export is skipped without querying Supabase; run workflow_dispatch with mode=full when DB1 is ready.');
    await writeOutput('ready', 'false');
    await writeOutput('changed', 'false');
    return;
  }

  const clients = createClients();
  const full = mode === 'full';
  console.log(`Starting ${full ? 'controlled full reconciliation' : 'DB2-only incremental refresh'}.`);
  const municipalities = full
    ? await fetchMunicipalities(clients.core, clients.data, [], { strict: true })
    : await fetchMunicipalities(null, clients.data, [], { strict: true });

  const fetched = await fetchOfficialData(
    full ? clients.core : null,
    clients.data,
    full ? {} : { sinceByTable: currentManifest.cursors || {} },
  );
  const errors = fetched?.cacheMeta?.errors || [];
  if (errors.length) {
    throw new Error('Snapshot publication blocked by source read errors: ' + errors
      .map((item) => `${item.key}: ${item.message}`).join(' | '));
  }

  const incoming = { ...fetched, municipalities };
  const prepared = await prepareDatasets(incoming, currentManifest, full);
  if (!full && sameDatasetReferences(prepared, currentManifest)) {
    console.log('No dataset changes detected; keeping the existing immutable snapshot version.');
    await writeOutput('ready', 'true');
    await writeOutput('changed', 'false');
    return;
  }

  const municipalityRows = prepared.datasets.municipalities.rows;
  const municipalityManifestShards = prepared.datasets.municipalities.shards;
  const municipalityValues = await readPartition(municipalityManifestShards);
  const municipalityIds = new Set(municipalityValues.map((row) => String(row.id)));
  if (municipalityRows !== EXPECTED_MUNICIPALITIES || municipalityIds.size !== EXPECTED_MUNICIPALITIES) {
    throw new Error(`Snapshot publication blocked: expected exactly ${EXPECTED_MUNICIPALITIES} municipalities, got rows=${municipalityRows}, unique IDs=${municipalityIds.size}`);
  }

  const now = new Date().toISOString();
  const version = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const previousManifest = currentManifest;
  const manifest = {
    schemaVersion: 1,
    version,
    createdAt: now,
    lastSuccessfulUpdateAt: now,
    lastFullReconciliationAt: full ? now : previousManifest.lastFullReconciliationAt,
    refreshType: full ? 'full' : 'incremental',
    sourceStatus: {
      db1: full
        ? { status: 'ok', mode: 'full', lastCheckedAt: now }
        : { ...(previousManifest.sourceStatus?.db1 || {}), mode: 'retained_until_full_reconciliation' },
      db2: { status: 'ok', mode: full ? 'full' : 'incremental', lastCheckedAt: now },
    },
    recordCounts: Object.fromEntries(DATASETS.map((key) => [key, prepared.datasets[key].rows])),
    compressedBytes: prepared.compressedBytes,
    uncompressedBytes: prepared.uncompressedBytes,
    shardCount: prepared.shardCount,
    maxCompressedChunkBytes: prepared.maxCompressedChunkBytes,
    maxUncompressedChunkBytes: prepared.maxUncompressedChunkBytes,
    municipalityCount: municipalityIds.size,
    datasets: prepared.datasets,
    cursors: {
      ...(previousManifest?.cursors || {}),
      ...(fetched.cacheMeta?.cursorCandidates || {}),
    },
  };
  validateManifest(manifest);

  const manifestDir = path.join(SNAPSHOT_ROOT, 'manifests');
  await mkdir(manifestDir, { recursive: true });
  const manifestPath = `snapshots/manifests/${version}.json`;
  const manifestFile = path.join(STORE_ROOT, manifestPath);
  const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
  const manifestSha256 = sha256(manifestBytes);
  await writeFile(manifestFile, manifestBytes, { flag: 'wx' });

  // Publish the old current pointer as previous before switching current.
  if (currentPointer?.manifestPath && previousManifest) {
    await writeFile(path.join(SNAPSHOT_ROOT, 'previous.json'), JSON.stringify(currentPointer, null, 2) + '\n');
  }
  await writeFile(path.join(SNAPSHOT_ROOT, 'current.json'), JSON.stringify({
    version,
    manifestPath,
    manifestSha256,
    publishedAt: now,
  }, null, 2) + '\n');
  await writeFile(path.join(SNAPSHOT_ROOT, 'health', 'latest.json'), JSON.stringify({
    status: 'ok',
    lastAttemptAt: now,
    lastSuccessAt: now,
    version,
    refreshType: manifest.refreshType,
    counts: manifest.recordCounts,
    compressedBytes: manifest.compressedBytes,
    uncompressedBytes: manifest.uncompressedBytes,
    shardCount: manifest.shardCount,
    failureCount: 0,
  }, null, 2) + '\n').catch(async (error) => {
    if (error?.code !== 'ENOENT') throw error;
    await mkdir(path.join(SNAPSHOT_ROOT, 'health'), { recursive: true });
    await writeFile(path.join(SNAPSHOT_ROOT, 'health', 'latest.json'), JSON.stringify({
      status: 'ok', lastAttemptAt: now, lastSuccessAt: now, version,
      refreshType: manifest.refreshType, counts: manifest.recordCounts,
      compressedBytes: manifest.compressedBytes, uncompressedBytes: manifest.uncompressedBytes,
      shardCount: manifest.shardCount, failureCount: 0,
    }, null, 2) + '\n');
  });

  // Verify every published chunk and manifest reference before GitHub receives the commit.
  for (const key of DATASETS) {
    const dataset = manifest.datasets[key];
    let countedRows = 0;
    for (const shard of dataset.shards) countedRows += (await readShard(shard)).length;
    if (countedRows !== dataset.rows) throw new Error(`Post-write verification failed for dataset ${key}`);
  }
  await pruneUnreferencedFiles(manifest, previousManifest);
  await writeFile(path.join(SNAPSHOT_ROOT, '.nojekyll'), '');

  let fileCount = 0;
  let largestFileBytes = 0;
  let trackedBytes = 0;
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await inspect(filename);
      else {
        const size = (await stat(filename)).size;
        fileCount += 1;
        trackedBytes += size;
        largestFileBytes = Math.max(largestFileBytes, size);
      }
    }
  }
  await inspect(SNAPSHOT_ROOT);

  await writeFile(path.join(SNAPSHOT_ROOT, 'health', 'latest.json'), JSON.stringify({
    status: 'ok',
    lastAttemptAt: now,
    lastSuccessAt: now,
    version,
    refreshType: manifest.refreshType,
    counts: manifest.recordCounts,
    compressedBytes: manifest.compressedBytes,
    uncompressedBytes: manifest.uncompressedBytes,
    shardCount: manifest.shardCount,
    failureCount: 0,
    fileCount,
    largestFileBytes,
    repositorySnapshotBytes: trackedBytes,
  }, null, 2) + '\n');

  console.log(JSON.stringify({
    ok: true,
    version,
    refreshType: manifest.refreshType,
    municipalityCount: municipalityIds.size,
    recordCounts: manifest.recordCounts,
    fileCount,
    shardCount: manifest.shardCount,
    compressedBytes: manifest.compressedBytes,
    uncompressedBytes: manifest.uncompressedBytes,
    largestFileBytes,
    createdChunks: prepared.createdChunks,
  }, null, 2));
  await writeOutput('ready', 'true');
  await writeOutput('changed', 'true');
}

main().catch(async (error) => {
  console.error('Static snapshot export failed:', error?.stack || error?.message || error);
  await writeOutput('ready', 'false').catch(() => {});
  await writeOutput('changed', 'false').catch(() => {});
  process.exitCode = 1;
});
