import assert from 'node:assert/strict';
import { buildRiskModel, deriveMunicipalIndicators } from '../src/lib/riskModel.js';

const municipalities = [1, 2, 3].map((id) => ({ id, name: 'Муниципалитет ' + id }));
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

const makeScoreFixture = (middleValue) => ['economy', 'labour'].flatMap((pillarKey, pillarIndex) =>
  [1, 2, 3].map((municipalityId) => ({
    municipalityId, code: pillarKey, unit: '%', direction: 'higher', adverse: null,
    pillar: { key: pillarKey }, points: [{}, {}],
    latest: { numericValue: municipalityId === 2 ? middleValue : municipalityId * 10,
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



