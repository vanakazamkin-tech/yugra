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
const finite = (value) => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return normalized !== '' && Number.isFinite(Number(normalized));
};
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
  const month = period.match(/^\d{4}-(0[1-9]|1[0-2])$/);
  if (month) return { year, frequency: 'month', slot: Number(month[1]) };
  const pointInTime = period.match(/^(\d{4})-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/);
  if (pointInTime) {
    const monthNumber = Number(pointInTime[2]);
    const dayNumber = Number(pointInTime[3]);
    const calendarDate = new Date(Date.UTC(year, monthNumber - 1, dayNumber));
    if (calendarDate.getUTCFullYear() !== year
      || calendarDate.getUTCMonth() + 1 !== monthNumber
      || calendarDate.getUTCDate() !== dayNumber) return null;
    return { year, frequency: 'point_in_time', slot: monthNumber * 100 + dayNumber };
  }
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
  criticalPillars: 3,
  sharpChangePercent: 10,
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
    usable.push({
      ...members[0],
      familyMembers: members.length,
      adverseStreak: Math.max(...members.map((signal) => Number(signal.adverseStreak) || 0)),
      sharpChange: members.some((signal) => signal.sharpChange === true),
    });
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
    sharpChangePercent: normalize(thresholds?.sharpChangePercent, DEFAULT_RISK_THRESHOLDS.sharpChangePercent, 1, 100),
  };
  // Only explicit true/false values are assessable. Missing/unknown directions
  // must never be counted as healthy observations.
  const collapsed = collapseRiskSignals(signals);
  const usable = collapsed.usable;
  const bad = usable.filter((signal) => signal.adverse === true);
  const canonicalPillarKeys = new Set(MODEL_PILLARS.map((pillar) => pillar.key));
  const pillarOf = (signal) => {
    const key = signal.pillar?.key;
    const mapped = MODEL_PILLAR_BY_SERIES[key] || key;
    return canonicalPillarKeys.has(mapped) ? mapped : null;
  };
  const availablePillarKeys = new Set(usable.map(pillarOf).filter(Boolean));
  const missingPillars = MODEL_PILLARS.filter((pillar) => !availablePillarKeys.has(pillar.key));
  const missingPillarTitles = missingPillars.map((pillar) => pillar.title);
  // A green status needs source-backed, explicitly non-provisional latest
  // observations in every pillar, not merely a directional numeric value.
  const stableEligible = usable.filter((signal) => signal.latestSourcePresent === true
    && signal.latestIsProvisional === false);
  const stablePillarKeys = new Set(stableEligible.map(pillarOf).filter(Boolean));
  const missingStablePillars = MODEL_PILLARS.filter((pillar) => !stablePillarKeys.has(pillar.key));
  const missingStablePillarTitles = missingStablePillars.map((pillar) => pillar.title);
  const coverageNote = missingPillars.length
    ? ` Неполное покрытие: отсутствуют сопоставимые ряды по направлениям: ${missingPillarTitles.join(', ')}.`
    : '';
  const stableQualityNote = missingStablePillars.length
    ? ` Недостаточно подтверждённых данных для зелёного статуса: нет актуальных непредварительных наблюдений с источником по направлениям: ${missingStablePillarTitles.join(', ')}.`
    : '';
  const affectedPillars = new Set(bad.map(pillarOf).filter(Boolean));
  // Provisional or source-less observations remain visible as warnings, but
  // cannot independently qualify a municipality for the highest alert level.
  const criticalBad = bad.filter((signal) => signal.latestIsProvisional === false
    && signal.latestSourcePresent === true);
  const criticalAffectedPillars = new Set(criticalBad.map(pillarOf).filter(Boolean));
  const criticalGateBlocked = bad.length >= settings.criticalSignals
    && affectedPillars.size >= settings.criticalPillars
    && (criticalBad.length < settings.criticalSignals
      || criticalAffectedPillars.size < settings.criticalPillars);
  const criticalGateReason = criticalGateBlocked
    ? ' Красный статус не присвоен: часть негативных сигналов основана на предварительных наблюдениях, не имеет подтверждённого источника или не содержит явных метаданных качества; они остаются в предупреждениях.'
    : '';
  const pillarCounts = Object.fromEntries([...affectedPillars].map((key) => [
    key, bad.filter((signal) => pillarOf(signal) === key).length,
  ]));
  const repeatedDeterioration = bad.filter((signal) => Number(signal.adverseStreak) >= 2);
  const sharpChanges = bad.filter((signal) => signal.sharpChange === true);
  const conflictNote = collapsed.conflicts.length ? ` Исключено противоречивых семейств: ${collapsed.conflicts.join(', ')}.` : '';
  const conflictReasons = collapsed.conflicts.length ? [`Исключены противоречивые семейства сигналов: ${collapsed.conflicts.join(', ')}`] : [];
  const common = {
    usable, bad, thresholds: settings,
    conflictingSignalFamilies: collapsed.conflicts,
    usableCount: usable.length,
    adverseCount: bad.length,
    affectedPillars: affectedPillars.size,
    criticalEvidenceCount: criticalBad.length,
    criticalAffectedPillars: criticalAffectedPillars.size,
    provisionalAdverseCount: bad.filter((signal) => signal.latestIsProvisional === true).length,
    sourceMissingAdverseCount: bad.filter((signal) => signal.latestSourcePresent !== true).length,
    criticalQualityMetadataUnknownCount: bad.filter((signal) =>
      typeof signal.latestIsProvisional !== 'boolean' || typeof signal.latestSourcePresent !== 'boolean').length,
    availablePillars: availablePillarKeys.size,
    coveragePillars: availablePillarKeys.size,
    stableQualityPillars: stablePillarKeys.size,
    missingPillars: missingPillarTitles,
    missingStablePillars: missingStablePillarTitles,
    pillarCounts,
    repeatedDeterioration,
    sharpChanges,
    sharpChangeCount: sharpChanges.length,
    earlyWarning: repeatedDeterioration.length > 0,
  };
  if (usable.length < settings.minimumUsable) {
    return {
      ...common, level: 'insufficient',
      explanation: `Недостаточно данных: оцениваемых рядов ${usable.length}, требуется не менее ${settings.minimumUsable}; покрыто ${availablePillarKeys.size} из ${MODEL_PILLARS.length} направлений. Неопределённые и контекстные показатели не учитываются как положительные.${coverageNote}${conflictNote}`,
      reasons: ['Недостаточное покрытие показателями с однозначным направлением', ...conflictReasons],
    };
  }
  // A positive/green status is a system-wide conclusion. It is only allowed
  // when all six risk directions have at least one comparable, directional series.
  // Negative observed signals may still raise a warning with incomplete coverage.
  if (bad.length === 0 && (missingPillars.length > 0 || missingStablePillars.length > 0)) {
    return {
      ...common, level: 'insufficient',
      explanation: `Нельзя подтвердить отсутствие рисков: сопоставимые ряды с однозначным направлением доступны по ${availablePillarKeys.size} из ${MODEL_PILLARS.length} направлений, а подтверждённые актуальные наблюдения с источником и без предварительного статуса — по ${stablePillarKeys.size} из ${MODEL_PILLARS.length} направлений.${coverageNote}${stableQualityNote} Для зелёного статуса требуются все шесть направлений и явные метаданные качества последнего наблюдения.${conflictNote}`,
      reasons: [`Сопоставимое покрытие: ${availablePillarKeys.size} из ${MODEL_PILLARS.length} направлений`, ...missingPillarTitles.map((title) => `Нет сопоставимого ряда: ${title}`), ...missingStablePillarTitles.map((title) => `Нет подтверждённого актуального наблюдения с источником: ${title}`), ...conflictReasons],
    };
  }
  if (criticalBad.length >= settings.criticalSignals && criticalAffectedPillars.size >= settings.criticalPillars) {
    return {
      ...common, level: 'critical',
      explanation: `Зафиксировано ${criticalBad.length} негативных непредварительных сигналов с указанными источниками в ${criticalAffectedPillars.size} направлениях; достигнуты оба настраиваемых порога повышенного внимания.${coverageNote}${conflictNote}`,
      reasons: [`Непредварительных сигналов с источниками: ${criticalBad.length} из требуемых ${settings.criticalSignals}`, `Затронуто направлений по таким сигналам: ${criticalAffectedPillars.size} из требуемых ${settings.criticalPillars}`, ...(missingPillarTitles.map((title) => `Непроверено направление: ${title}`)), ...conflictReasons],
    };
  }
  if (bad.length > 0) {
    return {
      ...common, level: 'watch',
      explanation: `Есть ${bad.length} негативных сигнал(а/ов) в ${affectedPillars} направлениях, но критерий одновременного межотраслевого ухудшения на непредварительных данных с источниками не достигнут.${criticalGateReason}${coverageNote}${conflictNote}`,
      reasons: [`Негативных сигналов: ${bad.length}`, `Затронуто направлений: ${affectedPillars.size}`, ...(criticalGateBlocked ? [`Красный порог учитывает только непредварительные сигналы с источниками: ${criticalBad.length} сигналов / ${criticalAffectedPillars.size} направлений`] : []), ...(missingPillarTitles.map((title) => `Непроверено направление: ${title}`)), ...conflictReasons],
    };
  }
  return {
    ...common, level: 'stable',
    explanation: `По всем шести направлениям проверены сопоставимые ряды: среди ${usable.length} оцениваемых рядов негативных изменений не выявлено.${conflictNote}`,
    reasons: ['Негативных сигналов среди оцениваемых рядов нет; покрыты все шесть направлений', ...conflictReasons],
  };
}

export function buildRiskAuditRows(municipalityAssessments = []) {
  const output = [];
  for (const assessment of Array.isArray(municipalityAssessments) ? municipalityAssessments : []) {
    const series = Array.isArray(assessment?.own) ? assessment.own : [];
    const usable = Array.isArray(assessment?.usable) ? assessment.usable : [];
    const includedKeys = new Set(usable.map((signal) => signal.key).filter(Boolean));
    const conflicts = new Set((assessment?.conflictingSignalFamilies || []).map(String));
    const familyCounts = new Map();
    series.forEach((signal) => {
      const family = String(signal.signalFamily || signal.code || signal.key || '');
      familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
    });
    for (const signal of series) {
      const family = String(signal.signalFamily || signal.code || signal.key || '');
      const latest = signal.latest || {};
      const previous = signal.previous || {};
      const sourceIds = [...new Set([
        ...(Array.isArray(latest.source_ids) ? latest.source_ids : []),
        ...(latest.source_id ? [latest.source_id] : []),
      ].filter(Boolean))];
      const sourceUrls = [...new Set([
        ...(Array.isArray(latest.source_urls) ? latest.source_urls : []),
        ...(latest.source_url ? [latest.source_url] : []),
      ].filter(Boolean))];
      const sourcePresent = sourceIds.length > 0 || sourceUrls.length > 0;
      const criticalEligible = sourcePresent
        && signal.latestSourcePresent === true
        && signal.latestIsProvisional === false;
      const criticalEligibilityReason = !sourcePresent || signal.latestSourcePresent !== true
        ? 'Нет подтверждённого источника у последнего наблюдения'
        : signal.latestIsProvisional !== false
          ? signal.latestIsProvisional === true
            ? 'Последнее наблюдение предварительное/оценочное'
            : 'Не определён статус предварительности последнего наблюдения'
          : '';
      const inputCodes = [...new Set((latest.input_indicator_codes || []).map(String))];
      const sharedInputCodes = new Set();
      const sharedWith = [];
      for (const other of series) {
        if (other === signal) continue;
        const otherCodes = new Set((other.latest?.input_indicator_codes || []).map(String));
        const overlap = inputCodes.filter((code) => otherCodes.has(code));
        if (overlap.length) {
          overlap.forEach((code) => sharedInputCodes.add(code));
          sharedWith.push(String(other.name || other.code || other.key || 'Другой показатель'));
        }
      }
      const familyConflict = conflicts.has(family);
      const included = includedKeys.has(signal.key);
      let exclusionReason = '';
      if (familyConflict) {
        exclusionReason = 'Конфликт направлений у разных определений одного семейства; семейство исключено';
      } else if (signal.direction === 'context') {
        exclusionReason = 'Контекстное направление: методика не подтверждает монотонную связь с устойчивостью';
      } else if (!['higher', 'lower'].includes(signal.direction)) {
        exclusionReason = 'Не определено направление изменения';
      } else if (signal.conflictAfterLatest) {
        exclusionReason = 'Есть более новое конфликтующее наблюдение; текущий сигнал подавлен';
      } else if (signal.adverse == null) {
        exclusionReason = signal.excludedConflictingPeriods > 0
          ? 'Нет сопоставимой пары после исключения конфликтующих значений'
          : 'Нет соседней сопоставимой истории по периоду, частоте или году';
      } else if (!included) {
        exclusionReason = 'Схлопнут в семейство зависимых/дублирующих сигналов; учитывается один представитель';
      }
      const qualityNotes = [];
      if (!sourcePresent) qualityNotes.push('У последнего наблюдения не указан источник');
      if (signal.latestIsProvisional) qualityNotes.push('Последнее наблюдение помечено источником как предварительная оценка/неокончательный итог');
      if (signal.excludedConflictingPeriods > 0) qualityNotes.push('Из истории исключено конфликтующих периодов: ' + signal.excludedConflictingPeriods);
      if (sharedInputCodes.size) qualityNotes.push('Есть общие исходные компоненты с другими показателями; это пересечение входов, а не доказательство математической тождественности');
      output.push({
        municipalityId: assessment.id ?? assessment.municipalityId ?? '',
        municipality: assessment.name ?? assessment.municipalityName ?? String(assessment.id ?? ''),
        code: signal.code || '',
        name: signal.name || '',
        inclusionStatus: exclusionReason ? 'excluded' : signal.adverse === true ? 'negative' : 'no_adverse',
        includedInCount: !exclusionReason,
        criticalEligible,
        criticalEligibilityReason,
        direction: signal.direction || 'unknown',
        family,
        familyMembers: familyCounts.get(family) || 1,
        pillar: signal.pillar?.title || signal.pillar?.key || '',
        previousValue: previous.numericValue ?? '',
        previousPeriod: previous.reference_period || previous.reference_year || '',
        currentValue: latest.numericValue ?? '',
        currentPeriod: latest.reference_period || latest.reference_year || '',
        change: signal.change ?? '',
        unit: signal.unit || '',
        inputIndicatorCodes: inputCodes,
        sharedInputCodes: [...sharedInputCodes],
        sharedWith: [...new Set(sharedWith)],
        exclusionReason,
        qualityNotes,
        confidenceLabel: signal.confidenceLabel || '',
        confidenceReason: signal.confidenceReason || '',
        sourceIds,
        sourceUrls,
      });
    }
  }
  return output;
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
  for (const row of verified) {
    const key = rowKey(row);
    if (!grouped.has(key)) grouped.set(key, { rows: {}, ambiguousCodes: new Set() });
    const bucket = grouped.get(key);
    const code = String(row.indicator_code || '');
    if (!bucket.ambiguousCodes.has(code)) {
      const existing = bucket.rows[code];
      if (!existing) bucket.rows[code] = row;
      else if (Number(existing.value) !== Number(row.value)
        || !sameUnit(existing, row)
        || String(existing.indicator_name ?? '').trim() !== String(row.indicator_name ?? '').trim()) {
        // Same code and value do not prove the same statistical definition.
        // If the source wording changes within a municipality-period bucket,
        // quarantine that code rather than derive ratios from an ambiguous row.
        delete bucket.rows[code];
        bucket.ambiguousCodes.add(code);
      } else {
        const sourceIds = [...new Set([
          ...(Array.isArray(existing.source_ids) ? existing.source_ids : []),
          ...(existing.source_id ? [existing.source_id] : []),
          ...(row.source_id ? [row.source_id] : []),
        ])];
        const sourceUrls = [...new Set([
          ...(Array.isArray(existing.source_urls) ? existing.source_urls : []),
          ...(existing.source_url ? [existing.source_url] : []),
          ...(row.source_url ? [row.source_url] : []),
        ])];
        bucket.rows[code] = { ...existing, source_ids: sourceIds, source_urls: sourceUrls };
      }
    }
  }

  const populationByMunicipalityYear = new Map();
  const populationByMunicipalityDateSeries = new Map();
  for (const bucket of grouped.values()) {
    const population = bucket.rows.population_municipality;
    if (!population || Number(population.value) <= 0) continue;
    const municipalityYearKey = String(population.municipality_id) + '|' + String(population.reference_year);
    if (!populationByMunicipalityYear.has(municipalityYearKey)) populationByMunicipalityYear.set(municipalityYearKey, []);
    populationByMunicipalityYear.get(municipalityYearKey).push(population);

    const parsedPeriod = parseRiskPeriod(population);
    // The source currently supplies 1 January snapshots. Keep a same-date
    // comparison key so future point-in-time releases cannot be mixed silently.
    if (parsedPeriod?.frequency === 'point_in_time' && parsedPeriod.slot === 101) {
      const seriesKey = String(population.municipality_id) + '|0101|' + String(population.unit || '');
      if (!populationByMunicipalityDateSeries.has(seriesKey)) populationByMunicipalityDateSeries.set(seriesKey, []);
      populationByMunicipalityDateSeries.get(seriesKey).push(population);
    }
  }

  const derived = [];
  const push = (base, code, name, value, unit, directionNote, provenanceRows = [base], referencePeriod = base?.reference_period || null) => {
    if (!base || !Number.isFinite(value)) return;
    const inputs = (Array.isArray(provenanceRows) ? provenanceRows : [base]).filter(Boolean);
    const sourceIds = [...new Set(inputs.flatMap((row) => [
      ...(Array.isArray(row.source_ids) ? row.source_ids : []),
      ...(row.source_id ? [row.source_id] : []),
    ]).map((value) => String(value).trim()).filter(Boolean))];
    const sourceUrls = [...new Set(inputs.flatMap((row) => [
      ...(Array.isArray(row.source_urls) ? row.source_urls : []),
      ...(row.source_url ? [row.source_url] : []),
    ]).map((value) => String(value).trim()).filter(Boolean))];
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
      input_indicator_codes: [...new Set(inputs
        .map((row) => String(row.indicator_code ?? '').trim())
        .filter(Boolean))],
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

  // A unique population snapshot per municipality/year remains the only
  // permitted denominator for same-year per-capita investment.
  // For risk monitoring, derive an annual YoY growth point only from consecutive
  // 1 January snapshots. Do not bridge missing calendar years or mix snapshot dates.
  for (const history of populationByMunicipalityDateSeries.values()) {
    const points = history.slice().sort((a, b) => Number(a.reference_year) - Number(b.reference_year));
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      if (Number(current.reference_year) - Number(previous.reference_year) !== 1
        || !sameUnit(previous, current)
        || Number(previous.value) <= 0
        || Number(current.value) <= 0) continue;
      const yearOverYear = (Number(current.value) / Number(previous.value) - 1) * 100;
      push(
        current,
        'derived_population_growth_rate',
        'Годовое изменение численности населения к 1 января',
        yearOverYear,
        '% за год',
        'Расчёт по двум последовательным подтверждённым срезам на 1 января; пропуски лет не интерполируются. Показатель не заменяет полный демографический баланс рождаемости, смертности и миграции.',
        [previous, current],
        'annual',
      );
    }
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
