/**
 * Transparent scenario projection engine.
 *
 * This is an expert-assumption simulator, not a statistically trained model.
 * Factor coefficients are intentionally explicit and must be calibrated with
 * subject-matter experts before operational use.
 */
export const FACTOR_COEFFICIENTS = Object.freeze({
  exportShock: 0.20,
  costPressure: -0.15,
  laborShortage: -0.15,
});

const finite = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const numberOr = (value, fallback = 0) => finite(value) ? Number(value) : fallback;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const growth = (base, rate, years) => base * Math.pow(Math.max(0, 1 + rate / 100), years);

export function buildForecasts(municipalities = [], params = {}, horizon = 1) {
  const years = clamp(Math.round(numberOr(horizon, 1)), 1, 3);
  const uncertainty = Math.max(0, numberOr(params.uncertainty_rate)) * Math.sqrt(years);
  const baseRate = numberOr(params.score_growth_rate);
  const factors = [
    { key: 'exportShock', label: 'Снижение экспортной выручки', input: numberOr(params.export_shock_pct), coefficient: FACTOR_COEFFICIENTS.exportShock },
    { key: 'costPressure', label: 'Рост издержек предприятий', input: numberOr(params.cost_pressure_pct), coefficient: FACTOR_COEFFICIENTS.costPressure },
    { key: 'laborShortage', label: 'Кадровый дефицит', input: numberOr(params.labor_shortage_pct), coefficient: FACTOR_COEFFICIENTS.laborShortage },
  ].map((factor) => ({ ...factor, annualEffect: factor.input * factor.coefficient }));

  const adjustedScoreRate = baseRate + factors.reduce((sum, factor) => sum + factor.annualEffect, 0);
  const rows = (Array.isArray(municipalities) ? municipalities : []).map((municipality) => {
    const investmentRaw = municipality?.investments?.volumeBillion;
    const hasInvestment = finite(investmentRaw);
    const hasSme = finite(municipality?.smeCount);
    const hasScore = finite(municipality?.score);
    const investment = hasInvestment ? Number(investmentRaw) : null;
    const sme = hasSme ? Number(municipality.smeCount) : null;
    const score = hasScore ? clamp(Number(municipality.score), 0, 100) : null;

    const projectedInvestments = hasInvestment
      ? growth(investment, numberOr(params.investment_growth_rate), years) : null;
    const projectedSme = hasSme
      ? Math.round(growth(sme, numberOr(params.sme_growth_rate), years)) : null;
    const projectedScore = hasScore
      ? clamp(growth(score, adjustedScoreRate, years), 0, 100) : null;
    const scoreLow = projectedScore == null ? null : clamp(growth(score, adjustedScoreRate - uncertainty, years), 0, 100);
    const scoreHigh = projectedScore == null ? null : clamp(growth(score, adjustedScoreRate + uncertainty, years), 0, 100);

    const factorImpacts = factors.map((factor) => {
      if (!hasScore) return { key: factor.key, label: factor.label, annualEffect: factor.annualEffect, scorePoints: null };
      const withoutFactor = growth(score, adjustedScoreRate - factor.annualEffect, years);
      return {
        key: factor.key,
        label: factor.label,
        annualEffect: factor.annualEffect,
        scorePoints: clamp(projectedScore, 0, 100) - clamp(withoutFactor, 0, 100),
      };
    });

    return {
      id: municipality.id,
      name: municipality.name,
      group: municipality.group2024,
      investment,
      projectedInvestments,
      investmentsLow: projectedInvestments == null ? null : projectedInvestments * Math.max(0, 1 - uncertainty / 100),
      investmentsHigh: projectedInvestments == null ? null : projectedInvestments * (1 + uncertainty / 100),
      sme,
      projectedSme,
      smeLow: hasSme ? Math.round(growth(sme, numberOr(params.sme_growth_rate) - uncertainty, years)) : null,
      smeHigh: hasSme ? Math.round(growth(sme, numberOr(params.sme_growth_rate) + uncertainty, years)) : null,
      score,
      projectedScore,
      scoreLow,
      scoreHigh,
      factorImpacts,
      hasInvestment,
      hasSme,
      hasScore,
      adjustedScoreRate,
    };
  });

  const ranked = rows.filter((row) => row.projectedScore != null)
    .slice().sort((a, b) => b.projectedScore - a.projectedScore || String(a.name).localeCompare(String(b.name), 'ru-RU'));
  const rank = new Map(ranked.map((row, index) => [row.id, index + 1]));
  return rows.map((row) => ({ ...row, projectedRank: rank.get(row.id) ?? null }))
    .sort((a, b) => {
      if (a.projectedInvestments == null && b.projectedInvestments == null) return String(a.name).localeCompare(String(b.name), 'ru-RU');
      if (a.projectedInvestments == null) return 1;
      if (b.projectedInvestments == null) return -1;
      return b.projectedInvestments - a.projectedInvestments;
    });
}

export function summarizeForecast(rows = []) {
  const valid = rows.filter((row) => row.projectedScore != null);
  const average = (items, key) => {
    const values = items.map((item) => item[key]).filter((value) => Number.isFinite(value));
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  return {
    municipalityCount: rows.length,
    scoreCoverage: valid.length,
    averageScore: average(valid, 'projectedScore'),
    averageScoreLow: average(valid, 'scoreLow'),
    averageScoreHigh: average(valid, 'scoreHigh'),
    investmentTotal: rows.reduce((sum, row) => sum + (row.projectedInvestments ?? 0), 0),
    investmentCoverage: rows.filter((row) => row.projectedInvestments != null).length,
  };
}
