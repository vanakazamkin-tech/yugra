import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const input = 'supabase/imports/review/duma_budget_page1_manual_transcription.csv';
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'yugra-duma-p1-'));
try {
  const output = path.join(temp, 'review.json');
  execFileSync(process.execPath, [
    'scripts/prepare-duma-budget-import.mjs', input, `--out=${output}`,
  ], { stdio: 'pipe' });
  const result = JSON.parse(await fs.readFile(output, 'utf8'));
  assert.equal(result.input_rows, 132);
  assert.equal(result.staged_rows, 132);
  assert.equal(result.warning_count, 0);
  assert.equal(result.duplicate_keys.length, 0);
  assert.equal(result.coverage_by_year['2023'].municipality_count, 22);
  assert.equal(result.coverage_by_year['2024'].municipality_count, 22);
  assert.equal(result.records.filter((r) => r.reference_year === 2023).length, 66);
  assert.equal(result.records.filter((r) => r.reference_year === 2024).length, 66);

  const expected = {
    budget_total_revenue: {2023: 216011081.4, 2024: 241589251.7},
    budget_tax_non_tax_revenue: {2023: 80714629.9, 2024: 94817015.1},
    budget_revenue_excluding_grants: {2023: 56320867.8, 2024: 65586617.1},
  };
  for (const [code, years] of Object.entries(expected)) {
    for (const [yearText, total] of Object.entries(years)) {
      const year = Number(yearText);
      const actual = result.records
        .filter((r) => r.indicator_code === code && r.reference_year === year)
        .reduce((sum, r) => sum + r.value, 0);
      assert.equal(Math.round(actual * 10) / 10, total, `${code} ${year} must match PDF ВСЕГО row`);
    }
  }
  assert.ok(result.records.every((r) => r.verification_status === 'needs_review'));
  assert.ok(result.records.every((r) => r.source_page === 1));
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
console.log('Duma PDF page 1 transcription checks passed');
