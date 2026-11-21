import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/InvestmentDetails.jsx', import.meta.url), 'utf8');
const start = source.indexOf('const reportOfficialIndicators = useMemo');
const end = source.indexOf('const comparisonMetricDef', start);
assert.ok(start >= 0 && end > start, 'report official data selector must exist');
const selector = source.slice(start, end);
assert.match(selector, /item\.verification_status === 'verified'/);
assert.match(selector, /allowedGeographies\.has\(item\.geographic_level\)/);
assert.match(selector, /Number\.isInteger\(year\)/);
assert.match(selector, /year >= 1900/);
assert.match(selector, /year <= new Date\(\)\.getFullYear\(\) \+ 1/);
assert.match(selector, /numericValue\(item\.value\) != null/);
assert.match(selector, /String\(item\.indicator_code \|\| ''\)\.trim\(\) !== ''/);
assert.doesNotMatch(selector, /item\.geographic_level\s*\|\|\s*'municipality'/);

for (const label of ['Средний демо-балл', 'Демо-объём инвестиций', 'Демо-субъекты МСП', 'Средняя демо-оценка бизнеса']) {
  assert.ok(source.includes(label), `report aggregate must visibly identify ${label} as conceptual demo data`);
}
assert.match(source, /сумма только по доступным значениям/);

const filterStart = source.indexOf('const reportFilteredOfficialIndicators = useMemo');
const filterEnd = source.indexOf('const comparisonMetricDef', filterStart);
assert.ok(filterStart >= 0 && filterEnd > filterStart, 'report official filters must be memoized');
const filters = source.slice(filterStart, filterEnd);
assert.match(filters, /reportOfficialYear === 'all'/);
assert.match(filters, /reportOfficialGeography === 'all'/);
assert.match(filters, /searchableText\.includes\(search\)/);
assert.match(filters, /item\.indicator_code/);
assert.match(filters, /item\.geographic_name/);

const exporterStart = source.indexOf('const exportReportOfficialCsv = () =>');
const exporterEnd = source.indexOf('const renderTableRows', exporterStart);
assert.ok(exporterStart >= 0 && exporterEnd > exporterStart, 'official report CSV exporter must exist separately');
const exporter = source.slice(exporterStart, exporterEnd);
assert.match(exporter, /reportFilteredOfficialIndicators\.map/);
assert.match(exporter, /'URL источника'/);
assert.match(exporter, /'Статус проверки'/);
assert.ok(exporter.includes(String.raw`const csv = '\uFEFF'`), 'official CSV must include a UTF-8 BOM');
assert.ok(exporter.includes(String.raw`.join('\r\n')`), 'official CSV must use CRLF rows');
assert.ok(exporter.includes(String.raw`['=', '+', '-', '@', '\t', '\r']`), 'official CSV must mitigate spreadsheet formula injection');
assert.ok(exporter.includes(`replaceAll('"', '""')`), 'official CSV must escape quoted cells');
assert.match(exporter, /anchor\.download = 'yugra-official-observations-'/);
assert.doesNotMatch(exporter, /downloadCsv\(reportItems/);

assert.ok(source.includes(String.raw`/^\d{4}$/`), 'saved report year must be validated when loading templates');
assert.match(source, /reportOfficialSearch, reportOfficialYear, reportOfficialGeography/);
assert.match(source, /reportFilteredOfficialIndicators\.map\(\(item\)/);
assert.match(source, /Экспорт официальных данных CSV/);
assert.match(source, /Год наблюдения/);
assert.match(source, /Уровень географии/);
assert.match(source, /Фильтры действуют только на отдельный официальный слой/);

console.log('Analytical report official-data gates passed.');
