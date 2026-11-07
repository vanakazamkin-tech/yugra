import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Manual transcription of the two annual "Итого расходов" columns on page 3
// (PDF page index P2) of the official Duma Yugra annual appendix:
// https://www.dumahmao.ru/povest/0745_4/03/50.pdf
// This is a control fixture for arithmetic only, not an import dataset.
// The source text layer contains blank cells and multi-level headers; each
// row still requires visual review before production use.

const rows = [
  ['г.Нефтеюганск', 16840037.2, 12608996.9],
  ['г.Сургут', 40273903.8, 43102449.6],
  ['г.Ханты-Мансийск', 15300639.1, 17133734.9],
  ['г.Нижневартовск', 27149965.7, 29379191.9],
  ['г.Мегион', 7403290.8, 6793946.7],
  ['г.Урай', 4917599.6, 6322476.2],
  ['г.Когалым', 7327858.5, 7466942.5],
  ['г.Радужный', 3424071.5, 3948707.5],
  ['г.Лангепас', 3939203.6, 4671396.3],
  ['г.Нягань', 6943079.4, 8336363.1],
  ['г.Пыть-Ях', 4618083.8, 5465220.5],
  ['г.Покачи', 1918787.5, 2324635.7],
  ['г.Югорск', 4867159.2, 5941621.4],
  ['Белоярский муниципальный район', 5099914.4, 6563581.8],
  ['Берёзовский муниципальный район', 5565446.9, 5866706.1],
  ['Кондинский муниципальный район', 5734583.2, 6178410.7],
  ['Октябрьский муниципальный район', 6106126.8, 6512505.1],
  ['Сургутский муниципальный район', 18747259.2, 24287065.5],
  ['Советский муниципальный район', 6276770.2, 6557925.8],
  ['Ханты-Мансийский муниципальный район', 5389919.6, 5979323.8],
  ['Нижневартовский муниципальный район', 6074761.6, 6498285.0],
  ['Нефтеюганский муниципальный район', 7789710.4, 9169371.7],
];

const expected = {
  2023: 211708172.0,
  2024: 231108858.7,
};
const csvPath = new URL('../supabase/imports/review/duma_budget_page3_expenditure_manual_transcription.csv', import.meta.url);
const csvText = await readFile(csvPath, 'utf8');
const [csvHeader, ...csvLines] = csvText.trim().split(/\r?\n/);
const csvColumns = csvHeader.split(';');
const csvRows = csvLines.map((line) => {
  const values = line.split(';');
  assert.equal(values.length, csvColumns.length, 'CSV delimiter/column count mismatch');
  return Object.fromEntries(csvColumns.map((key, index) => [key, values[index]]));
});

assert.equal(csvRows.length, 44, 'Expected 22 municipalities × 2 CSV rows');
assert.equal(
  new Set(csvRows.map((row) => `${row.municipality}:${row.year}`)).size,
  44,
  'CSV municipality/year rows must be unique',
);
assert.ok(csvRows.every((row) =>
  row.indicator_code === 'budget_total_expenditure'
  && row.indicator_name === 'Расходы бюджета — всего'
  && row.measure_type === 'amount'
  && row.unit === 'тыс. руб.'
  && row.page === '3'
  && row.source_id === 'duma_hmao_municipal_budget_2023_2024_appendix1'
  && row.review_status === 'needs_visual_review'
), 'CSV must retain the expected source, measure, page and review-only status');

for (const [name, value2023, value2024] of rows) {
  for (const [year, expectedValue] of [['2023', value2023], ['2024', value2024]]) {
    const csvRow = csvRows.find((row) => row.municipality === name && row.year === year);
    assert.ok(csvRow, `Missing CSV row for ${name} ${year}`);
    assert.equal(
      Number(csvRow.value_raw.replace(',', '.')),
      expectedValue,
      `CSV value mismatch against independent Appendix 2 controls for ${name} ${year}`,
    );
  }
}


assert.equal(rows.length, 22, 'Expected exactly 22 municipal rows');
assert.equal(new Set(rows.map(([name]) => name)).size, 22, 'Municipality labels must be unique');

const appendix2Expected2023 = new Map([
  ['г.Нефтеюганск', 16840037.2],
  ['г.Сургут', 40273903.8],
  ['г.Ханты-Мансийск', 15300639.1],
  ['г.Нижневартовск', 27149965.7],
  ['г.Мегион', 7403290.8],
  ['г.Урай', 4917599.6],
  ['г.Когалым', 7327858.5],
  ['г.Радужный', 3424071.5],
  ['г.Лангепас', 3939203.6],
  ['г.Нягань', 6943079.4],
  ['г.Пыть-Ях', 4618083.8],
  ['г.Покачи', 1918787.5],
  ['г.Югорск', 4867159.2],
  ['Белоярский муниципальный район', 5099914.4],
  ['Берёзовский муниципальный район', 5565446.9],
  ['Кондинский муниципальный район', 5734583.2],
  ['Октябрьский муниципальный район', 6106126.8],
  ['Сургутский муниципальный район', 18747259.2],
  ['Советский муниципальный район', 6276770.2],
  ['Ханты-Мансийский муниципальный район', 5389919.6],
  ['Нижневартовский муниципальный район', 6074761.6],
  ['Нефтеюганский муниципальный район', 7789710.4],
]);

const appendix2Expected2024 = new Map([
  ['г.Нефтеюганск', 12608996.9],
  ['г.Сургут', 43102449.6],
  ['г.Ханты-Мансийск', 17133734.9],
  ['г.Нижневартовск', 29379191.9],
  ['г.Мегион', 6793946.7],
  ['г.Урай', 6322476.2],
  ['г.Когалым', 7466942.5],
  ['г.Радужный', 3948707.5],
  ['г.Лангепас', 4671396.3],
  ['г.Нягань', 8336363.1],
  ['г.Пыть-Ях', 5465220.5],
  ['г.Покачи', 2324635.7],
  ['г.Югорск', 5941621.4],
  ['Белоярский муниципальный район', 6563581.8],
  ['Берёзовский муниципальный район', 5866706.1],
  ['Кондинский муниципальный район', 6178410.7],
  ['Октябрьский муниципальный район', 6512505.1],
  ['Сургутский муниципальный район', 24287065.5],
  ['Советский муниципальный район', 6557925.8],
  ['Ханты-Мансийский муниципальный район', 5979323.8],
  ['Нижневартовский муниципальный район', 6498285.0],
  ['Нефтеюганский муниципальный район', 9169371.7],
]);

// Independent cross-check against the official annual Appendix 2 reports:
// 2023: https://www.dumahmao.ru/povest/0734_2/05/62.pdf
// 2024: https://www.dumahmao.ru/povest/0745_4/03/51.pdf
assert.equal(appendix2Expected2023.size, 22, '2023 Appendix 2 must cover 22 municipalities');
assert.equal(appendix2Expected2024.size, 22, '2024 Appendix 2 must cover 22 municipalities');
for (const [name, value2023, value2024] of rows) {
  assert.equal(appendix2Expected2023.get(name), value2023,
    `2023 expenditure mismatch against Appendix 2 for ${name}`);
  assert.equal(appendix2Expected2024.get(name), value2024,
    `2024 expenditure mismatch against Appendix 2 for ${name}`);
}


const totals = {
  2023: rows.reduce((sum, [, value]) => sum + value, 0),
  2024: rows.reduce((sum, [, , value]) => sum + value, 0),
};

for (const year of [2023, 2024]) {
  assert.ok(Math.abs(totals[year] - expected[year]) < 0.0001,
    `Page 3 ${year} total mismatch: ${totals[year]} != ${expected[year]}`);
}

console.log('Duma annual page 3 expenditure control totals passed', totals);
