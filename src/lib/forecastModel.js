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

const finite = (value) => value != null && value !== '' && Number.isFinite(Number(value));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const rate = (value, min = -100, max = 100) => clamp(finite(value) ? Number(value) : 0, min, max);
const nonNegative = (value) => finite(value) && Number(value) >= 0;
const growth = (base, annualRate, years) => base * Math.pow(Math.max(0, 1 + annualRate / 100), years);

export function buildForecasts(municipalities = [], params = {}, horizon = 1) {
  const years = clamp(Math.round(finite(horizon) ? Number(horizon) : 1), 1, 3);
  const uncertaintyRate = rate(params.uncertainty_rate, 0, 100);
  const uncertainty = uncertaintyRate * Math.sqrt(years);
  const baseRate = rate(params.score_growth_rate, -100, 100);
  const factors = [
    { key: 'exportShock', label: 'Изменение экспортной выручки', input: rate(params.export_shock_pct, -100, 100), coefficient: FACTOR_COEFFICIENTS.exportShock },
    { key: 'costPressure', label: 'Изменение издержек предприятий', input: rate(params.cost_pressure_pct, -100, 100), coefficient: FACTOR_COEFFICIENTS.costPressure },
    { key: 'laborShortage', label: 'Изменение кадрового дефицита', input: rate(params.labor_shortage_pct, -100, 100), coefficient: FACTOR_COEFFICIENTS.laborShortage },
  ].map((factor) => ({ ...factor, annualEffect: factor.input * factor.coefficient }));

  const adjustedScoreRate = rate(baseRate + factors.reduce((sum, factor) => sum + factor.annualEffect, 0));
  const sourceRows = Array.isArray(municipalities) ? municipalities : [];
  const rows = sourceRows.map((municipality) => {
    const investmentRaw = municipality?.investments?.volumeBillion;
    const hasInvestment = nonNegative(investmentRaw);
    const hasSme = nonNegative(municipality?.smeCount);
    const hasScore = finite(municipality?.score);
    const investment = hasInvestment ? Number(investmentRaw) : null;
    const sme = hasSme ? Number(municipality.smeCount) : null;
    const score = hasScore ? clamp(Number(municipality.score), 0, 100) : null;

    const investmentRate = rate(params.investment_growth_rate);
    const smeRate = rate(params.sme_growth_rate);
    const projectedInvestments = hasInvestment ? growth(investment, investmentRate, years) : null;
    const projectedSme = hasSme ? Math.round(growth(sme, smeRate, years)) : null;
    const projectedScore = hasScore ? clamp(growth(score, adjustedScoreRate, years), 0, 100) : null;
    const scoreLow = projectedScore == null ? null : clamp(growth(score, adjustedScoreRate - uncertainty, years), 0, 100);
    const scoreHigh = projectedScore == null ? null : clamp(growth(score, adjustedScoreRate + uncertainty, years), 0, 100);

    const factorImpacts = factors.map((factor) => {
      if (!hasScore) return { key: factor.key, label: factor.label, annualEffect: factor.annualEffect, scorePoints: null };
      const withoutFactor = growth(score, adjustedScoreRate - factor.annualEffect, years);
      return {
        key: factor.key,
        label: factor.label,
        annualEffect: factor.annualEffect,
        scorePoints: projectedScore - clamp(withoutFactor, 0, 100),
      };
    });

    return {
      id: municipality?.id,
      name: municipality?.name || '',
      group: municipality?.group2024,
      investment,
      projectedInvestments,
      investmentsLow: hasInvestment ? growth(investment, investmentRate - uncertainty, years) : null,
      investmentsHigh: hasInvestment ? growth(investment, investmentRate + uncertainty, years) : null,
      sme,
      projectedSme,
      smeLow: hasSme ? Math.round(growth(sme, smeRate - uncertainty, years)) : null,
      smeHigh: hasSme ? Math.round(growth(sme, smeRate + uncertainty, years)) : null,
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
    const values = items.map((item) => item[key]).filter(Number.isFinite);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  };
  const investmentRows = rows.filter((row) => row.projectedInvestments != null);
  return {
    municipalityCount: rows.length,
    scoreCoverage: valid.length,
    averageScore: average(valid, 'projectedScore'),
    averageScoreLow: average(valid, 'scoreLow'),
    averageScoreHigh: average(valid, 'scoreHigh'),
    investmentTotal: investmentRows.length ? investmentRows.reduce((sum, row) => sum + row.projectedInvestments, 0) : null,
    investmentCoverage: investmentRows.length,
  };
}
