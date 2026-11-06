#!/usr/bin/env node
/**
 * Extract only Khanty-Mansi Autonomous Okrug rows from a Tochno/BDPMO CSV.
 *
 * This is a staging utility only: it does not map Rosstat indicator codes to
 * project indicator codes and never writes to Supabase. Every row remains
 * REVIEW_REQUIRED until its definition, geography, unit, period and source
 * methodology have been checked against the original Rosstat table.
 *
 * Usage:
 *   node scripts/extract-tochno-hmao.mjs section.csv --out=hmao-review.json
 *   node scripts/extract-tochno-hmao.mjs section.csv --year-from=2020 --year-to=2026
 *   --region=... --municipality=... --indicator=... --indicator-name=...
 *   --year=... --value=... --unit=... --period=... --oktmo=...
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
  console.log('Usage: node scripts/extract-tochno-hmao.mjs input.csv [--out=hmao-review.json] [--delimiter=;]');
  process.exit(inputPath ? 0 : 1);
}

const delimiter = option('delimiter', ';');
const outputPath = option('out', 'hmao-review.json');
const yearFrom = Number(option('year-from', '2005'));
const yearTo = Number(option('year-to', String(new Date().getFullYear())));
const sourceUrl = 'https://tochno.st/datasets/bdmo';
if (delimiter.length !== 1) throw new Error('--delimiter must be one character');
if (!Number.isInteger(yearFrom) || !Number.isInteger(yearTo) || yearFrom > yearTo) {
  throw new Error('Invalid year range');
}

function parseCsv(input, sep) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
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
  .replace(/[–—]/g, '-')
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const headerCandidates = {
  region: ['регион', 'субъект рф', 'субъект российской федерации', 'наименование субъекта рф', 'region'],
  municipality: ['муниципальное образование', 'наименование муниципального образования', 'муниципальное образование верхнего уровня', 'мо', 'municipality'],
  indicator: ['номер показателя в бд пмо', 'код показателя в бд пмо', 'код показателя', 'номер показателя', 'indicator code'],
  indicatorName: ['показатель', 'наименование показателя', 'название показателя', 'indicator name'],
  year: ['год', 'год наблюдения', 'year', 'reference year'],
  value: ['значение', 'значение показателя', 'value'],
  unit: ['единица измерения', 'ед. изм.', 'unit'],
  period: ['период', 'период наблюдения', 'period'],
  oktmo: ['октмо', 'код октмо', 'oktmo'],
};

const explicitHeaders = Object.fromEntries(
  Object.keys(headerCandidates).map((field) => [field, option(field === 'indicatorName' ? 'indicator-name' : field)]),
);

const input = (await fs.readFile(inputPath, 'utf8')).replace(/^\uFEFF/, '');
const parsed = parseCsv(input, delimiter);
if (parsed.length < 2) throw new Error('CSV must contain a header and at least one data row');
const headers = parsed[0].map((value) => value.trim());
const indexes = {};

for (const [field, candidates] of Object.entries(headerCandidates)) {
  const requested = explicitHeaders[field];
  const requestedIndex = requested ? headers.findIndex((header) => header === requested) : -1;
  const normalizedCandidates = candidates.map(normalize);
  const found = requestedIndex >= 0 ? requestedIndex : headers.findIndex((header) => normalizedCandidates.includes(normalize(header)));
  if (found >= 0) indexes[field] = found;
}
for (const required of ['region', 'municipality', 'indicator', 'year', 'value']) {
  if (indexes[required] == null) {
    throw new Error(`Could not identify required "${required}" column. Headers: ${headers.join(' | ')}. Pass --${required}=<exact header>.`);
  }
}

const municipalityAliases = new Map([
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

const isHmao = (value) => {
  const region = normalize(value);
  return region === 'югра'
    || region.startsWith('ханты мансийский автономный округ')
    || region.startsWith('ханты мансийский автономный округ югра');
};

const staged = [];
const skipped = { otherRegion: 0, invalidYear: 0, outsideYearRange: 0 };
const unmatchedNames = new Set();
const seen = new Map();
const duplicates = [];

for (const [offset, raw] of parsed.slice(1).entries()) {
  const sourceRowNumber = offset + 2;
  const get = (field) => indexes[field] == null ? '' : String(raw[indexes[field]] ?? '').trim();
  if (!isHmao(get('region'))) {
    skipped.otherRegion += 1;
    continue;
  }

  const yearText = get('year').replace(/\.0$/, '');
  const year = Number(yearText);
  if (!Number.isInteger(year) || year < 1900) {
    skipped.invalidYear += 1;
    continue;
  }
  if (year < yearFrom || year > yearTo) {
    skipped.outsideYearRange += 1;
    continue;
  }

  const municipalityName = get('municipality');
  const municipalityId = municipalityAliases.get(normalize(municipalityName)) ?? null;
  if (!municipalityId) unmatchedNames.add(municipalityName || '[пустое название]');

  const record = {
    municipality_id: municipalityId,
    geographic_level: municipalityId ? 'municipality' : 'UNRESOLVED',
    geographic_name: municipalityName,
    oktmo: get('oktmo') || null,
    source_indicator_code: get('indicator'),
    source_indicator_name: get('indicatorName') || null,
    reference_year: year,
    reference_period: get('period') || String(year),
    value_raw: get('value'),
    unit: get('unit') || null,
    source_row_number: sourceRowNumber,
    source_id: 'tochno_bdmo_2026_09',
    source_url: sourceUrl,
    verification_status: 'REVIEW_REQUIRED',
    notes: 'Извлечено из вторичной выгрузки БД ПМО. Сверить с исходной записью Росстата, ОКТМО, тип МО, определение показателя, единицу, период и методику территориальной реконструкции. Не включать в индекс до проверки.',
    source_row: Object.fromEntries(headers.map((header, index) => [header, raw[index] ?? ''])),
  };
  // Preserve all source cross-sections (e.g. sex, age, organization type) in the key.
  // Only the value column is excluded so conflicting duplicates are still detected.
  const key = raw.map((value, index) => index === indexes.value ? '' : normalize(value)).join('|');
  if (seen.has(key)) duplicates.push({ key, firstRow: seen.get(key), duplicateRow: sourceRowNumber });
  else seen.set(key, sourceRowNumber);
  staged.push(record);
}

const result = {
  generated_at: new Date().toISOString(),
  input_file: path.basename(inputPath),
  source_url: sourceUrl,
  source_release: '2026-09-28',
  license: 'CC BY 4.0; attribution required',
  input_rows: parsed.length - 1,
  staged_rows: staged.length,
  matched_municipalities: new Set(staged.filter((row) => row.municipality_id).map((row) => row.municipality_id)).size,
  unmatched_municipality_names: [...unmatchedNames].sort(),
  unique_source_indicators: new Set(staged.map((row) => row.source_indicator_code)).size,
  year_range: staged.length ? staged.reduce((range, row) => [Math.min(range[0], row.reference_year), Math.max(range[1], row.reference_year)], [Infinity, -Infinity]) : null,
  duplicate_keys: duplicates,
  skipped,
  records: staged,
  safety_note: 'Staging only. No project indicator mapping, verification promotion or Supabase writes were performed.',
};

await fs.writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  output_file: outputPath,
  input_rows: result.input_rows,
  hmao_rows: result.staged_rows,
  matched_municipalities: result.matched_municipalities,
  unmatched_municipality_names: result.unmatched_municipality_names,
  unique_source_indicators: result.unique_source_indicators,
  year_range: result.year_range,
  duplicate_count: duplicates.length,
  skipped,
  mode: 'staging only; no Supabase writes',
}, null, 2));
