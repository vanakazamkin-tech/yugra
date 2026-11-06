import { parseRiskPeriod, countConsecutiveAdverseIntervals } from './riskModel.js';
import { classify } from './indicatorClassification.js';
import { directionForRiskIndicator } from './riskDirection.js';

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
export function buildRiskSeries(rows) {
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
    candidates.forEach((duplicates) => {
      if (new Set(duplicates.map((item) => item.numericValue)).size > 1) {
        excludedConflictingPeriods += 1;
        return;
      }
      duplicates.sort((a, b) => new Date(b.retrieved_at || 0) - new Date(a.retrieved_at || 0));
      points.push(duplicates[0]);
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
    const change = comparable ? latest.numericValue - previous.numericValue : null;
    const changePercent = comparable && previous.numericValue !== 0 ? change / Math.abs(previous.numericValue) * 100 : null;
    const direction = directionFor(latest);
    const adverse = change == null || direction === 'context' ? null : direction === 'lower' ? change > 0 : change < 0;
    const adverseStreak = countConsecutiveAdverseIntervals(points, direction);
    result.push({ key, municipalityId: latest.municipality_id, code: latest.indicator_code, name: safeText(latest.indicator_name) || latest.indicator_code, unit: latest.unit || '—', pillar: classify(latest), direction, points, latest, previous, change, changePercent, adverse, adverseStreak, excludedConflictingPeriods });
  });
  return result;
}
