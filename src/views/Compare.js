import { useEffect, useMemo, useState } from 'react';
import { h, div, span, button, label, input, select, option, table, thead, tbody, tr, th, td, h3, strong, small, p, svg, g, polygon, line, circle, txt } from '../lib/ui.js';
import { METRICS, BY_KEY, val, fmtVal, show, stats, norm, kindOf, nf, deltaPct, isGood } from '../lib/metrics.js';
import { buildTable, toCsv, toXls, save } from '../lib/exporters.js';

const MAX = 6;
const STORE = 'yugra-compare-v2';
const COLORS = ['#2b5d46', '#c29556', '#89936e', '#945b3f', '#4f7f9a', '#7a5a8c'];
const BAR = ['bar-forest', 'bar-ochre', 'bar-moss', 'bar-russet', 'bar-sky', 'bar-plum'];
const BASES = [['avg', 'среднему по округу'], ['median', 'медиане по округу'], ['first', 'первой выбранной территории']];
const DEFAULT = { ids: ['surgutsky', 'khanty-mansiysk', 'surgut'], metrics: METRICS.map((m) => m.key), chart: 'score', base: 'avg' };

const readHash = () => { try { const q = new URLSearchParams(window.location.hash.slice(1)); const ids = (q.get('cmp') || '').split(',').filter(Boolean); return ids.length ? { ids, metrics: (q.get('m') || '').split(',').filter((k) => BY_KEY[k]) } : null; } catch { return null; } };
const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } };

export default function Compare({ municipalities, onMakeReport }) {
  const [st, setSt] = useState(() => { const s = { ...DEFAULT, ...(readStore() || {}), ...(readHash() || {}) }; if (!s.metrics?.length) s.metrics = DEFAULT.metrics; return s; });
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const upd = (patch) => { setCopied(false); setSt((s) => ({ ...s, ...patch })); };
  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch { /* хранилище недоступно */ } }, [st]);

  const byId = useMemo(() => Object.fromEntries(municipalities.map((m) => [m.id, m])), [municipalities]);
  const sorted = useMemo(() => [...municipalities].sort((a, b) => a.rank2024 - b.rank2024), [municipalities]);
  const items = st.ids.map((id) => byId[id]).filter(Boolean);
  const metrics = st.metrics.filter((k) => BY_KEY[k]);
  const chartKey = metrics.includes(st.chart) ? st.chart : metrics[0];
  const shown = sorted.filter((m) => m.name.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU')));

  const toggle = (id) => upd({ ids: st.ids.includes(id) ? st.ids.filter((x) => x !== id) : st.ids.length >= MAX ? st.ids : [...st.ids, id] });
  const toggleMetric = (k) => upd({ metrics: METRICS.map((m) => m.key).filter((x) => (x === k ? !metrics.includes(k) : metrics.includes(x))) });
  const quick = (fn) => upd({ ids: sorted.filter(fn).slice(0, MAX).map((m) => m.id) });
  const baseOf = (key) => { if (st.base === 'first') return items[0] ? val(items[0], key) : null; const s = stats(municipalities, key); return s ? (st.base === 'median' ? s.median : s.avg) : null; };
  const baseLabel = BASES.find((b) => b[0] === st.base)?.[1];

  const link = () => { const q = new URLSearchParams({ cmp: items.map((m) => m.id).join(','), m: metrics.join(',') }); return `${window.location.origin}${window.location.pathname}#${q}`; };
  const copy = async () => { try { await navigator.clipboard.writeText(link()); setCopied(true); } catch { window.prompt('Скопируйте ссылку', link()); } };
  const exportAs = (kind) => { const tb = buildTable(items, metrics); const n = 'yugra-comparison'; if (kind === 'csv') save(`${n}.csv`, 'text/csv;charset=utf-8', toCsv(tb)); else save(`${n}.xls`, 'application/vnd.ms-excel', toXls(tb, 'Сравнение')); };

  const picker = div({ className: 'compare-picker' },
    div({ className: 'picker-title' }, div(null, strong(null, 'Территории'), span(null, `Выбрано ${items.length} из ${MAX}`)), span({ className: 'picker-counter' }, `${items.length}/${MAX}`)),
    div({ className: 'quick-sets' },
      button({ type: 'button', className: 'slice-chip', onClick: () => quick((m) => m.rank2024 <= 3) }, 'Топ-3'),
      button({ type: 'button', className: 'slice-chip', onClick: () => quick((m) => m.group2024 === 'A') }, 'Группа A'),
      button({ type: 'button', className: 'slice-chip', onClick: () => quick((m) => kindOf(m) === 'city') }, 'Лучшие города'),
      button({ type: 'button', className: 'slice-chip', onClick: () => quick((m) => kindOf(m) === 'district') }, 'Лучшие районы'),
      button({ type: 'button', className: 'slice-chip', onClick: () => upd({ ids: [] }) }, 'Очистить')),
    label({ className: 'search-box picker-search' }, input({ value: query, onChange: (e) => setQuery(e.target.value), placeholder: 'Найти муниципалитет…', 'aria-label': 'Поиск территории' })),
    div({ className: 'compare-options' }, ...shown.map((m) => {
      const checked = st.ids.includes(m.id), disabled = !checked && st.ids.length >= MAX, idx = st.ids.indexOf(m.id);
      return label({ key: m.id, className: `compare-option ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}` },
        input({ type: 'checkbox', checked, disabled, onChange: () => toggle(m.id) }),
        span({ className: 'compare-checkmark', style: checked ? { background: COLORS[idx % 6], borderColor: COLORS[idx % 6] } : null }, checked ? '✓' : ''),
        span({ className: 'compare-option-copy' }, strong(null, m.name), small(null, `Группа ${m.group2024} · место ${m.rank2024}`)),
        span({ className: 'compare-option-score' }, nf(m.score)));
    })),
    p({ className: 'picker-note' }, `До ${MAX} территорий. Выбор сохраняется, а ссылкой можно поделиться.`));

  const bars = () => {
    const mt = BY_KEY[chartKey], vals = items.map((m) => val(m, chartKey)).filter((v) => v !== null);
    const top = Math.max(...vals, 1), maxRank = Math.max(...municipalities.map((m) => m.rank2024), 1);
    const order = [...items].sort((a, b) => ((val(b, chartKey) ?? -Infinity) - (val(a, chartKey) ?? -Infinity)) * mt.dir);
    return div({ className: 'comparison-chart-card' },
      div({ className: 'chart-card-heading' }, div(null, strong(null, mt.label), span(null, mt.dir < 0 ? 'Меньше — лучше. Лучший показатель — вверху' : `Единица: ${mt.unit}. Лучший показатель — вверху`)),
        select({ value: chartKey, 'aria-label': 'Показатель диаграммы', onChange: (e) => upd({ chart: e.target.value }) }, ...metrics.map((k) => option({ key: k, value: k }, BY_KEY[k].label)))),
      ...order.map((m, idx) => {
        const v = val(m, chartKey), w = v === null ? 0 : mt.key === 'rank2024' ? ((maxRank + 1 - v) / maxRank) * 100 : (v / top) * 100;
        return div({ key: m.id, className: 'comparison-bar-row' },
          div({ className: 'comparison-bar-label' }, span({ className: 'cmp-dot', style: { background: COLORS[st.ids.indexOf(m.id) % 6] } }), strong(null, m.name)),
          div({ className: 'comparison-bar-track' }, h('i', { className: BAR[st.ids.indexOf(m.id) % 6], style: { width: `${Math.max(3, Math.min(100, w))}%` } })),
          strong({ className: 'comparison-bar-value' }, show(mt, v), idx === 0 && order.length > 1 ? ' ★' : ''));
      }));
  };

  const radar = () => {
    const n = metrics.length, C = 170, R = 105, ang = (i) => -Math.PI / 2 + (2 * Math.PI * i) / n;
    const pt = (i, r) => `${C + Math.cos(ang(i)) * r},${C + Math.sin(ang(i)) * r}`;
    const avg = metrics.map((k) => municipalities.reduce((s, m) => s + norm(m, k, municipalities), 0) / municipalities.length);
    return div({ className: 'comparison-chart-card' },
      div({ className: 'chart-card-heading' }, div(null, strong(null, 'Профиль территорий'), span(null, 'Шкала 0–100 относительно всех 22 территорий; 100 — лучшее значение с учётом направления показателя'))),
      svg({ viewBox: '0 0 340 340', className: 'cmp-radar', role: 'img', 'aria-label': 'Лепестковая диаграмма сравнения' },
        ...[25, 50, 75, 100].map((r) => polygon({ key: r, points: metrics.map((_, i) => pt(i, (R * r) / 100)).join(' '), fill: 'none', stroke: '#e0d5bf', strokeWidth: 1 })),
        ...metrics.map((k, i) => g({ key: k }, line({ x1: C, y1: C, x2: C + Math.cos(ang(i)) * R, y2: C + Math.sin(ang(i)) * R, stroke: '#e0d5bf' }),
          txt({ x: C + Math.cos(ang(i)) * (R + 14), y: C + Math.sin(ang(i)) * (R + 14), fontSize: 10, fill: '#5f7162', textAnchor: Math.cos(ang(i)) > 0.2 ? 'start' : Math.cos(ang(i)) < -0.2 ? 'end' : 'middle', dominantBaseline: 'middle' }, BY_KEY[k].short))),
        polygon({ points: avg.map((v, i) => pt(i, (R * v) / 100)).join(' '), fill: 'none', stroke: '#8a9384', strokeWidth: 1.4, strokeDasharray: '4 3' }),
        ...items.map((m, idx) => { const c = COLORS[st.ids.indexOf(m.id) % 6]; return g({ key: m.id }, polygon({ points: metrics.map((k, i) => pt(i, (R * norm(m, k, municipalities)) / 100)).join(' '), fill: c, fillOpacity: 0.13, stroke: c, strokeWidth: 2 }),
          ...metrics.map((k, i) => circle({ key: k, cx: C + Math.cos(ang(i)) * ((R * norm(m, k, municipalities)) / 100), cy: C + Math.sin(ang(i)) * ((R * norm(m, k, municipalities)) / 100), r: 2.8, fill: c }))); })),
      div({ className: 'cmp-legend' }, ...items.map((m) => span({ key: m.id }, span({ className: 'cmp-dot', style: { background: COLORS[st.ids.indexOf(m.id) % 6] } }), m.name)), span(null, span({ className: 'cmp-dot dashed' }), 'Среднее по округу')));
  };

  const grid = () => div({ className: 'compare-details-card' },
    div({ className: 'chart-card-heading' }, div(null, strong(null, 'Все показатели рядом'), span(null, 'Зелёная ячейка — лучший, коричневая — худший. Под значением — отклонение от базы')),
      label({ className: 'select-field' }, span(null, 'Отклонение от'), select({ value: st.base, onChange: (e) => upd({ base: e.target.value }) }, ...BASES.map(([v, l]) => option({ key: v, value: v }, l))))),
    div({ className: 'table-scroll' }, table({ className: 'ranking-table comparison-data-table' },
      thead(null, tr(null, th(null, 'Показатель'), ...items.map((m) => th({ key: m.id }, span({ className: 'cmp-dot', style: { background: COLORS[st.ids.indexOf(m.id) % 6] } }), m.name)), th({ className: 'cmp-avg' }, 'Среднее по округу'))),
      tbody(null, ...metrics.map((k) => {
        const mt = BY_KEY[k], vs = items.map((m) => val(m, k)).filter((v) => v !== null), best = mt.dir > 0 ? Math.max(...vs) : Math.min(...vs), worst = mt.dir > 0 ? Math.min(...vs) : Math.max(...vs), base = baseOf(k), s = stats(municipalities, k);
        return tr({ key: k }, td({ className: 'metric-name-cell' }, mt.label, small(null, ` ${mt.unit}`)),
          ...items.map((m) => { const v = val(m, k), d = deltaPct(v, base, k), spread = items.length > 1 && best !== worst; return td({ key: m.id, className: spread && v === best ? 'cmp-best' : spread && v === worst ? 'cmp-worst' : '' }, span({ className: 'cmp-v' }, show(mt, v)), d !== null && span({ className: `cmp-d ${isGood(d, k) ? 'up' : 'down'}` }, `${d > 0 ? '+' : ''}${nf(d, 1)}%`)); }),
          td({ className: 'cmp-avg' }, s ? show(mt, s.avg) : '—'));
      })))),
    p({ className: 'picker-note' }, `Отклонение считается от ${baseLabel}. Для места в рейтинге не показывается.`));

  return div({ className: 'compare-page' },
    div({ className: 'section-heading' }, div({ className: 'heading-label' }, div(null, h3({ className: 'cmp-title' }, 'Сравнение муниципалитетов'), p(null, 'Выберите до шести территорий и набор показателей — сравнение обновляется сразу'))),
      div({ className: 'toolbar-actions' },
        button({ type: 'button', className: 'outline-button', disabled: items.length < 2, onClick: copy }, copied ? 'Ссылка скопирована' : 'Копировать ссылку'),
        button({ type: 'button', className: 'outline-button', disabled: items.length < 2 || !metrics.length, onClick: () => exportAs('csv') }, 'CSV'),
        button({ type: 'button', className: 'outline-button', disabled: items.length < 2 || !metrics.length, onClick: () => exportAs('xls') }, 'Excel'),
        button({ type: 'button', className: 'primary-button', disabled: !items.length, onClick: () => onMakeReport({ mode: 'manual', ids: items.map((m) => m.id), cols: metrics }) }, 'Отчёт по сравнению'))),
    div({ className: 'compare-workspace' }, picker,
      div({ className: 'compare-analysis' },
        div({ className: 'metric-picker' }, span({ className: 'filter-caption' }, 'Показатели для сравнения'), div({ className: 'slice-options' }, ...METRICS.map((m) => button({ key: m.key, type: 'button', className: `slice-chip ${metrics.includes(m.key) ? 'active' : ''}`, onClick: () => toggleMetric(m.key) }, m.label)))),
        items.length < 2 || !metrics.length
          ? div({ className: 'empty-state comparison-empty' }, span(null, !metrics.length ? 'Выберите хотя бы один показатель' : 'Выберите минимум две территории'), p(null, 'Отметьте муниципалитеты в списке слева — диаграммы и таблица появятся здесь.'))
          : div({ className: 'compare-analysis' }, bars(), metrics.length >= 3 ? radar() : null, grid()))));
}
