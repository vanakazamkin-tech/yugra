const DATASETS=['municipalities','sources','forecastScenarios','indicators','investmentSites','investmentProjects','industrialEnterprises','infrastructureObjects','landParcels','programExecution','fuelPrices','facilities','externalRatings'];
function compareText(field) {
  return (a, b) => String(a?.[field] ?? '').localeCompare(String(b?.[field] ?? ''), 'ru-RU', { numeric: true });
}
function compareId(a, b) {
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}
function compareNumber(field, direction = 1) {
  return (a, b) => {
    const left = Number(a?.[field]);
    const right = Number(b?.[field]);
    const safeLeft = Number.isFinite(left) ? left : (direction > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    const safeRight = Number.isFinite(right) ? right : (direction > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY);
    return (safeLeft - safeRight) * direction;
  };
}
function compareDate(field, direction = 1) {
  return (a, b) => {
    const left = Date.parse(a?.[field] || '') || 0;
    const right = Date.parse(b?.[field] || '') || 0;
    return (left - right) * direction;
  };
}
function chainCompare(...comparators) {
  return (a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result) return result;
    }
    return 0;
  };
}
function restoreDatasetOrder(data) {
  const orders = {
    municipalities: chainCompare(compareNumber('rank2024', 1), compareText('name'), compareId),
    sources: chainCompare(compareText('category'), compareText('name'), compareId),
    forecastScenarios: chainCompare(compareNumber('display_order', 1), compareId),
    indicators: chainCompare(compareNumber('reference_year', -1), compareId),
    investmentSites: chainCompare(compareText('name'), compareId),
    investmentProjects: chainCompare(compareText('project_name'), compareId),
    industrialEnterprises: chainCompare(compareText('enterprise_name'), compareId),
    infrastructureObjects: chainCompare(compareText('name'), compareId),
    landParcels: chainCompare(compareText('municipality_id'), compareId),
    programExecution: chainCompare(compareDate('report_date', -1), compareId),
    fuelPrices: chainCompare(compareDate('observed_at', -1), compareText('source_row'), compareId),
    facilities: chainCompare(compareText('facility_category'), compareText('name_short'), compareId),
    externalRatings: chainCompare(compareText('geography_name'), compareId),
  };
  for (const [dataset, comparator] of Object.entries(orders)) {
    if (Array.isArray(data[dataset])) data[dataset].sort(comparator);
  }
  return data;
}

async function mapLimit(items,limit,fn){const out=new Array(items.length);let next=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await fn(items[i]);}}));return out;}
const SNAPSHOT_BASE = '/snapshot-data/';

async function fetchJson(path, cache = 'no-store') {
  const response = await fetch(SNAPSHOT_BASE + path, {
    credentials: 'same-origin',
    cache,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while loading ${path}`);
  }
  return response.json();
}

async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error('Web Crypto is unavailable for snapshot integrity checks');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

async function decodeSnapshotChunk(response, shard, dataset) {
  const received = await response.arrayBuffer();
  const bytes = new Uint8Array(received);
  const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  let raw = received;

  // Some static hosts return .gz as an opaque file, others may transparently
  // decode Content-Encoding. Detect the gzip signature instead of trusting headers.
  if (isGzip) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This browser cannot decompress a published snapshot chunk');
    }
    const stream = new Blob([received]).stream().pipeThrough(new DecompressionStream('gzip'));
    raw = await new Response(stream).arrayBuffer();
  }

  const actualHash = await sha256Hex(raw);
  if (actualHash !== shard.sha256) throw new Error(`Checksum mismatch in ${dataset}: ${shard.key}`);

  const rows = JSON.parse(new TextDecoder().decode(raw));
  if (!Array.isArray(rows) || rows.length !== Number(shard.rows)) {
    throw new Error(`Chunk row count mismatch in ${dataset}: ${shard.key}`);
  }
  return rows;
}

function validateSnapshotManifest(manifest) {
  if (!manifest?.version || !manifest.datasets || typeof manifest.datasets !== 'object') {
    throw new Error('Snapshot manifest is incomplete');
  }
  for (const dataset of DATASETS) {
    const descriptor = manifest.datasets[dataset];
    if (!descriptor || !Array.isArray(descriptor.shards)) {
      throw new Error('Required snapshot dataset is missing: ' + dataset);
    }
    const rows = descriptor.shards.reduce((sum, shard) => sum + Number(shard.rows || 0), 0);
    if (rows !== Number(descriptor.rows)) throw new Error('Manifest row count mismatch: ' + dataset);
    for (const shard of descriptor.shards) {
      if (!new RegExp('^snapshots/chunks/' + dataset + '/[a-f0-9]{64}\\.json\\.gz$').test(shard.key || '')) {
        throw new Error('Invalid snapshot chunk reference: ' + String(shard.key));
      }
      if (!/^[a-f0-9]{64}$/.test(shard.sha256 || '')) {
        throw new Error('Missing snapshot checksum: ' + String(shard.key));
      }
    }
  }
  if (manifest.shardCount != null) {
    const actual = DATASETS.reduce((sum, dataset) => sum + manifest.datasets[dataset].shards.length, 0);
    if (actual !== Number(manifest.shardCount)) throw new Error('Snapshot shard count mismatch');
  }
}

async function loadSnapshotPointer(pointerName, version) {
  const pointer = await fetchJson(pointerName + '.json');
  const manifestPath = String(pointer?.manifestPath || '');
  const manifestFileName = manifestPath.startsWith('snapshots/manifests/')
    ? manifestPath.slice('snapshots/manifests/'.length)
    : '';
  if (!/^[A-Za-z0-9_-]+[.]json$/.test(manifestFileName)) {
    throw new Error('Snapshot ' + pointerName + ' pointer is invalid');
  }

  const publishedManifestPath = 'manifests/' + manifestFileName;
  const manifestResponse = await fetch(SNAPSHOT_BASE + publishedManifestPath, {
    credentials: 'same-origin',
    cache: 'force-cache',
  });
  if (!manifestResponse.ok) throw new Error('Snapshot manifest is not available: HTTP ' + manifestResponse.status);
  const manifestText = await manifestResponse.text();
  if (pointer.manifestSha256) {
    const actualHash = await sha256Hex(new TextEncoder().encode(manifestText));
    if (actualHash !== pointer.manifestSha256) throw new Error('Snapshot manifest checksum mismatch');
  }
  const manifest = JSON.parse(manifestText);
  if (pointer.version && pointer.version !== manifest.version) {
    throw new Error('Snapshot pointer and manifest versions do not match');
  }
  validateSnapshotManifest(manifest);

  let health = null;
  try { health = await fetchJson('health/latest.json'); } catch { /* health is optional */ }
  const servedFrom = pointerName === 'previous' ? 'previous' : 'current';
  if (version && version === manifest.version) {
    return { unchanged: true, manifest: { ...manifest, servedFrom, health } };
  }

  const tasks = DATASETS.flatMap((dataset) => manifest.datasets[dataset].shards.map((shard) => ({
    dataset,
    shard,
  })));
  const loaded = await mapLimit(tasks, 8, async ({ dataset, shard }) => {
    const publishedChunkPath = shard.key.slice('snapshots/'.length);
    const url = SNAPSHOT_BASE + publishedChunkPath.split('/').map(encodeURIComponent).join('/');
    const response = await fetch(url, { credentials: 'same-origin', cache: 'force-cache' });
    if (!response.ok) throw new Error('Snapshot chunk unavailable for ' + dataset + ': HTTP ' + response.status);
    return { dataset, rows: await decodeSnapshotChunk(response, shard, dataset) };
  });

  const data = Object.fromEntries(DATASETS.map((key) => [key, []]));
  for (const item of loaded) data[item.dataset].push(...item.rows);
  for (const key of DATASETS) {
    if (data[key].length !== Number(manifest.datasets[key].rows)) {
      throw new Error('Incomplete shared snapshot dataset: ' + key);
    }
  }

  const municipalityIds = new Set(data.municipalities.map((item) => String(item.id)));
  if (data.municipalities.length !== 22 || municipalityIds.size !== 22) {
    throw new Error('Incomplete municipality directory in shared snapshot');
  }

  restoreDatasetOrder(data);
  return { manifest: { ...manifest, servedFrom, health }, data, unchanged: false };
}

export async function fetchSharedSnapshot(version = null) {
  const errors = [];
  for (const pointerName of ['current', 'previous']) {
    try {
      return await loadSnapshotPointer(pointerName, version);
    } catch (error) {
      errors.push(pointerName + ': ' + (error?.message || String(error)));
      console.warn('Yugra18 snapshot ' + pointerName + ' is unavailable:', error?.message || error);
    }
  }
  throw new Error('No complete published snapshot is available. ' + errors.join(' | '));
}
