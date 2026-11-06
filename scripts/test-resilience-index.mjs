import assert from 'node:assert/strict';
import { analyzeIndicatorDominance, calculateLeaveOneOutSensitivity, calculateMunicipalIndex, compareMunicipalRankings, INDEX_PILLARS, percentileScore } from '../src/lib/resilienceIndex.js';

assert.equal(INDEX_PILLARS.reduce((sum, item) => sum + item.weight, 0), 1);
assert.deepEqual(INDEX_PILLARS.map((item) => item.weight), [0.20, 0.20, 0.15, 0.15, 0.15, 0.15]);
assert.equal(percentileScore(3, [1, 2, 3, 3, 5], 'higher'), 60);
assert.equal(percentileScore(3, [1, 2, 3, 3, 5], 'lower'), 40);
assert.equal(percentileScore(true, [1, 2, 3, 4, 5], 'higher'), null, 'boolean values are not valid statistical observations');
assert.equal(percentileScore([3], [1, 2, 3, 4, 5], 'higher'), null, 'array coercion must not create a numeric observation');
assert.equal(percentileScore(Symbol('invalid'), [1, 2, 3, 4, 5], 'higher'), null, 'unsupported value types must be rejected without throwing');
assert.equal(percentileScore(5, [1, 2, 3, 4], 'higher'), null, 'fewer than five peers must be insufficient');
assert.equal(percentileScore(3, [1, 2, 3, 4, 5], 'sideways'), null);
assert.equal(percentileScore(0, [-2, -1, 0, 1, 2], 'higher'), 50, 'zero and negative observations are valid numeric inputs');
assert.equal(percentileScore(-1, [-2, -1, 0, 1, 2], 'lower'), 70, 'lower-is-better normalization must handle negative values');
assert.equal(percentileScore(0, [0, 0, 0, 0, 0], 'higher'), 50, 'an all-tied peer group must not divide by zero');

const municipalities = Array.from({ length: 6 }, (_, i) => ({ id: 'm' + (i + 1), name: 'MO ' + (i + 1) }));
const definitions = INDEX_PILLARS.map((pillar) => ({ code: 'x_' + pillar.key, name: pillar.title, pillar: pillar.key, direction: 'higher', acceptedNames: ['Тестовый показатель ' + pillar.key] }));
const rows = [];
for (const definition of definitions) {
  municipalities.forEach((municipality, i) => rows.push({
    municipality_id: municipality.id, indicator_code: definition.code, indicator_name: definition.acceptedNames[0], value: i + 1, unit: 'ед.',
    reference_year: 2025, reference_period: 'annual', geographic_level: 'municipality',
    verification_status: 'verified', source_id: 'source-' + definition.code, source_url: 'https://example.test/' + definition.code,
  }));
}
const model = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(model.results.m1.index, 8.33);
assert.equal(model.results.m6.index, 91.67);
assert.equal(model.results.m1.status, 'complete');
assert.equal(model.results.m1.coveragePercent, 100, 'indicator coverage is based on distinct approved codes');
assert.equal(model.results.m1.approvedIndicatorCount, 6);
assert.equal(model.results.m1.coveredIndicatorCount, 6);
assert.equal(model.results.m1.missingIndicatorCount, 0);
assert.deepEqual(model.results.m1.coveredPillarKeys, INDEX_PILLARS.map((pillar) => pillar.key));
assert.deepEqual(model.results.m1.missingPillarKeys, []);
const reorderedModel = calculateMunicipalIndex(rows.slice().reverse(), municipalities.slice().reverse(), {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions,
});
assert.deepEqual(reorderedModel, model, 'row and municipality input order must not change results or diagnostics');
const duplicateMunicipalityModel = calculateMunicipalIndex(rows, [...municipalities, { id: 'm1', name: 'Duplicate municipality row' }, { id: '', name: 'Invalid row' }], {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions,
});
assert.equal(Object.hasOwn(duplicateMunicipalityModel.results, 'm1'), false, 'ambiguous duplicate municipality IDs must not silently overwrite results');
assert.deepEqual(duplicateMunicipalityModel.diagnostics.duplicateMunicipalityIds, ['m1']);
assert.equal(duplicateMunicipalityModel.diagnostics.invalidMunicipalityRows, 1);

const wrongNameRows = rows.map((row) => row.indicator_code === 'x_economy'
  ? { ...row, indicator_name: 'Неутверждённое название' }
  : row);
const wrongNames = calculateMunicipalIndex(wrongNameRows, municipalities, {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions,
});
assert.equal(wrongNames.results.m1.index, null, 'unapproved source indicator names must not enter the index');
assert.equal(wrongNames.diagnostics.rowsRejectedForUnapprovedIndicatorName, 6);
assert.ok(!wrongNames.diagnostics.indicatorGroups.some((item) => item.code === 'x_economy'), 'unapproved names must be rejected before peer grouping');

const incompleteDefinition = definitions.map(({ acceptedNames, ...definition }) => definition);
const invalidNameDefinition = calculateMunicipalIndex(rows, municipalities, {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: incompleteDefinition,
});
assert.equal(invalidNameDefinition.results.m1.index, null, 'definitions without approved source-name aliases must be rejected');
assert.ok(invalidNameDefinition.diagnostics.definitionErrors.some((item) => item.reason === 'invalid_or_unapproved_definition_or_source_names'));

const approvedAliases = definitions.map((definition) => ({
  ...definition,
  acceptedNames: [...definition.acceptedNames, 'Утверждённый вариант названия ' + definition.pillar],
}));
const aliasRows = rows.map((row, index) => index % 2 === 0
  ? { ...row, indicator_name: approvedAliases.find((item) => item.code === row.indicator_code).acceptedNames[1] }
  : row);
const aliasModel = calculateMunicipalIndex(aliasRows, municipalities, {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: approvedAliases,
});
assert.equal(aliasModel.results.m1.index, 8.33, 'only explicitly approved source-name aliases may be combined in one peer group');
assert.equal(model.results.m1.pillars.length, 6);
const sensitivity = calculateLeaveOneOutSensitivity(model.results.m1);
assert.equal(sensitivity.available, true);

const outlierRows = rows.map((row) => row.indicator_code === 'x_economy' && row.municipality_id === 'm6'
  ? { ...row, value: 100000 }
  : row);
const outlierModel = calculateMunicipalIndex(outlierRows, municipalities, {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions,
});
const economyDiagnostics = outlierModel.diagnostics.indicatorGroups.find((item) => item.code === 'x_economy');
assert.equal(economyDiagnostics.outliers[0].municipalityId, 'm6', 'outlier diagnostics must identify the affected municipality');
assert.equal(outlierModel.results.m6.pillars.find((item) => item.key === 'economy').indicators[0].rawValue, 100000, 'outliers are reported but not silently removed');
assert.equal(sensitivity.indicators.length, 6);
assert.ok(sensitivity.indicators.every((item) => item.reason === 'pillar_becomes_unavailable'), 'removing the only indicator in a pillar must be reported as a coverage failure');

const withMissing = rows.filter((row) => row.indicator_code !== 'x_infrastructure');
const partial = calculateMunicipalIndex(withMissing, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(partial.results.m1.index, null, 'missing pillar must not be zero-filled or renormalized');
assert.equal(partial.results.m1.status, 'insufficient_coverage');
assert.equal(partial.results.m1.availableWeightPercent, 85);
assert.equal(partial.results.m1.coveragePercent, 83.33, 'missing one of six approved indicator codes must be visible in coverage');

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
    indicator_name: definition.acceptedNames[0],
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
const missingYear = calculateMunicipalIndex(rows, municipalities, { referenceYear: null, referencePeriod: 'annual', indicatorDefinitions: definitions });
assert.equal(missingYear.results.m1.index, null, 'null must not be coerced into reference year zero');
assert.equal(missingYear.diagnostics.eligibleRows, 0);
const missingPeriod = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, indicatorDefinitions: definitions });
assert.equal(missingPeriod.results.m1.index, null, 'period must be explicit rather than silently defaulting to annual');
const duplicatedDefinition = calculateMunicipalIndex(rows, municipalities, { referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: [...definitions, definitions[0]] });
assert.equal(duplicatedDefinition.results.m1.index, null, 'ambiguous duplicate definitions must not silently re-enable an indicator');
assert.ok(duplicatedDefinition.diagnostics.definitionErrors.some((item) => item.reason === 'duplicate_definition'));


const stableRanking = compareMunicipalRankings(
  { a: 10, b: 20, c: 30, d: 40, e: 50, f: 60, g: 70, h: 80 },
  { a: 11, b: 19, c: 31, d: 39, e: 51, f: 59, g: 71, h: 79 },
);
assert.equal(stableRanking.available, true);
assert.equal(stableRanking.spearmanRankCorrelation, 1);
assert.equal(stableRanking.meanAbsoluteRankShiftPercentilePoints, 0);
assert.equal(stableRanking.topQuartileRetentionPercent, 100);
assert.equal(stableRanking.bottomQuartileRetentionPercent, 100);

const reversedRanking = compareMunicipalRankings(
  { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 },
  { a: 6, b: 5, c: 4, d: 3, e: 2, f: 1 },
);
assert.equal(reversedRanking.spearmanRankCorrelation, -1);
assert.equal(reversedRanking.topQuartileRetentionPercent, 0);
assert.equal(reversedRanking.bottomQuartileRetentionPercent, 0);

const tiedBoundaryRanking = compareMunicipalRankings(
  { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 },
  { a: 1, b: 2, c: 3, d: 4, e: 5, f: 7, g: 7, h: 8 },
);
assert.equal(tiedBoundaryRanking.topQuartileRetentionPercent, null);
assert.equal(tiedBoundaryRanking.quartileOverlapUnavailableReason, 'ties_at_quartile_boundary');

const insufficientRanking = compareMunicipalRankings(
  { a: 1, b: 2, c: 3, d: 4 },
  { a: 1, b: 2, c: 3, d: 4 },
);
assert.equal(insufficientRanking.available, false);
assert.equal(insufficientRanking.reason, 'insufficient_common_municipalities');


const dominanceDefinitions = [
  ...definitions,
  { code: 'x_economy_duplicate_candidate', name: 'Похожий показатель экономики', pillar: 'economy', direction: 'higher', acceptedNames: ['Похожий показатель экономики'] },
  { code: 'x_economy_inverse_candidate', name: 'Обратный показатель экономики', pillar: 'economy', direction: 'higher', acceptedNames: ['Обратный показатель экономики'] },
];
const dominanceRows = [...rows];
municipalities.forEach((municipality, i) => {
  dominanceRows.push({
    municipality_id: municipality.id, indicator_code: 'x_economy_duplicate_candidate',
    indicator_name: 'Похожий показатель экономики', value: i + 10, unit: 'ед.',
    reference_year: 2025, reference_period: 'annual', geographic_level: 'municipality',
    verification_status: 'verified',
  });
  dominanceRows.push({
    municipality_id: municipality.id, indicator_code: 'x_economy_inverse_candidate',
    indicator_name: 'Обратный показатель экономики', value: 100 - i, unit: 'ед.',
    reference_year: 2025, reference_period: 'annual', geographic_level: 'municipality',
    verification_status: 'verified',
  });
});
const dominanceModel = calculateMunicipalIndex(dominanceRows, municipalities, {
  referenceYear: 2025, referencePeriod: 'annual', indicatorDefinitions: dominanceDefinitions,
});
const dominance = analyzeIndicatorDominance(dominanceModel);
assert.equal(dominance.available, true);
const economyDominance = dominance.pillars.find((item) => item.pillar === 'economy');
assert.equal(economyDominance.indicatorCount, 3);
assert.ok(economyDominance.pairs.some((pair) =>
  pair.leftCode === 'x_economy' && pair.rightCode === 'x_economy_duplicate_candidate'
  && pair.spearman === 1 && pair.classification === 'possible_positive_overlap_review'));
assert.ok(economyDominance.pairs.some((pair) =>
  pair.leftCode === 'x_economy' && pair.rightCode === 'x_economy_inverse_candidate'
  && pair.spearman === -1 && pair.classification === 'strong_inverse_relationship_review'));
assert.ok(economyDominance.indicators.every((item) => item.evaluatedMunicipalities === 6));
assert.equal(economyDominance.indicators.find((item) => item.code === 'x_economy').meanNominalWeightWithinPillar, 0.3333);
assert.equal(analyzeIndicatorDominance(null).available, false);

console.log('Six-pillar resilience index methodology tests passed.');
