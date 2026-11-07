import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function load(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const [header, ...lines] = source.trim().split(/\r?\n/);
  const columns = header.split(';');
  return lines.map((line) => {
    const values = line.split(';');
    assert.equal(values.length, columns.length, 'CSV delimiter/column count mismatch');
    return Object.fromEntries(columns.map((key, i) => [key, values[i]]));
  });
}
function total(rows, year) {
  return Math.round(rows.filter(r => r.year === year && r.value_raw !== '')
    .reduce((sum, r) => sum + Number(r.value_raw.replace(',', '.')), 0) * 10) / 10;
}

const media = await load('../supabase/imports/review/duma_budget_page6_mass_media_manual_transcription.csv');
assert.equal(media.length, 44);
assert.equal(new Set(media.map(r => `${r.municipality_id}:${r.year}`)).size, 44);
assert.equal(new Set(media.map(r => r.municipality_id)).size, 22);
assert.ok(media.every(r => r.page === '6' && r.printed_page === '817' && r.review_status === 'needs_visual_review'));
assert.equal(media.filter(r => r.value_raw === '').length, 1, 'One source cell remains unresolved');
assert.equal(total(media, '2023'), 574231.8);
assert.equal(total(media, '2024'), 679104.4);

const debt = await load('../supabase/imports/review/duma_budget_page6_municipal_debt_service_manual_transcription.csv');
assert.equal(debt.length, 44);
assert.equal(new Set(debt.map(r => `${r.municipality_id}:${r.year}`)).size, 44);
assert.equal(new Set(debt.map(r => r.municipality_id)).size, 22);
assert.ok(debt.every(r => r.page === '6' && r.printed_page === '817' && r.review_status === 'needs_visual_review'));
assert.equal(debt.filter(r => r.value_raw === '').length, 10, 'Five municipalities have blank debt-service cells');
assert.equal(total(debt, '2023'), 127118.5);
assert.equal(total(debt, '2024'), 44074.7);

console.log('Duma page 6 mass media and municipal debt service review transcriptions passed');
