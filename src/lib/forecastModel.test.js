import test from 'node:test';
import assert from 'node:assert/strict';
import { buildForecasts, buildHistoricalBacktest, normalizeScenarioRows, summarizeForecast } from './forecastModel.js';

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

test('blank strings, whitespace, null, booleans and malformed values remain missing', () => {
  for (const missing of ['', '   ', String.fromCharCode(9), null, undefined, 'not-a-number', true, false, {}, NaN, Infinity]) {
    const row = buildForecasts([{
      id: String(missing), name: 'Invalid', score: missing, smeCount: missing,
      investments: { volumeBillion: missing },
    }], {}, 1)[0];
    assert.equal(row.score, null, String(missing));
    assert.equal(row.projectedScore, null, String(missing));
    assert.equal(row.sme, null, String(missing));
    assert.equal(row.projectedSme, null, String(missing));
    assert.equal(row.investment, null, String(missing));
    assert.equal(row.projectedInvestments, null, String(missing));
  }
});

test('numeric strings and real zero are preserved', () => {
  const row = buildForecasts([{
    id: 'zero', name: 'Ноль', score: 0, smeCount: '0',
    investments: { volumeBillion: '0' },
  }], { investment_growth_rate: 10, sme_growth_rate: 10, score_growth_rate: 10 }, 3)[0];
  assert.equal(row.score, 0);
  assert.equal(row.projectedInvestments, 0);
  assert.equal(row.projectedSme, 0);
  assert.equal(row.projectedScore, 0);
});

test('negative baselines are rejected and score must remain within the index scale', () => {
  for (const score of [-1, 101]) {
    const row = buildForecasts([{ id: 'x', name: 'X', score, smeCount: -1, investments: { volumeBillion: -2 } }], {}, 1)[0];
    assert.equal(row.projectedScore, null);
    assert.equal(row.projectedInvestments, null);
    assert.equal(row.projectedSme, null);
  }
});

test('projects only available non-negative baselines and preserves missing values', () => {
  const rows = buildForecasts(sample, { investment_growth_rate: 5, sme_growth_rate: 2, score_growth_rate: 1, uncertainty_rate: 3 }, 2);
  const b = rows.find((row) => row.id === 'b');
  assert.equal(b.projectedInvestments, null);
  assert.equal(b.projectedSme, null);
  assert.ok(b.projectedScore > 80);
  assert.equal(rows.find((row) => row.id === 'c').projectedScore, null);
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

test('factor signs and isolated effects follow documented assumptions', () => {
  const baseline = buildForecasts([{ id: 'a', name: 'A', score: 60 }], {}, 1)[0].projectedScore;
  const exportDown = buildForecasts([{ id: 'a', name: 'A', score: 60 }], { export_shock_pct: -10 }, 1)[0].projectedScore;
  const costUp = buildForecasts([{ id: 'a', name: 'A', score: 60 }], { cost_pressure_pct: 10 }, 1)[0].projectedScore;
  const laborUp = buildForecasts([{ id: 'a', name: 'A', score: 60 }], { labor_shortage_pct: 10 }, 1)[0].projectedScore;
  assert.ok(exportDown < baseline);
  assert.ok(costUp < baseline);
  assert.ok(laborUp < baseline);
});

test('scenario factors combine additively in annual rate and compound over years', () => {
  const row = buildForecasts([{ id: 'a', name: 'A', score: 50 }], {
    score_growth_rate: 2, export_shock_pct: 10, cost_pressure_pct: -10, labor_shortage_pct: -10,
  }, 3)[0];
  const annualRate = 2 + 10 * 0.2 + (-10) * -0.15 + (-10) * -0.15;
  assert.equal(row.adjustedScoreRate, annualRate);
  assert.ok(Math.abs(row.projectedScore - 50 * Math.pow(1 + annualRate / 100, 3)) < 1e-10);
});

test('extreme inputs are bounded and all score ranges remain ordered', () => {
  const row = buildForecasts([{ id: 'x', name: 'X', score: 99, investments: {}, smeCount: 1 }], {
    score_growth_rate: 10000, uncertainty_rate: 10000,
  }, 3)[0];
  assert.equal(row.projectedScore, 100);
  assert.ok(row.scoreLow >= 0 && row.scoreLow <= 100);
  assert.ok(row.scoreHigh >= 0 && row.scoreHigh <= 100);
  assert.ok(row.scoreLow <= row.scoreHigh);
  assert.ok(Number.isFinite(row.projectedScore));
});

test('1, 2 and 3 year horizons use compound growth', () => {
  const municipality = [{ id: 'a', name: 'A', score: 60, smeCount: 100, investments: { volumeBillion: 20 } }];
  for (const years of [1, 2, 3]) {
    const row = buildForecasts(municipality, { score_growth_rate: 10, investment_growth_rate: 10, sme_growth_rate: 10 }, years)[0];
    assert.ok(Math.abs(row.projectedScore - 60 * Math.pow(1.1, years)) < 1e-10);
    assert.ok(Math.abs(row.projectedInvestments - 20 * Math.pow(1.1, years)) < 1e-10);
    assert.equal(row.projectedSme, Math.round(100 * Math.pow(1.1, years)));
  }
});

test('horizon is constrained to the supported 1–3 year range', () => {
  const clamped = buildForecasts(sample, { score_growth_rate: 1 }, 5).find((row) => row.id === 'a');
  assert.equal(clamped.projectedScore, 60 * Math.pow(1.01, 3));
});

test('duplicate and absent identifiers do not overwrite municipality ranks', () => {
  const rows = buildForecasts([
    { id: 'same', name: 'A', score: 80 },
    { id: 'same', name: 'B', score: 60 },
    { name: 'C', score: 70 },
  ], {}, 1);
  assert.equal(rows.find((row) => row.name === 'A').projectedRank, 1);
  assert.equal(rows.find((row) => row.name === 'B').projectedRank, 3);
  assert.equal(rows.find((row) => row.name === 'C').projectedRank, 2);
});

test('overflowing projections and totals are exposed as unavailable, not Infinity', () => {
  const rows = buildForecasts([
    { id: 'huge', name: 'Huge', score: 50, investments: { volumeBillion: Number.MAX_VALUE }, smeCount: Number.MAX_VALUE },
  ], { investment_growth_rate: 100, sme_growth_rate: 100 }, 3);
  assert.equal(rows[0].projectedInvestments, null);
  assert.equal(rows[0].projectedSme, null);
  const summary = summarizeForecast([
    { projectedScore: 10, scoreLow: 9, scoreHigh: 11, projectedInvestments: Number.MAX_VALUE },
    { projectedScore: 20, scoreLow: 19, scoreHigh: 21, projectedInvestments: Number.MAX_VALUE },
  ]);
  assert.equal(summary.investmentTotal, null);
  assert.equal(summary.averageScore, 15);
});

test('scenario calculation is deterministic and does not mutate historical inputs', () => {
  const before = structuredClone(sample);
  const first = buildForecasts(sample, { score_growth_rate: 2, uncertainty_rate: 4 }, 2);
  const second = buildForecasts(sample, { score_growth_rate: 2, uncertainty_rate: 4 }, 2);
  assert.deepEqual(first, second);
  assert.deepEqual(sample, before);
});


test('forecast can use only complete results from an explicitly approved index contract', () => {
  const municipalities = [
    { id: 'complete', name: 'Полное покрытие', score: 75 },
    { id: 'partial', name: 'Неполное покрытие', score: 65 },
    { id: 'invalid', name: 'Некорректный индекс', score: 55 },
  ];
  const indexResults = {
    complete: { status: 'complete', index: 82.5 },
    partial: { status: 'insufficient_coverage', index: null },
    invalid: { status: 'complete', index: 101 },
  };
  const unapproved = buildForecasts(municipalities, {}, 1, {
    scoreSource: 'resilience-index',
    indexContract: { status: 'candidate', version: '1.0-candidate' },
    indexResults,
  });
  assert.equal(unapproved.find((row) => row.id === 'complete').projectedScore, null);
  assert.equal(unapproved.find((row) => row.id === 'complete').scoreSource, 'unavailable_index_contract');
  assert.equal(unapproved.find((row) => row.id === 'complete').scoreProjectionMode, 'unavailable_index_contract');

  const approved = buildForecasts(municipalities, { score_growth_rate: 0 }, 1, {
    scoreSource: 'resilience-index',
    indexContract: { status: 'approved', version: '1.0' },
    indexResults,
  });
  const complete = approved.find((row) => row.id === 'complete');
  assert.equal(complete.score, 82.5);
  assert.equal(complete.projectedScore, 82.5);
  assert.equal(complete.scoreSource, 'approved_resilience_index');
  assert.equal(complete.scoreMethodologyVersion, '1.0');
  assert.equal(approved.find((row) => row.id === 'partial').projectedScore, null);
  assert.equal(approved.find((row) => row.id === 'invalid').projectedScore, null);
});


test('approved percentile index uses additive points rather than compound percentage growth', () => {
  const rows = buildForecasts([
    { id: 'm1', name: 'Муниципалитет', score: 60 },
  ], {
    score_growth_rate: 1.5,
    uncertainty_rate: 0,
    export_shock_pct: 10,
    cost_pressure_pct: 0,
    labor_shortage_pct: 0,
  }, 3, {
    scoreSource: 'resilience-index',
    indexContract: { status: 'approved', version: '1.0' },
    indexResults: { m1: { status: 'complete', index: 82.5 } },
  });
  assert.equal(rows[0].score, 82.5);
  assert.equal(rows[0].adjustedScoreRate, 3.5);
  assert.equal(rows[0].projectedScore, 93);
  assert.equal(rows[0].scoreProjectionMode, 'additive_index_points');
  assert.equal(rows[0].scoreMethodologyVersion, '1.0');
  assert.equal(rows[0].factorImpacts.find((factor) => factor.key === 'exportShock').scorePoints, 6);
});

test('approved percentile index projection respects the 0–100 scale without compounding', () => {
  const rows = buildForecasts([
    { id: 'm1', name: 'Муниципалитет' },
  ], { score_growth_rate: 10, uncertainty_rate: 0 }, 3, {
    scoreSource: 'resilience-index',
    indexContract: { status: 'approved', version: '1.0' },
    indexResults: { m1: { status: 'complete', index: 95 } },
  });
  assert.equal(rows[0].projectedScore, 100);
  assert.equal(rows[0].scoreProjectionMode, 'additive_index_points');
});

test('approved index mode never falls back to municipality.score when an index result is absent', () => {
  const rows = buildForecasts([
    { id: 'missing-index', name: 'Нет индекса', score: 88 },
  ], {}, 1, {
    scoreSource: 'resilience-index',
    indexContract: { status: 'approved', version: '1.0' },
    indexResults: {},
  });
  assert.equal(rows[0].score, null);
  assert.equal(rows[0].projectedScore, null);
  assert.equal(rows[0].hasScore, false);
  assert.equal(rows[0].scoreSource, 'missing_or_invalid_index_result');
});

test('summary reports coverage and does not convert missing values to zero', () => {
  const summary = summarizeForecast(buildForecasts(sample, { score_growth_rate: 0 }, 1));
  assert.equal(summary.municipalityCount, 3);
  assert.equal(summary.scoreCoverage, 2);
  assert.equal(summary.investmentCoverage, 2);
  assert.ok(summary.averageScore > 0);
  assert.equal(summarizeForecast([{ projectedScore: null, projectedInvestments: null }]).investmentTotal, null);
});

test('coefficient sensitivity is transparent and matches one-year score effects', () => {
  const municipality = [{ id: 'a', name: 'A', score: 60 }];
  const exportPositive = buildForecasts(municipality, { export_shock_pct: 10 }, 1)[0];
  const costIncrease = buildForecasts(municipality, { cost_pressure_pct: 10 }, 1)[0];
  const laborIncrease = buildForecasts(municipality, { labor_shortage_pct: 10 }, 1)[0];
  assert.equal(exportPositive.adjustedScoreRate, 2);
  assert.equal(costIncrease.adjustedScoreRate, -1.5);
  assert.equal(laborIncrease.adjustedScoreRate, -1.5);
  assert.ok(Math.abs(exportPositive.projectedScore - 61.2) < 1e-10);
  assert.ok(Math.abs(costIncrease.projectedScore - 59.1) < 1e-10);
  assert.ok(Math.abs(laborIncrease.projectedScore - 59.1) < 1e-10);
});

test('finite aggregate helper preserves zero, ignores missing values and rejects overflow', async () => {
  const { sumFiniteValues } = await import('./forecastModel.js');
  assert.equal(sumFiniteValues([null, '', '  ', undefined]), null);
  assert.equal(sumFiniteValues([0, '0', 2]), 2);
  assert.equal(sumFiniteValues([Number.MAX_VALUE, Number.MAX_VALUE]), null);
  assert.equal(sumFiniteValues([1, 'bad', 2]), 3);
});


test('scenario normalization keeps database rates and uses expert factors on legacy schemas', () => {
  const fallback = [
    { key: 'base', title: 'Базовый', summary: 'fallback', investment_growth_rate: 4, sme_growth_rate: 3, score_growth_rate: 1.5, uncertainty_rate: 7, export_shock_pct: 0, cost_pressure_pct: 0, labor_shortage_pct: 0, display_order: 2 },
    { key: 'cautious', title: 'Стрессовый', investment_growth_rate: -8, sme_growth_rate: -4, score_growth_rate: -3, uncertainty_rate: 18, export_shock_pct: -10, cost_pressure_pct: 8, labor_shortage_pct: 6, display_order: 1 },
  ];
  const rows = normalizeScenarioRows([
    { id: 'db-base', key: 'base', title: 'Базовый из БД', summary: 'db', investment_growth_rate: '6', sme_growth_rate: 2, score_growth_rate: null, uncertainty_rate: 9, display_order: 2 },
    { id: 'db-cautious', key: 'cautious', title: 'Стрессовый из БД', summary: 'db', investment_growth_rate: -7, sme_growth_rate: -3, score_growth_rate: -2, uncertainty_rate: 20, display_order: 1 },
  ], [], false, fallback);

  assert.equal(rows[0].investment_growth_rate, 6);
  assert.equal(rows[0].score_growth_rate, 1.5);
  assert.equal(rows[0].export_shock_pct, 0);
  assert.equal(rows[1].export_shock_pct, -10);
  assert.equal(rows[1].cost_pressure_pct, 8);
  assert.equal(rows[0].title, 'Базовый из БД');
});

test('scenario normalization prefers persisted factor columns when available', () => {
  const fallback = [{ key: 'base', investment_growth_rate: 4, sme_growth_rate: 3, score_growth_rate: 1.5, uncertainty_rate: 7, export_shock_pct: 0, cost_pressure_pct: 0, labor_shortage_pct: 0 }];
  const rows = normalizeScenarioRows([
    { id: 'db-base', key: 'base', investment_growth_rate: 5, sme_growth_rate: 4, score_growth_rate: 2, uncertainty_rate: 8 },
  ], [
    { id: 'db-base', key: 'base', export_shock_pct: 12, cost_pressure_pct: -4, labor_shortage_pct: 3 },
  ], true, fallback);

  assert.equal(rows[0].export_shock_pct, 12);
  assert.equal(rows[0].cost_pressure_pct, -4);
  assert.equal(rows[0].labor_shortage_pct, 3);
});


test('walk-forward backtest compares naive, linear and mean-growth baselines at one to three years', () => {
  const rows = [2020, 2021, 2022, 2023, 2024].map((year, index) => ({
    municipality_id: 'm1', indicator_code: 'population_municipality',
    indicator_name: 'Population', unit: 'persons', reference_year: year,
    reference_period: 'annual', geographic_level: 'municipality',
    verification_status: 'verified', value: 100 + index * 10, source_id: 's' + year,
  }));
  const result = buildHistoricalBacktest(rows);
  const linearOneYear = result.metrics.find((item) => item.model === 'linear_trend' && item.horizon === 1);
  assert.equal(linearOneYear.testCount, 3);
  assert.equal(linearOneYear.mae, 0);
  assert.equal(linearOneYear.mape, 0);
  assert.equal(linearOneYear.sampleStatus, 'small_sample');
  assert.ok(result.metrics.some((item) => item.model === 'last_value' && item.horizon === 2));
  assert.ok(result.metrics.some((item) => item.model === 'mean_growth' && item.horizon === 3));
});

test('annual backtest excludes quarterly, half-year, monthly, settlement and unverified observations', () => {
  const annual = [2020, 2021, 2022].map((year, index) => ({
    municipality_id: 'm1', indicator_code: 'indicator', indicator_name: 'Indicator',
    unit: 'unit', reference_year: year, reference_period: 'annual',
    geographic_level: 'municipality', verification_status: 'verified', value: 10 + index, source_id: 'source-annual',
  }));
  const excluded = [
    { ...annual[0], reference_period: '2020-Q1' },
    { ...annual[0], reference_period: '2020-H1' },
    { ...annual[0], reference_period: '2020-03' },
    { ...annual[0], geographic_level: 'settlement' },
    { ...annual[0], verification_status: 'needs_review' },
  ];
  const result = buildHistoricalBacktest([...annual, ...excluded]);
  assert.ok(result.metrics.every((item) => item.periodKind === 'annual'));
  assert.equal(result.excluded.nonMunicipal, 1);
  assert.equal(result.excluded.notVerified, 1);
  assert.equal(result.excluded.unsupportedPeriod, 3);
});

test('point-in-time series only compare the same calendar date', () => {
  const rows = [2022, 2023, 2024].map((year, index) => ({
    municipality_id: 'm1', indicator_code: 'population', indicator_name: 'Population',
    unit: 'persons', reference_year: year, reference_period: year + '-01-01',
    geographic_level: 'municipality', verification_status: 'verified', value: 100 + index * 10,
    source_id: 'source-point-in-time',
  }));
  rows.push({ ...rows[2], reference_period: '2024-07-01', value: 500 });
  const result = buildHistoricalBacktest(rows, { horizons: [1] });
  const january = result.metrics.find((item) => item.periodSlot === '01-01');
  assert.ok(january);
  assert.equal(january.testCount, 1);
  assert.equal(result.metrics.some((item) => item.periodSlot === '07-01'), false);
});

test('missing years split a series and are never bridged by the backtest', () => {
  const rows = [2020, 2021, 2023, 2024].map((year, index) => ({
    municipality_id: 'm1', indicator_code: 'indicator', indicator_name: 'Indicator',
    unit: 'unit', reference_year: year, reference_period: 'annual',
    geographic_level: 'municipality', verification_status: 'verified', value: 10 + index,
    source_id: 'source-missing-year',
  }));
  const result = buildHistoricalBacktest(rows, { horizons: [1] });
  assert.equal(result.totalTestPredictions, 0);
  assert.equal(result.excluded.insufficientSegments, 2);
});

test('conflicting values for one municipality-year are quarantined instead of averaged', () => {
  const rows = [2020, 2021, 2022, 2023].map((year, index) => ({
    municipality_id: 'm1', indicator_code: 'indicator', indicator_name: 'Indicator',
    unit: 'unit', reference_year: year, reference_period: 'annual',
    geographic_level: 'municipality', verification_status: 'verified', value: 10 + index,
    source_id: 'source-a',
  }));
  rows.push({ ...rows[2], value: 99, source_id: 'source-b' });
  const result = buildHistoricalBacktest(rows, { horizons: [1] });
  assert.equal(result.excluded.conflictingMunicipalityYearGroups, 1);
  assert.equal(result.totalTestPredictions, 0);
});

test('identical cross-source values collapse but non-positive actuals are excluded from MAPE', () => {
  const rows = [2020, 2021, 2022].map((year) => ({
    municipality_id: 'm1', indicator_code: 'zero_indicator', indicator_name: 'Zero indicator',
    unit: 'unit', reference_year: year, reference_period: 'annual',
    geographic_level: 'municipality', verification_status: 'verified', value: 0, source_id: 'source-a',
  }));
  rows.push({ ...rows[1], source_id: 'source-b' });
  const result = buildHistoricalBacktest(rows, { horizons: [1] });
  assert.equal(result.excluded.duplicateSameValueRows, 1);
  const metric = result.metrics.find((item) => item.model === 'last_value');
  assert.equal(metric.mae, 0);
  assert.equal(metric.mape, null);
  assert.equal(metric.mapeCount, 0);

  const negative = rows.map((item) => ({ ...item, value: -item.value - 1 }));
  const negativeMetric = buildHistoricalBacktest(negative, { horizons: [1] }).metrics.find((item) => item.model === 'last_value');
  assert.equal(negativeMetric.mape, null);
  assert.equal(negativeMetric.mapeCount, 0);
});


test('indicator aliases and units are never combined into one validation series', () => {
  const first = [2020, 2021, 2022].map((year, index) => ({
    municipality_id: 'm1', indicator_code: 'same_code', indicator_name: 'Original definition',
    unit: 'persons', reference_year: year, reference_period: 'annual',
    geographic_level: 'municipality', verification_status: 'verified', value: 10 + index,
    source_id: 'source-original',
  }));
  const second = [2020, 2021, 2022].map((year, index) => ({
    ...first[index],
    indicator_name: 'Different definition',
    unit: 'thousand persons',
    value: 1 + index,
  }));
  const result = buildHistoricalBacktest([...first, ...second], { horizons: [1] });
  const distinctDefinitions = new Set(result.metrics.map((item) => item.indicatorName + '|' + item.unit));
  assert.deepEqual([...distinctDefinitions].sort(), ['Different definition|thousand persons', 'Original definition|persons']);
  assert.equal(result.eligibleSeriesGroups, 2);
});

test('historical backtest excludes observations without a source reference', () => {
  const rows = [2020, 2021, 2022].map((year, index) => ({
    municipality_id: 'm1', indicator_code: 'indicator', indicator_name: 'Indicator',
    unit: 'unit', reference_year: year, reference_period: 'annual',
    geographic_level: 'municipality', verification_status: 'verified', value: 10 + index,
  }));
  const missing = buildHistoricalBacktest(rows, { horizons: [1] });
  assert.equal(missing.totalTestPredictions, 0);
  assert.equal(missing.excluded.missingProvenance, 3);

  const withSourceId = buildHistoricalBacktest(rows.map((row) => ({ ...row, source_id: 'catalogue-source' })), { horizons: [1] });
  assert.ok(withSourceId.totalTestPredictions > 0);
  assert.equal(withSourceId.excluded.missingProvenance, 0);

  const withSourceUrl = buildHistoricalBacktest(rows.map((row) => ({ ...row, source_url: 'https://example.gov.ru/source' })), { horizons: [1] });
  assert.ok(withSourceUrl.totalTestPredictions > 0);
  assert.equal(withSourceUrl.excluded.missingProvenance, 0);

  const invalidUrl = buildHistoricalBacktest(rows.map((row) => ({ ...row, source_url: 'javascript:alert(1)' })), { horizons: [1] });
  assert.equal(invalidUrl.totalTestPredictions, 0);
  assert.equal(invalidUrl.excluded.missingProvenance, 3);
});
