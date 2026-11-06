import assert from 'node:assert/strict';
import { classify } from '../src/lib/indicatorClassification.js';
import { buildRiskModel, deriveMunicipalIndicators, MODEL_PILLARS } from '../src/lib/riskModel.js';

assert.equal(classify({ indicator_code: 'healthcare_facilities', indicator_name: 'Медицинские организации' }).key, 'health');
assert.equal(classify({ indicator_code: 'hospital_beds', indicator_name: 'Количество больничных коек' }).key, 'health');
assert.equal(classify({ indicator_code: 'employees_healthcare', indicator_name: 'Деятельность в области здравоохранения и социальных услуг' }).key, 'employment');
assert.equal(classify({ indicator_code: 'death_rate', indicator_name: 'Общий коэффициент смертности' }).key, 'demography');
assert.equal(classify({ indicator_code: 'employees_hospitality', indicator_name: 'Деятельность гостиниц и предприятий общественного питания' }).key, 'employment');
assert.equal(classify({ indicator_code: 'education_preschool', indicator_name: 'Дошкольные образовательные учреждения' }).key, 'education');
assert.equal(classify({ indicator_code: 'social_support', indicator_name: 'Социальная поддержка населения' }).key, 'social');
assert.equal(classify({ indicator_code: 'road_network', indicator_name: 'Протяжённость автомобильных дорог' }).key, 'infrastructure');
assert.equal(classify({ indicator_code: 'registered_organizations_2024_04', indicator_name: 'Количество организаций по данным государственной регистрации' }).key, 'business');
assert.equal(classify({ indicator_code: 'pokachi_construction_volume', indicator_name: 'Объём работ по виду деятельности «Строительство»' }).key, 'production');
assert.equal(classify({ indicator_code: 'kogalym_taxable_land_share', indicator_name: 'Доля площади земельных участков, являющихся объектами налогообложения земельным налогом' }).key, 'budget');
assert.equal(classify({ indicator_code: 'jobs_created_permanent', indicator_name: 'Создано постоянных рабочих мест' }).key, 'employment');
assert.equal(classify({ indicator_code: 'fairs_count_q1', indicator_name: 'Число проведённых ярмарок, всего' }).key, 'production');
assert.equal(classify({ indicator_code: 'industrial_output_mln_rub', indicator_name: 'Объём промышленного производства' }).key, 'production');
assert.equal(classify({ indicator_code: 'consumer_market_volume', indicator_name: 'Объём потребительского рынка города' }).key, 'production');
assert.equal(classify({ indicator_code: 'kogalym_profitable_agri_org_share', indicator_name: 'Доля прибыльных сельскохозяйственных организаций' }).key, 'production');
assert.equal(classify({ indicator_code: 'beloyarsky_oil_extraction', indicator_name: 'Добыча нефти' }).key, 'production');
assert.equal(classify({ indicator_code: 'october_paid_services', indicator_name: 'Объём реализации платных услуг в действующих ценах' }).key, 'production');

const municipalities = [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }];
const definitions = [
  { code: 'investment_index', key: 'investment', values: [10, 20, 30], adverseIndex: 0 },
  { code: 'employment_index', key: 'employment', values: [10, 20, 30], adverseIndex: 0 },
  { code: 'health_access', key: 'health', values: [10, 20, 30], adverseIndex: -1 },
  { code: 'education_access', key: 'education', values: [10, 20, 30], adverseIndex: -1 },
];
const series = [];
for (const definition of definitions) {
  definition.values.forEach((value, index) => {
    const id = municipalities[index].id;
    series.push({
      municipalityId: id,
      code: definition.code,
      unit: 'индекс',
      direction: 'higher',
      adverse: index === definition.adverseIndex,
      pillar: { key: definition.key },
      latest: { numericValue: value, reference_year: 2025, reference_period: 'annual' },
      points: [2022, 2023, 2024, 2025].map((year) => ({ reference_year: year, numericValue: value })),
    });
  });
}
const model = buildRiskModel(municipalities, series);
const m1 = model.byMunicipality.m1;
assert.ok(m1.score !== null, 'two or more independently covered pillars should produce a partial score');
assert.equal(m1.pillars.find((pillar) => pillar.key === 'social').indicators, 2, 'health and education series must map into the social model pillar');
assert.equal(m1.availableWeight, 55, 'economy + labour + social base weights should remain unchanged');
const chain = m1.chains.find((item) => item.id === 'investment-employment');
assert.ok(chain?.active, 'adverse investment and employment signals should activate their risk chain');

const serviceSeries = [];
for (const definition of [
  { code: 'budget_services_test', key: 'budget', adverseIndex: 0 },
  { code: 'health_services_test', key: 'health', adverseIndex: 0 },
  { code: 'education_services_test', key: 'education', adverseIndex: 0 },
]) {
  [10, 20, 30].forEach((value, index) => {
    serviceSeries.push({
      municipalityId: municipalities[index].id,
      code: definition.code,
      unit: 'индекс',
      direction: 'higher',
      adverse: index === definition.adverseIndex,
      pillar: { key: definition.key },
      latest: { numericValue: value, reference_year: 2025, reference_period: 'annual' },
      points: [2022, 2023, 2024, 2025].map((year) => ({ reference_year: year, numericValue: value })),
    });
  });
}
const serviceRisk = buildRiskModel(municipalities, serviceSeries).byMunicipality.m1.chains.find((item) => item.id === 'budget-services');
assert.ok(serviceRisk?.active, 'health and education signals must activate the social stage in the budget-services chain');
assert.deepEqual(serviceRisk.hits, ['budget', 'social'], 'health and education must count as one social-stage hit, not duplicate hits');

const insufficient = buildRiskModel(municipalities, series.filter((item) => item.pillar.key === 'investment'));
assert.equal(insufficient.byMunicipality.m1.score, null, 'one 20% pillar must not produce a resilience score');
assert.equal(MODEL_PILLARS.find((pillar) => pillar.key === 'social').weight, 0.15, 'the existing social weight must remain unchanged');

const sourceRow = (indicator_code, value, reference_period, unit = 'тыс. руб.', overrides = {}) => ({
  municipality_id: 'm1',
  indicator_code,
  indicator_name: indicator_code,
  reference_year: 2024,
  reference_period,
  value,
  unit,
  verification_status: 'verified',
  geographic_level: 'municipality',
  ...overrides,
});
const derivedRows = deriveMunicipalIndicators([
  sourceRow('budget_total_revenue', 100, '2024-Q2'),
  sourceRow('budget_revenue_excluding_grants', 40, '2024-Q2'),
  sourceRow('budget_total_expenditure', 80, '2024-Q2'),
  sourceRow('budget_total_revenue', 200, '2024-Q3', 'тыс. руб.', { source_id: 'budget_main', source_url: 'https://example.com/budget-main.pdf' }),
  sourceRow('budget_revenue_excluding_grants', 60, '2024-Q3'),
  sourceRow('budget_intergovernmental_transfers', 50, '2024-Q3', 'тыс. руб.', { source_id: 'budget_appendix', source_url: 'https://example.com/budget-appendix.pdf' }),
  sourceRow('budget_total_expenditure', 180, '2024-Q3'),
  sourceRow('fixed_capital_investment_non_mining', 1000, 'annual', 'руб.', { source_id: 'investment_source', source_url: 'https://example.com/investment.pdf' }),
  sourceRow('population_municipality', 10, '2024-01-01', 'человек', { source_id: 'population_source', source_url: 'https://example.com/population.xlsx' }),
  sourceRow('population_municipality', 9, '2022-01-01', 'человек', { reference_year: 2022 }),
  sourceRow('budget_total_revenue', 100, '2024-Q3', 'руб.', { municipality_id: 'm2' }),
  sourceRow('budget_revenue_excluding_grants', 40, '2024-Q3', 'тыс. руб.', { municipality_id: 'm2' }),
  sourceRow('budget_total_revenue', 999, '2024-Q3', 'тыс. руб.', { verification_status: 'needs_review' }),
  sourceRow('budget_revenue_excluding_grants', 999, '2024-Q3', 'тыс. руб.', { geographic_level: 'settlement' }),
]);
const ownRevenueShares = derivedRows.filter((row) => row.indicator_code === 'derived_budget_own_revenue_share');
assert.deepEqual(ownRevenueShares.map((row) => [row.reference_period, row.value]), [['2024-Q2', 40], ['2024-Q3', 30]], 'budget ratios must remain separated by reporting period');
assert.equal(derivedRows.find((row) => row.indicator_code === 'derived_budget_transfer_dependency')?.reference_period, '2024-Q3', 'transfer dependency must retain its source quarter');
assert.deepEqual(derivedRows.filter((row) => row.indicator_code === 'derived_budget_balance_ratio').map((row) => [row.reference_period, Number(row.value.toFixed(4))]), [['2024-Q2', 25], ['2024-Q3', 11.1111]], 'budget balance must use values from the same quarter');
assert.equal(derivedRows.find((row) => row.indicator_code === 'derived_investment_per_capita')?.value, 100, 'annual investment must join to the unique population snapshot for the same year');
assert.equal(derivedRows.find((row) => row.indicator_code === 'derived_population_growth_rate')?.reference_period, 'annual', 'population growth is explicitly annualized');
assert.equal(derivedRows.some((row) => row.municipality_id === 'm2' && row.indicator_code === 'derived_budget_own_revenue_share'), false, 'ratios with incompatible units must not be calculated');
assert.equal(derivedRows.some((row) => row.value === 999), false, 'unverified and settlement-level rows must not enter derived municipal indicators');
const transferDerived = derivedRows.find((row) => row.indicator_code === 'derived_budget_transfer_dependency');
assert.deepEqual(transferDerived.source_ids, ['budget_main', 'budget_appendix'], 'derived indicators must retain every contributing source ID');
assert.deepEqual(transferDerived.source_urls, ['https://example.com/budget-main.pdf', 'https://example.com/budget-appendix.pdf'], 'derived indicators must retain every contributing source URL');
assert.equal(transferDerived.source_url, null, 'legacy single-source URL must be empty when provenance has multiple sources');
assert.ok(transferDerived.notes.includes('budget_main, budget_appendix'), 'derivation notes must expose contributing source IDs');
const investmentDerived = derivedRows.find((row) => row.indicator_code === 'derived_investment_per_capita');
assert.deepEqual(investmentDerived.source_ids, ['investment_source', 'population_source'], 'per-capita investment must cite both investment and population inputs');
assert.equal(investmentDerived.source_url, null, 'per-capita investment must not imply that one source supports both inputs');



console.log('Indicator classification and resilience model pillar tests passed.');
