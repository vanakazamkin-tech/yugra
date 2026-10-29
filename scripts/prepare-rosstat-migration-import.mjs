#!/usr/bin/env node
/**
 * Prepare a reviewable staging file for Rosstat municipal migration data.
 *
 * This script intentionally does NOT write to Supabase. The public Rosstat
 * database and the processed "Если быть точным" dataset can use different
 * municipality boundaries/names across years. Review the staged records and
 * reconcile them with the original Rosstat table before marking them verified.
 *
 * Usage:
 *   node scripts/prepare-rosstat-migration-import.mjs input.csv --out migration-review.json
 *   node scripts/prepare-rosstat-migration-import.mjs input.csv --delimiter=, --out migration-review.json
 *
 * Optional explicit header overrides:
 *   --year=Год --municipality=Муниципальное образование --value=Значение
 *   --indicator=Номер показателя в БД ПМО --region=Регион --unit=Единица измерения
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith('--'));
const option = (name, fallback = null) => {
  const value = args.find((arg) => arg.startsWith(`--${name}=`));
  return value ? value.slice(name.length + 3) : fallback;
};

if (!inputPath || args.includes('--help')) {
  console.log('Usage: node scripts/prepare-rosstat-migration-import.mjs input.csv [--out=migration-review.json] [--delimiter=;]');
  process.exit(inputPath ? 0 : 1);
}

const delimiter = option('delimiter', ';');
const outputPath = option('out', 'migration-review.json');
if (delimiter.length !== 1) throw new Error('--delimiter must be one character');

function parseCsv(text, sep) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === sep) {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell.replace(/\r$/, ''));
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field');
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }
  return rows;
}

const normalize = (value) => String(value ?? '')
  .normalize('NFKC')
  .toLocaleLowerCase('ru-RU')
  .replace(/ё/g, 'е')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const headerCandidates = {
  year: ['год', 'год наблюдения', 'year', 'reference_year'],
  municipality: ['муниципальное образование', 'наименование муниципального образования', 'муниципальное образование верхнего уровня', 'мо', 'municipality', 'municipal entity'],
  value: ['значение', 'значение показателя', 'value'],
  indicator: ['номер показателя в бд пмо', 'код показателя в бд пмо', 'код показателя', 'indicator_code', 'indicator'],
  region: ['регион', 'субъект рф', 'субъект российской федерации', 'region'],
  unit: ['единица измерения', 'ед. изм.', 'unit'],
  oktmo: ['октмо', 'код октмо', 'oktmo'],
  period: ['период', 'period'],
};

const explicitHeaders = {
  year: option('year'),
  municipality: option('municipality'),
  value: option('value'),
  indicator: option('indicator'),
  region: option('region'),
  unit: option('unit'),
  oktmo: option('oktmo'),
  period: option('period'),
};

const text = await fs.readFile(inputPath, 'utf8');
const parsed = parseCsv(text.replace(/^\uFEFF/, ''), delimiter);
if (parsed.length < 2) throw new Error('CSV must contain a header and at least one data row');
const headers = parsed[0].map((value) => value.trim());
const headerIndex = {};

for (const [field, candidates] of Object.entries(headerCandidates)) {
  const requested = explicitHeaders[field];
  const index = requested ? headers.findIndex((header) => header === requested) : -1;
  const normalizedCandidates = candidates.map(normalize);
  const found = index >= 0 ? index : headers.findIndex((header) => normalizedCandidates.includes(normalize(header)));
  if (found >= 0) headerIndex[field] = found;
}

for (const required of ['year', 'municipality', 'value', 'indicator', 'region']) {
  if (headerIndex[required] == null) {
    throw new Error(`Could not identify required "${required}" column. Headers: ${headers.join(' | ')}. Pass --${required}=<exact header>.`);
  }
}

const municipalityIds = new Map([
  ['белоярский район', 'beloyarsky-raion'],
  ['березовский район', 'berezovsky-raion'],
  ['когалым', 'kogalym'],
  ['кондинский район', 'kondinsky-raion'],
  ['лангепас', 'langepas'],
  ['мегион', 'megion'],
  ['нефтеюганск', 'nefteyugansk'],
  ['нефтеюганский район', 'nefteyugansky-raion'],
  ['нижневартовск', 'nizhnevartovsk'],
  ['нижневартовский район', 'nizhnevartovsky-raion'],
  ['нягань', 'nyagan-city'],
  ['октябрьский район', 'october-raion'],
  ['покачи', 'pokachi'],
  ['пыть ях', 'pyt-yah'],
  ['радужный', 'raduzhny'],
  ['советский район', 'sovetsky-raion'],
  ['сургут', 'surgut'],
  ['сургутский район', 'surgutsky'],
  ['урай', 'uray'],
  ['ханты мансийск', 'khanty-mansiysk'],
  ['ханты мансийский район', 'khanty-mansiysky-raion'],
  ['югорск', 'ugorsk'],
]);

const sourceCodeToBdPmoCode = new Map([
  ['2332000010001', '8112021'],
  ['2332000010002', '8112022'],
  ['2332000010003', '8112023'],
]);
const migrationCodes = new Set(['8112021', '8112022', '8112023']);
const migrationNames = new Map([
  ['8112021', 'Число прибывших'],
  ['8112022', 'Число выбывших'],
  ['8112023', 'Миграционный прирост'],
]);
const regionNames = ['ханты мансийский автономный округ', 'ханты мансийский автономный округ югра', 'югра'];

const staged = [];
const skipped = { nonMigrationIndicator: 0, wrongRegion: 0, invalidValueOrYear: 0 };
const duplicates = [];
const seen = new Map();

for (const [dataRowIndex, raw] of parsed.slice(1).entries()) {
  const sourceRowNumber = dataRowIndex + 2;
  const row = Object.fromEntries(headers.map((header, i) => [header, raw[i] ?? '']));
  const get = (field) => headerIndex[field] == null ? '' : String(raw[headerIndex[field]] ?? '').trim();
  const sourceIndicatorCode = get('indicator').replace(/\.0$/, '');
  const indicator = sourceCodeToBdPmoCode.get(sourceIndicatorCode) ?? sourceIndicatorCode;
  if (!migrationCodes.has(indicator)) {
    skipped.nonMigrationIndicator += 1;
    continue;
  }

  const region = get('region');
  if (!regionNames.includes(normalize(region))) {
    skipped.wrongRegion += 1;
    continue;
  }

  const year = Number(get('year'));
  const valueText = get('value').replace(/\s/g, '').replace(',', '.');
  const value = Number(valueText);
  if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear() || valueText === '' || !Number.isFinite(value)) {
    skipped.invalidValueOrYear += 1;
    continue;
  }

  const municipalityName = get('municipality');
  const municipalityId = municipalityIds.get(normalize(municipalityName)) ?? null;
  const record = {
    municipality_id: municipalityId,
    geographic_level: 'municipality',
    geographic_name: municipalityName,
    indicator_code: `rosstat_migration_${indicator}`,
    indicator_name: migrationNames.get(indicator),
    rosstat_indicator_code: indicator,
    source_indicator_code: sourceIndicatorCode,
    reference_year: year,
    reference_period: get('period') || String(year),
    value,
    unit: get('unit') || 'человек',
    source_row_number: sourceRowNumber,
    source_id: 'rosstat_municipal',
    source_url: 'https://rosstat.gov.ru/storage/mediabank/MUNST.htm',
    verification_status: 'REVIEW_REQUIRED',
    notes: 'Подготовлено из выгрузки для проверки. Сверить значение, код показателя, год и границы муниципалитета с исходной БД ПМО Росстата перед подтверждением.',
    source_row: row,
  };
  const key = [record.rosstat_indicator_code, record.reference_year, normalize(municipalityName), normalize(record.reference_period)].join('|');
  if (seen.has(key)) duplicates.push({ key, firstRow: seen.get(key), duplicateRow: sourceRowNumber });
  else seen.set(key, sourceRowNumber);
  staged.push(record);
}

const result = {
  generated_at: new Date().toISOString(),
  input_file: path.basename(inputPath),
  input_rows: parsed.length - 1,
  staged_rows: staged.length,
  matched_municipalities: new Set(staged.filter((row) => row.municipality_id).map((row) => row.municipality_id)).size,
  unmatched_municipality_names: [...new Set(staged.filter((row) => !row.municipality_id).map((row) => row.geographic_name))].sort(),
  duplicate_keys: duplicates,
  skipped,
  records: staged,
  safety_note: 'No Supabase writes were performed. Do not change REVIEW_REQUIRED to verified until every row is reconciled with the original Rosstat BД ПМО record and geographic boundaries.',
};

await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  output_file: outputPath,
  input_rows: result.input_rows,
  staged_rows: result.staged_rows,
  matched_municipalities: result.matched_municipalities,
  unmatched_municipality_names: result.unmatched_municipality_names,
  duplicate_count: duplicates.length,
  skipped,
  mode: 'staging only; no Supabase writes',
}, null, 2));
