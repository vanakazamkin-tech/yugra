import assert from 'node:assert/strict';
import { buildRiskSeries } from '../src/lib/riskSeries.js';

const makeRow = (overrides = {}) => ({
  municipality_id: 'municipality-1',
  geographic_level: 'municipality',
  verification_status: 'verified',
  indicator_code: 'employment_rate',
  indicator_name: 'Employment rate',
  reference_year: 2023,
  reference_period: 'annual',
  value: 70,
  unit: '%',
  source_id: 'source-2023',
  ...overrides,
});

const validHistory = [
  makeRow({ reference_year: 2022, value: 72, source_id: 'source-2022' }),
  makeRow({ reference_year: 2023, value: 70, source_id: 'source-2023' }),
];

// The verified municipal history is admitted and produces an adverse employment signal.
const admitted = buildRiskSeries(validHistory);
assert.equal(admitted.length, 1, 'verified municipality observations must be admitted');
assert.equal(admitted[0].adverse, true, 'a comparable decline in employment rate must be adverse');
assert.equal(admitted[0].change, -2);

// Every row that fails either provenance or geography gates must be excluded.
const rejectedRows = [
  makeRow({ verification_status: 'unverified' }),
  makeRow({ verification_status: null }),
  makeRow({ verification_status: '' }),
  makeRow({ verification_status: undefined }),
  makeRow({ geographic_level: 'settlement' }),
  makeRow({ geographic_level: null }),
  makeRow({ geographic_level: '' }),
  makeRow({ geographic_level: undefined }),
];
for (const rejected of rejectedRows) {
  assert.equal(buildRiskSeries([...validHistory, rejected]).length, 1,
    'unverified or non-municipal observations must not create an additional series');
}

// If all observations fail the gate, no risk series may be emitted.
assert.equal(buildRiskSeries([
  makeRow({ verification_status: 'unverified' }),
  makeRow({ verification_status: 'verified', geographic_level: 'settlement' }),
]).length, 0, 'unverified and settlement-level data must be excluded');

// Missing gate metadata is not inferred or defaulted to a trusted value.
assert.equal(buildRiskSeries([
  makeRow({ verification_status: undefined }),
  makeRow({ geographic_level: undefined }),
]).length, 0, 'missing verification/geography metadata must fail closed');

// The risk pipeline must not mutate caller-owned rows or nested provenance arrays.
const input = [
  makeRow({ reference_year: 2022, value: 72, source_ids: ['source-a'] }),
  makeRow({ reference_year: 2023, value: 70, source_ids: ['source-b'] }),
];
const before = structuredClone(input);
buildRiskSeries(input);
assert.deepEqual(input, before, 'buildRiskSeries must not mutate the input dataset');

console.log('Risk data provenance and geography runtime tests passed.');
