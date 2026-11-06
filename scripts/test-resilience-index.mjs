import assert from 'node:assert/strict';
import { calculateLeaveOneOutSensitivity, calculateMunicipalIndex, INDEX_PILLARS, percentileScore } from '../src/lib/resilienceIndex.js';

assert.equal(INDEX_PILLARS.reduce((sum, item) => sum + item.weight, 0), 1);
assert.deepEqual(INDEX_PILLARS.map((item) => item.weight), [0.20, 0.20, 0.15, 0.15, 0.15, 0.15]);
assert.equal(percentileScore(3, [1, 2, 3, 3, 5], 'higher'), 60);
assert.equal(percentileScore(3, [1, 2, 3, 3, 5], 'lower'), 40);
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
const sensitivity = calculateLeaveOneOutSensitivity(model.results.m1);
assert.equal(sensitivity.available, true);
assert.equal(sensitivity.indicators.length, 6);
assert.ok(sensitivity.indicators.every((item) => item.reason === 'pillar_becomes_unavailable'), 'removing the only indicator in a pillar must be reported as a coverage failure');

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
  { ...rows[0], reference_period: undefined, value: 99999 },
];
const filtered = calculateMunicipalIndex(dirty, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(filtered.results.m1.index, null, 'duplicate logical key must be excluded, not arbitrarily resolved');
assert.ok(filtered.diagnostics.duplicateLogicalKeysExcluded > 0);
assert.equal(filtered.diagnostics.eligibleRows, rows.length + 2, 'a unit-mismatched row remains eligible but forms an insufficient peer group');

const tenMunicipalities = Array.from({ length: 10 }, (_, i) => ({ id: 'u' + (i + 1), name: 'МО ' + (i + 1) }));
const mixedUnitRows = [];
for (const definition of definitions) {
  tenMunicipalities.forEach((municipality, i) => mixedUnitRows.push({
    municipality_id: municipality.id,
    indicator_code: definition.code,
    value: i + 1,
    unit: definition.code === 'x_economy' && i >= 5 ? 'тыс. ед.' : 'ед.',
    reference_year: 2025,
    reference_period: 'annual',
    geographic_level: 'municipality',
    verification_status: 'verified',
  }));
}
const mixedUnits = calculateMunicipalIndex(mixedUnitRows, tenMunicipalities, {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions,
});
assert.equal(mixedUnits.results.u1.index, null, 'the same indicator in incompatible units must not be normalized in separate peer groups');
assert.ok(mixedUnits.diagnostics.indicatorGroups
  .filter((item) => item.code === 'x_economy')
  .every((item) => item.reason === 'inconsistent_units_across_municipalities'));

const twoYearRows = rows.map((row) => ({ ...row, reference_year: 2024 }));
const wrongPeriod = calculateMunicipalIndex(twoYearRows, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(wrongPeriod.results.m1.index, null, 'a different reference year must not be substituted');

const unapproved = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, indicatorDefinitions: [] });
assert.equal(unapproved.results.m1.index, null);
assert.equal(unapproved.diagnostics.eligibleRows, 0);
const missingPeriod = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, indicatorDefinitions: definitions });
assert.equal(missingPeriod.results.m1.index, null, 'period must be explicit rather than silently defaulting to annual');
const duplicatedDefinition = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: [...definitions, definitions[0]] });
assert.equal(duplicatedDefinition.results.m1.index, null, 'ambiguous duplicate definitions must not silently re-enable an indicator');
assert.ok(duplicatedDefinition.diagnostics.definitionErrors.some((item) => item.reason === 'duplicate_definition'));

console.log('Six-pillar resilience index methodology tests passed.');
