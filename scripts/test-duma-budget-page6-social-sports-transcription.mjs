import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../supabase/imports/review/duma_budget_page6_social_sports_manual_transcription.csv', import.meta.url);
const source = await readFile(file, 'utf8');
const [header, ...lines] = source.trim().split(/\r?\n/);
const columns = header.split(';');
const rows = lines.map((line) => {
  const values = line.split(';');
  assert.equal(values.length, columns.length, 'CSV delimiter/column count mismatch');
  return Object.fromEntries(columns.map((key, i) => [key, values[i]]));
});

const expected = {
  candidate_budget_social_policy_expenditure: [3491881.1, 5100351.3],
  candidate_budget_sports_expenditure: [10654142.3, 11836796.3],
};
assert.equal(rows.length, 88, 'Expected 2 indicators × 22 municipalities × 2 years');
assert.equal(new Set(rows.map(r => `${r.indicator_code}:${r.municipality_id}:${r.year}`)).size, 88, 'Duplicate indicator/municipality/year row');
assert.equal(new Set(rows.map(r => r.municipality_id)).size, 22, 'Expected all 22 municipalities');
assert.ok(rows.every(r => r.page === '6' && r.printed_page === '817'));
assert.ok(rows.every(r => r.review_status === 'needs_visual_review'));
assert.ok(rows.every(r => r.unit === 'тыс. руб.' && r.measure_type === 'amount'));

for (const [code, totals] of Object.entries(expected)) {
  const subset = rows.filter(r => r.indicator_code === code);
  assert.equal(subset.length, 44, `Expected 44 rows for ${code}`);
  for (const [i, year] of ['2023', '2024'].entries()) {
    const actual = Math.round(subset.filter(r => r.year === year)
      .reduce((sum, r) => sum + Number(r.value_raw.replace(',', '.')), 0) * 10) / 10;
    assert.equal(actual, totals[i], `Control total mismatch for ${code} ${year}`);
  }
}

console.log('Duma page 6 social/sports review transcription passed');
