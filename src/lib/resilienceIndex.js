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
const DECIMAL_VALUE_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;

const isFiniteValue = (value) => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;
  const normalized = value.trim();
  return normalized !== ''
    && DECIMAL_VALUE_PATTERN.test(normalized)
    && Number.isFinite(Number(normalized));
};

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
  return [String(row.municipality_id), String(row.indicator_code), String(row.reference_year), String(row.reference_period ?? '')].join('|');
}

function comparableGroupKey(row) {
  return [String(row.indicator_code), String(row.reference_year), String(row.reference_period ?? ''), String(row.unit || '')].join('|');
}

function summarize(values) {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: quantile(sorted, 0.5),
    q1,
    q3,
    lowerFence,
    upperFence,
    outlierCount: sorted.filter((v) => v < lowerFence || v > upperFence).length,
  };
}

export function calculateMunicipalIndex(rows = [], municipalities = [], options = {}) {
  const rawYear = options.referenceYear;
  const year = rawYear === null || rawYear === undefined || String(rawYear).trim() === '' ? NaN : Number(rawYear);
  const period = String(options.referencePeriod ?? '');
  const definitions = Array.isArray(options.indicatorDefinitions) ? options.indicatorDefinitions : [];
  const minPeers = Math.max(5, Math.trunc(Number(options.minimumPeers) || 5));
  const definitionByCode = new Map();

  const definitionErrors = [];
  const duplicateDefinitions = new Set();
  for (const definition of definitions) {
    if (!definition?.code || !PILLAR_KEYS.has(definition.pillar) || !['higher', 'lower'].includes(definition.direction)
      || !Array.isArray(definition.acceptedNames) || definition.acceptedNames.length === 0
      || definition.acceptedNames.some((name) => typeof name !== 'string' || name.trim() === '')) {
      definitionErrors.push({ code: definition?.code || null, reason: 'invalid_or_unapproved_definition_or_source_names' });
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

  const municipalityRows = Array.isArray(municipalities) ? municipalities : [];
  const municipalityIdOf = (municipality) => {
    const value = municipality?.id ?? municipality?.municipality_id;
    return value == null ? '' : String(value).trim();
  };
  const declaredMunicipalityIds = [...new Set(municipalityRows.map(municipalityIdOf).filter(Boolean))].sort();
  const declaredMunicipalityIdSet = new Set(declaredMunicipalityIds);
  const baseCandidateRows = (Array.isArray(rows) ? rows : []).filter((row) =>
    row
    && row.verification_status === 'verified'
    && row.geographic_level === 'municipality'
    && Number.isInteger(year)
    && period.trim() !== ''
    && Number(row.reference_year) === year
    && String(row.reference_period ?? '') === period
    && isFiniteValue(row.value)
    && definitionByCode.has(String(row.indicator_code))
    && row.municipality_id != null
    && String(row.unit || '').trim() !== ''
  );
  const unknownMunicipalityIds = [...new Set(baseCandidateRows
    .map((row) => String(row.municipality_id).trim())
    .filter((id) => declaredMunicipalityIdSet.size > 0 && !declaredMunicipalityIdSet.has(id)))].sort();
  const baseEligibleRows = baseCandidateRows.filter((row) =>
    declaredMunicipalityIdSet.size === 0 || declaredMunicipalityIdSet.has(String(row.municipality_id).trim())
  );
  const targetRows = baseEligibleRows.filter((row) =>
    definitionByCode.get(String(row.indicator_code)).acceptedNames.includes(String(row.indicator_name || '').trim())
  );

  // Ambiguous duplicate observations are excluded as a whole; never "last row wins".
  const counts = new Map();
  for (const row of targetRows) counts.set(keyOf(row), (counts.get(keyOf(row)) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key).sort();
  const duplicateSet = new Set(duplicates);
  const uniqueRows = targetRows
    .filter((row) => !duplicateSet.has(keyOf(row)))
    .sort((left, right) => {
      const leftKey = [left.indicator_code, left.municipality_id, left.reference_year, left.reference_period ?? '', left.unit];
      const rightKey = [right.indicator_code, right.municipality_id, right.reference_year, right.reference_period ?? '', right.unit];
      for (let index = 0; index < leftKey.length; index += 1) {
        const comparison = String(leftKey[index]).localeCompare(String(rightKey[index]));
        if (comparison !== 0) return comparison;
      }
      return 0;
    });

  const groups = new Map();
  const unitsByIndicator = new Map();
  for (const row of uniqueRows) {
    const code = String(row.indicator_code);
    if (!unitsByIndicator.has(code)) unitsByIndicator.set(code, new Set());
    unitsByIndicator.get(code).add(String(row.unit).trim());
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
    const inconsistentUnits = (unitsByIndicator.get(String(definition.code))?.size || 0) > 1;
    const usable = distinctMunicipalities.size >= minPeers && !inconsistentUnits;
    indicatorDiagnostics.push({
      code: definition.code,
      pillar: definition.pillar,
      unit: group[0].unit,
      municipalityCount: distinctMunicipalities.size,
      peerMunicipalityIds: [...distinctMunicipalities].sort(),
      peerCoveragePercent: declaredMunicipalityIds.length
        ? Math.round((distinctMunicipalities.size / declaredMunicipalityIds.length) * 10000) / 100
        : null,
      peerMunicipalityCountOutsideRegistry: [...distinctMunicipalities].filter((id) => !declaredMunicipalityIdSet.has(id)).length,
      comparable: usable,
      distribution,
      outliers: distribution
        ? group
          .filter((row) => Number(row.value) < distribution.lowerFence || Number(row.value) > distribution.upperFence)
          .map((row) => ({ municipalityId: String(row.municipality_id), value: Number(row.value) }))
        : [],
      reason: inconsistentUnits ? 'inconsistent_units_across_municipalities' : usable ? null : 'insufficient_peer_coverage',
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
  const municipalityIdCounts = new Map();
  for (const municipality of municipalityRows) {
    const id = municipalityIdOf(municipality);
    if (id) municipalityIdCounts.set(id, (municipalityIdCounts.get(id) || 0) + 1);
  }
  const duplicateMunicipalityIds = [...municipalityIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();
  const duplicateMunicipalityIdSet = new Set(duplicateMunicipalityIds);
  const sortedMunicipalityRows = municipalityRows
    .filter((municipality) => municipalityIdOf(municipality) && !duplicateMunicipalityIdSet.has(municipalityIdOf(municipality)))
    .slice()
    .sort((left, right) => municipalityIdOf(left).localeCompare(municipalityIdOf(right)));
  for (const municipality of sortedMunicipalityRows) {
    const id = municipalityIdOf(municipality);
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
    const coveredIndicatorCodes = new Set(indicatorScores.map((item) => item.code)).size;
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
      approvedIndicatorCount: definitionByCode.size,
      coveredIndicatorCount: coveredIndicatorCodes,
      missingIndicatorCount: Math.max(0, definitionByCode.size - coveredIndicatorCodes),
      coveragePercent: definitionByCode.size ? Math.round((coveredIndicatorCodes / definitionByCode.size) * 10000) / 100 : 0,
      coveredPillarKeys: available.map((pillar) => pillar.key),
      missingPillarKeys: pillars.filter((pillar) => pillar.score === null).map((pillar) => pillar.key),
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
      rowsRejectedForUnapprovedIndicatorName: baseEligibleRows.length - targetRows.length,
      rowsRejectedForUnknownMunicipality: baseCandidateRows.length - baseEligibleRows.length,
      unknownMunicipalityIds,
      uniqueRows: uniqueRows.length,
      duplicateLogicalKeysExcluded: duplicates.length,
      duplicateKeys: duplicates,
      comparableIndicatorGroups: indicatorDiagnostics.filter((item) => item.comparable).length,
      excludedIndicatorGroups: indicatorDiagnostics.filter((item) => !item.comparable).length,
      indicatorGroups: indicatorDiagnostics,
      definitionErrors,
      minimumPeers: minPeers,
      municipalityRows: municipalityRows.length,
      invalidMunicipalityRows: municipalityRows.filter((municipality) => !municipalityIdOf(municipality)).length,
      duplicateMunicipalityIds,
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


// Compare municipal ordering between a baseline and a sensitivity scenario.
// Inputs are { municipalityId: score } maps; only municipalities present in both
// maps with finite scores are compared. This is a diagnostic, not a new index.
function averageRanks(entries) {
  const sorted = entries.slice().sort((a, b) => a.value - b.value || a.id.localeCompare(b.id));
  const ranks = new Map();
  for (let start = 0; start < sorted.length;) {
    let end = start + 1;
    while (end < sorted.length && sorted[end].value === sorted[start].value) end += 1;
    const averageRank = ((start + 1) + end) / 2;
    for (let i = start; i < end; i += 1) ranks.set(sorted[i].id, averageRank);
    start = end;
  }
  return ranks;
}

function pearsonCorrelation(left, right) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftSquares = 0;
  let rightSquares = 0;
  for (let i = 0; i < left.length; i += 1) {
    const x = left[i] - leftMean;
    const y = right[i] - rightMean;
    numerator += x * y;
    leftSquares += x * x;
    rightSquares += y * y;
  }
  const denominator = Math.sqrt(leftSquares * rightSquares);
  return denominator ? numerator / denominator : null;
}

function quartileSet(entries, side) {
  const sorted = entries.slice().sort((a, b) => side === 'top'
    ? b.value - a.value || a.id.localeCompare(b.id)
    : a.value - b.value || a.id.localeCompare(b.id));
  const count = Math.ceil(sorted.length / 4);
  if (count < sorted.length && sorted[count - 1].value === sorted[count].value) return null;
  return new Set(sorted.slice(0, count).map((item) => item.id));
}

function setOverlapRatio(left, right) {
  if (!left || !right) return null;
  let overlap = 0;
  for (const id of left) if (right.has(id)) overlap += 1;
  return Math.round((overlap / left.size) * 10000) / 100;
}

// Spearman rank correlation and top/bottom-quartile retention quantify how much
// municipal ordering changes under leave-one-out, weight, or normalization scenarios.
export function compareMunicipalRankings(baselineScores = {}, scenarioScores = {}, options = {}) {
  const minimumMunicipalities = Math.max(5, Math.trunc(Number(options.minimumMunicipalities) || 5));
  const ids = Object.keys(baselineScores).filter((id) =>
    Object.prototype.hasOwnProperty.call(scenarioScores, id)
    && isFiniteValue(baselineScores[id])
    && isFiniteValue(scenarioScores[id])
  ).sort();
  if (ids.length < minimumMunicipalities) {
    return { available: false, reason: 'insufficient_common_municipalities', municipalityCount: ids.length, minimumMunicipalities };
  }
  const baseline = ids.map((id) => ({ id, value: Number(baselineScores[id]) }));
  const scenario = ids.map((id) => ({ id, value: Number(scenarioScores[id]) }));
  const baselineRanks = averageRanks(baseline);
  const scenarioRanks = averageRanks(scenario);
  const leftRanks = ids.map((id) => baselineRanks.get(id));
  const rightRanks = ids.map((id) => scenarioRanks.get(id));
  const rankCorrelation = pearsonCorrelation(leftRanks, rightRanks);
  const meanAbsoluteRankShift = leftRanks.reduce((sum, rank, index) =>
    sum + Math.abs(rank - rightRanks[index]), 0) / ids.length;
  const denominator = Math.max(1, ids.length - 1);
  const baselineTop = quartileSet(baseline, 'top');
  const scenarioTop = quartileSet(scenario, 'top');
  const baselineBottom = quartileSet(baseline, 'bottom');
  const scenarioBottom = quartileSet(scenario, 'bottom');
  return {
    available: true,
    municipalityCount: ids.length,
    spearmanRankCorrelation: rankCorrelation === null ? null : Math.round(rankCorrelation * 10000) / 10000,
    meanAbsoluteRankShiftPercentilePoints: Math.round((meanAbsoluteRankShift / denominator) * 10000) / 100,
    topQuartileRetentionPercent: setOverlapRatio(baselineTop, scenarioTop),
    bottomQuartileRetentionPercent: setOverlapRatio(baselineBottom, scenarioBottom),
    quartileOverlapUnavailableReason: [baselineTop, scenarioTop, baselineBottom, scenarioBottom].some((set) => set === null)
      ? 'ties_at_quartile_boundary'
      : null,
  };
}


// Inspect whether indicators inside a pillar move together after normalization,
// and quantify each indicator's leave-one-out influence on complete municipal indices.
// High positive rank correlation is a review flag only; it never deletes an indicator.
export function analyzeIndicatorDominance(indexResult, options = {}) {
  const results = indexResult?.results;
  if (!results || typeof results !== 'object') {
    return { available: false, reason: 'calculated_index_results_required', pillars: [] };
  }
  const minimumPairs = Math.max(5, Math.trunc(Number(options.minimumPairs) || 5));
  const overlapThreshold = Number.isFinite(Number(options.overlapThreshold))
    ? Math.min(1, Math.max(0, Number(options.overlapThreshold)))
    : 0.9;
  const municipalities = Object.values(results);
  const pillarReports = [];

  for (const pillar of INDEX_PILLARS) {
    const byCode = new Map();
    const pillarByMunicipality = new Map();
    for (const municipality of municipalities) {
      const pillarResult = municipality.pillars?.find((item) => item.key === pillar.key);
      if (!pillarResult) continue;
      const scores = new Map();
      for (const item of pillarResult.indicators || []) {
        if (isFiniteValue(item.score)) scores.set(String(item.code), Number(item.score));
      }
      pillarByMunicipality.set(String(municipality.municipalityId), { municipality, pillarResult, scores });
      for (const [code, score] of scores) {
        if (!byCode.has(code)) byCode.set(code, new Map());
        byCode.get(code).set(String(municipality.municipalityId), score);
      }
    }

    const indicators = [...byCode.entries()].map(([code, scores]) => {
      const influence = [];
      const nominalWeights = [];
      let pillarCount = 0;
      for (const { municipality, pillarResult } of pillarByMunicipality.values()) {
        if (pillarResult.indicators?.some((item) => String(item.code) === code)) {
          pillarCount += 1;
          const indicatorCount = new Set(pillarResult.indicators.map((item) => String(item.code))).size;
          if (indicatorCount) nominalWeights.push(1 / indicatorCount);
        }
        if (!Number.isFinite(municipality.index) || !Number.isFinite(pillarResult.score)) continue;
        const remaining = (pillarResult.indicators || []).filter((item) => String(item.code) !== code);
        if (!remaining.length) continue;
        const replacement = remaining.reduce((sum, item) => sum + Number(item.score), 0) / remaining.length;
        const scenarioIndex = INDEX_PILLARS.reduce((sum, current) => {
          const currentResult = municipality.pillars.find((item) => item.key === current.key);
          const score = current.key === pillar.key ? replacement : currentResult?.score;
          return sum + Number(score) * current.weight;
        }, 0);
        influence.push(scenarioIndex - municipality.index);
      }
      const absolute = influence.map(Math.abs);
      return {
        code,
        municipalityCount: scores.size,
        pillarCoverageCount: pillarCount,
        meanNominalWeightWithinPillar: nominalWeights.length ? Math.round((nominalWeights.reduce((sum, value) => sum + value, 0) / nominalWeights.length) * 10000) / 10000 : null,
        meanEffectiveIndexWeight: nominalWeights.length ? Math.round((nominalWeights.reduce((sum, value) => sum + value * pillar.weight, 0) / nominalWeights.length) * 10000) / 10000 : null,
        minimumNominalWeightWithinPillar: nominalWeights.length ? Math.round(Math.min(...nominalWeights) * 10000) / 10000 : null,
        maximumNominalWeightWithinPillar: nominalWeights.length ? Math.round(Math.max(...nominalWeights) * 10000) / 10000 : null,
        meanAbsoluteIndexShift: absolute.length ? Math.round((absolute.reduce((sum, value) => sum + value, 0) / absolute.length) * 100) / 100 : null,
        maximumAbsoluteIndexShift: absolute.length ? Math.round(Math.max(...absolute) * 100) / 100 : null,
        evaluatedMunicipalities: influence.length,
        leaveOneOutAvailable: influence.length > 0,
      };
    });

    const pairs = [];
    const codes = [...byCode.keys()].sort();
    for (let leftIndex = 0; leftIndex < codes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < codes.length; rightIndex += 1) {
        const leftCode = codes[leftIndex];
        const rightCode = codes[rightIndex];
        const commonIds = [...byCode.get(leftCode).keys()].filter((id) => byCode.get(rightCode).has(id)).sort();
        if (commonIds.length < minimumPairs) {
          pairs.push({ leftCode, rightCode, pairCount: commonIds.length, spearman: null, classification: 'insufficient_pairs' });
          continue;
        }
        const leftValues = commonIds.map((id) => ({ id, value: byCode.get(leftCode).get(id) }));
        const rightValues = commonIds.map((id) => ({ id, value: byCode.get(rightCode).get(id) }));
        const leftRanks = averageRanks(leftValues);
        const rightRanks = averageRanks(rightValues);
        const rho = pearsonCorrelation(commonIds.map((id) => leftRanks.get(id)), commonIds.map((id) => rightRanks.get(id)));
        const rounded = rho === null ? null : Math.round(rho * 10000) / 10000;
        const classification = rounded === null
          ? 'constant_or_undefined'
          : rounded >= overlapThreshold
            ? 'possible_positive_overlap_review'
            : rounded <= -overlapThreshold
              ? 'strong_inverse_relationship_review'
              : 'no_high_rank_correlation_flag';
        pairs.push({ leftCode, rightCode, pairCount: commonIds.length, spearman: rounded, classification });
      }
    }

    pillarReports.push({
      pillar: pillar.key,
      title: pillar.title,
      indicatorCount: indicators.length,
      indicators,
      pairs,
      reviewFlags: pairs.filter((pair) => pair.classification === 'possible_positive_overlap_review'
        || pair.classification === 'strong_inverse_relationship_review'),
      note: 'Корреляция рангов — диагностический сигнал, не доказательство дублирования или причинности.',
    });
  }
  return {
    available: true,
    municipalityCount: municipalities.length,
    minimumPairs,
    positiveOverlapThreshold: overlapThreshold,
    pillars: pillarReports,
  };
}

