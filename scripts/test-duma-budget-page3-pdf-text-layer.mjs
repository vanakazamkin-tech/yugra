import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const csvPath = new URL('../supabase/imports/review/duma_budget_page3_expenditure_manual_transcription.csv', import.meta.url);
const fixturePath = new URL('../supabase/imports/review/source_text/duma_budget_page3_text_layer_expenditure.csv', import.meta.url);

const parseSemicolonCsv = (text) => text
  .split(/\r?\n/)
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => line.split(';'));

const normalizeValue = (value) => {
  const parsed = Number(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
  assert.ok(Number.isFinite(parsed), `Invalid numeric value: ${value}`);
  return parsed;
};

const [csvText, fixtureText] = await Promise.all([
  readFile(csvPath, 'utf8'),
  readFile(fixturePath, 'utf8'),
]);

const [csvHeader, ...csvValues] = parseSemicolonCsv(csvText);
const [fixtureHeader, ...fixtureValues] = parseSemicolonCsv(fixtureText);

assert.deepEqual(fixtureHeader, ['municipality', '2023', '2024']);
assert.ok(csvHeader.includes('municipality'));
assert.ok(csvHeader.includes('year'));
assert.ok(csvHeader.includes('value_raw'));
assert.ok(csvHeader.includes('review_status'));

const csvRows = csvValues.map((values) => Object.fromEntries(csvHeader.map((key, index) => [key, values[index]])));
const sourceRows = fixtureValues.map((values) => Object.fromEntries(fixtureHeader.map((key, index) => [key, values[index]])));
const sourceByMunicipality = new Map(sourceRows.map((row) => [row.municipality, row]));

assert.equal(sourceRows.length, 23, 'Expected 22 municipalities plus the printed total row');
assert.equal(csvRows.length, 44, 'Expected 22 municipalities × 2 years');
assert.equal(new Set(csvRows.map((row) => `${row.municipality}:${row.year}`)).size, 44, 'CSV municipality/year keys must be unique');

const printedTotal = sourceByMunicipality.get('ВСЕГО');
assert.ok(printedTotal, 'Official text-layer fixture must include the printed total row');

for (const row of csvRows) {
  const source = sourceByMunicipality.get(row.municipality);
  assert.ok(source, `Municipality missing from official PDF text layer: ${row.municipality}`);
  assert.ok(['2023', '2024'].includes(row.year), `Unexpected year: ${row.year}`);
  assert.equal(
    normalizeValue(row.value_raw),
    normalizeValue(source[row.year]),
    `CSV/PDF text-layer mismatch for ${row.municipality} ${row.year}`,
  );
  assert.equal(row.indicator_code, 'budget_total_expenditure');
  assert.equal(row.indicator_name, 'Расходы бюджета — всего');
  assert.equal(row.measure_type, 'amount');
  assert.equal(row.unit, 'тыс. руб.');
  assert.equal(row.page, '3');
  assert.equal(row.source_id, 'duma_hmao_municipal_budget_2023_2024_appendix1');
  assert.equal(row.review_status, 'needs_visual_review', 'Text-layer match must not promote visual-review status');
}

for (const year of ['2023', '2024']) {
  const sum = csvRows
    .filter((row) => row.year === year)
    .reduce((total, row) => total + normalizeValue(row.value_raw), 0);
  assert.ok(
    Math.abs(sum - normalizeValue(printedTotal[year])) <= 0.11,
    `Municipality sum does not match printed PDF total for ${year}: ${sum} vs ${printedTotal[year]}`,
  );
}

console.log('Page 3 PDF text-layer control passed: all 44 values, 22 municipality/year pairs, and both printed totals match.');
console.log('All transcriptions remain needs_visual_review; text-layer verification is not visual certification.');
