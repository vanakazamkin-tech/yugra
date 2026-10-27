import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { h, Fragment, div, span, button, label, input, select, option, table, thead, tbody, tr, th, td, h3, h4, p, strong, small, section, textarea } from '../lib/ui.js';
import { METRICS, BY_KEY, val, fmtVal, show, stats, nf, deltaPct, isGood } from '../lib/metrics.js';
import { applyFilters, emptyFilter, describe } from '../lib/filters.js';
import { buildTable, toCsv, toXls, toJson, save } from '../lib/exporters.js';
import FilterPanel from './FilterPanel.js';

const DRAFT = 'yugra-report-draft-v2';
const TPL = 'yugra-report-templates-v2';
const SECTIONS = {
  summary: ['Сводка по показателям', 'СВОДКА'], chart: ['Диаграмма', 'СРАВНЕНИЕ'], ranking: ['Лидеры и отстающие', 'РЕЙТИНГ'],
  table: ['Детализация по территориям', 'ТАБЛИЦА'], deviation: ['Отклонение от среднего по выборке', 'АНАЛИЗ'], notes: ['Комментарий и методика', 'ПРИМЕЧАНИЯ'],
};
export const DEFAULT_REPORT = {
  name: 'Новый отчёт', title: 'Социально-экономический обзор муниципалитетов Югры', subtitle: '', mode: 'own', filter: emptyFilter(), ids: [],
  cols: ['score', 'rank2024', 'investments', 'growthPercent', 'smeCount', 'assessmentScore'], sortKey: 'score', sortDir: 'desc', chartMetric: 'investments', topN: 3,
  sections: [{ id: 'summary', on: true }, { id: 'chart', on: true }, { id: 'ranking', on: true }, { id: 'table', on: true }, { id: 'deviation', on: false }, { id: 'notes', on: true }], notes: '',
};
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } };
const write = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; } };
// Старые/повреждённые сохранения не должны ломать страницу: добавляем недостающие поля и отбрасываем неизвестные показатели.
const sanitize = (c) => { const r = { ...DEFAULT_REPORT, ...c, filter: { ...emptyFilter(), ...(c?.filter || {}) } }; r.cols = (r.cols || []).filter((k) => BY_KEY[k]); const known = DEFAULT_REPORT.sections.map((s) => s.id); r.sections = [...(r.sections || []).filter((s) => known.includes(s.id)), ...DEFAULT_REPORT.sections.filter((s) => !(r.sections || []).some((x) => x.id === s.id))]; if (!BY_KEY[r.chartMetric]) r.chartMetric = 'investments'; if (!BY_KEY[r.sortKey]) r.sortKey = 'score'; return r; };

const dataTable = (head, rows, cls = '') => div({ className: 'table-scroll report-table-scroll' }, table({ className: `ranking-table report-table ${cls}` }, thead(null, tr(null, ...head.map((x, i) => th({ key: i }, x)))), tbody(null, ...rows.map((r, i) => tr({ key: i }, ...r.map((c, j) => (c && c.cls !== undefined ? td({ key: j, className: c.cls }, c.v) : td({ key: j }, c))))))));

/** Документ отчёта: один и тот же компонент рисует предпросмотр и печатную версию. */
function ReportDoc({ cfg, items, all, scopeText }) {
  const cols = cfg.cols.filter((k) => BY_KEY[k]);
  const ch = BY_KEY[cfg.chartMetric] || METRICS[0];
  const date = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const empty = p({ className: 'report-empty-note' }, 'Нет данных: измените выборку или показатели.');
  const ordered = [...items].sort((a, b) => ((val(b, ch.key) ?? -Infinity) - (val(a, ch.key) ?? -Infinity)) * ch.dir);
  const n = Math.max(1, Math.min(Number(cfg.topN) || 3, Math.floor(items.length / 2)));
  const body = {
    summary: () => !cols.length || !items.length ? empty : div(null,
      div({ className: 'report-summary-grid' }, div(null, span(null, 'Территорий в отчёте'), strong(null, items.length)), ...cols.slice(0, 4).map((k) => { const s = stats(items, k); return div({ key: k }, span(null, `${BY_KEY[k].short}: среднее`), strong(null, s ? show(BY_KEY[k], s.avg) : '—')); })),
      dataTable(['Показатель', 'Среднее', 'Медиана', 'Минимум', 'Максимум', 'Лучший', 'Худший'], cols.map((k) => { const s = stats(items, k), mt = BY_KEY[k]; return s ? [mt.label, show(mt, s.avg), show(mt, s.median), show(mt, s.min), show(mt, s.max), `${s.best.m.name} (${show(mt, s.best.v)})`, `${s.worst.m.name} (${show(mt, s.worst.v)})`] : [mt.label, '—', '—', '—', '—', '—', '—']; }))),
    chart: () => { if (!items.length) return empty; const top = Math.max(...items.map((m) => val(m, ch.key) ?? 0), 1), maxRank = Math.max(...all.map((m) => m.rank2024), 1);
      return div(null, p({ className: 'chart-unit-note' }, ch.dir < 0 ? 'Для места в рейтинге длиннее полоса — выше позиция.' : `${ch.label}, ${ch.unit}. Территории отсортированы от лучшей к худшей.`),
        div({ className: 'report-chart-list' }, ...ordered.map((m) => { const v = val(m, ch.key), w = v === null ? 0 : ch.key === 'rank2024' ? ((maxRank + 1 - v) / maxRank) * 100 : (v / top) * 100;
          return div({ key: m.id, className: 'report-chart-row' }, span({ className: 'report-chart-name' }, m.name), span({ className: 'report-chart-track' }, h('i', { style: { width: `${Math.max(2, Math.min(100, w))}%` } })), strong(null, show(ch, v))); }))); },
    ranking: () => items.length < 2 ? empty : div({ className: 'rep-two' },
      div(null, h4(null, `Лидеры: ${ch.label}`), dataTable(['№', 'Территория', ch.unit], ordered.slice(0, n).map((m, i) => [i + 1, m.name, show(ch, val(m, ch.key))]))),
      div(null, h4(null, `Отстающие: ${ch.label}`), dataTable(['№', 'Территория', ch.unit], ordered.slice(-n).reverse().map((m, i) => [i + 1, m.name, show(ch, val(m, ch.key))])))),
    table: () => !cols.length ? p({ className: 'report-empty-note' }, 'Отметьте хотя бы один показатель.') : !items.length ? empty : dataTable(['№', 'Муниципальное образование', 'Группа', ...cols.map((k) => BY_KEY[k].label)], items.map((m, i) => [String(i + 1).padStart(2, '0'), m.name, `Группа ${m.group2024}`, ...cols.map((k) => fmtVal(m, k))])),
    deviation: () => !cols.length || !items.length ? empty : div(null, p({ className: 'chart-unit-note' }, 'Зелёным отмечено отклонение в лучшую сторону, коричневым — в худшую (с учётом направления показателя).'),
      dataTable(['Муниципальное образование', ...cols.filter((k) => k !== 'rank2024').map((k) => BY_KEY[k].short)], items.map((m) => [m.name, ...cols.filter((k) => k !== 'rank2024').map((k) => { const d = deltaPct(val(m, k), stats(items, k)?.avg, k); return { cls: d === null ? '' : isGood(d, k) ? 'cmp-best' : 'cmp-worst', v: d === null ? '—' : `${d > 0 ? '+' : ''}${nf(d, 1)}%` }; })]))),
    notes: () => div(null, cfg.notes.trim() ? p({ className: 'report-notes' }, cfg.notes) : null,
      div({ className: 'report-method-note' }, p(null, 'Значения взяты из набора данных прототипа (срез 2024). Группа и место соответствуют рейтингу; «Инвестиции на 1 МСП» рассчитаны как инвестиции ÷ число субъектов МСП. Перед официальной публикацией сверьте источники, период и методику расчёта.'))),
  };
  return div(null,
    div({ className: 'report-document-brand' }, span({ className: 'report-doc-emblem' }, h('img', { src: '/images/khanty-prosperity-seal.svg', alt: '' })), div(null, strong(null, 'ЮГРА'), small(null, 'аналитическая платформа муниципалитетов')), span({ className: 'document-year' }, '2024')),
    div({ className: 'report-doc-rule' }),
    span({ className: 'report-doc-kicker' }, `АНАЛИТИЧЕСКИЙ ОТЧЁТ · ${date.toLocaleUpperCase('ru-RU')}`),
    h3({ className: 'rep-title' }, cfg.title || 'Название отчёта не задано'),
    p({ className: 'report-doc-subtitle' }, cfg.subtitle ? `${cfg.subtitle}. ` : '', `Выборка: ${scopeText}. В отчёте ${items.length} из ${all.length} территорий.`),
    ...cfg.sections.filter((s) => s.on).map((s) => section({ key: s.id, className: 'report-preview-section' }, div({ className: 'report-preview-section-heading' }, h4(null, SECTIONS[s.id][0]), span(null, SECTIONS[s.id][1])), body[s.id]())),
    div({ className: 'report-doc-footer' }, span(null, 'ЮГРА · ЛЮДИ · ЗЕМЛЯ · ПРИРОДА'), span(null, `Сформировано ${date}`)));
}

export default function Reports({ municipalities, catalogItems, request, onConsumeRequest }) {
  const [cfg, setCfg] = useState(() => sanitize(read(DRAFT, null)));
  const [templates, setTemplates] = useState(() => read(TPL, []));
  const [pick, setPick] = useState('');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const upd = (patch) => { setNote(''); setCfg((c) => ({ ...c, ...patch })); };
  useEffect(() => { write(DRAFT, cfg); }, [cfg]);
  useEffect(() => { if (request) { setCfg((c) => sanitize({ ...c, mode: request.mode || 'manual', ids: request.ids || c.ids, cols: request.cols?.length ? request.cols : c.cols })); onConsumeRequest?.(); } }, [request]);

  const items = useMemo(() => {
    const base = cfg.mode === 'catalog' ? catalogItems : cfg.mode === 'manual' ? municipalities.filter((m) => cfg.ids.includes(m.id)) : applyFilters(municipalities, cfg.filter);
    const mt = BY_KEY[cfg.sortKey] || METRICS[0], k = cfg.sortDir === 'asc' ? 1 : -1;
    return [...base].sort((a, b) => ((mt.get(a) ?? -Infinity) - (mt.get(b) ?? -Infinity)) * k || a.name.localeCompare(b.name, 'ru-RU'));
  }, [cfg, municipalities, catalogItems]);
  const scopeText = cfg.mode === 'catalog' ? 'текущий срез каталога' : cfg.mode === 'manual' ? 'территории, выбранные вручную' : describe(cfg.filter);
  const cols = cfg.cols.filter((k) => BY_KEY[k]);

  const toggleCol = (k) => upd({ cols: METRICS.map((m) => m.key).filter((x) => (x === k ? !cols.includes(k) : cols.includes(x))) });
  const toggleId = (id) => upd({ ids: cfg.ids.includes(id) ? cfg.ids.filter((x) => x !== id) : [...cfg.ids, id] });
  const toggleSec = (idx) => upd({ sections: cfg.sections.map((s, j) => (j === idx ? { ...s, on: !s.on } : s)) });
  const move = (idx, d) => { const s = [...cfg.sections], j = idx + d; if (j < 0 || j >= s.length) return; [s[idx], s[j]] = [s[j], s[idx]]; upd({ sections: s }); };
  const saveTpl = () => { const name = cfg.name.trim() || 'Без названия'; const next = [...templates.filter((t) => t.name !== name), { name, cfg: { ...cfg, name } }]; setTemplates(next); setPick(name); setNote(write(TPL, next) ? `Шаблон «${name}» сохранён` : 'Не удалось сохранить: хранилище браузера недоступно'); };
  const loadTpl = (name) => { setPick(name); const t = templates.find((x) => x.name === name); if (t) { setCfg(sanitize(t.cfg)); setNote(`Загружен шаблон «${name}»`); } };
  const delTpl = () => { const next = templates.filter((t) => t.name !== pick); setTemplates(next); write(TPL, next); setPick(''); setNote('Шаблон удалён'); };
  const run = (kind) => { const tb = buildTable(items, cols), n = `yugra-report-${new Date().toISOString().slice(0, 10)}`;
    if (kind === 'csv') save(`${n}.csv`, 'text/csv;charset=utf-8', toCsv(tb)); else if (kind === 'xls') save(`${n}.xls`, 'application/vnd.ms-excel', toXls(tb, 'Отчёт')); else if (kind === 'json') save(`${n}.json`, 'application/json', toJson(tb, { title: cfg.title, scope: scopeText, count: items.length, generated: new Date().toISOString() })); else window.print(); };
  const noExport = !items.length || !cols.length;
  const step = (n, title, hint, ...kids) => div({ className: 'config-section' }, div({ className: 'config-section-heading' }, span({ className: 'config-step' }, n), div(null, strong(null, title), small(null, hint))), ...kids);
  const field = (title, ...kids) => label({ className: 'form-field' }, span(null, title), ...kids);
  const docProps = { cfg, items, all: municipalities, scopeText };

  const config = div({ className: 'report-config' },
    step('01', 'Шаблоны', 'Сохраняйте настройки и возвращайтесь к ним',
      field('Название шаблона', input({ value: cfg.name, onChange: (e) => upd({ name: e.target.value }) })),
      templates.length ? field('Сохранённые шаблоны', select({ value: pick, onChange: (e) => loadTpl(e.target.value) }, option({ value: '' }, 'Выберите шаблон…'), ...templates.map((t) => option({ key: t.name, value: t.name }, t.name)))) : null,
      div({ className: 'selection-actions' }, button({ type: 'button', className: 'text-action', onClick: saveTpl }, 'Сохранить шаблон'), pick ? button({ type: 'button', className: 'text-action', onClick: delTpl }, 'Удалить') : null, button({ type: 'button', className: 'text-action', onClick: () => { setCfg(sanitize(null)); setPick(''); setNote('Настройки сброшены'); } }, 'Сбросить')),
      note ? p({ className: 'rep-note', role: 'status' }, note) : null),
    step('02', 'Документ и выборка', 'Заголовок и территории, которые попадут в отчёт',
      field('Заголовок', input({ value: cfg.title, onChange: (e) => upd({ title: e.target.value }) })),
      field('Подзаголовок (необязательно)', input({ value: cfg.subtitle, placeholder: 'Например: для совещания в департаменте', onChange: (e) => upd({ subtitle: e.target.value }) })),
      field('Источник территорий', select({ value: cfg.mode, onChange: (e) => upd({ mode: e.target.value }) }, option({ value: 'own' }, 'Фильтры отчёта'), option({ value: 'catalog' }, `Текущий срез каталога (${catalogItems.length})`), option({ value: 'manual' }, `Выбрать вручную (${cfg.ids.length})`))),
      cfg.mode === 'own' ? div({ className: 'rep-filter' }, h(FilterPanel, { filter: cfg.filter, onChange: (f) => upd({ filter: f }), total: municipalities.length, count: items.length })) : null,
      cfg.mode === 'manual' ? div({ className: 'report-selection-box' }, div({ className: 'selection-box-heading' }, strong(null, 'Территории'), span(null, `${cfg.ids.length} выбрано`)),
        label({ className: 'search-box' }, input({ value: query, onChange: (e) => setQuery(e.target.value), placeholder: 'Поиск в списке…' })),
        div({ className: 'report-selection-list' }, ...municipalities.filter((m) => m.name.toLocaleLowerCase('ru-RU').includes(query.trim().toLocaleLowerCase('ru-RU'))).map((m) => label({ key: m.id, className: 'report-selection-item' }, input({ type: 'checkbox', checked: cfg.ids.includes(m.id), onChange: () => toggleId(m.id) }), span(null, m.name), small(null, m.group2024)))),
        div({ className: 'selection-actions' }, button({ type: 'button', className: 'text-action', onClick: () => upd({ ids: municipalities.map((m) => m.id) }) }, 'Выбрать все'), button({ type: 'button', className: 'text-action', onClick: () => upd({ ids: [] }) }, 'Очистить'))) : null,
      div({ className: 'rep-sort' }, field('Сортировать по', select({ value: cfg.sortKey, onChange: (e) => upd({ sortKey: e.target.value }) }, ...METRICS.map((m) => option({ key: m.key, value: m.key }, m.label)))), field('Порядок', select({ value: cfg.sortDir, onChange: (e) => upd({ sortDir: e.target.value }) }, option({ value: 'desc' }, 'По убыванию'), option({ value: 'asc' }, 'По возрастанию'))))),
    step('03', 'Показатели', 'Колонки таблицы, сводки и выгрузки',
      div({ className: 'metric-check-grid' }, ...METRICS.map((m) => label({ key: m.key, className: 'metric-check' }, input({ type: 'checkbox', checked: cols.includes(m.key), onChange: () => toggleCol(m.key) }), span({ className: 'custom-check' }, cols.includes(m.key) ? '✓' : ''), span(null, strong(null, m.label), small(null, `${m.unit}${m.derived ? ' · расчётный' : ''}`))))),
      div({ className: 'selection-actions' }, button({ type: 'button', className: 'text-action', onClick: () => upd({ cols: METRICS.map((m) => m.key) }) }, 'Выбрать все'), button({ type: 'button', className: 'text-action', onClick: () => upd({ cols: [] }) }, 'Очистить'))),
    step('04', 'Состав и порядок блоков', 'Включайте блоки и меняйте их очерёдность',
      ...cfg.sections.map((s, idx) => div({ key: s.id, className: `sec-row ${s.on ? '' : 'off'}` }, label({ className: 'sec-name' }, input({ type: 'checkbox', checked: s.on, onChange: () => toggleSec(idx) }), span(null, SECTIONS[s.id][0])),
        button({ type: 'button', className: 'icon-button', disabled: idx === 0, 'aria-label': 'Выше', onClick: () => move(idx, -1) }, '↑'), button({ type: 'button', className: 'icon-button', disabled: idx === cfg.sections.length - 1, 'aria-label': 'Ниже', onClick: () => move(idx, 1) }, '↓'))),
      div({ className: 'rep-sort' }, field('Показатель диаграммы и рейтинга', select({ value: cfg.chartMetric, onChange: (e) => upd({ chartMetric: e.target.value }) }, ...METRICS.map((m) => option({ key: m.key, value: m.key }, m.label)))), field('Сколько лидеров', input({ type: 'number', min: 1, max: 10, value: cfg.topN, onChange: (e) => upd({ topN: e.target.value }) }))),
      field('Комментарий для блока «Примечания»', textarea({ rows: 3, value: cfg.notes, placeholder: 'Выводы, оговорки, ссылки на источники…', onChange: (e) => upd({ notes: e.target.value }) }))),
    div({ className: 'report-actions' }, button({ type: 'button', className: 'primary-button', disabled: !items.length, onClick: () => run('print') }, 'Печать / PDF'),
      div({ className: 'rep-export' }, button({ type: 'button', className: 'outline-button', disabled: noExport, onClick: () => run('xls') }, 'Excel'), button({ type: 'button', className: 'outline-button', disabled: noExport, onClick: () => run('csv') }, 'CSV'), button({ type: 'button', className: 'outline-button', disabled: noExport, onClick: () => run('json') }, 'JSON'))));

  return h(Fragment, null,
    div({ className: 'reports-page' },
      div({ className: 'section-heading' }, div({ className: 'heading-label' }, div(null, h3({ className: 'cmp-title' }, 'Конструктор отчётов'), p(null, 'Задайте выборку, показатели и состав документа — предпросмотр обновляется сразу'))), span({ className: 'preview-status' }, h('i'), 'Черновик сохраняется автоматически')),
      div({ className: 'report-workspace' }, config, div({ className: 'report-preview-column' }, div({ className: 'preview-topline' }, div(null, span({ className: 'micro-label' }, 'ПРЕДПРОСМОТР'), h3(null, 'Так будет выглядеть отчёт'))), div({ className: 'report-document-preview' }, h(ReportDoc, docProps))))),
    createPortal(div({ className: 'print-report' }, h(ReportDoc, docProps)), document.body));
}
