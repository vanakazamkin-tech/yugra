import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const [header, ...lines] = source.trim().split(/\r?\n/);
  const columns = header.split(';');
  return lines.map((line) => {
    const values = line.split(';');
    assert.equal(values.length, columns.length, `CSV delimiter/column count mismatch: ${path}`);
    return Object.fromEntries(columns.map((key, i) => [key, values[i]]));
  });
}
const numeric = (row) => Number(row.value_raw.replace(',', '.'));
const key = (row) => `${row.municipality_id}:${row.year}`;

const other = await load('../supabase/imports/review/duma_budget_page4_other_expenses_group_manual_transcription.csv');
const total = await load('../supabase/imports/review/duma_budget_page3_expenditure_manual_transcription.csv');
const payroll = await load('../supabase/imports/review/duma_budget_page3_payroll_manual_transcription.csv');
const capital = await load('../supabase/imports/review/duma_budget_page3_capital_investment_manual_transcription.csv');

assert.equal(other.length, 44, 'Expected 22 municipalities × 2 years');
assert.equal(new Set(other.map(r => r.municipality_id)).size, 22);
assert.equal(new Set(other.map(key)).size, 44);
assert.ok(other.every(r => r.page === '4' && r.printed_page === '815'));
assert.ok(other.every(r => r.review_status === 'needs_visual_review' && r.unit === 'тыс. руб.'));

const expectedTotals = { 2023: 62688872.0, 2024: 78916387.3 };
for (const year of ['2023', '2024']) {
  const sum = other.filter(r => r.year === year).reduce((s, r) => s + numeric(r), 0);
  assert.equal(Math.round(sum * 10) / 10, expectedTotals[year], `Other-expenses aggregate mismatch for ${year}`);
}

const index = (rows, name) => {
  const map = new Map(rows.map(r => [key(r), r]));
  assert.equal(map.size, 44, `${name}: expected unique 44 municipality/year rows`);
  return map;
};
const totalsByKey = index(total, 'total expenditure');
const payrollByKey = index(payroll, 'payroll');
const capitalByKey = index(capital, 'capital investment');
const otherByKey = index(other, 'other expenses');

for (const [k, totalRow] of totalsByKey) {
  const p = payrollByKey.get(k);
  const c = capitalByKey.get(k);
  const o = otherByKey.get(k);
  assert.ok(p && c && o, `Missing expense grouping component for ${k}`);
  const sum = numeric(p) + numeric(c) + numeric(o);
  assert.equal(Math.round(sum * 10) / 10, numeric(totalRow),
    `Payroll + capital investment + other expenses must equal total expenditure for ${k}`);
}

console.log('Duma page 4 other-expenses group and municipality-level three-part reconciliation passed');
