import assert from 'node:assert/strict';
import { buildRiskModel } from '../src/lib/riskModel.js';

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
      pillar: { key: pillarKey }, points: [{}, {}, {}, {}],
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
