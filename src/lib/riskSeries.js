import { parseRiskPeriod, countConsecutiveAdverseIntervals, DEFAULT_RISK_THRESHOLDS } from './riskModel.js';
import { classify } from './indicatorClassification.js';
import { directionForRiskIndicator, riskSignalFamilyFor } from './riskDirection.js';

const number = (value) => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const safeText = (value) => String(value ?? '').trim();
const directionFor = directionForRiskIndicator;

const signature = (row) => {
  const parsed = parseRiskPeriod(row);
  return parsed ? parsed.frequency + '-' + parsed.slot : 'unverified:' + safeText(row.reference_period).toLowerCase();
};
const periodOrder = (row) => {
  const parsed = parseRiskPeriod(row);
  return parsed ? parsed.year * 10 + parsed.slot : Number.NEGATIVE_INFINITY;
};
export function buildRiskSeries(rows, thresholds = DEFAULT_RISK_THRESHOLDS) {
  const groups = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || row.verification_status !== 'verified' || row.geographic_level !== 'municipality') return;
    const value = number(row.value);
    if (value == null || !safeText(row.municipality_id) || !safeText(row.indicator_code)) return;
    const key = [row.municipality_id, row.indicator_code, row.unit || '', signature(row)].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...row, numericValue: value, order: periodOrder(row) });
  });
  const result = [];
  groups.forEach((items, key) => {
    const candidates = new Map();
    items.forEach((item) => {
      const parsed = parseRiskPeriod(item);
      const naturalYear = parsed?.year ?? String(item.reference_year ?? '');
      const natural = [naturalYear, signature(item)].join('|');
      if (!candidates.has(natural)) candidates.set(natural, []);
      candidates.get(natural).push(item);
    });
    const points = [];
    let excludedConflictingPeriods = 0;
    let latestConflictOrder = Number.NEGATIVE_INFINITY;
    candidates.forEach((duplicates) => {
      if (new Set(duplicates.map((item) => item.numericValue)).size > 1) {
        excludedConflictingPeriods += 1;
        const parsedConflict = parseRiskPeriod(duplicates[0]);
        const conflictOrder = parsedConflict ? parsedConflict.year * 10 + parsedConflict.slot : Number.NEGATIVE_INFINITY;
        latestConflictOrder = Math.max(latestConflictOrder, conflictOrder);
        return;
      }
      duplicates.sort((a, b) => new Date(b.retrieved_at || 0) - new Date(a.retrieved_at || 0));
      const chosen = duplicates[0];
      const sourceIds = [...new Set(duplicates.flatMap((item) => [
        ...(Array.isArray(item.source_ids) ? item.source_ids : []),
        ...(item.source_id ? [item.source_id] : []),
      ]).filter(Boolean))];
      const sourceUrls = [...new Set(duplicates.flatMap((item) => [
        ...(Array.isArray(item.source_urls) ? item.source_urls : []),
        ...(item.source_url ? [item.source_url] : []),
      ]).filter(Boolean))];
      points.push({
        ...chosen,
        source_ids: sourceIds,
        source_urls: sourceUrls,
        source_id: sourceIds.length === 1 ? sourceIds[0] : null,
        source_url: sourceUrls.length === 1 ? sourceUrls[0] : null,
      });
    });
    points.sort((a, b) => a.order - b.order);
    if (!points.length) return;
    const latest = points[points.length - 1];
    const previous = points.length > 1 ? points[points.length - 2] : null;
    const currentPeriod = parseRiskPeriod(latest);
    const previousPeriod = previous ? parseRiskPeriod(previous) : null;
    const comparable = currentPeriod && previousPeriod
      && currentPeriod.frequency === previousPeriod.frequency
      && currentPeriod.slot === previousPeriod.slot
      && currentPeriod.year - previousPeriod.year === 1;
    const conflictAfterLatest = latestConflictOrder > latest.order;
    const change = comparable && !conflictAfterLatest ? latest.numericValue - previous.numericValue : null;
    const changePercent = comparable && previous.numericValue !== 0 ? change / Math.abs(previous.numericValue) * 100 : null;
    const direction = directionFor(latest);
    const adverse = change == null || direction === 'context' ? null : direction === 'lower' ? change > 0 : change < 0;
    const sharpChangeThreshold = Number.isFinite(Number(thresholds?.sharpChangePercent)) ? Math.max(1, Math.min(100, Number(thresholds.sharpChangePercent))) : DEFAULT_RISK_THRESHOLDS.sharpChangePercent;
    const sharpChange = adverse === true && changePercent != null && Math.abs(changePercent) >= sharpChangeThreshold;
    const adverseStreak = conflictAfterLatest ? 0 : countConsecutiveAdverseIntervals(points, direction);
    const sourcePresent = points.every((point) =>
      Boolean(point.source_id || point.source_url
        || (Array.isArray(point.source_ids) && point.source_ids.length)
        || (Array.isArray(point.source_urls) && point.source_urls.length))
    );
    const historyConsistent = points.length >= 3 && points.slice(1).every((point, index) => {
      const current = parseRiskPeriod(point), prior = parseRiskPeriod(points[index]);
      return current && prior && current.frequency === prior.frequency && current.slot === prior.slot && current.year - prior.year === 1;
    });
    let confidenceLevel = 'low';
    let confidenceLabel = 'Низкая';
    let confidenceReason = 'Нет подтверждённого сопоставимого интервала или метаданных источника.';
    if (excludedConflictingPeriods > 0) {
      confidenceReason = 'Есть конфликтующие дубликаты; они исключены из временного ряда.';
    } else if (!sourcePresent) {
      confidenceReason = 'Не заполнены идентификатор или ссылка на источник.';
    } else if (!comparable) {
      confidenceReason = 'Для последнего значения нет соседнего сопоставимого периода.';
    } else if (historyConsistent) {
      confidenceLevel = 'high';
      confidenceLabel = 'Высокая';
      confidenceReason = 'Источник указан; не менее трёх последовательных сопоставимых наблюдений без разрывов.';
    } else {
      confidenceLevel = 'medium';
      confidenceLabel = 'Средняя';
      confidenceReason = 'Источник указан; последнее изменение сопоставимо, но история короткая.';
    }
    result.push({ key, municipalityId: latest.municipality_id, code: latest.indicator_code, signalFamily: riskSignalFamilyFor(latest.indicator_code), name: safeText(latest.indicator_name) || latest.indicator_code, unit: latest.unit || '—', pillar: classify(latest), direction, points, latest, previous, change, changePercent, adverse, sharpChange, sharpChangeThreshold, adverseStreak, excludedConflictingPeriods, conflictAfterLatest, confidenceLevel, confidenceLabel, confidenceReason });
  });
  return result;
}
