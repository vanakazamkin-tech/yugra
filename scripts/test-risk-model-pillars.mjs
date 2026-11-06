import assert from 'node:assert/strict';
import { classify } from '../src/lib/indicatorClassification.js';
import { directionForRiskIndicator } from '../src/lib/riskDirection.js';
import { assessRiskSignals, buildRiskModel, countConsecutiveAdverseIntervals, DEFAULT_RISK_THRESHOLDS, deriveMunicipalIndicators, MODEL_PILLARS, parseRiskPeriod, projectScoreScenarios } from '../src/lib/riskModel.js';
import { buildRiskSeries } from '../src/lib/riskSeries.js';

assert.equal(directionForRiskIndicator({ indicator_code: 'derived_investment_per_capita', indicator_name: 'Инвестиции в основной капитал без добычи на одного жителя' }), 'context', 'nominal per-capita investment must not be treated as real growth without a deflator');
assert.equal(directionForRiskIndicator({ indicator_code: 'fixed_capital_investment_growth_preliminary', indicator_name: 'Индекс физического объёма инвестиций в основной капитал' }), 'higher', 'physical-volume investment index can be evaluated directionally');
assert.equal(directionForRiskIndicator({ indicator_code: 'average_monthly_salary_annual', indicator_name: 'Среднемесячная номинальная заработная плата' }), 'context', 'nominal salary without inflation adjustment must remain contextual');
assert.equal(directionForRiskIndicator({ indicator_code: 'sme_employment_share', indicator_name: 'Доля среднесписочной численности работников МСП в численности работников всех предприятий и организаций' }), 'context', 'SME employment share is not an automatically positive diversification signal');
assert.equal(directionForRiskIndicator({ indicator_code: 'derived_budget_transfer_dependency', indicator_name: 'Доля безвозмездных поступлений в общих доходах бюджета' }), 'lower', 'transfer dependency remains a lower-is-better signal');

// Period metadata is mandatory: year alone must never be silently promoted to annual.
assert.equal(parseRiskPeriod({ reference_year: 2024, reference_period: '' }), null);
assert.equal(parseRiskPeriod({ reference_year: 2024 }), null);
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-Q1' }), { year: 2024, frequency: 'quarter', slot: 1 });
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-H2' }), { year: 2024, frequency: 'half', slot: 2 });
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: 'annual' }), { year: 2024, frequency: 'annual', slot: 0 });
assert.equal(parseRiskPeriod({ reference_year: 2023, reference_period: '2024-Q1' }), null, 'period label and reference year conflict must be rejected');
assert.equal(parseRiskPeriod({ reference_year: 1800, reference_period: 'annual' }), null, 'out-of-range years must be rejected');
assert.equal(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-M13' }), null, 'unknown frequency must not be inferred as annual');

const riskRow = (year, period, value, overrides = {}) => ({
  municipality_id: 'm-risk', indicator_code: 'employment_rate', indicator_name: 'Уровень занятости',
  reference_year: year, reference_period: period, value, unit: '%',
  verification_status: 'verified', geographic_level: 'municipality', ...overrides,
});
const missingPeriodSeries = buildRiskSeries([
  riskRow(2022, '', 70), riskRow(2023, '', 60),
]);
assert.equal(missingPeriodSeries[0].adverse, null, 'empty periods must not produce an annual comparison');
assert.equal(missingPeriodSeries[0].adverseStreak, 0, 'empty periods must break early-warning streaks');

const gapSeries = buildRiskSeries([
  riskRow(2022, 'annual', 70), riskRow(2024, 'annual', 60),
]);
assert.equal(gapSeries[0].change, null, 'non-consecutive annual observations must not be compared');
assert.equal(gapSeries[0].adverse, null, 'a missing year must not create a current adverse signal');

const conflictingSeries = buildRiskSeries([
  riskRow(2022, 'annual', 70),
  riskRow(2024, 'annual', 60), riskRow(2024, 'annual', 80, { source_id: 'conflicting_source' }),
]);
assert.equal(conflictingSeries[0].excludedConflictingPeriods, 1, 'conflicting duplicates must be excluded and counted');
assert.equal(conflictingSeries[0].latest.reference_year, 2022, 'conflicting period must not be selected as latest');
assert.equal(conflictingSeries[0].adverse, null, 'excluded conflicting value must not create a risk signal');

const invalidYearSeries = buildRiskSeries([
  riskRow(2023, '2024-Q1', 70), riskRow(2024, '2024-Q1', 60),
]);
assert.equal(invalidYearSeries[0].adverse, null, 'a year-period conflict must not create a risk signal');

assert.equal(countConsecutiveAdverseIntervals([
  { reference_year: 2022, reference_period: 'annual', numericValue: -10 },
  { reference_year: 2023, reference_period: 'annual', numericValue: -12 },
], 'higher'), 1, 'negative numeric observations remain valid values for direction-aware comparisons');




assert.equal(classify({ indicator_code: 'healthcare_facilities', indicator_name: 'Медицинские организации' }).key, 'health');
assert.equal(classify({ indicator_code: 'hospital_beds', indicator_name: 'Количество больничных коек' }).key, 'health');
assert.equal(classify({ indicator_code: 'employees_healthcare', indicator_name: 'Деятельность в области здравоохранения и социальных услуг' }).key, 'employment');
assert.equal(classify({ indicator_code: 'death_rate', indicator_name: 'Общий коэффициент смертности' }).key, 'demography');
assert.equal(classify({ indicator_code: 'population_municipality', indicator_name: 'Численность постоянного населения муниципального образования на 1 января' }).key, 'demography', 'the phrase municipal entity must not trigger the education classifier');
assert.equal(classify({ indicator_code: 'population_rural_municipality', indicator_name: 'Численность сельского населения муниципального образования на 1 января' }).key, 'demography', 'rural municipal population must remain demographic, not education');
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
const riskSignal = (adverse, pillar) => ({ adverse, pillar: { key: pillar } });
assert.deepEqual(DEFAULT_RISK_THRESHOLDS, { minimumUsable: 2, criticalSignals: 3, criticalPillars: 2 }, 'default thresholds must preserve the existing traffic-light behavior');
assert.equal(assessRiskSignals([riskSignal(false, 'economy')]).level, 'insufficient', 'one usable signal is insufficient under the default threshold');
assert.equal(assessRiskSignals([riskSignal(false, 'economy'), riskSignal(false, 'labour')]).level, 'stable', 'no negative signals with sufficient coverage is green');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(false, 'labour')]).level, 'watch', 'one negative signal is yellow');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'labour'), riskSignal(true, 'finance')]).level, 'critical', 'three negative signals across two or more pillars are red by default');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'economy'), riskSignal(true, 'economy')]).level, 'watch', 'multiple signals in one pillar do not satisfy the default cross-pillar red threshold');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'labour')], { minimumUsable: 2, criticalSignals: 2, criticalPillars: 2 }).level, 'critical', 'custom thresholds must recalculate the traffic-light status');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'labour')], { minimumUsable: 3, criticalSignals: 2, criticalPillars: 2 }).level, 'insufficient', 'the minimum coverage threshold must take precedence over negative signals');


assert.equal(assessRiskSignals([riskSignal(true, 'economy'), { adverse: undefined, pillar: { key: 'labour' } }]).level, 'insufficient', 'unknown-direction rows must not count toward coverage');
const repeated = assessRiskSignals([{ ...riskSignal(true, 'economy'), adverseStreak: 2 }, riskSignal(false, 'labour')]);
assert.equal(repeated.level, 'watch', 'a repeated signal in one direction does not automatically become critical');
assert.equal(repeated.earlyWarning, true, 'two consecutive adverse intervals must activate early warning');
assert.equal(repeated.affectedPillars, 1, 'affected pillar count must be explicit');
assert.match(repeated.explanation, /негативных сигнал/, 'assessment must explain its assigned level');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2021, reference_period: 'annual', numericValue: 100 }, { reference_year: 2023, reference_period: 'annual', numericValue: 80 }], 'higher'), 0, 'a missing year must not count as a consecutive interval');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2022, reference_period: '2022-Q1', numericValue: 100 }, { reference_year: 2023, reference_period: '2023-Q1', numericValue: 90 }, { reference_year: 2024, reference_period: '2024-Q1', numericValue: 80 }], 'higher'), 2, 'same-quarter year-over-year deterioration must activate the streak');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2022, reference_period: '2022-Q1', numericValue: 100 }, { reference_year: 2024, reference_period: '2024-Q1', numericValue: 80 }], 'higher'), 0, 'a missing year must break the same-quarter warning streak');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2023, reference_period: '2023-H1', numericValue: 10 }, { reference_year: 2024, reference_period: '2024-H1', numericValue: 12 }], 'lower'), 1, 'same-half-year year-over-year deterioration must activate the streak');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2024, reference_period: '2024-01-01', numericValue: 100 }, { reference_year: 2024, reference_period: '2024-06-01', numericValue: 80 }], 'higher'), 0, 'unknown date cadence must not create an early warning');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2022, reference_period: '2022-Q1', numericValue: 100 }, { reference_year: 2023, reference_period: '2023-Q2', numericValue: 80 }], 'higher'), 0, 'different quarters across adjacent years must not be treated as comparable');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2022, reference_period: '2022-H1', numericValue: 100 }, { reference_year: 2023, reference_period: '2023-H2', numericValue: 80 }], 'higher'), 0, 'different half-years across adjacent years must not be treated as comparable');
assert.equal(countConsecutiveAdverseIntervals([{ reference_year: 2022, reference_period: 'annual', numericValue: 100 }, { reference_year: 2023, reference_period: '2023-Q1', numericValue: 80 }], 'higher'), 0, 'annual and quarterly observations must not be compared');
const noWarning = assessRiskSignals([riskSignal(false, 'economy'), riskSignal(false, 'labour')]);
assert.equal(noWarning.earlyWarning, false, 'no adverse streak must not produce an early warning');

const indexScenarios = projectScoreScenarios(60, [
  { key: 'cautious', score_growth_rate: -3, uncertainty_rate: 18 },
  { key: 'base', score_growth_rate: 1.5, uncertainty_rate: 7 },
  { key: 'ambitious', score_growth_rate: 3, uncertainty_rate: 12 },
], 3);
assert.equal(indexScenarios.length, 3, 'all three stored scenarios must produce an index trajectory');
assert.equal(indexScenarios[0].value, 60 * Math.pow(0.97, 3), 'pessimistic index path must use the stored annual score growth rate');
assert.equal(indexScenarios[0].low, 60 * Math.pow(0.79, 3), 'scenario uncertainty must define the lower sensitivity bound');
assert.equal(indexScenarios[1].horizon, 3, 'the selected 1–3 year horizon must be retained');
assert.equal(projectScoreScenarios(99, [{ score_growth_rate: 20, uncertainty_rate: 30 }], 3)[0].high, 100, 'index projections must stay within the 0–100 scale');
assert.deepEqual(projectScoreScenarios(null, [{ score_growth_rate: 2 }], 3), [], 'an unavailable base index must not produce a forecast');


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
