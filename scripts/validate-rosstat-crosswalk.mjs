import { readFileSync } from 'node:fs'

const csvPath = new URL('../data/rosstat/municipality-oktmo-crosswalk.template.csv', import.meta.url)
const municipalitiesPath = new URL('../data/municipalities-detailed.json', import.meta.url)
const csvText = readFileSync(csvPath, 'utf8').replace(/^\\uFEFF/, '').trim()
const projectData = JSON.parse(readFileSync(municipalitiesPath, 'utf8'))
const expectedMunicipalities = projectData.municipalities

function parseCsv(text) {
  const records = []
  let row = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        quoted = false
      } else {
        field += char
      }
    } else if (char === '"' && field.length === 0) {
      quoted = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\\n') {
      row.push(field.replace(/\\r$/, ''))
      records.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field')
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\\r$/, ''))
    records.push(row)
  }
  return records
}

const records = parseCsv(csvText)
const headers = records[0] ?? []
const rows = records.slice(1).map((cells, index) => {
  if (cells.length !== headers.length) {
    throw new Error('CSV row ' + (index + 2) + ' has ' + cells.length + ' columns; expected ' + headers.length)
  }
  return Object.fromEntries(headers.map((header, column) => [header, cells[column]]))
})

const requiredHeaders = [
  'project_municipality_id',
  'project_name',
  'rosstat_municipality_name',
  'oktmo_code',
  'municipality_type',
  'valid_from',
  'valid_to',
  'source_file',
  'source_document_url',
  'source_file_sha256',
  'verified_at',
  'match_status',
  'review_note',
]
const errors = []
for (const header of requiredHeaders) {
  if (!headers.includes(header)) errors.push('Missing CSV column: ' + header)
}
if (headers.length !== requiredHeaders.length || requiredHeaders.some((header, i) => headers[i] !== header)) {
  errors.push('CSV header order or column set differs from the required schema')
}
if (rows.length !== expectedMunicipalities.length) {
  errors.push('Expected ' + expectedMunicipalities.length + ' crosswalk rows, found ' + rows.length)
}

const expectedById = new Map(expectedMunicipalities.map((municipality) => [municipality.id, municipality]))
const seenIds = new Set()

for (const row of rows) {
  const id = row.project_municipality_id
  const expected = expectedById.get(id)

  if (!id) errors.push('A row has an empty project_municipality_id')
  if (seenIds.has(id)) errors.push('Duplicate project municipality: ' + id)
  seenIds.add(id)

  if (!expected) {
    errors.push('Unknown project municipality: ' + id)
    continue
  }
  if (row.project_name !== expected.name) {
    errors.push('Project name mismatch for ' + id + ': expected "' + expected.name + '"')
  }

  if (row.oktmo_code) {
    if (!/^\\d{8}$/.test(row.oktmo_code)) {
      errors.push('Invalid municipal-level OKTMO format for ' + id + ': ' + row.oktmo_code)
    }
    if (row.match_status !== 'matched') {
      errors.push('An assigned OKTMO code requires match_status=matched: ' + id)
    }
    for (const field of ['rosstat_municipality_name', 'municipality_type', 'valid_from', 'source_file', 'source_document_url', 'source_file_sha256', 'verified_at']) {
      if (!row[field]) errors.push('A matched row requires ' + field + ': ' + id)
    }
    if (row.source_file_sha256 && !/^[a-f0-9]{64}$/i.test(row.source_file_sha256)) {
      errors.push('Invalid SHA-256 for ' + id)
    }
    if (row.verified_at && !/^\\d{4}-\\d{2}-\\d{2}$/.test(row.verified_at)) {
      errors.push('Invalid verified_at date for ' + id)
    }
    if (row.valid_from && !/^\\d{4}-\\d{2}-\\d{2}$/.test(row.valid_from)) {
      errors.push('Invalid valid_from date for ' + id)
    }
    if (row.valid_to && !/^\\d{4}-\\d{2}-\\d{2}$/.test(row.valid_to)) {
      errors.push('Invalid valid_to date for ' + id)
    }
  } else if (row.match_status !== 'pending_official_match') {
    errors.push('An empty OKTMO code must remain pending_official_match: ' + id)
  }
}

for (const expected of expectedMunicipalities) {
  if (!seenIds.has(expected.id)) errors.push('Missing project municipality: ' + expected.id)
}

const matched = rows.filter((row) => row.match_status === 'matched').length
console.log('Crosswalk rows: ' + rows.length + '/' + expectedMunicipalities.length)
console.log('Officially matched municipal OKTMO codes: ' + matched + '/' + expectedMunicipalities.length)
if (errors.length) {
  console.error(errors.join('\\n'))
  process.exitCode = 1
} else {
  console.log('Crosswalk structure and project municipality coverage checks passed.')
}
