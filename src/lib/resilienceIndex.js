// Transparent six-pillar municipal resilience index.
// This module deliberately refuses to infer indicator meaning, period, geography,
// direction, or missing values. Definitions must be explicitly approved by method owners.
export const INDEX_PILLARS = Object.freeze([
  { key: 'economy', title: 'Экономика', weight: 0.20 },
  { key: 'labour', title: 'Труд', weight: 0.20 },
  { key: 'demography', title: 'Демография', weight: 0.15 },
  { key: 'finance', title: 'Финансы', weight: 0.15 },
  { key: 'social', title: 'Социальная сфера', weight: 0.15 },
  { key: 'infrastructure', title: 'Инфраструктура', weight: 0.15 },
]);

const PILLAR_KEYS = new Set(INDEX_PILLARS.map((item) => item.key));
const isFiniteValue = (value) => value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '') && Number.isFinite(Number(value));

const quantile = (sorted, p) => {
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

// Mid-rank percentile: ties receive the same score; no arbitrary order by municipality.
export function percentileScore(value, peers, direction = 'higher') {
  if (!isFiniteValue(value) || !Array.isArray(peers)) return null;
  const values = peers.filter(isFiniteValue).map(Number).sort((a, b) => a - b);
  if (!['higher', 'lower'].includes(direction) || values.length < 5) return null;
  const x = Number(value);
  const less = values.filter((v) => v < x).length;
  const equal = values.filter((v) => v === x).length;
  const rank = ((less + equal / 2) / values.length) * 100;
  return Math.round((direction === 'higher' ? rank : 100 - rank) * 100) / 100;
}

function keyOf(row) {
  return [String(row.municipality_id), String(row.indicator_code), String(row.reference_year), String(row.reference_period || 'annual')].join('|');
}

function comparableGroupKey(row) {
  return [String(row.indicator_code), String(row.reference_year), String(row.reference_period || 'annual'), String(row.unit || '')].join('|');
}

function summarize(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  return { min: sorted[0], max: sorted[sorted.length - 1], median: quantile(sorted, 0.5), q1, q3, outlierCount: sorted.filter((v) => v < low || v > high).length };
}

export function calculateMunicipalIndex(rows = [], municipalities = [], options = {}) {
  const year = Number(options.referenceYear);
  const period = String(options.referencePeriod ?? '');
  const definitions = Array.isArray(options.indicatorDefinitions) ? options.indicatorDefinitions : [];
  const minPeers = Math.max(5, Math.trunc(Number(options.minimumPeers) || 5));
  const definitionByCode = new Map();

  const definitionErrors = [];
  const duplicateDefinitions = new Set();
  for (const definition of definitions) {
    if (!definition?.code || !PILLAR_KEYS.has(definition.pillar) || !['higher', 'lower'].includes(definition.direction)) {
      definitionErrors.push({ code: definition?.code || null, reason: 'invalid_or_unapproved_definition' });
      continue;
    }
    const code = String(definition.code);
    if (definitionByCode.has(code) || duplicateDefinitions.has(code)) {
      definitionErrors.push({ code, reason: 'duplicate_definition' });
      definitionByCode.delete(code);
      duplicateDefinitions.add(code);
      continue;
    }
    definitionByCode.set(code, definition);
  }

  const targetRows = (Array.isArray(rows) ? rows : []).filter((row) =>
    row
    && row.verification_status === 'verified'
    && row.geographic_level === 'municipality'
    && Number.isInteger(year)
    && period.trim() !== ''
    && Number(row.reference_year) === year
    && String(row.reference_period || 'annual') === period
    && isFiniteValue(row.value)
    && definitionByCode.has(String(row.indicator_code))
    && row.municipality_id != null
    && String(row.unit || '').trim() !== ''
  );

  // Ambiguous duplicate observations are excluded as a whole; never "last row wins".
  const counts = new Map();
  for (const row of targetRows) counts.set(keyOf(row), (counts.get(keyOf(row)) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key);
  const duplicateSet = new Set(duplicates);
  const uniqueRows = targetRows.filter((row) => !duplicateSet.has(keyOf(row)));

  const groups = new Map();
  for (const row of uniqueRows) {
    const key = comparableGroupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const scoredByMunicipality = new Map();
  const indicatorDiagnostics = [];
  for (const [groupKey, group] of groups) {
    const distinctMunicipalities = new Set(group.map((row) => String(row.municipality_id)));
    const definition = definitionByCode.get(String(group[0].indicator_code));
    const peerValues = group.map((row) => Number(row.value));
    const distribution = summarize(peerValues);
    const usable = distinctMunicipalities.size >= minPeers;
    indicatorDiagnostics.push({
      code: definition.code,
      pillar: definition.pillar,
      unit: group[0].unit,
      municipalityCount: distinctMunicipalities.size,
      comparable: usable,
      distribution,
      reason: usable ? null : 'insufficient_peer_coverage',
      groupKey,
    });
    if (!usable) continue;
    for (const row of group) {
      const score = percentileScore(row.value, peerValues, definition.direction);
      if (score === null) continue;
      const id = String(row.municipality_id);
      if (!scoredByMunicipality.has(id)) scoredByMunicipality.set(id, []);
      scoredByMunicipality.get(id).push({
        code: definition.code,
        name: definition.name || definition.code,
        pillar: definition.pillar,
        direction: definition.direction,
        rawValue: Number(row.value),
        unit: row.unit,
        score,
        sourceId: row.source_id || null,
        sourceUrl: row.source_url || null,
        year,
        period,
      });
    }
  }

  const results = {};
  for (const municipality of municipalities) {
    const id = String(municipality.id ?? municipality.municipality_id ?? '');
    const indicatorScores = scoredByMunicipality.get(id) || [];
    const pillars = INDEX_PILLARS.map((pillar) => {
      const items = indicatorScores.filter((item) => item.pillar === pillar.key);
      return {
        ...pillar,
        score: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length * 100) / 100 : null,
        indicatorCount: items.length,
        indicators: items,
      };
    });
    const available = pillars.filter((pillar) => pillar.score !== null);
    const availableWeight = available.reduce((sum, pillar) => sum + pillar.weight, 0);
    const complete = available.length === INDEX_PILLARS.length;
    // Partial weighted averages are intentionally not called an integrated index:
    // re-normalizing weights on different pillar sets makes municipalities incomparable.
    const index = complete
      ? Math.round(pillars.reduce((sum, pillar) => sum + pillar.score * pillar.weight, 0) * 100) / 100
      : null;
    results[id] = {
      municipalityId: id,
      municipalityName: municipality.name || id,
      index,
      status: complete ? 'complete' : 'insufficient_coverage',
      availablePillars: available.length,
      availableWeightPercent: Math.round(availableWeight * 10000) / 100,
      coveragePercent: Math.round((indicatorScores.length / Math.max(1, definitions.length)) * 10000) / 100,
      pillars,
      indicatorCount: indicatorScores.length,
      explanation: complete
        ? 'Индекс рассчитан по всем шести направлениям. Внутри направления показатели имеют равный вес; итоговые веса направлений фиксированы методологией.'
        : 'Полный интегральный индекс не рассчитан: отсутствует сопоставимое покрытие одного или нескольких направлений. Пропуски не заменяются нулями, веса не перераспределяются.',
    };
  }

  return {
    referenceYear: Number.isFinite(year) ? year : null,
    referencePeriod: period,
    indexScale: '0–100 percentile score',
    pillars: INDEX_PILLARS,
    results,
    diagnostics: {
      inputRows: Array.isArray(rows) ? rows.length : 0,
      eligibleRows: targetRows.length,
      uniqueRows: uniqueRows.length,
      duplicateLogicalKeysExcluded: duplicates.length,
      duplicateKeys: duplicates,
      comparableIndicatorGroups: indicatorDiagnostics.filter((item) => item.comparable).length,
      excludedIndicatorGroups: indicatorDiagnostics.filter((item) => !item.comparable).length,
      indicatorGroups: indicatorDiagnostics,
      definitionErrors,
      minimumPeers: minPeers,
    },
  };
}

export function calculateLeaveOneOutSensitivity(indexResult) {
  if (!indexResult || !Number.isFinite(indexResult.index)) return { available: false, reason: 'full_index_required', indicators: [], pillars: [] };
  const all = indexResult.pillars;
  const baseline = indexResult.index;
  const indicatorResults = [];
  const pillarResults = [];
  for (const pillar of all) {
    for (const item of pillar.indicators) {
      const remaining = pillar.indicators.filter((candidate) => candidate.code !== item.code);
      if (!remaining.length) {
        indicatorResults.push({ code: item.code, pillar: pillar.key, indexWithoutIndicator: null, delta: null, reason: 'pillar_becomes_unavailable' });
        continue;
      }
      const replacement = remaining.reduce((sum, candidate) => sum + candidate.score, 0) / remaining.length;
      const adjustedPillar = all.reduce((sum, candidate) => sum + (candidate.key === pillar.key ? replacement : candidate.score) * candidate.weight, 0);
      indicatorResults.push({ code: item.code, pillar: pillar.key, indexWithoutIndicator: Math.round(adjustedPillar * 100) / 100, delta: Math.round((adjustedPillar - baseline) * 100) / 100, reason: null });
    }
  }
  for (const pillar of all) {
    const remainingWeight = all.filter((candidate) => candidate.key !== pillar.key).reduce((sum, candidate) => sum + candidate.weight, 0);
    const without = all.filter((candidate) => candidate.key !== pillar.key).reduce((sum, candidate) => sum + candidate.score * candidate.weight, 0) / remainingWeight;
    pillarResults.push({ pillar: pillar.key, indexWithoutPillar: Math.round(without * 100) / 100, delta: Math.round((without - baseline) * 100) / 100 });
  }
  return { available: true, baseline, indicators: indicatorResults, pillars: pillarResults };
}
