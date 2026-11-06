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
  assert.ok(result.records.every((r) => r.reference_period === String(r.reference_year)));
  const expectedMunicipalityIds = new Set([
    'beloyarsky-raion','berezovsky-raion','kogalym','kondinsky-raion','langepas',
    'megion','nefteyugansk','nefteyugansky-raion','nizhnevartovsk',
    'nizhnevartovsky-raion','nyagan-city','october-raion','pokachi','pyt-yah',
    'raduzhny','sovetsky-raion','surgut','surgutsky','uray','khanty-mansiysk',
    'khanty-mansiysky-raion','ugorsk',
  ]);
  assert.deepEqual(new Set(result.records.map((r) => r.municipality_id)), expectedMunicipalityIds);
  assert.ok(result.records.every((r) => ['budget_total_revenue','budget_tax_non_tax_revenue','budget_revenue_excluding_grants'].includes(r.indicator_code)));
  for (const code of ['budget_total_revenue','budget_tax_non_tax_revenue','budget_revenue_excluding_grants']) {
    assert.equal(result.coverage_by_indicator_year[code]['2023'].municipality_count, 22, `${code} 2023 coverage`);
    assert.equal(result.coverage_by_indicator_year[code]['2024'].municipality_count, 22, `${code} 2024 coverage`);
    assert.equal(result.coverage_by_indicator_year[code]['2023'].complete, true, `${code} 2023 complete`);
    assert.equal(result.coverage_by_indicator_year[code]['2024'].complete, true, `${code} 2024 complete`);
  }

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
  assert.ok(result.records.every((r) => r.source_id === 'duma_hmao_municipal_budget_2023_2024_appendix1'));
  assert.ok(result.records.every((r) => r.source_url === 'https://www.dumahmao.ru/povest/0745_4/03/50.pdf'));
  assert.ok(result.records.every((r) => r.geographic_level === 'municipality'));
  assert.ok(result.records.every((r) => r.source_page === 1));
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
console.log('Duma PDF page 1 transcription checks passed');
