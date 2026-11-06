import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const municipalities = [
  'г.Нефтеюганск','г.Сургут','г.Ханты-Мансийск','г.Нижневартовск',
  'г.Мегион','г.Урай','г.Когалым','г.Радужный','г.Лангепас','г.Нягань',
  'г.Пыть-Ях','г.Покачи','г.Югорск','Белоярский муниципальный район',
  'Берёзовский муниципальный район','Кондинский муниципальный район',
  'Октябрьский муниципальный район','Сургутский муниципальный район',
  'Советский муниципальный район','Ханты-Мансийский муниципальный район',
  'Нижневартовский муниципальный район','Нефтеюганский муниципальный район',
];
const header = 'municipality;indicator_code;indicator_name;measure_type;year;value_raw;unit;page;table_title';
const rows = [];
for (const municipality of municipalities) {
  rows.push(`${municipality};budget_total_revenue;Доходы бюджета — всего;amount;2023;1 234,5;тыс. руб.;1;Итого доходов`);
  rows.push(`${municipality};budget_total_revenue;Доходы бюджета — всего;amount;2024;-12,5;тыс. руб.;1;Итого доходов`);
}
rows.push('ВСЕГО;budget_total_revenue;Доходы бюджета — всего;amount;2024;999;тыс. руб.;1;Итого доходов');
rows.push('г.Радужный;budget_growth_demo;Тестовый темп;growth_rate;2024;св.100;%;1;Темп роста');

const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'yugra-duma-import-'));
try {
  const input = path.join(temp, 'fixture.csv');
  const output = path.join(temp, 'review.json');
  await fs.writeFile(input, [header, ...rows].join('\n'), 'utf8');
  execFileSync(process.execPath, [
    'scripts/prepare-duma-budget-import.mjs', input, `--out=${output}`,
  ], { stdio: 'pipe' });
  const result = JSON.parse(await fs.readFile(output, 'utf8'));

  assert.equal(result.source.source_id, 'duma_hmao_municipal_budget_2023_2024_appendix1');
  assert.equal(result.input_rows, 46);
  assert.equal(result.staged_rows, 45);
  assert.equal(result.excluded_control_total_rows, 1);
  assert.equal(result.coverage_by_year['2023'].municipality_count, 22);
  assert.equal(result.coverage_by_year['2023'].complete, true);
  assert.equal(result.coverage_by_year['2024'].municipality_count, 22);
  assert.equal(result.coverage_by_year['2024'].complete, true);
  assert.equal(result.records[0].value, 1234.5);
  assert.equal(result.records[1].value, -12.5);
  const threshold = result.records.at(-1);
  assert.equal(threshold.value, null);
  assert.equal(threshold.value_raw, 'св.100');
  assert.ok(threshold.review_flags.includes('special_threshold_not_numeric'));
  assert.equal(result.records[0].verification_status, 'needs_review');
  assert.ok(result.safety_note.includes('No Supabase request or write'));
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

console.log('Duma budget staging tests passed');
