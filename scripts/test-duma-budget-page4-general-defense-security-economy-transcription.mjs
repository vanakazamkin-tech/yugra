import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../supabase/imports/review/duma_budget_page4_general_defense_security_economy_manual_transcription.csv', import.meta.url);
const source = await readFile(file, 'utf8');
const [header, ...lines] = source.trim().split(/\r?\n/);
const columns = header.split(';');
const rows = lines.map((line) => {
  const values = line.split(';');
  assert.equal(values.length, columns.length, 'CSV delimiter/column count mismatch');
  return Object.fromEntries(columns.map((key, i) => [key, values[i]]));
});

const expected = {
  candidate_budget_general_government_expenditure: [19728122.5, 21964121.3],
  candidate_budget_national_defense_expenditure: [80621.8, 86646.2],
  candidate_budget_national_security_expenditure: [1948989.5, 2074296.5],
  candidate_budget_national_economy_expenditure: [20643219.0, 25410302.5],
};
assert.equal(rows.length, 176, 'Expected 4 indicators × 22 municipalities × 2 years');
assert.equal(new Set(rows.map(r => `${r.indicator_code}:${r.municipality_id}:${r.year}`)).size, 176, 'Duplicate indicator/municipality/year row');
assert.equal(new Set(rows.map(r => r.municipality_id)).size, 22, 'Expected all 22 municipalities');
assert.ok(rows.every(r => r.page === '4' && r.printed_page === '815'));
assert.ok(rows.every(r => r.review_status === 'needs_visual_review'));
assert.ok(rows.every(r => r.unit === 'тыс. руб.' && r.measure_type === 'amount'));

for (const [code, totals] of Object.entries(expected)) {
  const subset = rows.filter(r => r.indicator_code === code);
  assert.equal(subset.length, 44, `Expected 44 rows for ${code}`);
  for (const [i, year] of ['2023', '2024'].entries()) {
    const values = subset.filter(r => r.year === year);
    const actual = Math.round(values.reduce((sum, r) => sum + (r.value_raw === '' ? 0 : Number(r.value_raw.replace(',', '.'))), 0) * 10) / 10;
    assert.equal(actual, totals[i], `Control total mismatch for ${code} ${year}`);
  }
}
const defense = rows.filter(r => r.indicator_code === 'candidate_budget_national_defense_expenditure');
assert.equal(defense.filter(r => r.value_raw === '').length, 18, 'Expected 9 source-empty municipalities × 2 years for national defense');
assert.ok(defense.filter(r => r.value_raw !== '').every(r => Number.isFinite(Number(r.value_raw.replace(',', '.')))));

console.log('Duma page 4 general/defense/security/economy review transcription passed');
