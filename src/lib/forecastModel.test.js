import test from 'node:test';
import assert from 'node:assert/strict';
import { buildForecasts, summarizeForecast } from './forecastModel.js';

const sample = [
  { id: 'a', name: 'Муниципалитет А', group2024: 1, score: 60, smeCount: 100, investments: { volumeBillion: 20 } },
  { id: 'b', name: 'Муниципалитет Б', group2024: 2, score: 80, smeCount: null, investments: { volumeBillion: null } },
  { id: 'c', name: 'Муниципалитет В', group2024: 3, score: null, smeCount: 50, investments: { volumeBillion: 10 } },
];

test('projects only available baseline values and preserves missing values', () => {
  const rows = buildForecasts(sample, { investment_growth_rate: 5, sme_growth_rate: 2, score_growth_rate: 1, uncertainty_rate: 3 }, 2);
  const b = rows.find((row) => row.id === 'b');
  assert.equal(b.projectedInvestments, null);
  assert.equal(b.projectedSme, null);
  assert.ok(b.projectedScore > 80);
  assert.equal(rows.find((row) => row.id === 'c').projectedScore, null);
});

test('stress factors reduce the projected score and expose their contribution', () => {
  const baseline = buildForecasts(sample, { score_growth_rate: 1, uncertainty_rate: 2 }, 3).find((row) => row.id === 'a');
  const stress = buildForecasts(sample, { score_growth_rate: 1, export_shock_pct: -10, cost_pressure_pct: 10, labor_shortage_pct: 10, uncertainty_rate: 2 }, 3).find((row) => row.id === 'a');
  assert.ok(stress.projectedScore < baseline.projectedScore);
  assert.equal(stress.factorImpacts.length, 3);
  assert.ok(stress.factorImpacts.every((factor) => factor.scorePoints < 0));
});

test('score projection and uncertainty bounds stay within the 0–100 index scale', () => {
  const rows = buildForecasts([{ id: 'x', name: 'X', score: 99, investments: {}, smeCount: 1 }], {
    score_growth_rate: 20, uncertainty_rate: 25,
  }, 3);
  assert.equal(rows[0].projectedScore, 100);
  assert.ok(rows[0].scoreLow >= 0 && rows[0].scoreLow <= 100);
  assert.ok(rows[0].scoreHigh >= 0 && rows[0].scoreHigh <= 100);
});

test('summaries disclose coverage rather than treating missing data as zero', () => {
  const rows = buildForecasts(sample, { score_growth_rate: 0 }, 1);
  const summary = summarizeForecast(rows);
  assert.equal(summary.municipalityCount, 3);
  assert.equal(summary.scoreCoverage, 2);
  assert.equal(summary.investmentCoverage, 2);
  assert.ok(summary.averageScore > 0);
});

test('horizon is constrained to the supported 1–3 year range', () => {
  const rows = buildForecasts(sample, { score_growth_rate: 0 }, 5);
  assert.equal(rows.find((row) => row.id === 'a').projectedScore, 60);
});
