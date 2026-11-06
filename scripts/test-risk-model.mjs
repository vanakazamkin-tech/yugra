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

