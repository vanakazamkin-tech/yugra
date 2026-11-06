import test from 'node:test';
import assert from 'node:assert/strict';
import { createForecastIndexOptions } from './forecastIndexAdapter.js';

const municipalities = [
  { id: 'a', name: 'A', score: 91 },
  { id: 'b', name: 'B', score: 72 },
  { id: 'c', name: 'C', score: 64 },
];

const run = {
  referenceYear: 2025,
  referencePeriod: 'year',
  indexScale: '0–100 percentile score',
  results: {
    a: { municipalityId: 'a', status: 'complete', index: 88.5 },
    b: { municipalityId: 'b', status: 'insufficient_coverage', index: null },
    c: { municipalityId: 'c', status: 'complete', index: 101 },
  },
};

const contract = { status: 'approved', version: '1.2.0' };

test('adapter passes only complete finite 0–100 index results under an approved matching contract', () => {
  const options = createForecastIndexOptions({
    indexRun: run,
    municipalities,
    indexContract: contract,
    referenceYear: 2025,
    referencePeriod: 'year',
  });
  assert.equal(options.scoreSource, 'resilience-index');
  assert.deepEqual(options.indexContract, { status: 'approved', version: '1.2.0' });
  assert.deepEqual(options.indexResults, {
    a: { status: 'complete', index: 88.5 },
    b: { status: 'insufficient_coverage', index: null },
    c: { status: 'invalid_index_result', index: null },
  });
  assert.deepEqual(options.diagnostics, {
    available: true,
    reason: null,
    referenceYear: 2025,
    referencePeriod: 'year',
    methodologyVersion: '1.2.0',
    municipalityCount: 3,
    completeCount: 1,
    incompleteCount: 1,
    invalidCount: 1,
    duplicateMunicipalityCount: 0,
  });
  assert.equal('score' in options.indexResults.a, false);
});

test('adapter refuses candidate or unversioned methodology contracts', () => {
  for (const indexContract of [
    { status: 'candidate', version: '1.2.0' },
    { status: 'approved', version: '   ' },
    null,
  ]) {
    const options = createForecastIndexOptions({
      indexRun: run, municipalities, indexContract,
      referenceYear: 2025, referencePeriod: 'year',
    });
    assert.equal(options.indexContract.status, 'candidate');
    assert.equal(options.indexContract.version, null);
    assert.equal(options.diagnostics.available, false);
    assert.equal(options.diagnostics.reason, 'approved_versioned_methodology_contract_required');
  }
});

test('adapter blocks a different year or period and unsupported index scale', () => {
  const wrongPeriod = createForecastIndexOptions({
    indexRun: run, municipalities, indexContract: contract,
    referenceYear: 2024, referencePeriod: 'year',
  });
  assert.equal(wrongPeriod.indexContract.status, 'candidate');
  assert.equal(wrongPeriod.diagnostics.reason, 'reference_period_mismatch');

  const wrongScale = createForecastIndexOptions({
    indexRun: { ...run, indexScale: '0–100' }, municipalities, indexContract: contract,
    referenceYear: 2025, referencePeriod: 'year',
  });
  assert.equal(wrongScale.indexContract.status, 'candidate');
  assert.equal(wrongScale.diagnostics.reason, 'unsupported_index_scale');
});

test('adapter does not silently use duplicate or missing municipality IDs', () => {
  const options = createForecastIndexOptions({
    indexRun: run,
    municipalities: [
      { id: 'a', score: 91 },
      { id: 'a', score: 80 },
      { name: 'Без ID', score: 70 },
      { id: 'b', score: 72 },
    ],
    indexContract: contract,
    referenceYear: 2025,
    referencePeriod: 'year',
  });
  assert.equal(options.indexResults.a, undefined);
  assert.deepEqual(options.indexResults.b, { status: 'insufficient_coverage', index: null });
  assert.equal(options.diagnostics.duplicateMunicipalityCount, 2);
});

test('adapter rejects malformed run result collections', () => {
  const options = createForecastIndexOptions({
    indexRun: { ...run, results: [] }, municipalities, indexContract: contract,
    referenceYear: 2025, referencePeriod: 'year',
  });
  assert.equal(options.indexContract.status, 'candidate');
  assert.equal(options.diagnostics.reason, 'calculated_index_results_required');
});


test('adapter rejects a complete result whose embedded municipality identity does not match its key', () => {
  const options = createForecastIndexOptions({
    indexRun: {
      ...run,
      results: {
        ...run.results,
        a: { municipalityId: 'b', status: 'complete', index: 88.5 },
      },
    },
    municipalities,
    indexContract: contract,
    referenceYear: 2025,
    referencePeriod: 'year',
  });
  assert.deepEqual(options.indexResults.a, { status: 'invalid_index_result', index: null });
  assert.equal(options.diagnostics.invalidCount, 2);
});
