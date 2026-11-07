import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Manual transcription of “Капитальные вложения в объекты государственной
// (муниципальной) собственности (с учетом бюджетных и автономных учреждений)”
// from page 3 of official Duma Yugra Appendix 1:
// https://www.dumahmao.ru/povest/0745_4/03/50.pdf
// Review fixture only; visual cell-by-cell verification is still required.
const expected = [
  ['г.Нефтеюганск', 'nefteyugansk', 5328450.4, 1559169.5],
  ['г.Сургут', 'surgut', 8586706.9, 4936892.6],
  ['г.Ханты-Мансийск', 'khanty-mansiysk', 4301165.1, 3486206.0],
  ['г.Нижневартовск', 'nizhnevartovsk', 4853707.5, 3368448.4],
  ['г.Мегион', 'megion', 2313012.0, 419270.9],
  ['г.Урай', 'uray', 1331005.1, 2337044.4],
  ['г.Когалым', 'kogalym', 1763696.6, 1342309.2],
  ['г.Радужный', 'raduzhny', 75345.1, 104315.1],
  ['г.Лангепас', 'langepas', 379276.8, 317878.4],
  ['г.Нягань', 'nyagan-city', 1532343.6, 1285776.8],
  ['г.Пыть-Ях', 'pyt-yakh', 311898.4, 268227.3],
  ['г.Покачи', 'pokachi', 98546.0, 76237.9],
  ['г.Югорск', 'yugorsk', 986174.6, 822888.0],
  ['Белоярский муниципальный район', 'beloyarsky-raion', 1311343.4, 1960340.2],
  ['Берёзовский муниципальный район', 'berezovsky-raion', 1043901.2, 610744.7],
  ['Кондинский муниципальный район', 'kondinsky-raion', 1279723.3, 666970.8],
  ['Октябрьский муниципальный район', 'october-raion', 2058631.5, 1454994.3],
  ['Сургутский муниципальный район', 'surgutsky', 3747074.2, 6881295.9],
  ['Советский муниципальный район', 'sovetsky-raion', 1109051.3, 637842.8],
  ['Ханты-Мансийский муниципальный район', 'khanty-mansiysky-raion', 776502.6, 486710.3],
  ['Нижневартовский муниципальный район', 'nizhnevartovsky-raion', 460768.0, 327826.3],
  ['Нефтеюганский муниципальный район', 'nefteyugansky-raion', 2038062.3, 2012389.4],
];

const file = new URL('../supabase/imports/review/duma_budget_page3_capital_investment_manual_transcription.csv', import.meta.url);
const text = await readFile(file, 'utf8');
const [header, ...lines] = text.trim().split(/\r?\n/);
const columns = header.split(';');
const parsed = lines.map((line) => {
  const values = line.split(';');
  assert.equal(values.length, columns.length, 'CSV delimiter/column count mismatch');
  return Object.fromEntries(columns.map((key, index) => [key, values[index]]));
});

assert.equal(parsed.length, 44, 'Expected 22 municipalities × 2 years');
assert.equal(new Set(parsed.map((r) => `${r.municipality_id}:${r.year}`)).size, 44, 'Duplicate municipality/year row');
assert.ok(parsed.every((r) => r.page === '3' && r.review_status === 'needs_visual_review'));
assert.ok(parsed.every((r) => r.indicator_code === 'candidate_budget_capital_investment_expenditure'));
assert.ok(parsed.every((r) => r.unit === 'тыс. руб.' && r.measure_type === 'amount'));

for (const [name, id, value2023, value2024] of expected) {
  for (const [year, value] of [['2023', value2023], ['2024', value2024]]) {
    const row = parsed.find((r) => r.municipality_id === id && r.year === year);
    assert.ok(row, `Missing ${year} capital investment row for ${name}`);
    assert.equal(row.municipality, name);
    assert.equal(Number(row.value_raw.replace(',', '.')), value,
      `Capital investment transcription mismatch for ${name} ${year}`);
  }
}

const totals = Object.fromEntries(['2023', '2024'].map((year) => [
  year,
  Math.round(parsed.filter((r) => r.year === year)
    .reduce((sum, r) => sum + Number(r.value_raw.replace(',', '.')), 0) * 10) / 10,
]));
assert.equal(totals['2023'], 45686385.9, '2023 capital investment control total mismatch');
assert.equal(totals['2024'], 35363779.2, '2024 capital investment control total mismatch');

console.log('Duma annual capital investment review transcription passed', totals);
