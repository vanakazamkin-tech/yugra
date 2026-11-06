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
      if (!scored.has(item.municipalityId)) scored.set(item.municipalityId, []);
      scored.get(item.municipalityId).push({ ...item, peerScore: score, indicatorScore, modelPillar: MODEL_PILLAR_BY_SERIES[item.pillar.key] });
    }
  }

  const byMunicipality = {};
  for (const municipality of municipalities) {
    const own = scored.get(municipality.id) || [];
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
    const resilience = available.length >= 3 && availableWeight >= 0.5
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
      const hits = chain.watch.filter((key) => own.some((item) => item.pillar.key === key && item.adverse === true));
      return { ...chain, hits, matched: hits.length, active: hits.length >= 2 };
    }).filter((chain) => chain.matched > 0).sort((a, b) => b.matched - a.matched);
    byMunicipality[municipality.id] = {
      municipalityId: municipality.id,
      score: resilience === null ? null : Math.round(resilience * 10) / 10,
      confidence: Math.round(confidence),
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


const rowKey = (row) => String(row.municipality_id) + '|' + String(row.reference_year);
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
    if (!grouped.has(key)) grouped.set(key, {});
    grouped.get(key)[row.indicator_code] = row;
  }
  const derived = [];
  const push = (base, code, name, value, unit, directionNote) => {
    if (!base || !Number.isFinite(value)) return;
    derived.push({
      municipality_id: base.municipality_id,
      indicator_code: code,
      indicator_name: name,
      reference_year: Number(base.reference_year),
      reference_period: 'annual',
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
  for (const bucket of grouped.values()) {
    const total = Number(bucket.budget_total_revenue?.value);
    const nonGrant = Number(bucket.budget_revenue_excluding_grants?.value);
    const transfers = Number(bucket.budget_intergovernmental_transfers?.value);
    const expenditure = Number(bucket.budget_total_expenditure?.value);
    const base = bucket.budget_total_revenue;
    if (base && total > 0 && finite(nonGrant)) {
      push(base, 'derived_budget_own_revenue_share', 'Доля доходов без безвозмездных поступлений в общих доходах бюджета', nonGrant / total * 100, '%', 'Чем выше доля, тем меньше формальная зависимость доходов от безвозмездных поступлений; это не полная оценка бюджетной устойчивости.');
    }
    if (base && total > 0 && finite(transfers)) {
      push(base, 'derived_budget_transfer_dependency', 'Доля безвозмездных поступлений в общих доходах бюджета', transfers / total * 100, '%', 'Рост доли рассматривается как сигнал зависимости от межбюджетных трансфертов.');
    }
    if (base && total > 0 && finite(expenditure) && expenditure > 0) {
      push(base, 'derived_budget_balance_ratio', 'Отношение доходов к расходам бюджета', (total - expenditure) / expenditure * 100, '%', 'Положительное значение означает превышение доходов над расходами в пределах данного отчётного периода; требуется сверка методики исполнения бюджета.');
    }
    const investment = bucket.fixed_capital_investment_non_mining;
    const population = bucket.population_municipality;
    if (investment && population && Number(population.value) > 0) {
      push(investment, 'derived_investment_per_capita', 'Инвестиции в основной капитал без добычи на одного жителя', Number(investment.value) / Number(population.value), 'руб./чел.', 'Номинальная интенсивность инвестиций; не является реальным темпом роста и не скорректирована на инфляцию.');
    }
  }

  const populationByMunicipality = new Map();
  for (const row of verified.filter((item) => item.indicator_code === 'population_municipality')) {
    if (!populationByMunicipality.has(row.municipality_id)) populationByMunicipality.set(row.municipality_id, []);
    populationByMunicipality.get(row.municipality_id).push(row);
  }
  for (const history of populationByMunicipality.values()) {
    const points = history.sort((a, b) => Number(a.reference_year) - Number(b.reference_year));
    const first = points[0], last = points[points.length - 1];
    if (points.length < 2 || Number(first.value) <= 0) continue;
    const span = Number(last.reference_year) - Number(first.reference_year);
    if (span <= 0) continue;
    const annualized = (Math.pow(Number(last.value) / Number(first.value), 1 / span) - 1) * 100;
    push(last, 'derived_population_growth_rate', 'Среднегодовое изменение численности населения за доступный период', annualized, '% в год', 'Расчёт по крайним доступным годам; не заменяет полный демографический баланс рождаемости, смертности и миграции.');
  }
  return derived;
}
