import { BY_KEY, kindOf, val, nf } from './metrics.js';

export const OP_LABEL = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '=': '=' };
const CMP = { '>=': (a, b) => a >= b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '<': (a, b) => a < b, '=': (a, b) => a === b };

// Быстрые срезы: готовые наборы условий. Добавляйте свои сюда.
export const PRESETS = [
  { id: 'all', label: 'Все территории', conds: [] },
  { id: 'top', label: 'Топ-5 рейтинга', conds: [{ key: 'rank2024', op: '<=', value: 5 }] },
  { id: 'investment', label: 'Инвестиции ≥ 50 млрд ₽', conds: [{ key: 'investments', op: '>=', value: 50 }] },
  { id: 'growth', label: 'Рост ≥ 103%', conds: [{ key: 'growthPercent', op: '>=', value: 103 }] },
  { id: 'stagnation', label: 'Нет роста инвестиций (≤ 100%)', conds: [{ key: 'growthPercent', op: '<=', value: 100 }] },
  { id: 'business', label: 'Оценка бизнеса ≥ 4,5', conds: [{ key: 'assessmentScore', op: '>=', value: 4.5 }] },
];

export const emptyFilter = () => ({ search: '', group: 'ALL', kind: 'ALL', preset: 'all', conds: [] });
export const newCond = () => ({ key: 'score', op: '>=', value: '' });

const activeConds = (f) => [...(PRESETS.find((x) => x.id === f.preset)?.conds || []), ...(f.conds || []).filter((c) => c.value !== '' && c.value !== null && BY_KEY[c.key] && Number.isFinite(Number(c.value)))];

export function applyFilters(items, f = emptyFilter()) {
  const q = (f.search || '').trim().toLocaleLowerCase('ru-RU');
  const conds = activeConds(f);
  return items.filter((m) => {
    if (q && !m.name.toLocaleLowerCase('ru-RU').includes(q)) return false;
    if (f.group && f.group !== 'ALL' && m.group2024 !== f.group) return false;
    if (f.kind && f.kind !== 'ALL' && kindOf(m) !== f.kind) return false;
    return conds.every((c) => { const v = val(m, c.key); return v !== null && CMP[c.op](v, Number(c.value)); });
  });
}

/** Человекочитаемое описание фильтра — для подзаголовка отчёта. */
export function describe(f) {
  const parts = [];
  if (f.search?.trim()) parts.push(`название содержит «${f.search.trim()}»`);
  if (f.group && f.group !== 'ALL') parts.push(`группа ${f.group}`);
  if (f.kind && f.kind !== 'ALL') parts.push(f.kind === 'city' ? 'городские округа' : 'муниципальные районы');
  const preset = PRESETS.find((x) => x.id === f.preset);
  if (preset && preset.id !== 'all') parts.push(preset.label);
  activeConds(f).filter((c) => !preset?.conds.includes(c)).forEach((c) => parts.push(`${BY_KEY[c.key].label} ${OP_LABEL[c.op]} ${nf(c.value, 2)}`));
  return parts.length ? parts.join('; ') : 'без фильтров';
}
