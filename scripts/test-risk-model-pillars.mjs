import assert from 'node:assert/strict';
import { classify } from '../src/lib/indicatorClassification.js';
import { buildRiskModel, MODEL_PILLARS } from '../src/lib/riskModel.js';

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

console.log('Indicator classification and resilience model pillar tests passed.');
