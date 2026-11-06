import test from 'node:test';
import assert from 'node:assert/strict';
import { buildForecasts, summarizeForecast } from './forecastModel.js';

const sample = [
  { id: 'a', name: 'Муниципалитет А', group2024: 1, score: 60, smeCount: 100, investments: { volumeBillion: 20 } },
  { id: 'b', name: 'Муниципалитет Б', group2024: 2, score: 80, smeCount: null, investments: { volumeBillion: null } },
  { id: 'c', name: 'Муниципалитет В', group2024: 3, score: null, smeCount: 50, investments: { volumeBillion: 10 } },
];

test('empty inputs and empty municipality lists return an empty result', () => {
  assert.deepEqual(buildForecasts([], {}, 1), []);
  assert.deepEqual(buildForecasts(null, {}, 1), []);
  assert.equal(summarizeForecast([]).investmentTotal, null);
  assert.equal(summarizeForecast([]).averageScore, null);
});

test('projects only available non-negative baselines and preserves missing values', () => {
  const rows = buildForecasts(sample, { investment_growth_rate: 5, sme_growth_rate: 2, score_growth_rate: 1, uncertainty_rate: 3 }, 2);
  const b = rows.find((row) => row.id === 'b');
  assert.equal(b.projectedInvestments, null);
  assert.equal(b.projectedSme, null);
  assert.ok(b.projectedScore > 80);
  assert.equal(rows.find((row) => row.id === 'c').projectedScore, null);
  const negative = buildForecasts([{ id: 'x', name: 'X', score: 10, smeCount: -1, investments: { volumeBillion: -2 } }], {}, 1)[0];
  assert.equal(negative.projectedInvestments, null);
  assert.equal(negative.projectedSme, null);
});

test('zero values are valid observations and remain zero', () => {
  const row = buildForecasts([{ id: 'zero', name: 'Ноль', score: 0, smeCount: 0, investments: { volumeBillion: 0 } }], {
    investment_growth_rate: 10, sme_growth_rate: 10, score_growth_rate: 10,
  }, 3)[0];
  assert.equal(row.projectedInvestments, 0);
  assert.equal(row.projectedSme, 0);
  assert.equal(row.projectedScore, 0);
});

test('negative annual rates reduce projected values without creating negatives', () => {
  const row = buildForecasts([{ id: 'x', name: 'X', score: 60, smeCount: 100, investments: { volumeBillion: 20 } }], {
    investment_growth_rate: -10, sme_growth_rate: -10, score_growth_rate: -10,
  }, 2)[0];
  assert.ok(row.projectedInvestments < 20);
  assert.ok(row.projectedSme < 100);
  assert.ok(row.projectedScore < 60);
  assert.ok(row.projectedInvestments >= 0 && row.projectedSme >= 0);
});

test('stress factors reduce the score and expose marginal contributions', () => {
  const baseline = buildForecasts(sample, { score_growth_rate: 1, uncertainty_rate: 2 }, 3).find((row) => row.id === 'a');
  const stress = buildForecasts(sample, { score_growth_rate: 1, export_shock_pct: -10, cost_pressure_pct: 10, labor_shortage_pct: 10, uncertainty_rate: 2 }, 3).find((row) => row.id === 'a');
  assert.ok(stress.projectedScore < baseline.projectedScore);
  assert.equal(stress.factorImpacts.length, 3);
  assert.ok(stress.factorImpacts.every((factor) => factor.scorePoints < 0));
  const positive = buildForecasts(sample, { export_shock_pct: 10 }, 1).find((row) => row.id === 'a');
  assert.ok(positive.factorImpacts[0].scorePoints > 0);
});

test('index and uncertainty bounds remain inside the 0–100 scale under extreme inputs', () => {
  const row = buildForecasts([{ id: 'x', name: 'X', score: 99, investments: {}, smeCount: 1 }], {
    score_growth_rate: 10000, uncertainty_rate: 10000,
  }, 3)[0];
  assert.equal(row.projectedScore, 100);
  assert.ok(row.scoreLow >= 0 && row.scoreLow <= 100);
  assert.ok(row.scoreHigh >= 0 && row.scoreHigh <= 100);
  assert.ok(row.scoreLow <= row.scoreHigh);
  assert.ok(Number.isFinite(row.projectedScore));
});

test('horizon is rounded and constrained to the supported 1–3 year range', () => {
  const twoYears = buildForecasts(sample, { score_growth_rate: 1 }, 2).find((row) => row.id === 'a');
  const clamped = buildForecasts(sample, { score_growth_rate: 1 }, 5).find((row) => row.id === 'a');
  assert.ok(twoYears.projectedScore > 60);
  assert.equal(clamped.projectedScore, 60 * Math.pow(1.01, 3));
});

test('scenario calculation is deterministic and does not mutate historical inputs', () => {
  const before = structuredClone(sample);
  const first = buildForecasts(sample, { score_growth_rate: 2, uncertainty_rate: 4 }, 2);
  const second = buildForecasts(sample, { score_growth_rate: 2, uncertainty_rate: 4 }, 2);
  assert.deepEqual(first, second);
  assert.deepEqual(sample, before);
});

test('summary reports coverage and does not convert missing values to zero', () => {
  const summary = summarizeForecast(buildForecasts(sample, { score_growth_rate: 0 }, 1));
  assert.equal(summary.municipalityCount, 3);
  assert.equal(summary.scoreCoverage, 2);
  assert.equal(summary.investmentCoverage, 2);
  assert.ok(summary.averageScore > 0);
  assert.equal(summarizeForecast([{ projectedScore: null, projectedInvestments: null }]).investmentTotal, null);
});
