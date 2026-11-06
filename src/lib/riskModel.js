// Explainable municipal resilience and early-warning model.
// Scores are comparative pilot indicators, never probabilities of crisis.
export const MODEL_PILLARS = [
  { key: 'economy', title: 'Экономика и инвестиции', weight: 0.20, series: ['investment', 'business', 'production'] },
  { key: 'labour', title: 'Рынок труда и доходы', weight: 0.20, series: ['employment', 'income'] },
  { key: 'demography', title: 'Демография и миграция', weight: 0.15, series: ['migration', 'demography'] },
  { key: 'finance', title: 'Муниципальные финансы', weight: 0.15, series: ['budget'] },
  { key: 'social', title: 'Социальная сфера', weight: 0.15, series: ['social', 'health', 'education'] },
  { key: 'infrastructure', title: 'Инфраструктура и среда', weight: 0.15, series: ['infrastructure'] },
];

export const RISK_CHAINS = [
  { id: 'investment-employment', title: 'Инвестиционное замедление', stages: ['investment', 'business', 'employment', 'income'], description: 'Снижение инвестиционной и деловой активности может сопровождаться ослаблением спроса на труд и доходов.', watch: ['investment', 'business', 'employment', 'income'] },
  { id: 'migration-demography', title: 'Демографическое ослабление', stages: ['migration', 'demography', 'employment', 'social'], description: 'Миграционный отток и сокращение трудовых ресурсов могут усиливать кадровые и социальные ограничения.', watch: ['migration', 'demography', 'employment', 'social'] },
  { id: 'budget-services', title: 'Бюджетное давление', stages: ['budget', 'infrastructure', 'social'], description: 'Ограничение бюджетных возможностей способно затруднять поддержание инфраструктуры и доступность услуг.', watch: ['budget', 'infrastructure', 'social'] },
  { id: 'concentration-shock', title: 'Отраслевая концентрация', stages: ['investment', 'production', 'employment', 'budget'], description: 'Зависимость от узкого круга отраслей или работодателей повышает чувствительность территории к внешним шокам.', watch: ['investment', 'production', 'employment', 'budget'] },
];

const MODEL_PILLAR_BY_SERIES = Object.fromEntries(MODEL_PILLARS.flatMap((p) => p.series.map((key) => [key, p.key])));
const RISK_WATCH_SERIES = { social: ['social', 'health', 'education'] };
const finite = (v) => Number.isFinite(Number(v)) && v !== null && v !== '';
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

// Count adverse changes only across genuinely consecutive comparable periods.
// Unknown/custom period frequencies are excluded from early-warning streaks.
function comparablePeriodSequence(point) {
  const period = String(point?.reference_period ?? '').trim();
  const year = Number(point?.reference_year) || Number(period.match(/^(\d{4})/)?.[1]);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;

  const quarter = period.match(/(?:^|[-_\s])Q([1-4])$/i);
  if (quarter) return { year, frequency: 'quarter', slot: Number(quarter[1]) };

  const half = period.match(/(?:^|[-_\s])H([12])$/i);
  if (half) return { year, frequency: 'half', slot: Number(half[1]) };

  if (!period || /^(?:annual|year|год|годовой|\d{4})$/i.test(period)) {
    return { year, frequency: 'annual', slot: 0 };
  }
  return null;
}

export function countConsecutiveAdverseIntervals(points = [], direction = 'context') {
  if (!Array.isArray(points) || points.length < 2 || !['higher', 'lower'].includes(direction)) return 0;
  let streak = 0;
  for (let index = points.length - 1; index > 0; index -= 1) {
    const current = points[index], previous = points[index - 1];
    const currentPeriod = comparablePeriodSequence(current), previousPeriod = comparablePeriodSequence(previous);
    const comparable = currentPeriod && previousPeriod
      && currentPeriod.frequency === previousPeriod.frequency
      && currentPeriod.slot === previousPeriod.slot
      && currentPeriod.year - previousPeriod.year === 1;
    if (!comparable) break;
    const currentValue = Number(current?.numericValue), previousValue = Number(previous?.numericValue);
    if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) break;
    const adverse = direction === 'lower' ? currentValue > previousValue : currentValue < previousValue;
    if (!adverse) break;
    streak += 1;
  }
  return streak;
}

export const DEFAULT_RISK_THRESHOLDS = Object.freeze({
  minimumUsable: 2,
  criticalSignals: 3,
  criticalPillars: 2,
});

export function assessRiskSignals(signals = [], thresholds = DEFAULT_RISK_THRESHOLDS) {
  const normalize = (value, fallback, min, max) => Number.isFinite(Number(value))
    ? clamp(Math.trunc(Number(value)), min, max)
    : fallback;
  const settings = {
    minimumUsable: normalize(thresholds?.minimumUsable, DEFAULT_RISK_THRESHOLDS.minimumUsable, 1, 10),
    criticalSignals: normalize(thresholds?.criticalSignals, DEFAULT_RISK_THRESHOLDS.criticalSignals, 1, 20),
    criticalPillars: normalize(thresholds?.criticalPillars, DEFAULT_RISK_THRESHOLDS.criticalPillars, 1, 6),
  };
  // Only explicit true/false values are assessable. Missing/unknown directions
  // must never be counted as healthy observations.
  const usable = (Array.isArray(signals) ? signals : []).filter(
    (signal) => signal && (signal.adverse === true || signal.adverse === false)
  );
  const bad = usable.filter((signal) => signal.adverse === true);
  const affectedPillars = new Set(bad.map((signal) => signal.pillar?.key).filter(Boolean));
  const pillarCounts = Object.fromEntries([...affectedPillars].map((key) => [
    key, bad.filter((signal) => signal.pillar?.key === key).length,
  ]));
  const repeatedDeterioration = bad.filter((signal) => Number(signal.adverseStreak) >= 2);
  const common = {
    usable, bad, thresholds: settings,
    usableCount: usable.length,
    adverseCount: bad.length,
    affectedPillars: affectedPillars.size,
    pillarCounts,
    repeatedDeterioration,
    earlyWarning: repeatedDeterioration.length > 0,
  };
  if (usable.length < settings.minimumUsable) {
    return {
      ...common, level: 'insufficient',
      explanation: `Недостаточно данных: оцениваемых рядов ${usable.length}, требуется не менее ${settings.minimumUsable}. Неопределённые и контекстные показатели не учитываются как положительные.`,
      reasons: ['Недостаточное покрытие показателями с однозначным направлением'],
    };
  }
  if (bad.length >= settings.criticalSignals && affectedPillars.size >= settings.criticalPillars) {
    return {
      ...common, level: 'critical',
      explanation: `Зафиксировано ${bad.length} негативных сигналов в ${affectedPillars} направлениях; достигнуты оба настраиваемых порога повышенного внимания.`,
      reasons: [`Негативных сигналов: ${bad.length} из требуемых ${settings.criticalSignals}`, `Затронуто направлений: ${affectedPillars.size} из требуемых ${settings.criticalPillars}`],
    };
  }
  if (bad.length > 0) {
    return {
      ...common, level: 'watch',
      explanation: `Есть ${bad.length} негативных сигнал(а/ов) в ${affectedPillars} направлениях, но критерий одновременного межотраслевого ухудшения не достигнут.`,
      reasons: [`Негативных сигналов: ${bad.length}`, `Затронуто направлений: ${affectedPillars.size}`],
    };
  }
  return {
    ...common, level: 'stable',
    explanation: `Среди ${usable.length} оцениваемых рядов негативных изменений не выявлено. Это не подтверждает отсутствие рисков в направлениях без данных или с контекстными показателями.`,
    reasons: ['Негативных сигналов среди оцениваемых рядов нет'],
  };
}

function percentile(value, values, higherIsBetter) {
  const sorted = values.filter(finite).map(Number).sort((a, b) => a - b);
  if (sorted.length < 3) return null;
  const below = sorted.filter((v) => v < Number(value)).length;
  const equal = sorted.filter((v) => v === Number(value)).length;
  const rank = (below + Math.max(0, equal - 1) / 2) / Math.max(1, sorted.length - 1) * 100;
  return higherIsBetter ? rank : 100 - rank;
}

export function buildRiskModel(municipalities = [], series = []) {
  const comparable = new Map();
  for (const item of series) {
    if (!item || item.direction === 'context' || !finite(item.latest?.numericValue)) continue;
    const pillarKey = MODEL_PILLAR_BY_SERIES[item.pillar?.key];
    if (!pillarKey) continue;
    const year = Number(item.latest.reference_year) || 0;
    const key = [item.code, item.unit, item.latest.reference_period || '', year].join('|');
    if (!comparable.has(key)) comparable.set(key, []);
    comparable.get(key).push(item);
  }

  const scored = new Map();
  for (const group of comparable.values()) {
    if (new Set(group.map((x) => x.municipalityId)).size < 3) continue;
    const values = group.map((x) => x.latest.numericValue);
    for (const item of group) {
      const score = percentile(item.latest.numericValue, values, item.direction === 'higher');
      if (score === null) continue;
      const trend = item.adverse === null ? 50 : item.adverse ? 20 : 80;
      const indicatorScore = score * 0.8 + trend * 0.2;
      const municipalityKey = String(item.municipalityId);
      if (!scored.has(municipalityKey)) scored.set(municipalityKey, []);
      scored.get(municipalityKey).push({ ...item, peerScore: score, indicatorScore, modelPillar: MODEL_PILLAR_BY_SERIES[item.pillar.key] });
    }
  }

  const byMunicipality = {};
  for (const municipality of municipalities) {
    const own = scored.get(String(municipality.id)) || [];
    const pillars = MODEL_PILLARS.map((pillar) => {
      const items = own.filter((item) => item.modelPillar === pillar.key);
      return {
        ...pillar,
        score: items.length ? items.reduce((sum, item) => sum + item.indicatorScore, 0) / items.length : null,
        indicators: items.length,
        adverse: items.filter((item) => item.adverse === true).length,
        series: items,
      };
    });
    const available = pillars.filter((p) => p.score !== null);
    const availableWeight = available.reduce((sum, p) => sum + p.weight, 0);
    // A pilot score is useful with two independently covered dimensions and >=35% of base weights.
    // The UI must always show coverage so a partial score cannot be mistaken for a complete assessment.
    const resilience = available.length >= 2 && availableWeight >= 0.35
      ? available.reduce((sum, p) => sum + p.score * p.weight, 0) / availableWeight
      : null;
    const coverage = availableWeight * 100;
    const historyDepth = own.length ? own.reduce((sum, item) => sum + Math.min(1, item.points.length / 4), 0) / own.length : 0;
    const confidence = resilience === null ? 0 : clamp(coverage * (0.65 + historyDepth * 0.35));
    const adverse = own.filter((item) => item.adverse === true);
    const affectedPillars = new Set(adverse.map((item) => item.modelPillar));
    const deteriorationShare = own.length ? adverse.length / own.length : 0;
    const priority = own.length >= 2
      ? clamp(deteriorationShare * 70 + Math.max(0, affectedPillars.size - 1) * 10)
      : null;
    const chains = RISK_CHAINS.map((chain) => {
      const hits = chain.watch.filter((key) => {
        const seriesKeys = RISK_WATCH_SERIES[key] || [key];
        return own.some((item) => seriesKeys.includes(item.pillar.key) && item.adverse === true);
      });
      return { ...chain, hits, matched: hits.length, active: hits.length >= 2 };
    }).filter((chain) => chain.matched > 0).sort((a, b) => b.matched - a.matched);
    byMunicipality[municipality.id] = {
      municipalityId: municipality.id,
      score: resilience === null ? null : Math.round(resilience * 10) / 10,
      confidence: Math.round(confidence),
      assessmentStatus: resilience === null ? 'insufficient' : available.length < 4 || coverage < 70 ? 'partial' : 'expanded',
      availablePillars: available.length,
      availableWeight: Math.round(availableWeight * 100),
      pillars,
      adverseCount: adverse.length,
      affectedPillars: affectedPillars.size,
      priority: priority === null ? null : Math.round(priority),
      chains,
      scoredIndicators: own.length,
    };
  }
  return { byMunicipality, pillars: MODEL_PILLARS, chains: RISK_CHAINS };
}


const rowKey = (row) => [
  String(row.municipality_id),
  String(row.reference_year),
  String(row.reference_period || ''),
].join('|');

const sameUnit = (left, right) => {
  const leftUnit = String(left?.unit ?? '').trim();
  const rightUnit = String(right?.unit ?? '').trim();
  return Boolean(leftUnit) && leftUnit === rightUnit;
};

export function deriveMunicipalIndicators(rows = []) {
  const verified = (Array.isArray(rows) ? rows : []).filter((row) =>
    row && row.verification_status === 'verified'
    && row.geographic_level === 'municipality'
    && finite(row.value)
    && row.municipality_id != null
    && Number.isInteger(Number(row.reference_year))
  );
  const grouped = new Map();
  const populationByMunicipalityYear = new Map();
  for (const row of verified) {
    const key = rowKey(row);
    if (!grouped.has(key)) grouped.set(key, {});
    grouped.get(key)[row.indicator_code] = row;
    if (row.indicator_code === 'population_municipality') {
      const populationKey = String(row.municipality_id) + '|' + String(row.reference_year);
      if (!populationByMunicipalityYear.has(populationKey)) populationByMunicipalityYear.set(populationKey, []);
      populationByMunicipalityYear.get(populationKey).push(row);
    }
  }

  const derived = [];
  const push = (base, code, name, value, unit, directionNote, provenanceRows = [base], referencePeriod = base?.reference_period || null) => {
    if (!base || !Number.isFinite(value)) return;
    const inputs = (Array.isArray(provenanceRows) ? provenanceRows : [base]).filter(Boolean);
    const sourceIds = [...new Set(inputs.map((row) => String(row.source_id || '').trim()).filter(Boolean))];
    const sourceUrls = [...new Set(inputs.map((row) => String(row.source_url || '').trim()).filter(Boolean))];
    const retrievedAt = inputs.map((row) => row.retrieved_at).filter(Boolean).sort((a, b) => new Date(b) - new Date(a))[0] || base.retrieved_at || null;
    const sourceNote = sourceIds.length ? ' Источники исходных наблюдений: ' + sourceIds.join(', ') + '.' : '';
    derived.push({
      municipality_id: base.municipality_id,
      indicator_code: code,
      indicator_name: name,
      reference_year: Number(base.reference_year),
      reference_period: referencePeriod,
      value,
      unit,
      source_id: 'derived_from_verified_municipal_indicators',
      source_ids: sourceIds,
      source_urls: sourceUrls,
      // Keep the legacy single-link field only when it is unambiguous.
      source_url: sourceUrls.length === 1 ? sourceUrls[0] : null,
      retrieved_at: retrievedAt,
      verification_status: 'verified',
      geographic_level: 'municipality',
      geographic_name: base.geographic_name || null,
      notes: 'Расчётный показатель, получен из подтверждённых исходных муниципальных наблюдений.' + sourceNote + ' ' + directionNote,
    });
  };

  for (const bucket of grouped.values()) {
    const totalRow = bucket.budget_total_revenue;
    const nonGrantRow = bucket.budget_revenue_excluding_grants;
    const transfersRow = bucket.budget_intergovernmental_transfers;
    const expenditureRow = bucket.budget_total_expenditure;
    const total = Number(totalRow?.value);
    const nonGrant = Number(nonGrantRow?.value);
    const transfers = Number(transfersRow?.value);
    const expenditure = Number(expenditureRow?.value);
    const hasPeriod = Boolean(String(totalRow?.reference_period || '').trim());

    // Ratios are calculated only from the same municipality, year, period and unit.
    // A quarterly observation must never be relabelled as annual.
    if (hasPeriod && totalRow && total > 0 && nonGrantRow && sameUnit(totalRow, nonGrantRow) && finite(nonGrant)) {
      push(totalRow, 'derived_budget_own_revenue_share', 'Доля доходов без безвозмездных поступлений в общих доходах бюджета', nonGrant / total * 100, '%', 'Чем выше доля, тем меньше формальная зависимость доходов от безвозмездных поступлений; это не полная оценка бюджетной устойчивости.', [totalRow, nonGrantRow]);
    }
    if (hasPeriod && totalRow && total > 0 && transfersRow && sameUnit(totalRow, transfersRow) && finite(transfers)) {
      push(totalRow, 'derived_budget_transfer_dependency', 'Доля безвозмездных поступлений в общих доходах бюджета', transfers / total * 100, '%', 'Рост доли рассматривается как сигнал зависимости от межбюджетных трансфертов.', [totalRow, transfersRow]);
    }
    if (hasPeriod && totalRow && total > 0 && expenditureRow && sameUnit(totalRow, expenditureRow) && finite(expenditure) && expenditure > 0) {
      push(totalRow, 'derived_budget_balance_ratio', 'Отношение доходов к расходам бюджета', (total - expenditure) / expenditure * 100, '%', 'Положительное значение означает превышение доходов над расходами в пределах данного отчётного периода; требуется сверка методики исполнения бюджета.', [totalRow, expenditureRow]);
    }

    const investment = bucket.fixed_capital_investment_non_mining;
    if (investment) {
      const populationKey = String(investment.municipality_id) + '|' + String(investment.reference_year);
      const populationRows = populationByMunicipalityYear.get(populationKey) || [];
      // A single population snapshot for the same calendar year is required.
      if (populationRows.length === 1 && Number(populationRows[0].value) > 0) {
        push(investment, 'derived_investment_per_capita', 'Инвестиции в основной капитал без добычи на одного жителя', Number(investment.value) / Number(populationRows[0].value), 'руб./чел.', 'Номинальная интенсивность инвестиций; не является реальным темпом роста и не скорректирована на инфляцию.', [investment, populationRows[0]], investment.reference_period || null);
      }
    }
  }

  const populationByMunicipality = new Map();
  for (const history of populationByMunicipalityYear.values()) {
    if (history.length !== 1) continue;
    const row = history[0];
    const municipalityId = String(row.municipality_id);
    if (!populationByMunicipality.has(municipalityId)) populationByMunicipality.set(municipalityId, []);
    populationByMunicipality.get(municipalityId).push(row);
  }
  for (const history of populationByMunicipality.values()) {
    const points = history.sort((a, b) => Number(a.reference_year) - Number(b.reference_year));
    const first = points[0], last = points[points.length - 1];
    if (points.length < 2 || Number(first.value) <= 0) continue;
    const span = Number(last.reference_year) - Number(first.reference_year);
    if (span <= 0) continue;
    const annualized = (Math.pow(Number(last.value) / Number(first.value), 1 / span) - 1) * 100;
    push(last, 'derived_population_growth_rate', 'Среднегодовое изменение численности населения за доступный период', annualized, '% в год', 'Расчёт по крайним доступным годам; не заменяет полный демографический баланс рождаемости, смертности и миграции.', history, 'annual');
  }
  return derived;
}


export function projectScoreScenarios(baseScore, scenarios = [], horizon = 1) {
  if (!finite(baseScore)) return [];
  const years = clamp(Math.trunc(Number(horizon) || 1), 1, 3);
  const base = clamp(Number(baseScore));
  return (Array.isArray(scenarios) ? scenarios : []).map((scenario) => {
    const rateValue = Number(scenario?.score_growth_rate ?? 0);
    const uncertaintyValue = Number(scenario?.uncertainty_rate ?? 0);
    const rate = Number.isFinite(rateValue) ? rateValue : 0;
    const uncertainty = Number.isFinite(uncertaintyValue) ? Math.max(0, uncertaintyValue) : 0;
    const project = (annualRate) => clamp(base * Math.pow(Math.max(0.01, 1 + annualRate / 100), years));
    return {
      ...scenario,
      rate,
      uncertainty,
      horizon: years,
      value: project(rate),
      low: project(rate - uncertainty),
      high: project(rate + uncertainty),
    };
  });
}

export function backtestAnnualSeries(series) {
  const points = Array.isArray(series?.points) ? series.points : [];
  const tests = [];
  for (let index = 2; index < points.length; index += 1) {
    const training = points.slice(0, index);
    const rates = [];
    for (let i = 1; i < training.length; i += 1) {
      const previous = Number(training[i - 1].numericValue);
      const current = Number(training[i].numericValue);
      const gap = Number(training[i].reference_year) - Number(training[i - 1].reference_year);
      if (previous > 0 && current > 0 && gap > 0) rates.push(Math.pow(current / previous, 1 / gap) - 1);
    }
    if (!rates.length) continue;
    const rate = rates.reduce((sum, value) => sum + value, 0) / rates.length;
    const last = training[training.length - 1];
    const actual = Number(points[index].numericValue);
    const gap = Number(points[index].reference_year) - Number(last.reference_year);
    if (!(actual > 0) || !(gap > 0)) continue;
    const predicted = Number(last.numericValue) * Math.pow(1 + rate, gap);
    tests.push({ year: points[index].reference_year, predicted, actual, absoluteError: Math.abs(predicted - actual), absolutePercentError: Math.abs((predicted - actual) / actual) * 100, signedPercentError: (predicted - actual) / actual * 100 });
  }
  if (!tests.length) return { tests, count: 0, mape: null, mae: null, bias: null, status: 'insufficient' };
  return {
    tests,
    count: tests.length,
    mape: tests.reduce((sum, item) => sum + item.absolutePercentError, 0) / tests.length,
    mae: tests.reduce((sum, item) => sum + item.absoluteError, 0) / tests.length,
    bias: tests.reduce((sum, item) => sum + item.signedPercentError, 0) / tests.length,
    status: tests.length >= 2 ? 'pilot' : 'very_small_sample',
  };
}
