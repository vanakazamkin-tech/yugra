import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/InvestmentDetails.jsx', import.meta.url), 'utf8');
const comparisonStart = source.indexOf('const officialComparisonSeriesOptions');
const comparisonEnd = source.indexOf('const selectedRiskSignalConfig', comparisonStart);
assert.ok(comparisonStart >= 0 && comparisonEnd > comparisonStart, 'official comparison logic must exist');
const comparison = source.slice(comparisonStart, comparisonEnd);
assert.ok((comparison.match(/item\.verification_status === 'verified'/g) || []).length >= 3, 'all comparison stages must require verified observations');
assert.ok((comparison.match(/item\.geographic_level === geographyLevel/g) || []).length >= 3, 'all comparison stages must require exact geography');
assert.doesNotMatch(comparison, /item\.geographic_level\s*\|\|\s*'municipality'/, 'missing geography must not default to municipality');
assert.match(comparison, /item\.unit \|\| ''/);
assert.match(comparison, /effectiveOfficialComparisonPeriod/);
console.log('Official comparison comparability gates passed.');
