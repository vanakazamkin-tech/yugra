import assert from 'node:assert/strict';
import { classify } from '../src/lib/indicatorClassification.js';
import { directionForRiskIndicator } from '../src/lib/riskDirection.js';
import { assessRiskSignals, buildRiskModel, countConsecutiveAdverseIntervals, DEFAULT_RISK_THRESHOLDS, deriveMunicipalIndicators, MODEL_PILLARS, parseRiskPeriod } from '../src/lib/riskModel.js';
import { buildRiskSeries } from '../src/lib/riskSeries.js';

assert.equal(directionForRiskIndicator({ indicator_code: 'derived_investment_per_capita', indicator_name: 'Инвестиции в основной капитал без добычи на одного жителя' }), 'context', 'nominal per-capita investment must not be treated as real growth without a deflator');
assert.equal(directionForRiskIndicator({ indicator_code: 'fixed_capital_investment_growth_preliminary', indicator_name: 'Индекс физического объёма инвестиций в основной капитал' }), 'higher', 'physical-volume investment index can be evaluated directionally');
assert.equal(directionForRiskIndicator({ indicator_code: 'average_monthly_salary_annual', indicator_name: 'Среднемесячная номинальная заработная плата' }), 'context', 'nominal salary without inflation adjustment must remain contextual');
assert.equal(directionForRiskIndicator({ indicator_code: 'sme_employment_share', indicator_name: 'Доля среднесписочной численности работников МСП в численности работников всех предприятий и организаций' }), 'context', 'SME employment share is not an automatically positive diversification signal');
assert.equal(directionForRiskIndicator({ indicator_code: 'sme_per_10k', indicator_name: 'Число субъектов МСП на 10 тыс. человек населения' }), 'context', 'SME density with unverified definitions and non-monotonic resilience relationship remains contextual');
assert.equal(directionForRiskIndicator({ indicator_code: 'derived_budget_transfer_dependency', indicator_name: 'Доля безвозмездных поступлений в общих доходах бюджета' }), 'lower', 'transfer dependency remains a lower-is-better signal');
assert.equal(directionForRiskIndicator({ indicator_code: 'migration_balance', indicator_name: 'Миграционное сальдо' }), 'higher', 'positive migration balance is a higher-is-better signal');
assert.equal(directionForRiskIndicator({ indicator_code: 'network_needs_replacement_share', indicator_name: 'Доля сетей, нуждающихся в замене' }), 'lower', 'a higher share of networks needing replacement is adverse');
assert.equal(directionForRiskIndicator({ indicator_code: 'roads_in_normative_condition', indicator_name: 'Доля дорог в нормативном состоянии' }), 'higher', 'a higher share of roads in normative condition is favourable');

// Period metadata is mandatory: year alone must never be silently promoted to annual.
assert.equal(parseRiskPeriod({ reference_year: 2024, reference_period: '' }), null);
assert.equal(parseRiskPeriod({ reference_year: 2024, reference_period: '   ' }), null, 'whitespace-only periods must remain unknown');
assert.equal(parseRiskPeriod({ reference_year: 2024 }), null);
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-Q1' }), { year: 2024, frequency: 'quarter', slot: 1 });
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-H2' }), { year: 2024, frequency: 'half', slot: 2 });
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: 'annual' }), { year: 2024, frequency: 'annual', slot: 0 });
assert.equal(parseRiskPeriod({ reference_year: 2023, reference_period: '2024-Q1' }), null, 'period label and reference year conflict must be rejected');
assert.equal(parseRiskPeriod({ reference_year: 1800, reference_period: 'annual' }), null, 'out-of-range years must be rejected');
assert.equal(parseRiskPeriod({ reference_year: 1800, reference_period: '2024-Q1' }), null, 'an invalid declared year must not be replaced by a year inferred from the period label');
assert.equal(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-M13' }), null, 'unknown frequency must not be inferred as annual');
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-03' }), { year: 2024, frequency: 'month', slot: 3 }, 'month periods must remain monthly rather than becoming annual');
assert.deepEqual(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-01-01' }), { year: 2024, frequency: 'point_in_time', slot: 101 }, 'point-in-time snapshots must be identified by their exact calendar date');
assert.equal(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-02-29' })?.frequency, 'point_in_time', 'valid leap-day snapshots must be accepted');
assert.equal(parseRiskPeriod({ reference_year: 2023, reference_period: '2023-02-29' }), null, 'impossible calendar dates must be rejected');
assert.equal(parseRiskPeriod({ reference_year: 2024, reference_period: '2024-13-01' }), null, 'invalid snapshot months must be rejected');

const riskRow = (year, period, value, overrides = {}) => ({
  municipality_id: 'm-risk', indicator_code: 'employment_rate', indicator_name: 'Уровень занятости',
  reference_year: year, reference_period: period, value, unit: '%',
  verification_status: 'verified', geographic_level: 'municipality', source_id: 'test-source', ...overrides,
});

const budgetRow = (indicator_code, value) => riskRow(2024, 'annual', value, {
  indicator_code, indicator_name: indicator_code, unit: 'млн руб.',
});
for (const missing of ['', '   ', String.fromCharCode(9), null, undefined, true, false, 'not-a-number', NaN, Infinity]) {
  const derived = deriveMunicipalIndicators([
    budgetRow('budget_total_revenue', 100),
    budgetRow('budget_intergovernmental_transfers', missing),
  ]);
  assert.equal(
    derived.some((item) => item.indicator_code === 'derived_budget_transfer_dependency'),
    false,
    'blank, boolean, and malformed financial values must not be converted into zero',
  );
}
const zeroTransfer = deriveMunicipalIndicators([
  budgetRow('budget_total_revenue', 100),
  budgetRow('budget_intergovernmental_transfers', '0'),
]);
assert.equal(
  zeroTransfer.find((item) => item.indicator_code === 'derived_budget_transfer_dependency')?.value,
  0,
  'a numeric string zero is a valid observation and must remain zero',
);
const periodYearFromLabelSeries = buildRiskSeries([
  { ...riskRow(null, '2022-Q1', 70), reference_year: null },
  { ...riskRow(null, '2023-Q1', 60), reference_year: null },
]);
assert.equal(periodYearFromLabelSeries.length, 1, 'period year labels must preserve distinct observations when reference_year is absent');
assert.equal(periodYearFromLabelSeries[0].adverse, true, 'validated year labels may support same-quarter year-over-year comparison');
assert.equal(periodYearFromLabelSeries[0].confidenceLevel, 'medium', 'two comparable observations with source metadata receive medium confidence');
const identicalDuplicateSeries = buildRiskSeries([
  riskRow(2022, 'annual', 70),
  riskRow(2023, 'annual', 60),
  riskRow(2023, 'annual', 60, { source_id: 'second-source' }),
]);
assert.deepEqual(identicalDuplicateSeries[0].latest.source_ids, ['test-source', 'second-source'], 'identical duplicate observations must retain all contributing source IDs');

const sharpDrop = buildRiskSeries([
  riskRow(2023, 'annual', 100), riskRow(2024, 'annual', 80),
]);
assert.equal(sharpDrop[0].adverse, true, 'a comparable decline remains a negative signal');
assert.equal(sharpDrop[0].sharpChange, true, 'a 20% adverse change exceeds the default 10% abrupt-change threshold');
const smallDrop = buildRiskSeries([
  riskRow(2023, 'annual', 100), riskRow(2024, 'annual', 95),
]);
assert.equal(smallDrop[0].sharpChange, false, 'a 5% adverse change is not classified as abrupt by default');
const customSharpThreshold = buildRiskSeries([
  riskRow(2023, 'annual', 100), riskRow(2024, 'annual', 80),
], { ...DEFAULT_RISK_THRESHOLDS, sharpChangePercent: 25 });
assert.equal(customSharpThreshold[0].sharpChange, false, 'the abrupt-change threshold must be configurable');
assert.equal(assessRiskSignals([{ adverse: true, sharpChange: true, pillar: { key: 'economy' } }]).sharpChangeCount, 1, 'sharp changes must be counted separately from the overall risk level');

const highConfidenceSeries = buildRiskSeries([
  riskRow(2022, 'annual', 70), riskRow(2023, 'annual', 65), riskRow(2024, 'annual', 60),
]);
assert.equal(highConfidenceSeries[0].confidenceLevel, 'high', 'three continuous annual observations with source metadata receive high confidence');
const incompleteSourceHistory = buildRiskSeries([
  riskRow(2022, 'annual', 70, { source_id: null }), riskRow(2023, 'annual', 65),
]);
assert.equal(incompleteSourceHistory[0].confidenceLevel, 'low', 'confidence must not be high when an earlier observation lacks source provenance');

const missingPeriodSeries = buildRiskSeries([
  riskRow(2022, '', 70), riskRow(2023, '', 60),
]);
assert.equal(missingPeriodSeries[0].adverse, null, 'empty periods must not produce an annual comparison');
assert.equal(missingPeriodSeries[0].adverseStreak, 0, 'empty periods must break early-warning streaks');

const mixedFrequencySeries = buildRiskSeries([
  riskRow(2023, 'annual', 70), riskRow(2024, '2024-Q1', 60),
]);
assert.equal(mixedFrequencySeries.length, 2, 'annual and quarterly observations must remain separate series');
assert.ok(mixedFrequencySeries.every((item) => item.adverse === null), 'annual and quarterly observations must not create a cross-frequency signal');

const gapSeries = buildRiskSeries([
  riskRow(2022, 'annual', 70), riskRow(2024, 'annual', 60),
]);
assert.equal(gapSeries[0].change, null, 'non-consecutive annual observations must not be compared');
assert.equal(gapSeries[0].adverse, null, 'a missing year must not create a current adverse signal');

const conflictingSeries = buildRiskSeries([
  riskRow(2022, 'annual', 70), riskRow(2023, 'annual', 65),
  riskRow(2024, 'annual', 60), riskRow(2024, 'annual', 80, { source_id: 'conflicting_source' }),
]);
assert.equal(conflictingSeries[0].excludedConflictingPeriods, 1, 'conflicting duplicates must be excluded and counted');
assert.equal(conflictingSeries[0].confidenceLevel, 'low', 'a conflicting period must lower the series confidence');
assert.equal(conflictingSeries[0].latest.reference_year, 2023, 'conflicting period must not be selected as latest');
assert.equal(conflictingSeries[0].conflictAfterLatest, true, 'a newer conflicting period must be identified as a data-quality block');
assert.equal(conflictingSeries[0].adverse, null, 'a newer conflicting period must suppress stale adverse signals as current');

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
assert.equal(classify({ indicator_code: 'average_monthly_salary_annual', indicator_name: 'Среднемесячная заработная плата работников организаций без субъектов малого предпринимательства, всего по обследуемым видам экономической деятельности' }).key, 'income', 'SME exclusion wording must not reclassify wages as business activity');
assert.equal(classify({ indicator_code: 'average_employees_annual', indicator_name: 'Среднесписочная численность работников организаций без субъектов малого предпринимательства, всего по обследуемым видам экономической деятельности' }).key, 'employment', 'employee count excluding SMEs remains a labour indicator');
assert.equal(classify({ indicator_code: 'fixed_capital_investment_enterprises_non_sme', indicator_name: 'Инвестиции в основной капитал организаций без субъектов малого предпринимательства' }).key, 'investment', 'non-SME investment remains in the investment pillar');
assert.equal(classify({ indicator_code: 'own_production_shipments_q1', indicator_name: 'Отгружено товаров собственного производства, без субъектов малого предпринимательства' }).key, 'production', 'non-SME production and shipments remain in production');
assert.equal(classify({ indicator_code: 'sme_per_10k', indicator_name: 'Число субъектов малого и среднего предпринимательства на 10 тыс. человек' }).key, 'business', 'SME density remains a business-count indicator');
assert.equal(classify({ indicator_code: 'sme_employment_share', indicator_name: 'Доля среднесписочной численности работников малых и средних предприятий' }).key, 'employment', 'SME employment share remains a labour indicator');

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
assert.equal(Object.hasOwn(m1, 'score'), false, 'risk diagnostics must not calculate an integrated index score');
assert.equal(m1.pillars.find((pillar) => pillar.key === 'social').indicators, 2, 'health and education series must map into the social model pillar');
assert.equal(m1.availablePillars, 3, 'risk diagnostics count covered directions without applying index weights');
const chain = m1.chains.find((item) => item.id === 'investment-employment');
assert.ok(chain?.active, 'adverse investment and employment signals should activate their risk chain');
const singleMunicipalityDiagnostics = buildRiskModel([municipalities[0]], series.filter((item) => item.municipalityId === municipalities[0].id)).byMunicipality.m1;
assert.ok(singleMunicipalityDiagnostics.adverseCount > 0, 'risk detection must not depend on a minimum peer group of municipalities');

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

const unknownDirectionSeries = series.map((item) => ({ ...item, direction: undefined }));
assert.equal(buildRiskModel(municipalities, unknownDirectionSeries).byMunicipality.m1.usableIndicators, 0, 'unknown directions must not be counted as assessable risk indicators');
const insufficient = buildRiskModel(municipalities, series.filter((item) => item.pillar.key === 'investment'));
assert.equal(insufficient.byMunicipality.m1.availablePillars, 1, 'one observed direction remains one risk-coverage direction');
assert.equal(Object.hasOwn(MODEL_PILLARS.find((pillar) => pillar.key === 'social'), 'weight'), false, 'risk directions must not carry or reapply index weights');
const riskSignal = (adverse, pillar) => ({ adverse, pillar: { key: pillar } });
assert.deepEqual(DEFAULT_RISK_THRESHOLDS, { minimumUsable: 2, criticalSignals: 3, criticalPillars: 2, sharpChangePercent: 10 }, 'default deterioration thresholds remain unchanged; green coverage is a fixed six-pillar requirement');
assert.equal(assessRiskSignals([riskSignal(false, 'economy')]).level, 'insufficient', 'one usable signal is insufficient under the default threshold');
const completeCoverageSignals = MODEL_PILLARS.map((pillar) => riskSignal(false, pillar.key));
assert.equal(assessRiskSignals(completeCoverageSignals).level, 'stable', 'green requires comparable directional evidence in all six risk pillars');
assert.equal(assessRiskSignals([riskSignal(false, 'economy'), riskSignal(false, 'labour')]).level, 'insufficient', 'two healthy signals from only two pillars cannot imply system-wide stability');
assert.equal(assessRiskSignals([riskSignal(false, 'economy'), riskSignal(false, 'economy')]).level, 'insufficient', 'multiple healthy indicators in one pillar cannot replace missing risk directions');
assert.equal(assessRiskSignals(completeCoverageSignals.slice(0, 5)).level, 'insufficient', 'missing even one of the six risk pillars prevents a green status');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(false, 'labour')]).level, 'watch', 'one negative signal is yellow');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'labour'), riskSignal(true, 'finance')]).level, 'critical', 'three negative signals across two or more pillars are red by default');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'economy'), riskSignal(true, 'economy')]).level, 'watch', 'multiple signals in one pillar do not satisfy the default cross-pillar red threshold');
assert.equal(assessRiskSignals([riskSignal(true, 'health'), riskSignal(true, 'education'), riskSignal(true, 'social'), riskSignal(false, 'finance')]).level, 'watch', 'health, education and social subcategories count as one social direction, not three');
const complementaryBudgetSignals = assessRiskSignals([
  { code: 'derived_budget_own_revenue_share', signalFamily: 'budget_revenue_structure', adverse: true, pillar: { key: 'budget' } },
  { code: 'derived_budget_transfer_dependency', signalFamily: 'budget_revenue_structure', adverse: true, pillar: { key: 'budget' } },
  { code: 'employment_rate', adverse: true, pillar: { key: 'employment' } },
]);
assert.equal(complementaryBudgetSignals.usableCount, 2, 'complementary own-revenue and transfer shares count as one independent signal family');
assert.equal(complementaryBudgetSignals.level, 'watch', 'a complementary budget pair plus one labour signal must not falsely satisfy the three-signal critical threshold');
const sharpBudgetFamily = assessRiskSignals([
  { code: 'derived_budget_own_revenue_share', signalFamily: 'budget_revenue_structure', adverse: true, sharpChange: true, pillar: { key: 'budget' } },
  { code: 'derived_budget_transfer_dependency', signalFamily: 'budget_revenue_structure', adverse: true, sharpChange: false, pillar: { key: 'budget' } },
  { code: 'employment_rate', adverse: false, pillar: { key: 'employment' } },
]);
assert.equal(sharpBudgetFamily.sharpChangeCount, 1, 'sharp-change evidence from any member must be retained after family deduplication');
const conflictingBudgetSignals = assessRiskSignals([
  { code: 'derived_budget_own_revenue_share', signalFamily: 'budget_revenue_structure', adverse: true, pillar: { key: 'budget' } },
  { code: 'derived_budget_transfer_dependency', signalFamily: 'budget_revenue_structure', adverse: false, pillar: { key: 'budget' } },
  { code: 'employment_rate', adverse: false, pillar: { key: 'employment' } },
]);
assert.equal(conflictingBudgetSignals.level, 'insufficient', 'contradictory signals from one dependent family must be quarantined');
assert.deepEqual(conflictingBudgetSignals.conflictingSignalFamilies, ['budget_revenue_structure']);

assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'labour')], { minimumUsable: 2, criticalSignals: 2, criticalPillars: 2 }).level, 'critical', 'observed negative signals may raise critical status despite incomplete coverage');
assert.equal(assessRiskSignals([riskSignal(true, 'economy'), riskSignal(true, 'labour')], { minimumUsable: 3, criticalSignals: 2, criticalPillars: 2 }).level, 'insufficient', 'the minimum coverage threshold must take precedence over negative signals');


assert.equal(assessRiskSignals([riskSignal(true, 'economy'), { adverse: undefined, pillar: { key: 'labour' } }]).level, 'insufficient', 'unknown-direction rows must not count toward coverage');
const repeated = assessRiskSignals([{ ...riskSignal(true, 'economy'), adverseStreak: 2 }, riskSignal(false, 'labour')]);
assert.equal(repeated.level, 'watch', 'a repeated signal in one direction does not automatically become critical');
assert.equal(repeated.earlyWarning, true, 'two consecutive adverse intervals must activate early warning');
assert.equal(repeated.affectedPillars, 1, 'affected pillar count must be explicit');
assert.equal(repeated.availablePillars, 2, 'available directional coverage must be explicit');
assert.ok(repeated.missingPillars.length >= 4, 'missing risk directions must be returned for explanation');
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
const conflictingDerivedRows = deriveMunicipalIndicators([
  sourceRow('budget_total_revenue', 100, '2024-Q3'),
  sourceRow('budget_total_revenue', 120, '2024-Q3', 'тыс. руб.', { source_id: 'conflicting_total' }),
  sourceRow('budget_revenue_excluding_grants', 40, '2024-Q3'),
]);
assert.equal(conflictingDerivedRows.some((row) => row.indicator_code === 'derived_budget_own_revenue_share'), false, 'conflicting source values must not be used to derive a budget ratio');

const unitConflictRows = deriveMunicipalIndicators([
  sourceRow('budget_total_revenue', 100, '2024-Q3', 'тыс. руб.'),
  sourceRow('budget_total_revenue', 100, '2024-Q3', 'руб.'),
  sourceRow('budget_revenue_excluding_grants', 40, '2024-Q3', 'тыс. руб.'),
]);
assert.equal(unitConflictRows.some((row) => row.indicator_code === 'derived_budget_own_revenue_share'), false, 'same numeric values in conflicting units must not be treated as duplicates');

const duplicateSourceRows = deriveMunicipalIndicators([
  sourceRow('budget_total_revenue', 100, '2024-Q3', 'тыс. руб.', { source_id: 'budget-source-a' }),
  sourceRow('budget_total_revenue', 100, '2024-Q3', 'тыс. руб.', { source_id: 'budget-source-b' }),
  sourceRow('budget_revenue_excluding_grants', 40, '2024-Q3', 'тыс. руб.', { source_id: 'own-source' }),
]);
const duplicateDerivedShare = duplicateSourceRows.find((row) => row.indicator_code === 'derived_budget_own_revenue_share');
assert.deepEqual(duplicateDerivedShare.source_ids, ['budget-source-a', 'budget-source-b', 'own-source'], 'derived rows must retain all identical source observations');

const derivedRows = deriveMunicipalIndicators([
  sourceRow('budget_total_revenue', 100, '2024-Q2'),
  sourceRow('budget_revenue_excluding_grants', 40, '2024-Q2'),
  sourceRow('budget_total_expenditure', 80, '2024-Q2'),
  sourceRow('budget_total_revenue', 200, '2024-Q3', 'тыс. руб.', { source_id: 'budget_main', source_url: 'https://example.com/budget-main.pdf' }),
  sourceRow('budget_revenue_excluding_grants', 60, '2024-Q3'),
  sourceRow('budget_intergovernmental_transfers', 50, '2024-Q3', 'тыс. руб.', { source_id: 'budget_appendix', source_url: 'https://example.com/budget-appendix.pdf' }),
  sourceRow('budget_total_expenditure', 180, '2024-Q3'),
  sourceRow('fixed_capital_investment_non_mining', 1000, 'annual', 'руб.', { source_id: 'investment_source', source_url: 'https://example.com/investment.pdf' }),
  sourceRow('population_municipality', 9, '2022-01-01', 'человек', { reference_year: 2022, source_id: 'population_source_2022', source_url: 'https://example.com/population-2022.xlsx' }),
  sourceRow('population_municipality', 9.5, '2023-01-01', 'человек', { reference_year: 2023, source_id: 'population_source_2023', source_url: 'https://example.com/population-2023.xlsx' }),
  sourceRow('population_municipality', 10, '2024-01-01', 'человек', { source_id: 'population_source_2024', source_url: 'https://example.com/population-2024.xlsx' }),
  sourceRow('population_municipality', 10.2, '2025-01-01', 'человек', { reference_year: 2025, source_id: 'population_source_2025', source_url: 'https://example.com/population-2025.xlsx' }),
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
const annualPopulationGrowth = derivedRows
  .filter((row) => row.indicator_code === 'derived_population_growth_rate')
  .sort((a, b) => a.reference_year - b.reference_year);
assert.deepEqual(
  annualPopulationGrowth.map((row) => [row.reference_year, Number(row.value.toFixed(4))]),
  [[2023, 5.5556], [2024, 5.2632], [2025, 2]],
  'population change must be derived as separate year-over-year observations from consecutive 1 January snapshots',
);
assert.ok(annualPopulationGrowth.every((row) => row.reference_period === 'annual'), 'each annual growth observation must have an explicit annual period');
assert.deepEqual(annualPopulationGrowth[1].source_ids, ['population_source_2023', 'population_source_2024'], 'each growth point must preserve both source observations');
const populationRisk = buildRiskSeries(annualPopulationGrowth.map((row) => ({
  ...row,
  municipality_id: 'm-pop',
  source_id: row.source_ids[0],
  source_url: row.source_urls[0],
})));
assert.equal(populationRisk.length, 1, 'the derived population growth series must be eligible for risk monitoring');
assert.equal(populationRisk[0].direction, 'higher');
assert.equal(populationRisk[0].adverse, true, 'a falling year-over-year population growth rate is an adverse signal');
assert.equal(populationRisk[0].adverseStreak, 2, 'two consecutive annual deteriorations must be detected');
const populationGap = deriveMunicipalIndicators([
  sourceRow('population_municipality', 9, '2022-01-01', 'человек', { reference_year: 2022 }),
  sourceRow('population_municipality', 10, '2024-01-01', 'человек', { reference_year: 2024 }),
]);
assert.equal(populationGap.some((row) => row.indicator_code === 'derived_population_growth_rate'), false, 'missing calendar years must not be bridged or annualized');
assert.equal(derivedRows.some((row) => row.municipality_id === 'm2' && row.indicator_code === 'derived_budget_own_revenue_share'), false, 'ratios with incompatible units must not be calculated');
assert.equal(derivedRows.some((row) => row.value === 999), false, 'unverified and settlement-level rows must not enter derived municipal indicators');
const transferDerived = derivedRows.find((row) => row.indicator_code === 'derived_budget_transfer_dependency');
assert.deepEqual(transferDerived.source_ids, ['budget_main', 'budget_appendix'], 'derived indicators must retain every contributing source ID');
assert.deepEqual(transferDerived.source_urls, ['https://example.com/budget-main.pdf', 'https://example.com/budget-appendix.pdf'], 'derived indicators must retain every contributing source URL');
assert.equal(transferDerived.source_url, null, 'legacy single-source URL must be empty when provenance has multiple sources');
assert.ok(transferDerived.notes.includes('budget_main, budget_appendix'), 'derivation notes must expose contributing source IDs');
const investmentDerived = derivedRows.find((row) => row.indicator_code === 'derived_investment_per_capita');
assert.deepEqual(investmentDerived.source_ids, ['investment_source', 'population_source_2024'], 'per-capita investment must cite the exact same-year population snapshot');
assert.equal(investmentDerived.source_url, null, 'per-capita investment must not imply that one source supports both inputs');





const definitionVariantRows = [
  riskRow(2022, 'annual', 100, { indicator_name: 'Employment rate — source definition A' }),
  riskRow(2023, 'annual', 90, { indicator_name: 'Employment rate — source definition A' }),
  riskRow(2022, 'annual', 50, { indicator_name: 'Employment rate — source definition B', source_id: 'source-b' }),
  riskRow(2023, 'annual', 60, { indicator_name: 'Employment rate — source definition B', source_id: 'source-b' }),
];
const separateDefinitionSeries = buildRiskSeries(definitionVariantRows);
assert.equal(separateDefinitionSeries.length, 2, 'different source indicator definitions must not be merged into one time series');
assert.deepEqual(
  separateDefinitionSeries.map((item) => item.points.length),
  [2, 2],
  'each exact definition must retain its own chronological history',
);
assert.equal(new Set(separateDefinitionSeries.map((item) => item.name)).size, 2, 'the two indicator names must remain visible');
assert.ok(separateDefinitionSeries.every((item) => item.signalFamily === 'employment_rate'), 'same-code variants remain one risk family to prevent double counting');
const contradictoryDefinitions = assessRiskSignals(separateDefinitionSeries);
assert.equal(contradictoryDefinitions.level, 'insufficient', 'contradictory definitions of one code must not produce a positive or negative aggregate risk');
assert.ok(contradictoryDefinitions.conflictingSignalFamilies.includes('employment_rate'), 'the conflicting source-definition family must be reported');
assert.equal(contradictoryDefinitions.usableCount, 0, 'conflicting definition variants must be excluded rather than averaged or selected');

console.log('Indicator classification and resilience model pillar tests passed.');
