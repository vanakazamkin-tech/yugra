import assert from 'node:assert/strict';
import { buildRiskModel, canonicalIndicatorCode, deriveMunicipalIndicators, indicatorDirection, indicatorMethodFor, indicatorSeriesGroup } from '../src/lib/riskModel.js';

const municipalities = [1, 2, 3].map((id) => ({ id, name: 'Муниципалитет ' + id }));
for (const alias of ['kogalym', 'langepas', 'pyt_yah', 'raduzhny', 'surgut']) {
  assert.equal(canonicalIndicatorCode(alias + '_sme_per_10k'), 'sme_per_10k',
    alias + ' SME density must share the canonical comparable indicator code');
}
assert.equal(canonicalIndicatorCode('registered_unemployment_rate'), 'registered_unemployment_rate',
  'unrelated indicator codes must remain unchanged');
assert.equal(indicatorDirection({ indicator_code: 'sme_per_10k' }), 'higher');
assert.equal(indicatorDirection({ indicator_code: 'derived_budget_own_revenue_share' }), 'higher');
assert.equal(indicatorDirection({ indicator_code: 'registered_unemployment_rate' }), 'lower');
assert.equal(indicatorDirection({ indicator_code: 'registered_unemployed_count' }), 'context',
  'absolute unemployment counts must not be treated as comparable rates');
assert.equal(indicatorDirection({ indicator_code: 'derived_migration_net_per_1000' }), 'context',
  'derived migration rate remains contextual until municipal source definitions are harmonized');
assert.equal(indicatorDirection({ indicator_code: 'fixed_capital_investment_growth_preliminary' }), 'context',
  'investment growth series with mixed municipal definitions must not be compared');
assert.equal(indicatorDirection({ indicator_code: 'real_disposable_income_index' }), 'context',
  'real disposable and real cash income indices must not be merged under one common score');
const sectorEmploymentMethod = indicatorMethodFor({ indicator_code: 'employees_healthcare' });
assert.equal(sectorEmploymentMethod.direction, 'context',
  'sectoral employee headcounts must remain contextual without a common denominator');
assert.match(sectorEmploymentMethod.limitation, /только два муниципалитета/,
  'sectoral employee headcounts must disclose their current two-municipality coverage');
assert.equal(indicatorSeriesGroup({ indicator_code: 'housing_commissioned_reported' }), 'production',
  'housing commissioning is construction activity, not infrastructure availability');
assert.equal(indicatorSeriesGroup({ indicator_code: 'sovetsky_noncompliant_roads_share' }), 'infrastructure',
  'road condition belongs to infrastructure');
assert.equal(indicatorSeriesGroup({ indicator_code: 'kogalym_no_regular_transport_population_share' }), 'infrastructure',
  'regular transport accessibility belongs to infrastructure');
assert.equal(indicatorSeriesGroup({ indicator_code: 'pokachi_population_below_poverty' }), 'social',
  'monetary poverty belongs to social context');
assert.equal(indicatorDirection({ indicator_code: 'pokachi_population_below_poverty' }), 'context',
  'single-municipality poverty series must not enter the composite score');
assert.match(indicatorMethodFor({ indicator_code: 'pokachi_population_below_poverty' }).limitation, /2024 год обозначен администрацией как оценка/,
  'estimated poverty value must be disclosed');
assert.equal(indicatorDirection({ indicator_code: 'kogalym_no_regular_transport_population_share' }), 'lower',
  'a lower share of residents without regular transport is preferable');
assert.match(indicatorMethodFor({ indicator_code: 'kogalym_no_regular_transport_population_share' }).limitation, /только по одному муниципалитету/,
  'single-municipality transport coverage must be disclosed');
assert.equal(indicatorMethodFor({ indicator_code: 'housing_commissioned_reported' }).direction, 'context',
  'housing commissioning must not be scored as infrastructure quality');
assert.equal(indicatorMethodFor({ indicator_code: 'sovetsky_local_road_repair' }).direction, 'context',
  'road repair volume must not be treated as infrastructure condition');
assert.equal(indicatorDirection({ indicator_code: 'average_monthly_salary_annual' }), 'higher',
  'full-year municipal nominal salary may be used as a qualified income proxy');
assert.equal(indicatorDirection({ indicator_code: 'average_monthly_salary_q1' }), 'context',
  'quarterly salary variants must not duplicate the annual income indicator in the composite index');
assert.equal(indicatorDirection({ indicator_code: 'average_monthly_salary_h1' }), 'context',
  'half-year salary variants must remain contextual until a non-duplicative aggregation rule exists');
assert.match(indicatorMethodFor({ indicator_code: 'average_monthly_salary_annual' }).limitation, /девятью муниципалитетами/,
  'salary method must disclose its limited municipal coverage');
assert.equal(indicatorDirection({ indicator_code: 'sme_employment_share' }), 'context',
  'structural SME employment share must remain contextual');
for (const code of [
  'derived_budget_transfer_dependency',
  'derived_budget_balance_ratio',
  'derived_investment_per_capita',
  'derived_population_growth_rate',
  'derived_migration_net_per_1000',
  'sme_employment_share',
]) {
  const method = indicatorMethodFor({ indicator_code: code });
  assert.equal(method?.direction, 'context', code + ' must remain contextual');
  assert.ok(method?.rationale && method?.limitation,
    code + ' must explain why it is contextual in the interface');
}
assert.ok(indicatorMethodFor({ indicator_code: 'sme_per_10k' }).rationale.length > 0);
console.log('OK: equivalent municipal SME-density aliases are harmonized without changing unrelated indicators.');
console.log('OK: indicator direction is assigned only by explicit reviewed rules with documented caveats.');

const indicators = [
  ['investment', 'economy'], ['business', 'economy'], ['production', 'economy'],
  ['employment', 'labour'], ['income', 'labour'], ['demography', 'demography'],
  ['migration', 'demography'], ['budget', 'finance'], ['social', 'social'],
  ['infrastructure', 'infrastructure'],
];
const series = [];
for (const [code, pillarKey] of indicators) {
  for (const municipalityId of [1, 2, 3]) {
    series.push({
      municipalityId, code, unit: 'ед.', direction: 'higher', adverse: false,
      pillar: { key: code }, points: [{}, {}, {}, {}],
      latest: { numericValue: municipalityId * 10, reference_year: 2024,
        reference_period: municipalityId === 2 ? '2024' : 'annual' },
    });
  }
}
const result = buildRiskModel(municipalities, series);
for (const id of [1, 2, 3]) {
  const model = result.byMunicipality[id];
  assert.ok(model, 'model exists for municipality ' + id);
  assert.notEqual(model.score, null, 'index must be calculated for municipality ' + id);
  assert.equal(model.availablePillars, 6, 'all six dimensions must be mapped');
  assert.equal(model.availableWeight, 100, 'full pillar coverage expected in fixture');
  assert.equal(model.historyCoverage, 100, 'four historical points represent full history coverage');
  assert.ok(Array.isArray(model.latestPeriods), 'model exposes periods used in the score');
  assert.ok(model.score >= 0 && model.score <= 100, 'index is bounded');
}
assert.equal(result.byMunicipality[1].pillars.find((p) => p.key === 'labour').indicators, 2);
assert.equal(result.byMunicipality[1].pillars.find((p) => p.key === 'finance').indicators, 1);

console.log('OK: index calculated; six pillars mapped; annual periods compared consistently.');

const mixedEstimateFixture = [1, 2, 3].map((municipalityId) => ({
  municipalityId, code: 'employment', unit: '%', direction: 'lower', adverse: null,
  pillar: { key: 'employment' }, points: [{}],
  latest: { numericValue: municipalityId, reference_year: 2025,
    reference_period: municipalityId === 3 ? 'year_end_estimate' : 'annual' },
}));
const mixedEstimateModel = buildRiskModel(municipalities, mixedEstimateFixture);
assert.equal(mixedEstimateModel.byMunicipality[1].pillars.find((p) => p.key === 'labour').indicators, 0,
  'year_end_estimate must not be grouped with annual observations');
assert.equal(mixedEstimateModel.byMunicipality[3].pillars.find((p) => p.key === 'labour').indicators, 0,
  'a non-annual estimate must remain a separate incomparable period');
console.log('OK: year-end estimates remain separate from annual observations.');


const budgetFixture = [];
for (const [year, period, total, own, transfers, expenditure] of [
  [2024, 'annual', 100, 20, 80, 95],
  [2025, '2025-Q3', 200, 80, 120, 190],
]) {
  for (const [indicator_code, value] of [
    ['budget_total_revenue', total],
    ['budget_revenue_excluding_grants', own],
    ['budget_intergovernmental_transfers', transfers],
    ['budget_total_expenditure', expenditure],
  ]) {
    budgetFixture.push({
      municipality_id: 'test-town', indicator_code, indicator_name: indicator_code,
      reference_year: year, reference_period: period, value, unit: 'тыс. руб.',
      verification_status: 'verified', geographic_level: 'municipality',
    });
  }
}
const derivedBudget = deriveMunicipalIndicators(budgetFixture)
  .filter((row) => row.indicator_code === 'derived_budget_own_revenue_share');
assert.equal(derivedBudget.length, 2, 'annual and quarterly budget ratios must remain separate');
assert.deepEqual(derivedBudget.map((row) => row.reference_period).sort(), ['2025-Q3', 'annual']);
assert.equal(derivedBudget.find((row) => row.reference_period === 'annual').value, 20);
assert.equal(derivedBudget.find((row) => row.reference_period === '2025-Q3').value, 40);
console.log('OK: derived budget indicators preserve source reporting periods and do not mix annual and quarterly data.');

const conflictingBudgetFixture = [
  { municipality_id: 'conflict-town', indicator_code: 'budget_total_revenue', reference_year: 2025, reference_period: '2025-Q3', value: 100, unit: 'тыс. руб.', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'conflict-town', indicator_code: 'budget_total_revenue', reference_year: 2025, reference_period: '2025-Q3', value: 120, unit: 'тыс. руб.', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'conflict-town', indicator_code: 'budget_revenue_excluding_grants', reference_year: 2025, reference_period: '2025-Q3', value: 50, unit: 'тыс. руб.', verification_status: 'verified', geographic_level: 'municipality' },
];
assert.equal(deriveMunicipalIndicators(conflictingBudgetFixture).length, 0,
  'derived budget ratios must not use arbitrary values when source observations conflict');

console.log('OK: conflicting duplicate source observations are excluded from derived calculations.');

const demographicFixture = [
  { municipality_id: 'north-town', indicator_code: 'population_municipality', reference_year: 2022, reference_period: '2022-01-01', value: 100, unit: 'человек', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'north-town', indicator_code: 'population_municipality', reference_year: 2023, reference_period: '2023-01-01', value: 110, unit: 'человек', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'north-town', indicator_code: 'population_municipality', reference_year: 2023, reference_period: '2023-Q3', value: 900, unit: 'человек', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'north-town', indicator_code: 'fixed_capital_investment_non_mining', reference_year: 2022, reference_period: 'annual', value: 1000, unit: 'руб.', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'north-town', indicator_code: 'fixed_capital_investment_non_mining', reference_year: 2023, reference_period: 'annual', value: 2200, unit: 'руб.', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'north-town', indicator_code: 'migration_net_total', reference_year: 2022, reference_period: 'annual', value: 5, unit: 'человек', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'north-town', indicator_code: 'migration_net_total', reference_year: 2023, reference_period: 'annual', value: 11, unit: 'человек', verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'north-town', indicator_code: 'migration_net_total', reference_year: 2023, reference_period: 'year_end_estimate', value: 999, unit: 'человек', verification_status: 'verified', geographic_level: 'municipality' },
];
const demographicDerived = deriveMunicipalIndicators(demographicFixture);
const populationGrowth = demographicDerived.find((row) => row.indicator_code === 'derived_population_growth_rate');
assert.ok(populationGrowth, 'annual Jan 1 population snapshots should produce a demographic trend');
assert.ok(Math.abs(populationGrowth.value - 10) < 1e-9,
  'population trend must use annual Jan 1 snapshots and ignore quarterly observations');
const investmentPerCapita = demographicDerived.filter((row) => row.indicator_code === 'derived_investment_per_capita');
assert.equal(investmentPerCapita.length, 2,
  'annual investment flows should align with same-year Jan 1 population snapshots');
assert.deepEqual(investmentPerCapita.map((row) => row.value).sort((a, b) => a - b), [10, 20]);
const migrationRates = demographicDerived.filter((row) => row.indicator_code === 'derived_migration_net_per_1000');
assert.equal(migrationRates.length, 2,
  'migration rates should use only annual net migration and matching Jan 1 population');
assert.deepEqual(migrationRates.map((row) => row.value).sort((a, b) => a - b), [50, 100]);
assert.match(migrationRates[0].notes, /Не включается в интегральный индекс/,
  'migration rate must remain contextual until source comparability is established');
console.log('OK: demographic trends use annual snapshots; investment intensity aligns same-year population denominators.');

const conflictingPopulationFixture = [
  { municipality_id: 'conflict-population', indicator_code: 'population_municipality', reference_year: 2022, reference_period: '2022-01-01', value: 100, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'conflict-population', indicator_code: 'population_municipality', reference_year: 2023, reference_period: '2023-01-01', value: 110, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'conflict-population', indicator_code: 'population_municipality', reference_year: 2023, reference_period: '2023-01-01', value: 115, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'conflict-population', indicator_code: 'fixed_capital_investment_non_mining', reference_year: 2023, reference_period: 'annual', value: 2300, verification_status: 'verified', geographic_level: 'municipality' },
];
assert.equal(deriveMunicipalIndicators(conflictingPopulationFixture)
  .filter((row) => ['derived_population_growth_rate', 'derived_investment_per_capita'].includes(row.indicator_code)).length, 0,
  'conflicting annual population values must not be used in trends or per-capita calculations');

console.log('OK: conflicting annual population snapshots are excluded from derived indicators.');

// Неполные данные не должны превращаться в нулевой балл или искусственный индекс.
const partialMunicipalities = [1, 2, 3, 4].map((id) => ({ id, name: 'Территория ' + id }));
const onePillarOnly = [1, 2, 3].map((municipalityId) => ({
  municipalityId, code: 'budget', unit: '%', direction: 'higher', adverse: null,
  pillar: { key: 'budget' }, points: [{}],
  latest: { numericValue: municipalityId * 10, reference_year: 2025, reference_period: '2025-Q3' },
}));
const partialModel = buildRiskModel(partialMunicipalities, onePillarOnly);
assert.equal(partialModel.byMunicipality[1].score, null,
  'one covered dimension must not be presented as a composite resilience index');
assert.equal(partialModel.byMunicipality[4].score, null,
  'municipality without observations must remain unscored');
assert.equal(partialModel.byMunicipality[4].availableWeight, 0,
  'missing data must not be converted to an artificial zero score');
console.log('OK: insufficient and missing coverage remains explicitly unscored.');

const makeScoreFixture = (seriesKey) => ['investment', 'employment'].flatMap((seriesCode) =>
  [1, 2, 3].map((municipalityId) => ({
    municipalityId, code: seriesCode, unit: '%', direction: 'higher', adverse: null,
    pillar: { key: seriesCode }, points: [{}, {}],
    latest: { numericValue: municipalityId === 2 ? seriesKey : municipalityId * 10,
      reference_year: 2025, reference_period: 'annual' },
  }))
);
const baseline = buildRiskModel(partialMunicipalities.slice(0, 3), makeScoreFixture(20));
const changed = buildRiskModel(partialMunicipalities.slice(0, 3), makeScoreFixture(35));
assert.notEqual(changed.byMunicipality[2].score, baseline.byMunicipality[2].score,
  'changing a source indicator must change the composite index when its peer rank changes');
assert.ok(changed.byMunicipality[2].score > baseline.byMunicipality[2].score,
  'higher-is-better source change must improve the comparative score');
console.log('OK: index responds to changes in source indicator values.');

const zeroFixture = ['investment', 'employment'].flatMap((code) =>
  [0, 10, 20].map((value, index) => ({
    municipalityId: index + 1, code, unit: 'ед.', direction: 'higher', adverse: null,
    pillar: { key: code }, points: [{}],
    latest: { numericValue: value, reference_year: 2025, reference_period: 'annual' },
  }))
);
const zeroModel = buildRiskModel(partialMunicipalities.slice(0, 3), zeroFixture);
assert.notEqual(zeroModel.byMunicipality[1].score, null,
  'zero is a valid observed value and must not be treated as missing');
assert.ok(zeroModel.byMunicipality[1].score >= 0 && zeroModel.byMunicipality[1].score <= 100);

console.log('OK: zero observations remain valid numeric inputs.');

const weightedFixture = ['investment', 'employment'].flatMap((code) =>
  [1, 2, 3].map((municipalityId) => ({
    municipalityId, code, unit: '%', direction: 'higher', adverse: null,
    pillar: { key: code }, points: [{}],
    latest: { numericValue: code === 'investment' ? municipalityId * 10 : (4 - municipalityId) * 10,
      reference_year: 2025, reference_period: 'annual' },
  }))
);
const economyHeavy = buildRiskModel(partialMunicipalities.slice(0, 3), weightedFixture, {
  economy: 80, labour: 20, demography: 0, finance: 0, social: 0, infrastructure: 0,
});
const labourHeavy = buildRiskModel(partialMunicipalities.slice(0, 3), weightedFixture, {
  economy: 20, labour: 80, demography: 0, finance: 0, social: 0, infrastructure: 0,
});
assert.notEqual(economyHeavy.byMunicipality[1].score, labourHeavy.byMunicipality[1].score,
  'changing configured pillar weights must recalculate the composite index');
assert.ok(Math.abs(economyHeavy.pillars.reduce((sum, pillar) => sum + pillar.weight, 0) - 1) < 1e-9,
  'configured weights must normalize to 100 percent');
assert.equal(economyHeavy.byMunicipality[1].availableWeight, 100,
  'configured weight coverage must use normalized user weights');
assert.equal(economyHeavy.byMunicipality[1].baseCoverage, 40,
  'fixed data coverage must remain based on the default methodology weights');

const lowBaseFixture = ['demography', 'budget'].flatMap((code) =>
  [1, 2, 3].map((municipalityId) => ({
    municipalityId, code, unit: '%', direction: 'higher', adverse: null,
    pillar: { key: code }, points: [{}],
    latest: { numericValue: municipalityId * 10, reference_year: 2025, reference_period: 'annual' },
  }))
);
const lowBaseModel = buildRiskModel(partialMunicipalities.slice(0, 3), lowBaseFixture, {
  economy: 0, labour: 0, demography: 50, finance: 50, social: 0, infrastructure: 0,
});
assert.equal(lowBaseModel.byMunicipality[1].availableWeight, 100);
assert.equal(lowBaseModel.byMunicipality[1].baseCoverage, 30);
assert.equal(lowBaseModel.byMunicipality[1].score, null,
  'user weight tuning must not bypass the fixed minimum data coverage');
console.log('OK: configurable weights normalize while fixed data coverage and score eligibility remain stable.');

const makeRankFixture = (topValue, change = null) => ['investment', 'employment'].flatMap((code) =>
  [10, 20, topValue].map((value, index) => ({
    municipalityId: index + 1, code, unit: '%', direction: 'higher', adverse: change === null ? null : false,
    change: change === null ? null : change,
    changePercent: change === null ? null : change,
    pillar: { key: code }, points: [{}],
    latest: { numericValue: value, reference_year: 2025, reference_period: 'annual' },
  }))
);
const ordinaryRanks = buildRiskModel(partialMunicipalities.slice(0, 3), makeRankFixture(30));
const extremeRanks = buildRiskModel(partialMunicipalities.slice(0, 3), makeRankFixture(1e12));
assert.deepEqual(
  partialMunicipalities.slice(0, 3).map((m) => ordinaryRanks.byMunicipality[m.id].score),
  partialMunicipalities.slice(0, 3).map((m) => extremeRanks.byMunicipality[m.id].score),
  'rank-based normalization must not let an extreme magnitude dominate when relative ordering is unchanged'
);
const stableTrendModel = buildRiskModel(partialMunicipalities.slice(0, 3), makeRankFixture(30, 0));
const positiveTrendModel = buildRiskModel(partialMunicipalities.slice(0, 3), makeRankFixture(30, 1));
assert.equal(stableTrendModel.byMunicipality[2].score, 50,
  'unchanged source indicators must receive a neutral trend score');
assert.equal(positiveTrendModel.byMunicipality[2].score, 56,
  'a non-deteriorating trend outside the stability band should receive the positive trend score');
console.log('OK: rank normalization resists extreme magnitudes; unchanged trends are neutral.');





