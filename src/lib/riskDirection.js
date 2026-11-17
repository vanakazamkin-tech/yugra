// Conservative direction rules for municipal risk monitoring.
// Nominal monetary levels remain contextual until converted to real terms.
export const directionForRiskIndicator = (row = {}) => {
  const code = String(row.indicator_code ?? '').trim().toLowerCase();
  const name = String(row.indicator_name ?? '').trim().toLowerCase();
  const text = code + ' ' + name;

  if (/(unemploy|registered_unemployed|poverty|below_poverty|death_rate|mortality|noncompliant_roads|arrears|deficit|debt|budget_transfer_dependency|derived_budget_transfer_dependency|needs_replacement|нуждающ.*замен|требующ.*замен|аварийн|износ|смертн|бедност|безработ|не отвечающ.*норматив)/i.test(text)) return 'lower';

  // Only explicitly directional labour, real-income, physical-volume and infrastructure measures are admitted.
  // SME density remains contextual until exact population, registration scope and monotonicity are validated.
  if (/(employment_rate|employment_level|share_employed_population|real_disposable_income|real_income|industrial_production_index|physical_index|productivity|budget_own_revenue_share|budget_balance_ratio|roads_in_normative_condition|compliant_roads|нормативном состоянии|соответств.*норматив|population_growth_rate|derived_population_growth_rate|migration_balance|migration_net|миграционн.*сальдо|положительн.*миграц|уровень занятости|доля занятых|индекс физического объём|индекс физического объем|реальн.*доход)/i.test(text)) return 'higher';

  // Nominal per-capita investment is still nominal: per-capita normalization
  // removes population scale, not price growth. Keep it contextual without a deflator.
  return 'context';
};

 
// These two budget shares are complementary parts of one revenue structure,
// not independent pieces of evidence for the same financial risk.
const RISK_SIGNAL_FAMILIES = new Map([
  ['derived_budget_own_revenue_share', 'budget_revenue_structure'],
  ['derived_budget_transfer_dependency', 'budget_revenue_structure'],
  // These two Pokachi indicators come from the same municipal table and
  // describe the same registered-unemployment phenomenon in count and rate.
  ['pokachi_registered_unemployed', 'registered_unemployment'],
  ['pokachi_registered_unemployment_rate', 'registered_unemployment'],
]);

export const riskSignalFamilyFor = (indicatorCode) => {
  const code = String(indicatorCode ?? '').trim().toLowerCase();
  return RISK_SIGNAL_FAMILIES.get(code) || code || null;
};
