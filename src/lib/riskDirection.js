// Conservative direction rules for municipal risk monitoring.
// Nominal monetary levels remain contextual until converted to real terms.
export const directionForRiskIndicator = (row = {}) => {
  const code = String(row.indicator_code ?? '').trim().toLowerCase();
  const name = String(row.indicator_name ?? '').trim().toLowerCase();
  const text = code + ' ' + name;

  if (/(unemploy|registered_unemployed|poverty|below_poverty|death_rate|mortality|noncompliant_roads|arrears|deficit|debt|budget_transfer_dependency|derived_budget_transfer_dependency|аварийн|износ|смертн|бедност|безработ|не отвечающ.*норматив)/i.test(text)) return 'lower';

  // Price-adjusted indices and explicitly real income measures can be directional.
  if (/(employment_share|sme_per_10k|real_disposable_income|real_income|industrial_production_index|physical_index|productivity|budget_own_revenue_share|budget_balance_ratio|population_growth_rate|derived_population_growth_rate|положительн.*миграц|уровень занятости|доля занятых|индекс физического объём|индекс физического объем|реальн.*доход)/i.test(text)) return 'higher';

  // Nominal per-capita investment is still nominal: per-capita normalization
  // removes population scale, not price growth. Keep it contextual without a deflator.
  return 'context';
};
