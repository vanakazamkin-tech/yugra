import { readFileSync } from 'node:fs';

const csvPath = new URL('../docs/data/municipal-performance-report-2024-pilot.csv', import.meta.url);
const text = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').trim();
const parseCsv = (source) => {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = []; value = '';
    } else value += char;
  }
  if (quoted) throw new Error('CSV contains an unterminated quoted field.');
  row.push(value);
  if (row.some((cell) => cell.length)) rows.push(row);
  return rows;
};

const parsed = parseCsv(text);
if (parsed.length < 2) throw new Error('Pilot CSV must contain a header and at least one observation.');
const headers = parsed[0].map((item) => item.trim());
const required = ['municipality', 'source_table', 'indicator_no', 'indicator_name', 'unit', 'year', 'value', 'status', 'source'];
const missingHeaders = required.filter((header) => !headers.includes(header));
if (missingHeaders.length) throw new Error('Missing required CSV columns: ' + missingHeaders.join(', '));
const index = Object.fromEntries(headers.map((header, position) => [header, position]));
const observations = parsed.slice(1).map((cells, rowIndex) => {
  if (cells.length !== headers.length) throw new Error(`CSV row ${rowIndex + 2} has ${cells.length} columns; expected ${headers.length}.`);
  const row = Object.fromEntries(headers.map((header, position) => [header, String(cells[position] ?? '').trim()]));
  for (const field of required) if (!row[field]) throw new Error(`CSV row ${rowIndex + 2} has an empty ${field} field.`);
  if (!Number.isInteger(Number(row.year))) throw new Error(`CSV row ${rowIndex + 2} has an invalid year.`);
  if (!Number.isFinite(Number(row.value))) throw new Error(`CSV row ${rowIndex + 2} has a non-numeric value.`);
  if (!/^https?:\/\//i.test(row.source)) throw new Error(`CSV row ${rowIndex + 2} has an invalid source URL.`);
  if (!['reported_fact', 'reported_zero'].includes(row.status)) throw new Error(`CSV row ${rowIndex + 2} has an unsupported status.`);
  if ((row.status === 'reported_zero') !== (Number(row.value) === 0)) throw new Error(`CSV row ${rowIndex + 2} has inconsistent zero/status semantics.`);
  return row;
});

const unique = (values) => [...new Set(values)];
const municipalities = unique(observations.map((row) => row.municipality));
const years = unique(observations.map((row) => row.year)).sort();
const indicatorCodes = unique(observations.map((row) => row.indicator_no));
const keyOf = (row) => [row.municipality, row.indicator_no, row.year].join('|');
const counts = new Map();
observations.forEach((row) => counts.set(keyOf(row), (counts.get(keyOf(row)) || 0) + 1));
const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
if (duplicates.length) throw new Error('Duplicate municipality/indicator/year observations: ' + duplicates.map(([key]) => key).join('; '));

const coverageByMunicipality = municipalities.map((municipality) => {
  const own = observations.filter((row) => row.municipality === municipality);
  return {
    municipality,
    observations: own.length,
    indicatorCodes: unique(own.map((row) => row.indicator_no)).length,
    years: unique(own.map((row) => row.year)).sort(),
  };
});
const thinCoverage = coverageByMunicipality.filter((item) => item.indicatorCodes <= 1);
const statusCounts = Object.fromEntries(unique(observations.map((row) => row.status)).map((status) => [
  status, observations.filter((row) => row.status === status).length,
]));

console.log('Risk pilot CSV structural audit passed.');
console.log(`Observations: ${observations.length}; municipalities: ${municipalities.length}; indicator codes: ${indicatorCodes.length}; years: ${years.join(', ')}.`);
console.log(`Statuses: ${Object.entries(statusCounts).map(([status, count]) => status + '=' + count).join(', ')}.`);
console.log(`Municipalities with only one indicator code: ${thinCoverage.length}/${municipalities.length}.`);
console.log('This file is a separate pilot report extract; it is not automatically admitted to the verified Supabase risk-series pipeline.');
