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
      scoreSource: useApprovedIndex ? 'approved_resilience_index' : indexModeRequested ? 'unavailable_index_contract' : 'conceptual_score',
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
