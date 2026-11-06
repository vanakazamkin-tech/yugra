#!/usr/bin/env node
/**
 * Prepare a review-only staging JSON from a manually transcribed Duma Yugra
 * budget PDF table. This is deliberately not a PDF OCR engine and never writes
 * to Supabase. Human transcription and indicator mapping remain explicit.
 *
 * Usage:
 * node scripts/prepare-duma-budget-import.mjs input.csv --out=duma-review.json
 *
 * CSV columns:
 * municipality,indicator_code,indicator_name,measure_type,year,value_raw,unit,page,table_title
 * measure_type is amount or growth_rate. Leave indicator_code empty until a
 * reviewer has confirmed the exact definition against the existing dictionary.
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
  console.log('Usage: node scripts/prepare-duma-budget-import.mjs input.csv [--out=duma-review.json]');
  process.exit(inputPath ? 0 : 1);
}

const outputPath = option('out', 'duma-budget-review.json');
const SOURCE_ID = 'duma_hmao_municipal_budget_2023_2024_appendix1';
const SOURCE_URL = 'https://www.dumahmao.ru/povest/0745_4/03/50.pdf';

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        closedQuote = true;
      } else {
        cell += char;
      }
    } else if (closedQuote) {
      if (char === ';') {
        row.push(cell);
        cell = '';
        closedQuote = false;
      } else if (char === '\n') {
        row.push(cell.replace(/\r$/, ''));
        if (row.some((value) => value.trim() !== '')) rows.push(row);
        row = [];
        cell = '';
        closedQuote = false;
      } else if (char === '\r' && text[i + 1] === '\n') {
        // Accept CRLF after a closing quoted field; the following LF ends the row.
      } else {
        throw new Error('CSV contains unexpected characters after a closing quote');
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === '"') {
      throw new Error('CSV contains a quote inside an unquoted field');
    } else if (char === ';') {
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

const municipalityIds = new Map([
  ['белоярский муниципальный район', 'beloyarsky-raion'],
  ['белоярский район', 'beloyarsky-raion'],
  ['березовский муниципальный район', 'berezovsky-raion'],
  ['березовский район', 'berezovsky-raion'],
  ['когалым', 'kogalym'],
  ['кондинский муниципальный район', 'kondinsky-raion'],
  ['кондинский район', 'kondinsky-raion'],
  ['лангепас', 'langepas'],
  ['мегион', 'megion'],
  ['нефтеюганск', 'nefteyugansk'],
  ['нефтеюганский муниципальный район', 'nefteyugansky-raion'],
  ['нефтеюганский район', 'nefteyugansky-raion'],
  ['нижневартовск', 'nizhnevartovsk'],
  ['нижневартовский муниципальный район', 'nizhnevartovsky-raion'],
  ['нижневартовский район', 'nizhnevartovsky-raion'],
  ['нягань', 'nyagan-city'],
  ['октябрьский муниципальный район', 'october-raion'],
  ['октябрьский район', 'october-raion'],
  ['покачи', 'pokachi'],
  ['пыть ях', 'pyt-yah'],
  ['радужный', 'raduzhny'],
  ['советский муниципальный район', 'sovetsky-raion'],
  ['советский район', 'sovetsky-raion'],
  ['сургут', 'surgut'],
  ['сургутский муниципальный район', 'surgutsky'],
  ['сургутский район', 'surgutsky'],
  ['урай', 'uray'],
  ['ханты мансийск', 'khanty-mansiysk'],
  ['ханты мансийский муниципальный район', 'khanty-mansiysky-raion'],
  ['ханты мансийский район', 'khanty-mansiysky-raion'],
  ['югорск', 'ugorsk'],
]);

function parseNumeric(raw) {
  const normalized = String(raw ?? '').trim().replace(/[\u00a0\u202f]/g, ' ');
  if (!normalized || normalized === '—' || normalized === '-') {
    return { value: null, flag: 'missing_value' };
  }
  if (/^св\.?\s*100$/iu.test(normalized)) {
    return { value: null, flag: 'special_threshold_not_numeric' };
  }
  const compact = normalized.replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(compact)) {
    return { value: null, flag: 'unparsed_value' };
  }
  const value = Number(compact);
  return Number.isFinite(value)
    ? { value, flag: null }
    : { value: null, flag: 'unparsed_value' };
}

const rawText = (await fs.readFile(inputPath, 'utf8')).replace(/^\uFEFF/, '');
const parsed = parseCsv(rawText);
if (parsed.length < 2) throw new Error('CSV must contain a header and at least one data row');

const headers = parsed[0].map((value) => value.trim());
if (new Set(headers).size !== headers.length) {
  throw new Error('CSV contains duplicate column names');
}
for (const [index, cells] of parsed.slice(1).entries()) {
  if (cells.length !== headers.length) {
    throw new Error(`CSV line ${index + 2} has ${cells.length} columns; expected ${headers.length}`);
  }
}
const requiredHeaders = [
  'municipality', 'indicator_code', 'indicator_name', 'measure_type',
  'year', 'value_raw', 'unit', 'page', 'table_title',
];
for (const header of requiredHeaders) {
  if (!headers.includes(header)) {
    throw new Error(`Missing required CSV column "${header}". Expected: ${requiredHeaders.join(';')}`);
  }
}

const records = [];
const excludedTotals = [];
const rowWarnings = [];
const duplicateKeys = [];
const seen = new Map();
const municipalityCoverage = new Map();
const indicatorMunicipalityCoverage = new Map();

for (const [index, cells] of parsed.slice(1).entries()) {
  const line = index + 2;
  const row = Object.fromEntries(headers.map((header, column) => [header, String(cells[column] ?? '').trim()]));
  const municipalityLabel = row.municipality;
  const normalizedMunicipality = normalize(municipalityLabel).replace(/^г\s+/, '');

  if (normalizedMunicipality === 'всего' || normalizedMunicipality === 'итого') {
    excludedTotals.push({ csv_line: line, municipality: municipalityLabel, raw_row: row });
    continue;
  }

  const municipalityId = municipalityIds.get(normalizedMunicipality) ?? null;
  const year = Number(row.year);
  const page = Number(row.page);
  const measureType = row.measure_type.toLowerCase();
  const parsedValue = parseNumeric(row.value_raw);
  const flags = [];

  if (!municipalityId) flags.push('unmatched_municipality');
  if (!Number.isInteger(year) || ![2023, 2024].includes(year)) flags.push('year_outside_source_period');
  if (!Number.isInteger(page) || page < 1 || page > 8) flags.push('invalid_source_page');
  if (!['amount', 'growth_rate'].includes(measureType)) flags.push('invalid_measure_type');
  if (!row.indicator_code) flags.push('indicator_mapping_required');
  if (!row.indicator_name) flags.push('indicator_name_missing');
  if (!row.unit) flags.push('unit_missing');
  if (parsedValue.flag) flags.push(parsedValue.flag);

  const record = {
    municipality_id: municipalityId,
    municipality_label_source: municipalityLabel,
    indicator_code: row.indicator_code || null,
    indicator_name_source: row.indicator_name || null,
    measure_type: measureType || null,
    reference_year: Number.isInteger(year) ? year : null,
    reference_period: Number.isInteger(year) ? String(year) : null,
    value: parsedValue.value,
    value_raw: row.value_raw,
    unit: row.unit || null,
    geographic_level: 'municipality',
    geographic_name: municipalityLabel,
    source_id: SOURCE_ID,
    source_url: SOURCE_URL,
    source_page: Number.isInteger(page) ? page : null,
    source_table_title: row.table_title || null,
    source_csv_line: line,
    verification_status: 'needs_review',
    review_flags: flags,
    notes: 'Ручная транскрипция из приложения к PDF. Сверить с оригинальной страницей, заголовком, единицей и словарём показателей до импорта.',
  };

  if (municipalityId && Number.isInteger(year)) {
    const years = municipalityCoverage.get(year) ?? new Set();
    years.add(municipalityId);
    municipalityCoverage.set(year, years);
  }

  if (municipalityId && row.indicator_code && Number.isInteger(year)) {
    const indicatorYears = indicatorMunicipalityCoverage.get(row.indicator_code) ?? new Map();
    const indicatorMunicipalities = indicatorYears.get(year) ?? new Set();
    indicatorMunicipalities.add(municipalityId);
    indicatorYears.set(year, indicatorMunicipalities);
    indicatorMunicipalityCoverage.set(row.indicator_code, indicatorYears);
  }

  if (municipalityId && row.indicator_code && Number.isInteger(year) && row.unit) {
    const key = [municipalityId, row.indicator_code, year, row.unit, measureType].join('|');
    if (seen.has(key)) duplicateKeys.push({ key, first_csv_line: seen.get(key), duplicate_csv_line: line });
    else seen.set(key, line);
  }

  if (flags.length) rowWarnings.push({ csv_line: line, flags });
  records.push(record);
}

const coverageByYear = Object.fromEntries([2023, 2024].map((year) => [
  year,
  {
    municipality_count: municipalityCoverage.get(year)?.size ?? 0,
    expected_municipality_count: 22,
    complete: (municipalityCoverage.get(year)?.size ?? 0) === 22,
  },
]));

const coverageByIndicatorYear = Object.fromEntries([...indicatorMunicipalityCoverage.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([code, years]) => [
  code,
  Object.fromEntries([2023, 2024].map((year) => {
    const count = years.get(year)?.size ?? 0;
    return [year, { municipality_count: count, expected_municipality_count: 22, complete: count === 22 }];
  })),
]));

const result = {
  generated_at: new Date().toISOString(),
  input_file: path.basename(inputPath),
  source: { source_id: SOURCE_ID, url: SOURCE_URL, document_pages: 8 },
  input_rows: parsed.length - 1,
  staged_rows: records.length,
  excluded_control_total_rows: excludedTotals,
  coverage_by_year: coverageByYear,
  coverage_by_indicator_year: coverageByIndicatorYear,
  duplicate_keys: duplicateKeys,
  warning_count: rowWarnings.length,
  row_warnings: rowWarnings,
  records,
  safety_note: 'Review-only output. No Supabase request or write is performed. Do not promote any row to verified until source-page transcription, indicator definition, unit and municipality identity are independently checked.',
};

await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  output_file: outputPath,
  input_rows: result.input_rows,
  staged_rows: result.staged_rows,
  excluded_control_total_rows: excludedTotals.length,
  coverage_by_year: coverageByYear,
  duplicate_count: duplicateKeys.length,
  warning_count: rowWarnings.length,
  mode: 'review-only; no Supabase writes',
}, null, 2));
