import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const canonicalIds = new Set([
  'beloyarsky-raion', 'berezovsky-raion', 'kogalym', 'kondinsky-raion',
  'langepas', 'megion', 'nefteyugansk', 'nefteyugansky-raion',
  'nizhnevartovsk', 'nizhnevartovsky-raion', 'nyagan-city',
  'october-raion', 'pokachi', 'pyt-yah', 'raduzhny', 'sovetsky-raion',
  'surgut', 'surgutsky', 'uray', 'khanty-mansiysk',
  'khanty-mansiysky-raion', 'ugorsk',
]);
assert.equal(canonicalIds.size, 22);

const files = [
  '../supabase/imports/review/duma_budget_page3_expenditure_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page3_payroll_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page3_capital_investment_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page4_general_defense_security_economy_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page4_housing_utility_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page4_other_expenses_group_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page5_environment_education_culture_health_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page6_mass_media_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page6_municipal_debt_service_manual_transcription.csv',
  '../supabase/imports/review/duma_budget_page6_social_sports_manual_transcription.csv',
];

for (const file of files) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const [header, ...lines] = source.trim().split(/\r?\n/);
  const columns = header.split(';');
  const municipalityIndex = columns.indexOf('municipality');
  const idIndex = columns.indexOf('municipality_id');
  assert.ok(municipalityIndex >= 0 && idIndex >= 0, `Missing municipality columns in ${file}`);
  const mapping = new Map();
  for (const line of lines) {
    const values = line.split(';');
    assert.equal(values.length, columns.length, `Malformed CSV row in ${file}`);
    const name = values[municipalityIndex];
    const id = values[idIndex];
    assert.ok(canonicalIds.has(id), `Unknown/noncanonical municipality_id "${id}" in ${file}`);
    if (mapping.has(name)) assert.equal(mapping.get(name), id, `Inconsistent ID for ${name} in ${file}`);
    mapping.set(name, id);
  }
  assert.equal(mapping.size, 22, `Expected all 22 municipalities in ${file}`);
}

console.log('Duma review CSV municipality IDs match the Supabase municipality registry');
