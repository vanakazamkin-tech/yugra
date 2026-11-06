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

/**
 * Reviewed direction rules. Indicators not explicitly listed remain contextual
 * and are excluded from scoring until their unit, denominator and meaning are checked.
 */
export const INDICATOR_METHODS = {
  sme_per_10k: {
    direction: 'higher', pillar: 'business',
    rationale: 'Число субъектов МСП на 10 тыс. жителей: относительная плотность предпринимательской среды.',
    limitation: 'Не измеряет выживаемость бизнеса, производительность или качество рабочих мест.',
  },
  derived_budget_own_revenue_share: {
    direction: 'higher', pillar: 'budget',
    rationale: 'Доля налоговых и неналоговых доходов в общих доходах бюджета — прозрачный прокси собственной доходной базы.',
    limitation: 'Рассчитывается именно по налоговым и неналоговым доходам, а не по отдельной строке «доходы без безвозмездных поступлений из бюджета автономного округа»: эти два показателя различаются в официальной таблице. Не заменяет анализ налоговой базы, долговой нагрузки и устойчивости поступлений.',
  },
  derived_budget_transfer_dependency: {
    direction: 'context', pillar: 'budget',
    rationale: 'Доля безвозмездных поступлений в общих доходах бюджета.',
    limitation: 'Трансферты могут быть механизмом выравнивания и стабильного финансирования услуг; высокая доля сама по себе не доказывает финансовую неустойчивость.',
  },
  derived_budget_balance_ratio: {
    direction: 'context', pillar: 'budget',
    rationale: 'Отношение доходов бюджета к расходам за отчётный период.',
    limitation: 'Профицит может быть связан с недоисполнением расходов, а дефицит — с плановым финансированием; без анализа исполнения бюджета знак неоднозначен.',
  },
  derived_investment_per_capita: {
    direction: 'context', pillar: 'investment',
    rationale: 'Номинальные инвестиции в основной капитал без добычи на одного жителя.',
    limitation: 'Показатель не скорректирован на инфляцию и зависит от отраслевой структуры крупных проектов; не включается в индекс как самостоятельный критерий устойчивости.',
  },
  derived_population_growth_rate: {
    direction: 'context', pillar: 'demography',
    rationale: 'Среднегодовое изменение численности населения по сопоставимым срезам на 1 января.',
    limitation: 'Рост или снижение численности сами по себе не определяют устойчивость; требуется разложение на рождаемость, смертность и миграцию.',
  },
  derived_migration_net_per_1000: {
    direction: 'context', pillar: 'migration',
    rationale: 'Миграционное сальдо, пересчитанное на 1000 жителей по населению на 1 января того же года.',
    limitation: 'Муниципальные источники пока неоднородны, часть оценок предварительная или округлённая; до унификации методики показатель не участвует в ранжировании.',
  },
  sme_employment_share: {
    direction: 'context', pillar: 'employment',
    rationale: 'Доля работников малых и средних предприятий в общей среднесписочной численности работников.',
    limitation: 'Высокая доля отражает структуру занятости, но не обязательно качество рабочих мест, производительность или устойчивость рынка труда.',
  },
  average_monthly_salary_annual: {
    direction: 'higher', pillar: 'income',
    rationale: 'Среднемесячная номинальная заработная плата работников организаций без субъектов малого предпринимательства за полный календарный год.',
    limitation: 'Не отражает реальную покупательную способность, стоимость жизни и доходы работников МСП; покрытие текущей базы ограничено девятью муниципалитетами, поэтому это частичный сравнительный прокси, а не полная оценка доходов населения.',
  },
  registered_unemployment_rate: {
    direction: 'lower', pillar: 'employment',
    rationale: 'Уровень зарегистрированной безработицы: меньшая доля зарегистрированных безработных предпочтительнее.',
    limitation: 'Не равен безработице по методологии МОТ; период и знаменатель проверяются по источнику.',
  },
  registered_unemployment_rate_municipal_report: {
    direction: 'lower', pillar: 'employment',
    rationale: 'Уровень зарегистрированной безработицы из муниципального отчёта.',
    limitation: 'Нельзя смешивать с оценками МОТ или срезами другой даты.',
  },
  registered_unemployment_rate_surgutsky: {
    direction: 'lower', pillar: 'employment',
    rationale: 'Уровень зарегистрированной безработицы из отчёта Сургутского района.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  sovetsky_registered_unemployment_rate: {
    direction: 'lower', pillar: 'employment',
    rationale: 'Уровень регистрируемой безработицы Советского района.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  beloyarsky_unemployment_rate: {
    direction: 'lower', pillar: 'employment',
    rationale: 'Уровень зарегистрированной безработицы Белоярского района.',
    limitation: 'Точечный срез не сравнивается с годовым показателем без сверки даты.',
  },
  pokachi_registered_unemployment_rate: {
    direction: 'lower', pillar: 'employment',
    rationale: 'Уровень зарегистрированной безработицы города Покачи.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  pokachi_population_below_poverty: {
    direction: 'lower', pillar: 'income',
    rationale: 'Доля населения с доходами ниже прожиточного минимума: меньшая доля предпочтительнее.',
    limitation: 'Требуется проверка методики и единства знаменателя.',
  },
  sovetsky_noncompliant_roads_share: {
    direction: 'lower', pillar: 'infrastructure',
    rationale: 'Доля местных дорог, не отвечающих нормативам: меньшая доля предпочтительнее.',
    limitation: 'Пока нет сопоставимого покрытия всех муниципалитетов.',
  },
  industrial_production_index: {
    direction: 'higher', pillar: 'production',
    rationale: 'Индекс промышленного производства к предыдущему году: более высокий индекс означает более сильную динамику.',
    limitation: 'Индекс ниже 100 означает снижение; проверить отраслевой состав и базу сравнения.',
  },
  industrial_production_index_surgutsky: {
    direction: 'higher', pillar: 'production',
    rationale: 'Индекс промышленного производства Сургутского района.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  pokachi_industrial_production_index: {
    direction: 'higher', pillar: 'production',
    rationale: 'Индекс промышленного производства города Покачи.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  beloyarsky_industrial_production_index: {
    direction: 'higher', pillar: 'production',
    rationale: 'Индекс промышленного производства Белоярского района.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  real_disposable_income_index: {
    direction: 'context', pillar: 'income',
    rationale: 'Реальные денежные доходы населения: потенциально важный показатель покупательной способности.',
    limitation: 'Текущие муниципальные значения смешивают индекс реальных располагаемых доходов и индекс реальных денежных доходов; до унификации определений не включать в межмуниципальное сравнение.',
  },
  pokachi_real_disposable_income_index: {
    direction: 'higher', pillar: 'income',
    rationale: 'Индекс реальных располагаемых доходов города Покачи.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  real_cash_income_index_surgutsky: {
    direction: 'higher', pillar: 'income',
    rationale: 'Индекс реальных денежных доходов Сургутского района.',
    limitation: 'Не объединять с индексом располагаемых доходов без проверки состава.',
  },
  real_per_capita_income_growth_preliminary: {
    direction: 'higher', pillar: 'income',
    rationale: 'Предварительное изменение реальных среднедушевых доходов.',
    limitation: 'Предварительный показатель; требуется подтверждение и единый муниципальный охват.',
  },
  fixed_capital_investment_growth_preliminary: {
    direction: 'context', pillar: 'investment',
    rationale: 'Предварительный индекс изменения инвестиций в основной капитал.',
    limitation: 'В текущих муниципальных рядах смешаны общий объём инвестиций и инвестиции крупных и средних организаций; определения не унифицированы, поэтому межмуниципальное ранжирование запрещено.',
  },
  paid_services_index_municipal_report: {
    direction: 'higher', pillar: 'production',
    rationale: 'Индекс физического объёма платных услуг населению.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  retail_turnover_index_municipal_report: {
    direction: 'higher', pillar: 'production',
    rationale: 'Индекс физического объёма розничной торговли.',
    limitation: 'Пока недостаточно сопоставимых муниципальных наблюдений.',
  },
  consumer_market_physical_index: {
    direction: 'higher', pillar: 'production',
    rationale: 'Индекс физического объёма потребительского рынка.',
    limitation: 'Проверить состав агрегата и отсутствие двойного учёта с торговлей и услугами.',
  },
};
export function indicatorSeriesGroup(row) {
  const code = canonicalIndicatorCode(row?.indicator_code);
  if (/^(housing_commissioned|housing_construction|pokachi_housing_commissioning|sovetsky_housing_commissioning_plan)/.test(code)) return 'production';
  if (/^(sovetsky_local_road_repair|sovetsky_engineering_network_repair|sovetsky_noncompliant_roads_share|kogalym_no_regular_transport_population_share)/.test(code)) return 'infrastructure';
  if (code === 'employees_water_supply') return 'infrastructure';
  if (code === 'employees_hospitality') return 'production';
  if (code === 'pokachi_population_below_poverty' || /^(employees_education|employees_healthcare)$/.test(code)) return 'social';
  return null;
}

export function indicatorMethodFor(row) {
  const code = canonicalIndicatorCode(row?.indicator_code);
  if (/^(housing_commissioned|housing_construction|pokachi_housing_commissioning|sovetsky_housing_commissioning_plan)/.test(code)) {
    return {
      direction: 'context',
      pillar: 'production',
      rationale: 'Объём ввода или строительства жилья — показатель строительной активности.',
      limitation: 'Не измеряет обеспеченность жильём, его качество, износ фонда или доступность коммунальной инфраструктуры; плановые и фактические значения нельзя смешивать.',
    };
  }
  if (code === 'pokachi_population_below_poverty') {
    return {
      direction: 'context',
      pillar: 'social',
      rationale: 'Доля населения с денежными доходами ниже прожиточного минимума характеризует масштаб денежной бедности.',
      limitation: 'Ряд доступен только по Покачам за 2022–2024 годы; 2024 год обозначен администрацией как оценка, а методика расчёта в источнике раскрыта недостаточно. Не использовать для межмуниципального ранжирования и интегрального индекса до проверки сопоставимых официальных значений.',
    };
  }
  if (code === 'kogalym_no_regular_transport_population_share') {
    return {
      direction: 'lower',
      pillar: 'infrastructure',
      rationale: 'Доля населения, не имеющего регулярного транспортного сообщения с административным центром муниципального образования: меньшая доля означает более высокую транспортную доступность.',
      limitation: 'В текущей базе наблюдения есть только по одному муниципалитету; показатель нельзя использовать для межмуниципального ранжирования до получения сопоставимых значений по другим территориям и проверки единства знаменателя.',
    };
  }
  if (/^(sovetsky_local_road_repair|sovetsky_engineering_network_repair)/.test(code)) {
    return {
      direction: 'context',
      pillar: 'infrastructure',
      rationale: 'Объём выполненных работ по ремонту дорог или инженерных сетей.',
      limitation: 'Объём ремонта не равен состоянию инфраструктуры: без протяжённости сети, доли нормативного состояния и сопоставимого муниципального охвата направление изменения неоднозначно.',
    };
  }
  if (/^(employees_education|employees_healthcare)$/.test(code)) {
    return {
      direction: 'context',
      pillar: 'social',
      rationale: 'Среднесписочная численность работников организаций в образовании либо здравоохранении и социальных услугах — контекстный показатель масштаба соответствующей сферы.',
      limitation: 'Абсолютная численность не измеряет обеспеченность услугами, нагрузку на персонал или доступность учреждений и исключает субъекты малого предпринимательства. Наблюдения есть только по Когалыму и Сургуту; у Когалыма представлен только I квартал 2026 года, тогда как сопоставимые годовые значения есть по Сургуту за 2024–2025 годы. Не использовать для межмуниципального ранжирования и интегрального индекса.',
    };
  }
  if (code === 'employees_water_supply') {
    return {
      direction: 'context',
      pillar: 'infrastructure',
      rationale: 'Среднесписочная численность работников водоснабжения, водоотведения и обращения с отходами характеризует масштаб занятости в коммунальном секторе.',
      limitation: 'Абсолютная численность не измеряет доступность или качество коммунальных услуг и не показывает обеспеченность персоналом относительно протяжённости сетей и населения. Данные только по Когалыму (2026-Q1) и Сургуту (2024–2026); малые предприятия исключены. Не использовать для межмуниципального ранжирования и индекса.',
    };
  }
  if (code === 'employees_hospitality') {
    return {
      direction: 'context',
      pillar: 'production',
      rationale: 'Среднесписочная численность работников гостиниц и предприятий общественного питания характеризует масштаб занятости в сфере гостеприимства.',
      limitation: 'Абсолютная численность не измеряет туристический поток, загрузку гостиниц или вклад отрасли в экономику. Данные только по Когалыму (2026-Q1) и Сургуту (2024–2026); малые предприятия исключены. Не использовать для межмуниципального ранжирования и индекса.',
    };
  }
  if (/^employees_[a-z0-9_]+$/.test(code)) {
    return {
      direction: 'context',
      pillar: 'employment',
      rationale: 'Среднесписочная численность работников организаций по отдельному виду экономической деятельности за указанный период.',
      limitation: 'Абсолютная численность зависит от размера муниципалитета и не является уровнем занятости или долей отрасли. Текущий набор охватывает только два муниципалитета и организации без субъектов малого предпринимательства; без единого знаменателя и полного охвата не используется для межмуниципального ранжирования.',
    };
  }
  return INDICATOR_METHODS[code] || null;
}
export function indicatorDirection(row) {
  return indicatorMethodFor(row)?.direction || 'context';
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
      const stableTrend = item.change === 0
        || (item.changePercent != null && Number.isFinite(Number(item.changePercent)) && Math.abs(Number(item.changePercent)) < 0.5);
      const trend = item.adverse === null || stableTrend ? 50 : item.adverse ? 20 : 80;
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
    const baseAvailableWeight = available.reduce((sum, p) =>
      sum + (MODEL_PILLARS.find((base) => base.key === p.key)?.weight || 0), 0);
    // Score eligibility and data coverage use fixed base weights: user tuning must not
    // make sparse data look complete by assigning zero weight to missing dimensions.
    const resilience = available.length >= 2 && baseAvailableWeight >= 0.35 && availableWeight > 0
      ? available.reduce((sum, p) => sum + p.score * p.weight, 0) / availableWeight
      : null;
    const baseCoverage = baseAvailableWeight * 100;
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
      assessmentStatus: resilience === null ? 'insufficient' : available.length < 4 || baseCoverage < 70 ? 'partial' : 'expanded',
      availablePillars: available.length,
      availableWeight: Math.round(availableWeight * 100),
      baseCoverage: Math.round(baseCoverage),
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
    const taxNonTax = Number(bucket.budget_tax_non_tax_revenue?.value);
    const transfers = Number(bucket.budget_intergovernmental_transfers?.value);
    const expenditure = Number(bucket.budget_total_expenditure?.value);
    const base = bucket.budget_total_revenue;
    if (base && total > 0 && finite(taxNonTax)) {
      push(base, 'derived_budget_own_revenue_share', 'Доля налоговых и неналоговых доходов в общих доходах бюджета', taxNonTax / total * 100, '%', 'Расчёт по отдельной строке официальной таблицы «Налоговые и неналоговые доходы». Не подменять её строкой «Итого доходов (без безвозмездных поступлений)», которая имеет другое значение и отличается по всем 22 муниципалитетам за 2024 и 2025 годы.', base.reference_period || 'annual');
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

  // Абсолютное сальдо миграции приводится к масштабу территории, но остаётся
  // контекстным: муниципальные источники и полнота охвата пока неоднородны.
  const annualMigration = uniqueByMunicipalityYear('migration_net_total',
    (row) => comparablePeriod(row) === 'annual');
  for (const [key, migration] of annualMigration) {
    const population = januaryPopulation.get(key);
    if (!population || Number(population.value) <= 0) continue;
    push(migration, 'derived_migration_net_per_1000', 'Миграционный прирост на 1000 жителей',
      Number(migration.value) / Number(population.value) * 1000, 'чел. на 1000 жителей',
      'Контекстный показатель: абсолютное миграционное сальдо пересчитано на численность населения на 1 января того же года. Не включается в интегральный индекс до подтверждения единой методики и сопоставимости муниципальных источников.',
      migration.reference_period || 'annual');
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
