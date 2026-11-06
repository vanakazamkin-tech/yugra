import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression guard: risk scoring must fail closed when provenance or geography is missing.
const source = readFileSync(new URL('../src/lib/riskSeries.js', import.meta.url), 'utf8');
assert.match(source, /row\.verification_status !== 'verified'/);
assert.match(source, /row\.geographic_level !== 'municipality'/);
assert.doesNotMatch(source, /row\.verification_status\s*&&\s*row\.verification_status\s*!==\s*'verified'/);
assert.doesNotMatch(source, /row\.geographic_level\s*\|\|\s*'municipality'/);
console.log('Risk data provenance and geography gate test passed.');
