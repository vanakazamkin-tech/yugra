import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const input = 'supabase/imports/review/duma_budget_page3_expenditure_manual_transcription.csv';
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'yugra-duma-p3-'));
try {
  const output = path.join(temp, 'review.json');
  execFileSync(process.execPath, [
    'scripts/prepare-duma-budget-import.mjs', input, `--out=${output}`,
  ], { stdio: 'pipe' });
  const result = JSON.parse(await fs.readFile(output, 'utf8'));

  assert.equal(result.input_rows, 44);
  assert.equal(result.staged_rows, 44);
  assert.equal(result.warning_count, 0);
  assert.equal(result.duplicate_keys.length, 0);
  assert.equal(result.coverage_by_year['2023'].municipality_count, 22);
  assert.equal(result.coverage_by_year['2024'].municipality_count, 22);
  assert.equal(result.coverage_by_year['2023'].complete, true);
  assert.equal(result.coverage_by_year['2024'].complete, true);
  assert.ok(result.records.every((r) => r.indicator_code === 'budget_total_expenditure'));
  assert.ok(result.records.every((r) => r.reference_period === String(r.reference_year)));
  assert.ok(result.records.every((r) => r.source_page === 3));
  assert.ok(result.records.every((r) => r.verification_status === 'needs_review'));
  assert.ok(result.records.every((r) => r.source_id === 'duma_hmao_municipal_budget_2023_2024_appendix1'));

  const expected = { 2023: 211708172.0, 2024: 231108858.7 };
  for (const year of [2023, 2024]) {
    const actual = result.records
      .filter((r) => r.reference_year === year)
      .reduce((sum, r) => sum + r.value, 0);
    assert.equal(Math.round(actual * 10) / 10, expected[year],
      `Page 3 ${year} expenditure must match PDF ВСЕГО row`);
  }
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
console.log('Duma PDF page 3 expenditure review transcription checks passed');
