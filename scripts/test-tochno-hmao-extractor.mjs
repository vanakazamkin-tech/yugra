import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'yugra-tochno-test-'));
try {
  const input = path.join(dir, 'section.csv');
  const output = path.join(dir, 'review.json');
  const csv = [
    'Регион;Муниципальное образование;Код показателя;Показатель;Год;Период;Разрез;Значение;Единица измерения;ОКТМО',
    'Ханты-Мансийский автономный округ — Югра;Мегион;8000001;Тестовый показатель;2024;2024;всего;1 234,5;тыс. руб.;7187',
    'Ханты-Мансийский автономный округ — Югра;Мегион;8000001;Тестовый показатель;2024;2024;мужчины;600;тыс. руб.;7187',
    'Ханты-Мансийский автономный округ - Югра;Сургут;8000001;Тестовый показатель;2025;2025;всего;2,5;тыс. руб.;7187',
    'Ямало-Ненецкий автономный округ;Новый Уренгой;8000001;Тестовый показатель;2025;2025;всего;99;тыс. руб.;7117',
    'Ханты-Мансийский автономный округ - Югра;Неизвестное МО;8000002;Другой показатель;2026;2026;всего;0;ед.;0000',
  ].join('\n');
  writeFileSync(input, csv, 'utf8');

  const run = spawnSync(process.execPath, [
    'scripts/extract-tochno-hmao.mjs',
    input,
    `--out=${output}`,
  ], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const report = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(report.input_rows, 5);
  assert.equal(report.staged_rows, 4);
  assert.equal(report.matched_municipalities, 2);
  assert.deepEqual(report.unmatched_municipality_names, ['Неизвестное МО']);
  assert.equal(report.unique_source_indicators, 2);
  assert.deepEqual(report.year_range, [2024, 2026]);
  assert.equal(report.records[0].municipality_id, 'megion');
  assert.equal(report.records[0].value_raw, '1 234,5');
  assert.equal(report.records[0].verification_status, 'REVIEW_REQUIRED');
  assert.equal(report.records[3].municipality_id, null);
  assert.equal(report.records[3].geographic_level, 'UNRESOLVED');
  assert.equal(report.skipped.otherRegion, 1);
  assert.equal(report.records.length, 4);
  assert.equal(report.duplicate_keys.length, 0, 'different source cross-sections are not duplicates');
  console.log('Tochno HMAO extraction test passed.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
