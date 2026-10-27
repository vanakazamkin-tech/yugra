import { BY_KEY, KIND_LABEL, kindOf, val } from './metrics.js';

/** Плоская таблица «территории × показатели» с числовыми значениями (не строками). */
export function buildTable(items, cols) {
  const keys = cols.filter((k) => BY_KEY[k]);
  return {
    head: ['Муниципальное образование', 'Группа', 'Тип', ...keys.map((k) => `${BY_KEY[k].label}, ${BY_KEY[k].unit}`)],
    rows: items.map((m) => [m.name, m.group2024, KIND_LABEL[kindOf(m)], ...keys.map((k) => val(m, k))]),
  };
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// CSV для русской локали Excel: BOM, разделитель «;», десятичная запятая.
export const toCsv = ({ head, rows }) => '\uFEFF' + [head, ...rows].map((r) => r.map((c) => {
  const s = c === null || c === undefined ? '' : typeof c === 'number' ? String(c).replace('.', ',') : String(c);
  return `"${s.replaceAll('"', '""')}"`;
}).join(';')).join('\r\n');

// Excel (SpreadsheetML 2003): открывается без сторонних библиотек, числа остаются числами.
export const toXls = ({ head, rows }, sheet = 'Отчёт') =>
  `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="${esc(sheet).slice(0, 31)}"><Table>` +
  [head, ...rows].map((r) => `<Row>${r.map((c) => (typeof c === 'number' ? `<Cell><Data ss:Type="Number">${c}</Data></Cell>` : `<Cell><Data ss:Type="String">${esc(c ?? '')}</Data></Cell>`)).join('')}</Row>`).join('') +
  '</Table></Worksheet></Workbook>';

export const toJson = (tbl, meta) => JSON.stringify({ meta, columns: tbl.head, rows: tbl.rows }, null, 2);

export function save(filename, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
