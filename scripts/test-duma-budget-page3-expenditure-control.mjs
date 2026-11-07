import assert from 'node:assert/strict';

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

assert.equal(rows.length, 22, 'Expected exactly 22 municipal rows');
assert.equal(new Set(rows.map(([name]) => name)).size, 22, 'Municipality labels must be unique');

const totals = {
  2023: rows.reduce((sum, [, value]) => sum + value, 0),
  2024: rows.reduce((sum, [, , value]) => sum + value, 0),
};

for (const year of [2023, 2024]) {
  assert.ok(Math.abs(totals[year] - expected[year]) < 0.0001,
    `Page 3 ${year} total mismatch: ${totals[year]} != ${expected[year]}`);
}

console.log('Duma annual page 3 expenditure control totals passed', totals);
