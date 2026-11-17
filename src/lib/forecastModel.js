/**
 * Yugra18 conceptual scenario projection engine.
 *
 * Expert-assumption simulator only; it is not trained or validated as a
 * statistical forecasting model. Coefficients are illustrative assumptions.
 */
export const FACTOR_COEFFICIENTS = Object.freeze({
  exportShock: 0.20,
  costPressure: -0.15,
  laborShortage: -0.15,
});

// Number('   ') and Number(null) both produce 0. Accept only explicit finite
// numbers or non-empty numeric strings; booleans and coercible objects are invalid.
const numeric = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rate = (value, min = -100, max = 100) => {
  const parsed = numeric(value);
  return clamp(parsed == null ? 0 : parsed, min, max);
};
const nonNegative = (value) => {
  const parsed = numeric(value);
  return parsed != null && parsed >= 0;
};
const validScore = (value) => {
  const parsed = numeric(value);
  return parsed != null && parsed >= 0 && parsed <= 100;
};
const growth = (base, annualRate, years) => {
  const result = base * Math.pow(Math.max(0, 1 + annualRate / 100), years);
  return Number.isFinite(result) ? result : null;
};
const roundCount = (value) => value == null ? null : Math.round(value);

/**
 * Normalize scenario definitions from Supabase while supporting databases
 * that have not yet received the optional scenario-factor migration.
 */
export function normalizeScenarioRows(baseRows, factorRows = [], factorColumnsAvailable = false, fallbackScenarios = []) {
  if (!Array.isArray(baseRows)) return [];
  const factors = Array.isArray(factorRows) ? factorRows : [];
  const fallbacks = Array.isArray(fallbackScenarios) ? fallbackScenarios : [];
  return baseRows.map((row) => {
    const fallback = fallbacks.find((item) => item?.key === row?.key) || {};
    const factor = factors.find((item) => item?.id === row?.id || item?.key === row?.key) || {};
    const valueOrFallback = (value, fallbackValue) => numeric(value) ?? numeric(fallbackValue) ?? 0;
    return {
      id: row?.id ?? null,
      key: row?.key ?? null,
      title: row?.title ?? fallback.title ?? '',
      summary: row?.summary ?? fallback.summary ?? '',
      investment_growth_rate: valueOrFallback(row?.investment_growth_rate, fallback.investment_growth_rate),
      sme_growth_rate: valueOrFallback(row?.sme_growth_rate, fallback.sme_growth_rate),
      score_growth_rate: valueOrFallback(row?.score_growth_rate, fallback.score_growth_rate),
      uncertainty_rate: valueOrFallback(row?.uncertainty_rate, fallback.uncertainty_rate),
      export_shock_pct: factorColumnsAvailable ? valueOrFallback(factor.export_shock_pct, fallback.export_shock_pct) : valueOrFallback(fallback.export_shock_pct, 0),
      cost_pressure_pct: factorColumnsAvailable ? valueOrFallback(factor.cost_pressure_pct, fallback.cost_pressure_pct) : valueOrFallback(fallback.cost_pressure_pct, 0),
      labor_shortage_pct: factorColumnsAvailable ? valueOrFallback(factor.labor_shortage_pct, fallback.labor_shortage_pct) : valueOrFallback(fallback.labor_shortage_pct, 0),
      display_order: row?.display_order ?? fallback.display_order ?? 0,
    };
  });
}


export function buildForecasts(municipalities = [], params = {}, horizon = 1, options = {}) {
  const safeOptions = options && typeof options === 'object' ? options : {};
  const indexModeRequested = safeOptions.scoreSource === 'resilience-index';
  const useApprovedIndex = indexModeRequested
    && safeOptions.indexContract?.status === 'approved'
    && typeof safeOptions.indexContract?.version === 'string'
    && safeOptions.indexContract.version.trim() !== '';
  const indexResults = safeOptions.indexResults && typeof safeOptions.indexResults === 'object'
    ? safeOptions.indexResults : {};
  const parsedHorizon = numeric(horizon);
  const years = clamp(Math.round(parsedHorizon == null ? 1 : parsedHorizon), 1, 3);
  const safeParams = params && typeof params === 'object' ? params : {};
  const uncertaintyRate = rate(safeParams.uncertainty_rate, 0, 100);
  const uncertainty = uncertaintyRate * Math.sqrt(years);
  const baseRate = rate(safeParams.score_growth_rate, -100, 100);
  const factors = [
    { key: 'exportShock', label: 'Изменение экспортной выручки', input: rate(safeParams.export_shock_pct, -100, 100), coefficient: FACTOR_COEFFICIENTS.exportShock },
    { key: 'costPressure', label: 'Изменение издержек предприятий', input: rate(safeParams.cost_pressure_pct, -100, 100), coefficient: FACTOR_COEFFICIENTS.costPressure },
    { key: 'laborShortage', label: 'Изменение кадрового дефицита', input: rate(safeParams.labor_shortage_pct, -100, 100), coefficient: FACTOR_COEFFICIENTS.laborShortage },
  ].map((factor) => ({ ...factor, annualEffect: factor.input * factor.coefficient }));

  const adjustedScoreRate = rate(baseRate + factors.reduce((sum, factor) => sum + factor.annualEffect, 0));
  const sourceRows = Array.isArray(municipalities) ? municipalities : [];
  const rows = sourceRows.map((municipality) => {
    const investmentRaw = municipality?.investments?.volumeBillion;
    const smeRaw = municipality?.smeCount;
    const indexResult = municipality?.id == null ? null : indexResults[String(municipality.id)];
    const scoreRaw = indexModeRequested
      ? (useApprovedIndex && indexResult?.status === 'complete' ? indexResult.index : null)
      : municipality?.score;
    const hasInvestment = nonNegative(investmentRaw);
    const hasSme = nonNegative(smeRaw);
    const hasScore = validScore(scoreRaw);
    const investment = hasInvestment ? numeric(investmentRaw) : null;
    const sme = hasSme ? numeric(smeRaw) : null;
    const score = hasScore ? numeric(scoreRaw) : null;

    const investmentRate = rate(safeParams.investment_growth_rate);
    const smeRate = rate(safeParams.sme_growth_rate);
    const projectedInvestments = hasInvestment ? growth(investment, investmentRate, years) : null;
    const projectedSmeRaw = hasSme ? growth(sme, smeRate, years) : null;
    const projectedSme = roundCount(projectedSmeRaw);
    // Percentile indices are relative cross-sectional positions, not ratio-scale quantities.
    // When an approved index is supplied, project additive index-point changes rather than
    // compounding the percentile score as if it were revenue or population.
    const projectedScoreRaw = hasScore
      ? (useApprovedIndex ? score + adjustedScoreRate * years : growth(score, adjustedScoreRate, years))
      : null;
    const projectedScore = projectedScoreRaw == null ? null : clamp(projectedScoreRaw, 0, 100);
    const scoreLowRaw = hasScore
      ? (useApprovedIndex ? score + adjustedScoreRate * years - uncertainty : growth(score, adjustedScoreRate - uncertainty, years))
      : null;
    const scoreHighRaw = hasScore
      ? (useApprovedIndex ? score + adjustedScoreRate * years + uncertainty : growth(score, adjustedScoreRate + uncertainty, years))
      : null;
    const scoreLow = scoreLowRaw == null ? null : clamp(scoreLowRaw, 0, 100);
    const scoreHigh = scoreHighRaw == null ? null : clamp(scoreHighRaw, 0, 100);

    const investmentsLow = hasInvestment ? growth(investment, investmentRate - uncertainty, years) : null;
    const investmentsHigh = hasInvestment ? growth(investment, investmentRate + uncertainty, years) : null;
    const smeLow = hasSme ? roundCount(growth(sme, smeRate - uncertainty, years)) : null;
    const smeHigh = hasSme ? roundCount(growth(sme, smeRate + uncertainty, years)) : null;

    const factorImpacts = factors.map((factor) => {
      if (!hasScore || projectedScore == null) return { key: factor.key, label: factor.label, annualEffect: factor.annualEffect, scorePoints: null };
      const withoutFactorRaw = useApprovedIndex
        ? score + (adjustedScoreRate - factor.annualEffect) * years
        : growth(score, adjustedScoreRate - factor.annualEffect, years);
      const withoutFactor = withoutFactorRaw == null ? null : clamp(withoutFactorRaw, 0, 100);
      return {
        key: factor.key,
        label: factor.label,
        annualEffect: factor.annualEffect,
        scorePoints: withoutFactor == null ? null : projectedScore - withoutFactor,
      };
    });

    return {
      id: municipality?.id,
      name: municipality?.name || '',
      group: municipality?.group2024,
      investment,
      projectedInvestments,
      investmentsLow,
      investmentsHigh,
      sme,
      projectedSme,
      smeLow,
      smeHigh,
      score,
      projectedScore,
      scoreLow,
      scoreHigh,
      factorImpacts,
      hasInvestment,
      hasSme,
      hasScore,
      scoreSource: useApprovedIndex
        ? (hasScore ? 'approved_resilience_index' : 'missing_or_invalid_index_result')
        : indexModeRequested ? 'unavailable_index_contract' : 'conceptual_score',
      scoreMethodologyVersion: useApprovedIndex ? safeOptions.indexContract.version : null,
      scoreProjectionMode: useApprovedIndex ? 'additive_index_points' : indexModeRequested ? 'unavailable_index_contract' : 'compound_conceptual_score',
      adjustedScoreRate,
    };
  });

  const ranked = rows.filter((row) => row.projectedScore != null)
    .slice().sort((a, b) => b.projectedScore - a.projectedScore || String(a.name).localeCompare(String(b.name), 'ru-RU'));
  const rankByRow = new Map(ranked.map((row, index) => [row, index + 1]));
  return rows.map((row) => ({ ...row, projectedRank: rankByRow.get(row) ?? null }))
    .sort((a, b) => {
      if (a.projectedInvestments == null && b.projectedInvestments == null) return String(a.name).localeCompare(String(b.name), 'ru-RU');
      if (a.projectedInvestments == null) return 1;
      if (b.projectedInvestments == null) return -1;
      return b.projectedInvestments - a.projectedInvestments || String(a.name).localeCompare(String(b.name), 'ru-RU');
    });
}

export function sumFiniteValues(values = []) {
  const valid = (Array.isArray(values) ? values : []).map(numeric).filter((value) => value != null);
  if (!valid.length) return null;
  const total = valid.reduce((sum, value) => sum + value, 0);
  return Number.isFinite(total) ? total : null;
}

export function summarizeForecast(rows = []) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const valid = safeRows.filter((row) => numeric(row?.projectedScore) != null);
  const average = (items, key) => {
    const values = items.map((item) => numeric(item?.[key])).filter((value) => value != null);
    if (!values.length) return null;
    // Incremental mean avoids overflowing an intermediate sum.
    return values.reduce((mean, value, index) => mean + (value - mean) / (index + 1), 0);
  };
  const investmentTotal = sumFiniteValues(safeRows.map((row) => row?.projectedInvestments));
  return {
    municipalityCount: safeRows.length,
    scoreCoverage: valid.length,
    averageScore: average(valid, 'projectedScore'),
    averageScoreLow: average(valid, 'scoreLow'),
    averageScoreHigh: average(valid, 'scoreHigh'),
    investmentTotal,
    investmentCoverage: safeRows.filter((row) => numeric(row?.projectedInvestments) != null).length,
  };
}


const BACKTEST_MODELS = Object.freeze([
  { key: 'last_value', label: 'Последнее значение' },
  { key: 'linear_trend', label: 'Линейный тренд' },
  { key: 'mean_growth', label: 'Средний темп роста' },
]);

function backtestNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function backtestPeriod(item) {
  const year = Number(item?.reference_year);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  const period = String(item?.reference_period ?? '').trim();
  if (period === 'annual' || period === String(year)) {
    return { kind: 'annual', slot: 'annual', label: 'Годовой ряд' };
  }
  const date = period.match(/^(\d{4})-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/);
  if (date) {
    const dateYear = Number(date[1]);
    const month = Number(date[2]);
    const day = Number(date[3]);
    const candidate = new Date(Date.UTC(dateYear, month - 1, day));
    if (candidate.getUTCFullYear() !== dateYear
      || candidate.getUTCMonth() + 1 !== month
      || candidate.getUTCDate() !== day
      || dateYear !== year) return null;
    const slot = date.slice(2).join('-');
    return { kind: 'point_in_time', slot, label: 'Срез на ' + slot };
  }
  return null;
}

function predictLastValue(training) {
  return Number(training[training.length - 1].value);
}

function predictLinearTrend(training, targetYear) {
  const meanYear = training.reduce((sum, point) => sum + point.year, 0) / training.length;
  const meanValue = training.reduce((sum, point) => sum + point.value, 0) / training.length;
  let numerator = 0;
  let denominator = 0;
  for (const point of training) {
    numerator += (point.year - meanYear) * (point.value - meanValue);
    denominator += (point.year - meanYear) ** 2;
  }
  if (!(denominator > 0)) return null;
  const prediction = meanValue + (numerator / denominator) * (targetYear - meanYear);
  return Number.isFinite(prediction) ? prediction : null;
}

function predictMeanGrowth(training, horizon) {
  if (training.some((point) => !(point.value > 0))) return null;
  const logRates = [];
  for (let index = 1; index < training.length; index += 1) {
    const previous = training[index - 1];
    const current = training[index];
    if (current.year - previous.year !== 1) return null;
    logRates.push(Math.log(current.value / previous.value));
  }
  if (!logRates.length) return null;
  const meanLogRate = logRates.reduce((sum, value) => sum + value, 0) / logRates.length;
  const prediction = training[training.length - 1].value * Math.exp(meanLogRate * horizon);
  return Number.isFinite(prediction) ? prediction : null;
}

/**
 * Expanding-window historical validation for observed municipal indicator series.
 * This is a diagnostic comparison against simple baselines, not model approval.
 */
export function buildHistoricalBacktest(indicators = [], options = {}) {
  const sourceRows = Array.isArray(indicators) ? indicators : [];
  const requestedHorizons = Array.isArray(options?.horizons) ? options.horizons : [1, 2, 3];
  const horizons = [...new Set(requestedHorizons
    .map(Number)
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 3))]
    .sort((a, b) => a - b);
  const minTrainingPoints = Math.max(2, Math.min(5, Math.trunc(backtestNumber(options?.minTrainingPoints) ?? 2)));
  const excluded = {
    notVerified: 0,
    nonMunicipal: 0,
    unsupportedPeriod: 0,
    invalidValue: 0,
    duplicateSameValueRows: 0,
    conflictingMunicipalityYearGroups: 0,
    eligibleSegments: 0,
    insufficientSegments: 0,
  };
  const groupedRows = new Map();
  for (const item of sourceRows) {
    if (item?.verification_status !== 'verified') {
      excluded.notVerified += 1;
      continue;
    }
    if (item?.geographic_level !== 'municipality') {
      excluded.nonMunicipal += 1;
      continue;
    }
    const period = backtestPeriod(item);
    if (!period) {
      excluded.unsupportedPeriod += 1;
      continue;
    }
    const value = backtestNumber(item?.value);
    if (value == null) {
      excluded.invalidValue += 1;
      continue;
    }
    const municipalityId = String(item?.municipality_id ?? '').trim();
    const indicatorCode = String(item?.indicator_code ?? '').trim();
    const indicatorName = String(item?.indicator_name ?? '').trim();
    const unit = String(item?.unit ?? '').trim();
    if (!municipalityId || !indicatorCode || !indicatorName || !unit) {
      excluded.invalidValue += 1;
      continue;
    }
    const identity = JSON.stringify([
      municipalityId, indicatorCode, indicatorName, unit, period.kind, period.slot,
    ]);
    if (!groupedRows.has(identity)) {
      groupedRows.set(identity, {
        municipalityId, indicatorCode, indicatorName, unit,
        periodKind: period.kind, periodSlot: period.slot, periodLabel: period.label,
        years: new Map(),
      });
    }
    const group = groupedRows.get(identity);
    const year = Number(item.reference_year);
    if (!group.years.has(year)) group.years.set(year, []);
    group.years.get(year).push({ value });
  }

  const aggregateRows = new Map();
  const testedMunicipalities = new Set();
  const eligibleSeries = new Set();
  const addPrediction = (series, horizon, modelDefinition, prediction, actualPoint) => {
    if (!Number.isFinite(prediction) || !Number.isFinite(actualPoint.value)) return;
    const error = prediction - actualPoint.value;
    // MAPE and percentage bias are only meaningful for strictly positive actuals.
    const hasPercentError = actualPoint.value > 0;
    const metricKey = JSON.stringify([
      series.indicatorCode, series.indicatorName, series.unit,
      series.periodKind, series.periodSlot, horizon, modelDefinition.key,
    ]);
    if (!aggregateRows.has(metricKey)) {
      aggregateRows.set(metricKey, {
        indicatorCode: series.indicatorCode,
        indicatorName: series.indicatorName,
        unit: series.unit,
        periodKind: series.periodKind,
        periodSlot: series.periodSlot,
        periodLabel: series.periodLabel,
        horizon,
        model: modelDefinition.key,
        modelLabel: modelDefinition.label,
        errors: [],
        absoluteErrors: [],
        percentErrors: [],
        signedPercentErrors: [],
        municipalities: new Set(),
        series: new Set(),
      });
    }
    const metric = aggregateRows.get(metricKey);
    metric.errors.push(error);
    metric.absoluteErrors.push(Math.abs(error));
    if (hasPercentError) {
      metric.percentErrors.push(Math.abs(error / actualPoint.value) * 100);
      metric.signedPercentErrors.push((error / actualPoint.value) * 100);
    }
    metric.municipalities.add(series.municipalityId);
    metric.series.add(series.municipalityId + '|' + series.periodKind + '|' + series.periodSlot);
    testedMunicipalities.add(series.municipalityId);
  };

  for (const series of groupedRows.values()) {
    const points = [];
    for (const [year, rows] of [...series.years.entries()].sort((a, b) => a[0] - b[0])) {
      const distinctValues = [...new Set(rows.map((row) => row.value))];
      if (distinctValues.length !== 1) {
        excluded.conflictingMunicipalityYearGroups += 1;
        continue;
      }
      if (rows.length > 1) excluded.duplicateSameValueRows += rows.length - 1;
      points.push({ year, value: distinctValues[0] });
    }

    let segment = [];
    const flushSegment = () => {
      if (segment.length < minTrainingPoints + 1) {
        if (segment.length) excluded.insufficientSegments += 1;
        segment = [];
        return;
      }
      eligibleSeries.add(JSON.stringify([series.municipalityId, series.indicatorCode, series.indicatorName, series.unit, series.periodKind, series.periodSlot]));
      excluded.eligibleSegments += 1;
      for (let origin = minTrainingPoints - 1; origin < segment.length - 1; origin += 1) {
        const training = segment.slice(0, origin + 1);
        for (const horizon of horizons) {
          const targetIndex = origin + horizon;
          if (targetIndex >= segment.length) continue;
          const actualPoint = segment[targetIndex];
          if (actualPoint.year - training[training.length - 1].year !== horizon) continue;
          for (const modelDefinition of BACKTEST_MODELS) {
            let prediction = null;
            if (modelDefinition.key === 'last_value') prediction = predictLastValue(training);
            else if (modelDefinition.key === 'linear_trend') prediction = predictLinearTrend(training, actualPoint.year);
            else if (modelDefinition.key === 'mean_growth') prediction = predictMeanGrowth(training, horizon);
            addPrediction(series, horizon, modelDefinition, prediction, actualPoint);
          }
        }
      }
      segment = [];
    };

    for (const point of points) {
      if (segment.length && point.year !== segment[segment.length - 1].year + 1) flushSegment();
      segment.push(point);
    }
    flushSegment();
  }

  const mean = (values) => values.length
    ? values.reduce((sum, value) => sum + value / values.length, 0)
    : null;
  const metrics = [...aggregateRows.values()].map((metric) => {
    const testCount = metric.errors.length;
    return {
      indicatorCode: metric.indicatorCode,
      indicatorName: metric.indicatorName,
      unit: metric.unit,
      periodKind: metric.periodKind,
      periodSlot: metric.periodSlot,
      periodLabel: metric.periodLabel,
      horizon: metric.horizon,
      model: metric.model,
      modelLabel: metric.modelLabel,
      testCount,
      mapeCount: metric.percentErrors.length,
      municipalityCount: metric.municipalities.size,
      seriesCount: metric.series.size,
      mae: mean(metric.absoluteErrors),
      mape: mean(metric.percentErrors),
      bias: mean(metric.errors),
      biasPercent: mean(metric.signedPercentErrors),
      sampleStatus: testCount < 2 ? 'very_small_sample' : testCount < 5 ? 'small_sample' : 'exploratory',
    };
  }).sort((a, b) =>
    a.indicatorName.localeCompare(b.indicatorName, 'ru-RU')
    || a.periodSlot.localeCompare(b.periodSlot, 'ru-RU')
    || a.horizon - b.horizon
    || a.model.localeCompare(b.model, 'en')
  );

  return {
    metrics,
    horizons,
    minTrainingPoints,
    totalTestPredictions: metrics.reduce((sum, metric) => sum + metric.testCount, 0),
    testedMunicipalityCount: testedMunicipalities.size,
    eligibleSeriesGroups: eligibleSeries.size,
    excluded,
    modelDefinitions: BACKTEST_MODELS.map(({ key, label }) => ({ key, label })),
  };
}
