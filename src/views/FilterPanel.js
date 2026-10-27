import { div, span, button, label, input, select, option, strong } from '../lib/ui.js';
import { METRICS, BY_KEY } from '../lib/metrics.js';
import { PRESETS, OP_LABEL, emptyFilter, newCond } from '../lib/filters.js';

const GROUPS = [['ALL', 'Все группы'], ['A', 'Группа A'], ['B', 'Группа B']];
const KINDS = [['ALL', 'Все типы'], ['city', 'Городские округа'], ['district', 'Муниципальные районы']];

/** Единая панель фильтров: поиск, группа, тип, быстрые срезы и произвольные условия по показателям. */
export default function FilterPanel({ filter, onChange, total, count }) {
  const set = (patch) => onChange({ ...filter, ...patch });
  const setCond = (idx, patch) => set({ conds: filter.conds.map((c, j) => (j === idx ? { ...c, ...patch } : c)) });
  const pills = (list, cur, field) => list.map(([v, l]) => button({ key: v, type: 'button', className: `filter-pill ${cur === v ? 'selected' : ''}`, onClick: () => set({ [field]: v }) }, l));

  return div({ className: 'filter-panel' },
    div({ className: 'catalog-toolbar' },
      label({ className: 'search-box' }, input({ value: filter.search, onChange: (e) => set({ search: e.target.value }), placeholder: 'Поиск по названию муниципалитета…', 'aria-label': 'Поиск по названию' })),
      div({ className: 'filter-block' },
        span({ className: 'filter-caption' }, 'Группа рейтинга и тип территории'),
        div({ className: 'filter-row' }, ...pills(GROUPS, filter.group, 'group'), span({ className: 'filter-sep' }), ...pills(KINDS, filter.kind, 'kind')))),
    div({ className: 'slice-bar' },
      div({ className: 'slice-label' }, 'Быстрые срезы'),
      div({ className: 'slice-options' }, ...PRESETS.map((x) => button({ key: x.id, type: 'button', className: `slice-chip ${filter.preset === x.id ? 'active' : ''}`, onClick: () => set({ preset: x.id }) }, x.label)))),
    div({ className: 'cond-builder' },
      div({ className: 'cond-head' }, span({ className: 'filter-caption' }, 'Свои условия (все должны выполняться)'),
        button({ type: 'button', className: 'text-action', onClick: () => set({ conds: [...filter.conds, newCond()] }) }, '+ Добавить условие')),
      ...filter.conds.map((c, idx) => div({ key: idx, className: 'cond-row' },
        select({ value: c.key, 'aria-label': 'Показатель', onChange: (e) => setCond(idx, { key: e.target.value }) }, ...METRICS.map((m) => option({ key: m.key, value: m.key }, m.label))),
        select({ value: c.op, 'aria-label': 'Условие', onChange: (e) => setCond(idx, { op: e.target.value }) }, ...Object.keys(OP_LABEL).map((op) => option({ key: op, value: op }, OP_LABEL[op]))),
        input({ type: 'number', step: 'any', value: c.value, placeholder: 'значение', 'aria-label': 'Значение', onChange: (e) => setCond(idx, { value: e.target.value }) }),
        span({ className: 'cond-unit' }, BY_KEY[c.key]?.unit),
        button({ type: 'button', className: 'icon-button', 'aria-label': 'Удалить условие', onClick: () => set({ conds: filter.conds.filter((_, j) => j !== idx) }) }, '×')))),
    div({ className: 'advanced-filter-footer filter-footer' },
      span(null, 'В срезе ', strong(null, count), ' из ', total, ' территорий'),
      button({ type: 'button', className: 'text-action', onClick: () => onChange(emptyFilter()) }, 'Сбросить всё')));
}
