import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isHttpSourceUrl } from '../src/lib/sourceUrl.js';

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
assert.match(selector, /String\(item\.unit \|\| ''\)\.trim\(\) !== ''/, 'official report observations must have an explicit unit');
assert.match(selector, /isHttpSourceUrl\\(item\\.source_url\\)/, 'official report observations must use a safe HTTP(S) source URL');
assert.equal(isHttpSourceUrl('https://rosstat.gov.ru/source'), true);
assert.equal(isHttpSourceUrl('http://example.org/source'), true);
assert.equal(isHttpSourceUrl('javascript:alert(1)'), false);
assert.equal(isHttpSourceUrl('data:text/html,source'), false);
assert.equal(isHttpSourceUrl('file:///etc/passwd'), false);
assert.equal(isHttpSourceUrl('https://'), false);

assert.match(selector, /String\(item\.indicator_code \|\| ''\)\.trim\(\) !== ''/);
assert.doesNotMatch(selector, /item\.geographic_level\s*\|\|\s*'municipality'/);

for (const label of ['Средний демо-балл', 'Демо-объём инвестиций', 'Демо-субъекты МСП', 'Средняя демо-оценка бизнеса']) {
  assert.ok(source.includes(label), `report aggregate must visibly identify ${label} as conceptual demo data`);
}
assert.match(source, /сумма только по доступным значениям/);

const exportStart = source.indexOf('const exportReportCsv = () =>');
const exportEnd = source.indexOf('const renderTableRows', exportStart);
assert.ok(exportStart >= 0 && exportEnd > exportStart, 'report CSV export must exist');
const reportExport = source.slice(exportStart, exportEnd);
assert.match(reportExport, /reportIncludeOfficialData \? reportOfficialIndicators : \[\]/, 'official observations must follow the report toggle');
assert.match(reportExport, /item\.indicator_name/);
assert.match(reportExport, /item\.geographic_level/);
assert.match(reportExport, /formatReferencePeriod\(item\)/);
assert.match(reportExport, /item\.unit/);
assert.match(reportExport, /item\.source_id/);
assert.match(reportExport, /item\.source_url/);
assert.match(reportExport, /item\.verification_status/);
assert.match(reportExport, /row\.map\(csvEscape\)/, 'all report CSV cells must use formula-safe escaping');
assert.match(reportExport, /Демонстрационные значения — не официальная статистика/);
assert.match(reportExport, /Проверенные официальные наблюдения/);

console.log('Analytical report official-data and CSV export gates passed.');
