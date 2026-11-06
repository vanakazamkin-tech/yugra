import assert from 'node:assert/strict';
import { calculateLeaveOneOutSensitivity, calculateMunicipalIndex, INDEX_PILLARS, percentileScore } from '../src/lib/resilienceIndex.js';

assert.equal(INDEX_PILLARS.reduce((sum, item) => sum + item.weight, 0), 1);
assert.deepEqual(INDEX_PILLARS.map((item) => item.weight), [0.20, 0.20, 0.15, 0.15, 0.15, 0.15]);
assert.equal(percentileScore(3, [1, 2, 3, 3, 5], 'higher'), 50);
assert.equal(percentileScore(3, [1, 2, 3, 3, 5], 'lower'), 50);
assert.equal(percentileScore(5, [1, 2, 3, 4], 'higher'), null, 'fewer than five peers must be insufficient');
assert.equal(percentileScore(3, [1, 2, 3, 4, 5], 'sideways'), null);

const municipalities = Array.from({ length: 6 }, (_, i) => ({ id: 'm' + (i + 1), name: 'MO ' + (i + 1) }));
const definitions = INDEX_PILLARS.map((pillar) => ({ code: 'x_' + pillar.key, name: pillar.title, pillar: pillar.key, direction: 'higher' }));
const rows = [];
for (const definition of definitions) {
  municipalities.forEach((municipality, i) => rows.push({
    municipality_id: municipality.id, indicator_code: definition.code, value: i + 1, unit: 'ед.',
    reference_year: 2025, reference_period: 'annual', geographic_level: 'municipality',
    verification_status: 'verified', source_id: 'source-' + definition.code, source_url: 'https://example.test/' + definition.code,
  }));
}
const model = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(model.results.m1.index, 8.33);
assert.equal(model.results.m6.index, 91.67);
assert.equal(model.results.m1.status, 'complete');
assert.equal(model.results.m1.pillars.length, 6);
assert.equal(calculateLeaveOneOutSensitivity(model.results.m1).available, true);

const withMissing = rows.filter((row) => row.indicator_code !== 'x_infrastructure');
const partial = calculateMunicipalIndex(withMissing, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(partial.results.m1.index, null, 'missing pillar must not be zero-filled or renormalized');
assert.equal(partial.results.m1.status, 'insufficient_coverage');
assert.equal(partial.results.m1.availableWeightPercent, 85);

const dirty = [
  ...rows,
  { ...rows[0], verification_status: 'needs_review', value: 99999 },
  { ...rows[1], geographic_level: 'settlement', value: 99999 },
  { ...rows[2], reference_period: '2025-Q1', value: 99999 },
  { ...rows[3], unit: 'руб.', value: 99999 },
  { ...rows[4], value: null },
  { ...rows[5], value: 100 },
];
const filtered = calculateMunicipalIndex(dirty, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(filtered.results.m1.index, null, 'duplicate logical key must be excluded, not arbitrarily resolved');
assert.ok(filtered.diagnostics.duplicateLogicalKeysExcluded > 0);
assert.equal(filtered.diagnostics.eligibleRows, rows.length + 1);

const twoYearRows = rows.map((row) => ({ ...row, reference_year: 2024 }));
const wrongPeriod = calculateMunicipalIndex(twoYearRows, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(wrongPeriod.results.m1.index, null, 'a different reference year must not be substituted');

const unapproved = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, indicatorDefinitions: [] });
assert.equal(unapproved.results.m1.index, null);
assert.equal(unapproved.diagnostics.eligibleRows, 0);

console.log('Six-pillar resilience index methodology tests passed.');
