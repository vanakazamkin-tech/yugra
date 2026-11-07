import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Manual transcription of the municipal “Жилищно-коммунальное хозяйство”
// expenditure column from page 4 (printed page 816) of official Duma Yugra
// Appendix 1: https://www.dumahmao.ru/povest/0745_4/03/50.pdf
// Review-only fixture; visual verification of each source cell is outstanding.
const expected = [
  ['г.Нефтеюганск', 'nefteyugansk', 6739950.4, 1724183.2],
  ['г.Сургут', 'surgut', 5159930.8, 4056607.3],
  ['г.Ханты-Мансийск', 'khanty-mansiysk', 2714225.9, 2058658.3],
  ['г.Нижневартовск', 'nizhnevartovsk', 1677345.1, 2527479.8],
  ['г.Мегион', 'megion', 2633901.0, 898886.5],
  ['г.Урай', 'uray', 1130650.4, 953297.0],
  ['г.Когалым', 'kogalym', 1623038.7, 696982.6],
  ['г.Радужный', 'raduzhny', 294927.2, 364030.7],
  ['г.Лангепас', 'langepas', 239184.8, 414962.9],
  ['г.Нягань', 'nyagan-city', 1971443.9, 1817176.0],
  ['г.Пыть-Ях', 'pyt-yakh', 904391.9, 1097522.8],
  ['г.Покачи', 'pokachi', 129432.1, 174266.3],
  ['г.Югорск', 'yugorsk', 1199952.5, 1126832.1],
  ['Белоярский муниципальный район', 'beloyarsky-raion', 1470390.8, 2275733.1],
  ['Берёзовский муниципальный район', 'berezovsky-raion', 1434016.4, 1425410.9],
  ['Кондинский муниципальный район', 'kondinsky-raion', 962078.3, 1177211.8],
  ['Октябрьский муниципальный район', 'october-raion', 1312421.7, 1648068.8],
  ['Сургутский муниципальный район', 'surgutsky', 3887596.5, 6717902.1],
  ['Советский муниципальный район', 'sovetsky-raion', 1564378.2, 1153152.8],
  ['Ханты-Мансийский муниципальный район', 'khanty-mansiysky-raion', 1257555.7, 1371688.9],
  ['Нижневартовский муниципальный район', 'nizhnevartovsky-raion', 1255101.8, 1033408.2],
  ['Нефтеюганский муниципальный район', 'nefteyugansky-raion', 2455506.3, 2814038.1],
];

const file = new URL('../supabase/imports/review/duma_budget_page4_housing_utility_manual_transcription.csv', import.meta.url);
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
assert.ok(parsed.every((r) => r.page === '4' && r.printed_page === '816'));
assert.ok(parsed.every((r) => r.review_status === 'needs_visual_review'));
assert.ok(parsed.every((r) => r.indicator_code === 'candidate_budget_housing_utility_expenditure'));
assert.ok(parsed.every((r) => r.unit === 'тыс. руб.' && r.measure_type === 'amount'));

for (const [name, id, value2023, value2024] of expected) {
  for (const [year, value] of [['2023', value2023], ['2024', value2024]]) {
    const row = parsed.find((r) => r.municipality_id === id && r.year === year);
    assert.ok(row, `Missing ${year} housing/utility row for ${name}`);
    assert.equal(row.municipality, name);
    assert.equal(Number(row.value_raw.replace(',', '.')), value,
      `Housing/utility transcription mismatch for ${name} ${year}`);
  }
}

const totals = Object.fromEntries(['2023', '2024'].map((year) => [
  year,
  Math.round(parsed.filter((r) => r.year === year)
    .reduce((sum, r) => sum + Number(r.value_raw.replace(',', '.')), 0) * 10) / 10,
]));
assert.equal(totals['2023'], 42017420.4, '2023 housing/utility control total mismatch');
assert.equal(totals['2024'], 37527500.2, '2024 housing/utility control total mismatch');

console.log('Duma annual housing/utility review transcription passed', totals);
