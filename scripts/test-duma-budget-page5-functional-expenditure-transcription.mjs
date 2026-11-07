import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../supabase/imports/review/duma_budget_page5_environment_education_culture_health_manual_transcription.csv', import.meta.url);
const source = await readFile(path, 'utf8');
const [header, ...lines] = source.trim().split(/\r?\n/);
const columns = header.split(';');
const rows = lines.map((line) => {
  const values = line.split(';');
  assert.equal(values.length, columns.length, 'CSV delimiter/column count mismatch');
  return Object.fromEntries(columns.map((key, i) => [key, values[i]]));
});

const expected = {
  candidate_budget_environmental_protection_expenditure: [2361475.0, 1455772.0],
  candidate_budget_education_expenditure: [100886482.2, 114891654.7],
  candidate_budget_culture_expenditure: [9157143.5, 9995712.4],
  candidate_budget_healthcare_expenditure: [37324.4, 42526.2],
};
assert.equal(rows.length, 176, 'Expected 4 indicators × 22 municipalities × 2 years');
assert.equal(new Set(rows.map(r => `${r.indicator_code}:${r.municipality_id}:${r.year}`)).size, 176, 'Duplicate indicator/municipality/year row');
assert.equal(new Set(rows.map(r => r.municipality_id)).size, 22, 'Expected all 22 municipalities');
assert.ok(rows.every(r => r.page === '5' && r.printed_page === '816'));
assert.ok(rows.every(r => r.review_status === 'needs_visual_review'));
assert.ok(rows.every(r => r.unit === 'тыс. руб.' && r.measure_type === 'amount'));

for (const [code, expectedTotals] of Object.entries(expected)) {
  const subset = rows.filter(r => r.indicator_code === code);
  assert.equal(subset.length, 44, `Expected 44 rows for ${code}`);
  for (const [i, year] of ['2023', '2024'].entries()) {
    const actual = Math.round(subset.filter(r => r.year === year)
      .reduce((sum, r) => sum + Number(r.value_raw.replace(',', '.')), 0) * 10) / 10;
    assert.equal(actual, expectedTotals[i], `Control total mismatch for ${code} ${year}`);
  }
}

console.log('Duma page 5 functional expenditure review transcription passed');
