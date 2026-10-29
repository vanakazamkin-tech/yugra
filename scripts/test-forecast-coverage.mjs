import assert from 'node:assert/strict';
import { buildForecastCoverage } from '../src/lib/forecastCoverage.js';

const indicators = [
  { municipality_id: 'surgut', indicator_code: 'average_employees_q1', indicator_name: 'Среднесписочная численность работников', reference_year: 2026, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'megion', indicator_code: 'employees_trade', indicator_name: 'Численность работников торговли', reference_year: 2026, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'surgut', indicator_code: 'average_monthly_salary_q1', indicator_name: 'Среднемесячная заработная плата работников организаций без субъектов малого предпринимательства', reference_year: 2026, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'megion', indicator_code: 'fixed_capital_investment_local_budget', indicator_name: 'Инвестиции в основной капитал за счёт средств местного бюджета', reference_year: 2024, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'megion', indicator_code: 'rosstat_migration_8112023', indicator_name: 'Миграционный прирост', reference_year: 2023, verification_status: 'verified', geographic_level: 'municipality' },
  { municipality_id: 'settlement-a', indicator_code: 'average_employees_q1', indicator_name: 'Численность работников', reference_year: 2026, verification_status: 'verified', geographic_level: 'settlement' },
  { municipality_id: 'langepas', indicator_code: 'average_monthly_salary_annual', indicator_name: 'Средняя заработная плата', reference_year: 2025, verification_status: 'pending', geographic_level: 'municipality' },
  { municipality_id: 'surgut', indicator_code: 'municipal_budget_expenditure', indicator_name: 'Расходы бюджета', reference_year: 2025, verification_status: 'verified', geographic_level: 'municipality' },
];

const coverage = buildForecastCoverage(indicators, [
  { municipality_id: 'megion', report_date: '2026-06-30', verification_status: 'verified' },
  { municipality_id: 'megion', report_date: '2026-09-30', verification_status: 'verified' },
  { municipality_id: 'langepas', report_date: null, verification_status: 'verified' },
], 22);
const byKey = Object.fromEntries(coverage.map((item) => [item.key, item]));

assert.equal(byKey.employment.municipalityCount, 2);
assert.equal(byKey.employment.observationCount, 2);
assert.equal(byKey.income.municipalityCount, 1);
assert.equal(byKey.income.observationCount, 1);
assert.equal(byKey.investment.municipalityCount, 1);
assert.equal(byKey.investment.observationCount, 1);
assert.equal(byKey.budget.municipalityCount, 2);
assert.equal(byKey.budget.observationCount, 4);
assert.equal(byKey.budget.latestYear, 2026);
assert.equal(byKey.budget.municipalityCount, 3);
assert.equal(byKey.migration.municipalityCount, 1);
assert.equal(byKey.migration.latestYear, 2023);
console.log('Forecast coverage classification test passed.');
