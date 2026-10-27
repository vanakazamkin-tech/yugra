// Единый реестр показателей. Чтобы добавить показатель — добавьте объект в METRICS:
// он сразу появится в фильтрах, сравнении и конструкторе отчётов.
export const nf = (v, d = 0) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: d }).format(Number(v || 0));
const num = (x) => { const n = Number(x); return x === null || x === undefined || !Number.isFinite(n) ? null : n; };

export const kindOf = (m) => (/район/i.test(m.name) ? 'district' : 'city');
export const KIND_LABEL = { district: 'Муниципальный район', city: 'Городской округ' };

// dir: 1 — чем больше, тем лучше; -1 — чем меньше, тем лучше. additive — значения можно суммировать.
export const METRICS = [
  { key: 'score', label: 'Итоговый балл', short: 'Балл', unit: 'баллов', dir: 1, d: 1, get: (m) => num(m.score) },
  { key: 'rank2024', label: 'Место в рейтинге', short: 'Место', unit: 'место', dir: -1, d: 0, pre: '№ ', get: (m) => num(m.rank2024) },
  { key: 'investments', label: 'Инвестиции без добычи', short: 'Инвестиции', unit: 'млрд ₽', dir: 1, d: 1, suf: ' млрд ₽', additive: true, get: (m) => num(m.investments?.volumeBillion) },
  { key: 'growthPercent', label: 'Динамика инвестиций', short: 'Динамика', unit: '%', dir: 1, d: 0, suf: '%', get: (m) => num(m.investments?.growthPercent) },
  { key: 'smeCount', label: 'Субъекты МСП', short: 'МСП', unit: 'ед.', dir: 1, d: 0, additive: true, get: (m) => num(m.smeCount) },
  { key: 'assessmentScore', label: 'Оценка бизнеса', short: 'Бизнес', unit: 'из 5', dir: 1, d: 2, suf: ' / 5', get: (m) => num(m.assessmentScore) },
  { key: 'investPerSme', label: 'Инвестиции на 1 субъект МСП', short: 'Инв. на МСП', unit: 'млн ₽', dir: 1, d: 2, suf: ' млн ₽', derived: true,
    get: (m) => { const v = num(m.investments?.volumeBillion), s = num(m.smeCount); return v === null || !s ? null : (v * 1000) / s; } },
];
export const BY_KEY = Object.fromEntries(METRICS.map((x) => [x.key, x]));
export const val = (m, key) => BY_KEY[key].get(m);
export const show = (mt, v) => (v === null || v === undefined ? '—' : `${mt.pre || ''}${nf(v, mt.d)}${mt.suf || ''}`);
export const fmtVal = (m, key) => show(BY_KEY[key], val(m, key));

/** Сводная статистика показателя по выборке. best/worst учитывают направление (dir). */
export function stats(items, key) {
  const mt = BY_KEY[key];
  const vs = items.map((m) => ({ m, v: mt.get(m) })).filter((x) => x.v !== null);
  if (!vs.length) return null;
  const nums = vs.map((x) => x.v).sort((a, b) => a - b);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mid = Math.floor(nums.length / 2);
  const median = nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  const hi = vs.reduce((a, b) => (b.v > a.v ? b : a));
  const lo = vs.reduce((a, b) => (b.v < a.v ? b : a));
  return { n: nums.length, sum, avg: sum / nums.length, median, min: nums[0], max: nums[nums.length - 1], best: mt.dir > 0 ? hi : lo, worst: mt.dir > 0 ? lo : hi };
}

/** Нормировка 0–100 относительно всех территорий; 100 — лучшее значение с учётом направления. */
export function norm(m, key, all) {
  const s = stats(all, key), v = val(m, key);
  if (!s || v === null) return 0;
  if (s.max === s.min) return 50;
  const x = ((v - s.min) / (s.max - s.min)) * 100;
  return BY_KEY[key].dir > 0 ? x : 100 - x;
}

/** Отклонение в % от базы. Для места в рейтинге не считается. */
export const deltaPct = (v, base, key) => (key === 'rank2024' || v === null || v === undefined || !base ? null : ((v - base) / Math.abs(base)) * 100);
export const isGood = (delta, key) => delta !== null && delta * BY_KEY[key].dir > 0;
