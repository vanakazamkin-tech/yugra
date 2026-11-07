import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Manual transcription of “Оплата труда, начисления на выплаты по оплате
// труда (с учетом бюджетных и автономных учреждений)” from page 3 of the
// official annual Duma Yugra Appendix 1 (PDF printed page 814):
// https://www.dumahmao.ru/povest/0745_4/03/50.pdf
//
// Review fixture only. The PDF text layer identifies the column headings and
// annual totals, but the municipality-level rows still require visual review.
// No separate Appendix 2 payroll cross-check has been established.
const expected = [
  ['г.Нефтеюганск', 'nefteyugansk', 6032142.8, 6683239.0],
  ['г.Сургут', 'surgut', 18686569.6, 22105265.4],
  ['г.Ханты-Мансийск', 'khanty-mansiysk', 6623996.1, 7739603.7],
  ['г.Нижневартовск', 'nizhnevartovsk', 15023405.5, 16631505.6],
  ['г.Мегион', 'megion', 3582422.5, 4051410.9],
  ['г.Урай', 'uray', 2392530.9, 2671477.1],
  ['г.Когалым', 'kogalym', 3484840.7, 3926042.5],
  ['г.Радужный', 'raduzhny', 2282996.4, 2557989.0],
  ['г.Лангепас', 'langepas', 2661413.1, 3014277.4],
  ['г.Нягань', 'nyagan-city', 3186747.9, 3865162.1],
  ['г.Пыть-Ях', 'pyt-yah', 2599610.4, 2969411.9],
  ['г.Покачи', 'pokachi', 1300853.8, 1480096.3],
  ['г.Югорск', 'ugorsk', 2521595.5, 2697060.2],
  ['Белоярский муниципальный район', 'beloyarsky-raion', 2548582.9, 2818052.1],
  ['Берёзовский муниципальный район', 'berezovsky-raion', 2675417.7, 2962373.0],
  ['Кондинский муниципальный район', 'kondinsky-raion', 2935490.9, 3243954.2],
  ['Октябрьский муниципальный район', 'october-raion', 2723076.5, 3055936.6],
  ['Сургутский муниципальный район', 'surgutsky', 8966035.4, 10193164.7],
  ['Советский муниципальный район', 'sovetsky-raion', 3592805.4, 3874799.1],
  ['Ханты-Мансийский муниципальный район', 'khanty-mansiysky-raion', 2651693.9, 2848251.7],
  ['Нижневартовский муниципальный район', 'nizhnevartovsky-raion', 3440589.5, 3818387.1],
  ['Нефтеюганский муниципальный район', 'nefteyugansky-raion', 3420096.7, 3621232.6],
];

const file = new URL('../supabase/imports/review/duma_budget_page3_payroll_manual_transcription.csv', import.meta.url);
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
assert.ok(parsed.every((r) => r.indicator_code === 'candidate_budget_payroll_and_contributions'));
assert.ok(parsed.every((r) => r.unit === 'тыс. руб.' && r.measure_type === 'amount'));

for (const [name, id, value2023, value2024] of expected) {
  for (const [year, value] of [['2023', value2023], ['2024', value2024]]) {
    const row = parsed.find((r) => r.municipality_id === id && r.year === year);
    assert.ok(row, `Missing ${year} payroll row for ${name}`);
    assert.equal(row.municipality, name);
    assert.equal(Number(row.value_raw.replace(',', '.')), value,
      `Payroll transcription mismatch for ${name} ${year}`);
  }
}

const totals = Object.fromEntries(['2023', '2024'].map((year) => [
  year,
  Math.round(parsed.filter((r) => r.year === year)
    .reduce((sum, r) => sum + Number(r.value_raw.replace(',', '.')), 0) * 10) / 10,
]));
assert.equal(totals['2023'], 103332914.1, '2023 payroll control total mismatch');
assert.equal(totals['2024'], 116828692.2, '2024 payroll control total mismatch');

console.log('Duma annual payroll review transcription passed', totals);
