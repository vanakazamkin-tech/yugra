import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const input = new URL('../supabase/imports/review/duma_budget_page3_expenditure_manual_transcription.csv', import.meta.url);
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'yugra-duma-page3-review-'));

try {
  const output = path.join(temp, 'prepared-review.json');
  execFileSync(process.execPath, [
    'scripts/prepare-duma-budget-import.mjs',
    input.pathname,
    `--out=${output}`,
  ], { stdio: 'pipe' });

  const result = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.equal(result.source.source_id, 'duma_hmao_municipal_budget_2023_2024_appendix1');
  assert.equal(result.source.url, 'https://www.dumahmao.ru/povest/0745_4/03/50.pdf');
  assert.equal(result.input_rows, 44);
  assert.equal(result.staged_rows, 44);
  assert.equal(result.excluded_control_total_rows.length, 0);
  assert.equal(result.duplicate_keys.length, 0);
  assert.equal(result.warning_count, 0);
  assert.equal(result.records.length, 44);

  for (const year of ['2023', '2024']) {
    assert.equal(result.coverage_by_year[year].municipality_count, 22);
    assert.equal(result.coverage_by_year[year].expected_municipality_count, 22);
    assert.equal(result.coverage_by_year[year].complete, true);
  }

  const expectedTotals = { 2023: 211708172.0, 2024: 231108858.7 };
  for (const [year, expected] of Object.entries(expectedTotals)) {
    const total = result.records
      .filter((record) => String(record.reference_year) === year)
      .reduce((sum, record) => sum + record.value, 0);
    assert.ok(Math.abs(total - expected) <= 0.11, `Unexpected staged total for ${year}: ${total}`);
  }

  assert.equal(new Set(result.records.map((record) => record.municipality_id)).size, 22);
  assert.ok(result.records.every((record) =>
    record.indicator_code === 'budget_total_expenditure'
    && record.measure_type === 'amount'
    && record.unit === 'тыс. руб.'
    && record.source_page === 3
    && record.source_id === 'duma_hmao_municipal_budget_2023_2024_appendix1'
    && record.source_url === 'https://www.dumahmao.ru/povest/0745_4/03/50.pdf'
    && record.verification_status === 'needs_review'
    && Array.isArray(record.review_flags)
    && record.review_flags.length === 0
  ), 'All prepared records must preserve source metadata and needs_review status');

  const csvText = await fs.readFile(input, 'utf8');
  const csvRows = csvText.trim().split(/\r?\n/).slice(1).map((line) => line.split(';'));
  assert.equal(csvRows.length, 44);
  assert.ok(csvRows.every((row) => row[11] === 'needs_visual_review'));

  assert.ok(result.safety_note.includes('No Supabase request or write'));
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

console.log('Duma page 3 expenditure review-only staging test passed: 44 rows, complete 22×2 coverage, zero warnings/duplicates, totals reconciled, no writes.');
