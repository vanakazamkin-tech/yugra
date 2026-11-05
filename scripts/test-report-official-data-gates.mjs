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
console.log('Analytical report official-data gates passed.');
