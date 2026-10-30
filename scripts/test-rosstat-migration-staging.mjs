import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'yugra-migration-test-'));
try {
  const input = path.join(dir, 'sample.csv');
  const output = path.join(dir, 'review.json');
  const csv = [
    'Год;Регион;Муниципальное образование;Номер показателя в БД ПМО;Значение;Единица измерения;Период',
    '2023;Ханты-Мансийский автономный округ - Югра;Мегион;8112023;-10;человек;2023',
    '2022;Ханты-Мансийский автономный округ - Югра;Мегион;2332000010003;-4;человек;2022',
    '2023;Ханты-Мансийский автономный округ - Югра;Мегион;8112023;-10;человек;2023',
    '2023;Ямало-Ненецкий автономный округ;Мегион;8112023;2;человек;2023',
    '2023;Ханты-Мансийский автономный округ - Югра;Мегион;8423005;100;человек;2023',
  ].join('\n');
  writeFileSync(input, csv, 'utf8');

  const run = spawnSync(process.execPath, [
    'scripts/prepare-rosstat-migration-import.mjs',
    input,
    `--out=${output}`,
  ], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr || run.stdout);

  const report = JSON.parse(readFileSync(output, 'utf8'));
  assert.equal(report.input_rows, 5);
  assert.equal(report.staged_rows, 3);
  assert.equal(report.matched_municipalities, 1);
  assert.equal(report.records[0].municipality_id, 'megion');
  assert.equal(report.records[0].value, -10);
  assert.equal(report.records[0].verification_status, 'REVIEW_REQUIRED');
  assert.equal(report.records[0].source_row_number, 2);
  assert.equal(report.records[1].rosstat_indicator_code, '8112023');
  assert.equal(report.records[1].source_indicator_code, '2332000010003');
  assert.equal(report.records[2].source_row_number, 4);
  assert.equal(report.duplicate_keys.length, 1);
  assert.equal(report.duplicate_keys[0].firstRow, 2);
  assert.equal(report.duplicate_keys[0].duplicateRow, 4);
  assert.equal(report.skipped.wrongRegion, 1);
  assert.equal(report.skipped.nonMigrationIndicator, 1);
  console.log('Rosstat migration staging test passed.');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
