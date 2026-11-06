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

// Ключи здесь должны совпадать с classify() в UnifiedRiskForecast.jsx.
// Раньше карта содержала только внутренние названия (например, labour),
// тогда как реальные ряды приходили с ключами employment/income/budget.
const MODEL_PILLAR_BY_SERIES = Object.fromEntries([
  ...MODEL_PILLARS.flatMap((p) => p.series.map((key) => [key, p.key])),
  ['employment', 'labour'], ['income', 'labour'],
  ['budget', 'finance'],
  ['social', 'social'], ['health', 'social'], ['education', 'social'],
  ['infrastructure', 'infrastructure'],
]);

function comparablePeriod(row) {
  const raw = String(row?.reference_period ?? '').trim().toLowerCase();
  if (/q[1-4]/i.test(raw)) return raw.match(/q([1-4])/i)[0].toUpperCase();
  if (/h[12]/i.test(raw)) return raw.match(/h([12])/i)[0].toUpperCase();
  if (!raw || /^(annual|year|год|годовой|за год)$/.test(raw) || /^\d{4}$/.test(raw)) return 'annual';
  return raw;
}
// These city-scoped codes are the same SME density indicator from the same official 349-рп report.
export function canonicalIndicatorCode(code) {
  const value = String(code ?? '').trim();
  return /^(kogalym|langepas|pyt_yah|raduzhny|surgut)_sme_per_10k$/.test(value)
    ? 'sme_per_10k'
    : value;
}

const finite = (v) => Number.isFinite(Number(v)) && v !== null && v !== '';
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

function percentile(value, values, higherIsBetter) {
  const sorted = values.filter(finite).map(Number).sort((a, b) => a - b);
  if (sorted.length < 3) return null;
  const below = sorted.filter((v) => v < Number(value)).length;
  const equal = sorted.filter((v) => v === Number(value)).length;
  const rank = (below + Math.max(0, equal - 1) / 2) / Math.max(1, sorted.length - 1) * 100;
  return higherIsBetter ? rank : 100 - rank;
}

export function buildRiskModel(municipalities = [], series = [], weightOverrides = {}) {
  const requestedWeights = MODEL_PILLARS.map((pillar) => {
    const value = Number(weightOverrides?.[pillar.key]);
    return { ...pillar, requestedWeight: Number.isFinite(value) && value >= 0 ? value : pillar.weight * 100 };
  });
  const requestedTotal = requestedWeights.reduce((sum, pillar) => sum + pillar.requestedWeight, 0);
  const configuredPillars = requestedWeights.map(({ requestedWeight, ...pillar }) => ({
    ...pillar,
    weight: requestedTotal > 0 ? requestedWeight / requestedTotal : MODEL_PILLARS.find((item) => item.key === pillar.key).weight,
  }));
  const comparable = new Map();
  for (const item of series) {
    if (!item || item.direction === 'context' || !finite(item.latest?.numericValue)) continue;
    const pillarKey = MODEL_PILLAR_BY_SERIES[item.pillar?.key];
    if (!pillarKey) continue;
    const year = Number(item.latest.reference_year) || 0;
    const key = [item.code, item.unit, comparablePeriod(item.latest), year].join('|');
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
    const pillars = configuredPillars.map((pillar) => {
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
    // Историческая глубина показывается отдельно: это характеристика доступности
    // временной истории, а не статистическая вероятность правильности индекса.
    const historyDepth = own.length ? own.reduce((sum, item) => sum + Math.min(1, item.points.length / 4), 0) / own.length : 0;
    const latestPeriods = [...new Set(own.map((item) =>
      String(item.latest.reference_period || item.latest.reference_year || 'период не указан')
    ))].sort();
    const adverse = own.filter((item) => item.adverse === true);
    const affectedPillars = new Set(adverse.map((item) => item.modelPillar));
    const deteriorationShare = own.length ? adverse.length / own.length : 0;
    const priority = own.length >= 2
      ? clamp(deteriorationShare * 70 + Math.max(0, affectedPillars.size - 1) * 10)
      : null;
    const chains = RISK_CHAINS.map((chain) => {
      const hits = chain.watch.filter((key) => own.some((item) => item.pillar.key === key && item.adverse === true));
      return { ...chain, hits, matched: hits.length, active: hits.length >= 2 };
    }).filter((chain) => chain.matched > 0).sort((a, b) => b.matched - a.matched);
    byMunicipality[municipality.id] = {
      municipalityId: municipality.id,
      score: resilience === null ? null : Math.round(resilience * 10) / 10,
      historyCoverage: Math.round(historyDepth * 100),
      latestPeriods,
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
  return { byMunicipality, pillars: configuredPillars, chains: RISK_CHAINS };
}


const rowKey = (row) => [row.municipality_id, row.reference_year, comparablePeriod(row)].join('|');
export function deriveMunicipalIndicators(rows = []) {
  const verified = (Array.isArray(rows) ? rows : []).filter((row) =>
    row && row.verification_status === 'verified'
    && row.geographic_level === 'municipality'
    && finite(row.value)
    && row.municipality_id != null
    && Number.isInteger(Number(row.reference_year))
  );
  const grouped = new Map();
  for (const row of verified) {
    const key = rowKey(row);
    if (!grouped.has(key)) grouped.set(key, new Map());
    const byCode = grouped.get(key);
    if (!byCode.has(row.indicator_code)) byCode.set(row.indicator_code, []);
    byCode.get(row.indicator_code).push(row);
  }
  const derived = [];
  const push = (base, code, name, value, unit, directionNote, referencePeriod = base.reference_period || 'annual') => {
    if (!base || !Number.isFinite(value)) return;
    derived.push({
      municipality_id: base.municipality_id,
      indicator_code: code,
      indicator_name: name,
      reference_year: Number(base.reference_year),
      reference_period: referencePeriod,
      value,
      unit,
      source_id: 'derived_from_verified_municipal_indicators',
      source_url: base.source_url || null,
      retrieved_at: base.retrieved_at || null,
      verification_status: 'verified',
      geographic_level: 'municipality',
      geographic_name: base.geographic_name || null,
      notes: 'Расчётный показатель, получен из подтверждённых исходных муниципальных наблюдений. ' + directionNote,
    });
  };
  for (const candidatesByCode of grouped.values()) {
    // Не выбираем произвольное значение, если один код за тот же период
    // имеет конфликтующие значения из разных источников.
    const bucket = {};
    for (const [code, candidates] of candidatesByCode.entries()) {
      const distinctValues = new Set(candidates.map((row) => Number(row.value)));
      if (distinctValues.size !== 1) continue;
      bucket[code] = [...candidates].sort((a, b) =>
        new Date(b.retrieved_at || 0).getTime() - new Date(a.retrieved_at || 0).getTime()
      )[0];
    }
    const total = Number(bucket.budget_total_revenue?.value);
    const nonGrant = Number(bucket.budget_revenue_excluding_grants?.value);
    const transfers = Number(bucket.budget_intergovernmental_transfers?.value);
    const expenditure = Number(bucket.budget_total_expenditure?.value);
    const base = bucket.budget_total_revenue;
    if (base && total > 0 && finite(nonGrant)) {
      push(base, 'derived_budget_own_revenue_share', 'Доля доходов без безвозмездных поступлений в общих доходах бюджета', nonGrant / total * 100, '%', 'Чем выше доля, тем меньше формальная зависимость доходов от безвозмездных поступлений; это не полная оценка бюджетной устойчивости.', base.reference_period || 'annual');
    }
    if (base && total > 0 && finite(transfers)) {
      push(base, 'derived_budget_transfer_dependency', 'Доля безвозмездных поступлений в общих доходах бюджета', transfers / total * 100, '%', 'Рост доли рассматривается как сигнал зависимости от межбюджетных трансфертов.', base.reference_period || 'annual');
    }
    if (base && total > 0 && finite(expenditure) && expenditure > 0) {
      push(base, 'derived_budget_balance_ratio', 'Отношение доходов к расходам бюджета', (total - expenditure) / expenditure * 100, '%', 'Положительное значение означает превышение доходов над расходами в пределах данного отчётного периода; требуется сверка методики исполнения бюджета.', base.reference_period || 'annual');
    }
  }

  // Для интенсивности инвестиций сопоставляем годовой поток инвестиций
  // с населением на 1 января того же года. Это разные типы периода,
  // но методологически совместимые годовой поток и начальный запас населения.
  const uniqueByMunicipalityYear = (code, acceptPeriod) => {
    const grouped = new Map();
    for (const row of verified.filter((item) => item.indicator_code === code && acceptPeriod(item))) {
      const key = row.municipality_id + '|' + Number(row.reference_year);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }
    const result = new Map();
    for (const [key, candidates] of grouped) {
      if (new Set(candidates.map((item) => Number(item.value))).size !== 1) continue;
      result.set(key, [...candidates].sort((a, b) =>
        new Date(b.retrieved_at || 0).getTime() - new Date(a.retrieved_at || 0).getTime()
      )[0]);
    }
    return result;
  };
  const annualInvestment = uniqueByMunicipalityYear('fixed_capital_investment_non_mining',
    (row) => comparablePeriod(row) === 'annual');
  const januaryPopulation = uniqueByMunicipalityYear('population_municipality',
    (row) => /^\d{4}-01-01$/.test(String(row.reference_period || '')));
  for (const [key, investment] of annualInvestment) {
    const population = januaryPopulation.get(key);
    if (!population || Number(population.value) <= 0) continue;
    push(investment, 'derived_investment_per_capita', 'Инвестиции в основной капитал без добычи на одного жителя',
      Number(investment.value) / Number(population.value), 'руб./чел.',
      'Номинальная интенсивность инвестиций; годовой поток сопоставлен с численностью населения на 1 января того же года; показатель не скорректирован на инфляцию.',
      investment.reference_period || 'annual');
  }

  // Динамика численности рассчитывается только по сопоставимым годовым
  // срезам на 1 января. Квартальные наблюдения и конфликтующие значения
  // не должны превращаться в фиктивный годовой темп.
  const populationByMunicipality = new Map();
  for (const row of verified.filter((item) => item.indicator_code === 'population_municipality'
    && /^\d{4}-01-01$/.test(String(item.reference_period || '')))) {
    if (!populationByMunicipality.has(row.municipality_id)) populationByMunicipality.set(row.municipality_id, new Map());
    const byYear = populationByMunicipality.get(row.municipality_id);
    const year = Number(row.reference_year);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(row);
  }
  for (const byYear of populationByMunicipality.values()) {
    const points = [...byYear.entries()].flatMap(([year, candidates]) => {
      if (new Set(candidates.map((item) => Number(item.value))).size !== 1) return [];
      return [{ ...candidates[0], reference_year: year }];
    }).sort((a, b) => Number(a.reference_year) - Number(b.reference_year));
    const first = points[0], last = points[points.length - 1];
    if (points.length < 2 || Number(first.value) <= 0) continue;
    const span = Number(last.reference_year) - Number(first.reference_year);
    if (span <= 0) continue;
    const annualized = (Math.pow(Number(last.value) / Number(first.value), 1 / span) - 1) * 100;
    push(last, 'derived_population_growth_rate', 'Среднегодовое изменение численности населения за доступный период', annualized, '% в год', 'Расчёт по сопоставимым годовым срезам на 1 января; не заменяет полный демографический баланс рождаемости, смертности и миграции.');
  }
  return derived;
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
