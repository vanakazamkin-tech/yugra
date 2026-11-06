// Explainable municipal risk diagnostics and early-warning rules.
// This module does not calculate the six-pillar resilience index.
export const MODEL_PILLARS = [
  { key: 'economy', title: 'Экономика и инвестиции', series: ['investment', 'business', 'production'] },
  { key: 'labour', title: 'Рынок труда и доходы', series: ['employment', 'income'] },
  { key: 'demography', title: 'Демография и миграция', series: ['migration', 'demography'] },
  { key: 'finance', title: 'Муниципальные финансы', series: ['budget'] },
  { key: 'social', title: 'Социальная сфера', series: ['social', 'health', 'education'] },
  { key: 'infrastructure', title: 'Инфраструктура и среда', series: ['infrastructure'] },
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

// Explicit period metadata is required. reference_year alone never proves annual frequency.
export function parseRiskPeriod(point = {}) {
  const period = String(point?.reference_period ?? '').trim();
  if (!period) return null;
  const rawYear = point?.reference_year;
  const hasDeclaredYear = rawYear != null && String(rawYear).trim() !== '';
  const declaredYear = Number(rawYear);
  const yearFromLabel = Number(period.match(/^(\d{4})(?=$|[-_\s])/i)?.[1]);
  if (hasDeclaredYear && (!Number.isInteger(declaredYear) || declaredYear < 1900 || declaredYear > 2200)) return null;
  const year = hasDeclaredYear ? declaredYear : yearFromLabel;
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  if (yearFromLabel && yearFromLabel !== year) return null;
  const quarter = period.match(/^(?:\d{4}[-_\s]?)?Q([1-4])$/i);
  if (quarter) return { year, frequency: 'quarter', slot: Number(quarter[1]) };
  const half = period.match(/^(?:\d{4}[-_\s]?)?H([12])$/i);
  if (half) return { year, frequency: 'half', slot: Number(half[1]) };
  if (/^(?:annual|year|год|годовой|\d{4})$/i.test(period)) return { year, frequency: 'annual', slot: 0 };
  return null;
}

function consecutiveComparablePeriods(current, previous) {
  const a = parseRiskPeriod(current), b = parseRiskPeriod(previous);
  return Boolean(a && b && a.frequency === b.frequency && a.slot === b.slot && a.year - b.year === 1);
}

export function countConsecutiveAdverseIntervals(points = [], direction = 'context') {
  if (!Array.isArray(points) || points.length < 2 || !['higher', 'lower'].includes(direction)) return 0;
  let streak = 0;
  for (let index = points.length - 1; index > 0; index -= 1) {
    const current = points[index], previous = points[index - 1];
    const comparable = consecutiveComparablePeriods(current, previous);
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

export function collapseRiskSignals(signals = []) {
  const groups = new Map();
  (Array.isArray(signals) ? signals : []).filter((signal) =>
    signal && (signal.adverse === true || signal.adverse === false)
  ).forEach((signal) => {
    const identity = signal.signalFamily || signal.code || signal.key || signal;
    if (!groups.has(identity)) groups.set(identity, []);
    groups.get(identity).push(signal);
  });
  const usable = [];
  const conflicts = [];
  groups.forEach((members, identity) => {
    const states = new Set(members.map((signal) => signal.adverse));
    // Contradictory duplicate definitions are not counted in either direction.
    if (states.size > 1) {
      conflicts.push(String(identity));
      return;
    }
    members.sort((a, b) => Number(b.adverseStreak || 0) - Number(a.adverseStreak || 0));
    usable.push({ ...members[0], familyMembers: members.length });
  });
  return { usable, conflicts };
}

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
  const collapsed = collapseRiskSignals(signals);
  const usable = collapsed.usable;
  const bad = usable.filter((signal) => signal.adverse === true);
  const pillarOf = (signal) => MODEL_PILLAR_BY_SERIES[signal.pillar?.key] || signal.pillar?.key;
  const affectedPillars = new Set(bad.map(pillarOf).filter(Boolean));
  const pillarCounts = Object.fromEntries([...affectedPillars].map((key) => [
    key, bad.filter((signal) => pillarOf(signal) === key).length,
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

export function buildRiskModel(municipalities = [], series = []) {
  const byMunicipality = {};
  for (const municipality of municipalities) {
    const own = (Array.isArray(series) ? series : []).filter((item) => String(item.municipalityId) === String(municipality.id));
    const collapsed = collapseRiskSignals(own.filter((item) => ['higher', 'lower'].includes(item.direction)));
    const usable = collapsed.usable;
    const adverse = usable.filter((item) => item.adverse === true);
    const affectedPillars = new Set(adverse.map((item) => MODEL_PILLAR_BY_SERIES[item.pillar?.key]).filter(Boolean));
    const availablePillars = new Set(usable.map((item) => MODEL_PILLAR_BY_SERIES[item.pillar?.key]).filter(Boolean));
    const pillars = MODEL_PILLARS.map((pillar) => {
      const items = usable.filter((item) => MODEL_PILLAR_BY_SERIES[item.pillar?.key] === pillar.key);
      return {
        key: pillar.key,
        title: pillar.title,
        series: pillar.series,
        indicators: items.length,
        adverse: items.filter((item) => item.adverse === true).length,
        totalSeries: own.filter((item) => MODEL_PILLAR_BY_SERIES[item.pillar?.key] === pillar.key).length,
      };
    });
    const chains = RISK_CHAINS.map((chain) => {
      const hits = chain.watch.filter((key) => {
        const seriesKeys = RISK_WATCH_SERIES[key] || [key];
        return own.some((item) => seriesKeys.includes(item.pillar?.key) && item.adverse === true);
      });
      return { ...chain, hits, matched: hits.length, active: hits.length >= 2 };
    }).filter((chain) => chain.matched > 0).sort((a, b) => b.matched - a.matched);
    byMunicipality[municipality.id] = {
      municipalityId: municipality.id,
      totalSeries: own.length,
      usableIndicators: usable.length,
      availablePillars: availablePillars.size,
      adverseCount: adverse.length,
      affectedPillars: affectedPillars.size,
      pillars,
      chains,
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
    if (!grouped.has(key)) grouped.set(key, { rows: {}, ambiguousCodes: new Set() });
    const bucket = grouped.get(key);
    const code = String(row.indicator_code || '');
    if (!bucket.ambiguousCodes.has(code)) {
      const existing = bucket.rows[code];
      if (!existing) bucket.rows[code] = row;
      else if (Number(existing.value) !== Number(row.value)) {
        delete bucket.rows[code];
        bucket.ambiguousCodes.add(code);
      }
    }
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
    const totalRow = bucket.rows.budget_total_revenue;
    const nonGrantRow = bucket.rows.budget_revenue_excluding_grants;
    const transfersRow = bucket.rows.budget_intergovernmental_transfers;
    const expenditureRow = bucket.rows.budget_total_expenditure;
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

    const investment = bucket.rows.fixed_capital_investment_non_mining;
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
