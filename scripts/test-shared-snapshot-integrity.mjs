import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { webcrypto } from 'node:crypto';
import { fetchSharedSnapshot } from '../src/lib/sharedSnapshot.js';

globalThis.crypto ||= webcrypto;

const DATASETS = [
  'municipalities', 'sources', 'forecastScenarios', 'indicators',
  'investmentSites', 'investmentProjects', 'industrialEnterprises',
  'infrastructureObjects', 'landParcels', 'programExecution',
  'fuelPrices', 'facilities', 'externalRatings',
];

const municipalities = Array.from({ length: 22 }, (_, index) => ({
  id: String(index + 1),
  name: `Муниципалитет ${index + 1}`,
  rank2024: index + 1,
}));
const raw = Buffer.from(JSON.stringify(municipalities));
const chunkHash = createHash('sha256').update(raw).digest('hex');
const chunkPath = `snapshots/chunks/municipalities/${chunkHash}.json.gz`;
const compressed = gzipSync(raw);

function makeManifest(version, key = chunkPath, checksum = chunkHash) {
  const datasets = Object.fromEntries(DATASETS.map((key) => [key, { rows: 0, shards: [] }]));
  datasets.municipalities = {
    rows: municipalities.length,
    shards: [{
      key,
      sha256: checksum,
      partition: '__shared__',
      partIndex: 0,
      rows: municipalities.length,
      compressedBytes: compressed.byteLength,
      uncompressedBytes: raw.byteLength,
    }],
  };
  return {
    schemaVersion: 1,
    version,
    shardCount: 1,
    datasets,
  };
}

function manifestBytes(manifest) {
  return Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function runCase({ currentVersion = 'v1', currentChunk = compressed, previousVersion = null } = {}) {
  const manifests = new Map();
  const pointers = new Map();
  const chunks = new Map();
  for (const version of [currentVersion, previousVersion].filter(Boolean)) {
    const invalidCurrent = version === currentVersion && currentChunk !== compressed;
    const expectedHash = invalidCurrent ? 'a'.repeat(64) : chunkHash;
    const key = `snapshots/chunks/municipalities/${expectedHash}.json.gz`;
    const manifest = makeManifest(version, key, expectedHash);
    manifests.set(version, manifest);
    chunks.set(key, version === currentVersion ? currentChunk : compressed);
    pointers.set(version, {
      version,
      manifestPath: `snapshots/manifests/${version}.json`,
      manifestSha256: createHash('sha256').update(manifestBytes(manifest)).digest('hex'),
    });
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input).replace('/snapshot-data/', '');
    if (url === 'snapshots/current.json') return jsonResponse(pointers.get(currentVersion));
    if (url === 'snapshots/previous.json') {
      return previousVersion ? jsonResponse(pointers.get(previousVersion)) : jsonResponse({ error: 'missing' }, 404);
    }
    if (url === 'snapshots/health/latest.json') return jsonResponse({ status: 'ok' });
    if (url.startsWith('snapshots/manifests/')) {
      const version = url.match(/([^/]+)\.json$/)?.[1];
      const manifest = manifests.get(version);
      return manifest ? new Response(manifestBytes(manifest)) : jsonResponse({}, 404);
    }
    if (chunks.has(url)) return new Response(chunks.get(url));
    return jsonResponse({ error: 'not found' }, 404);
  };

  try {
    return await fetchSharedSnapshot();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const valid = await runCase();
assert.equal(valid.unchanged, false);
assert.equal(valid.manifest.version, 'v1');
assert.equal(valid.data.municipalities.length, 22);
assert.equal(new Set(valid.data.municipalities.map((row) => row.id)).size, 22);
assert.equal(valid.data.indicators.length, 0);

const unchanged = await (async () => {
  const originalFetch = globalThis.fetch;
  const manifest = makeManifest('v1');
  const pointer = pointersFor(manifest);
  globalThis.fetch = async (input) => {
    const url = String(input).replace('/snapshot-data/', '');
    if (url === 'snapshots/current.json') return jsonResponse(pointer);
    if (url.startsWith('snapshots/manifests/')) return new Response(manifestBytes(manifest));
    if (url === 'snapshots/health/latest.json') return jsonResponse({ status: 'ok' });
    throw new Error('An unchanged snapshot must not fetch chunk files');
  };
  try {
    return await fetchSharedSnapshot('v1');
  } finally {
    globalThis.fetch = originalFetch;
  }
})();
assert.equal(unchanged.unchanged, true);
assert.equal(unchanged.manifest.version, 'v1');

const fallback = await runCase({
  currentVersion: 'v2',
  currentChunk: Buffer.from('corrupted gzip payload'),
  previousVersion: 'v1',
});
assert.equal(fallback.manifest.servedFrom, 'previous');
assert.equal(fallback.manifest.version, 'v1');
assert.equal(fallback.data.municipalities.length, 22);

console.log('Static snapshot integrity, unchanged-version, and previous-version fallback tests passed.');

function pointersFor(manifest) {
  return {
    version: manifest.version,
    manifestPath: `snapshots/manifests/${manifest.version}.json`,
    manifestSha256: createHash('sha256').update(manifestBytes(manifest)).digest('hex'),
  };
}
