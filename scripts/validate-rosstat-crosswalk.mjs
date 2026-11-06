import { readFileSync } from 'node:fs'

const csvPath = new URL('../data/rosstat/municipality-oktmo-crosswalk.template.csv', import.meta.url)
const municipalitiesPath = new URL('../data/municipalities-detailed.json', import.meta.url)
const csvText = readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, '').trim()
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
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      records.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field')
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ''))
    records.push(row)
  }
  return records
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function intervalsOverlap(left, right) {
  const leftEnd = left.valid_to || '9999-12-31'
  const rightEnd = right.valid_to || '9999-12-31'
  return left.valid_from <= rightEnd && right.valid_from <= leftEnd
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

if (rows.length < expectedMunicipalities.length) {
  errors.push('Expected at least ' + expectedMunicipalities.length + ' crosswalk rows, found ' + rows.length)
}

const expectedById = new Map(expectedMunicipalities.map((municipality) => [municipality.id, municipality]))
const rowsByProjectId = new Map()
const seenExactRows = new Set()
const seenProjectIds = new Set()

for (const row of rows) {
  const id = row.project_municipality_id
  const expected = expectedById.get(id)

  if (!id) errors.push('A row has an empty project_municipality_id')
  if (!expected) {
    errors.push('Unknown project municipality: ' + id)
    continue
  }
  if (row.project_name !== expected.name) {
    errors.push('Project name mismatch for ' + id + ': expected "' + expected.name + '"')
  }

  seenProjectIds.add(id)
  if (!rowsByProjectId.has(id)) rowsByProjectId.set(id, [])
  rowsByProjectId.get(id).push(row)

  const exactKey = [id, row.oktmo_code, row.valid_from, row.valid_to].join('|')
  if (seenExactRows.has(exactKey)) errors.push('Duplicate crosswalk interval: ' + exactKey)
  seenExactRows.add(exactKey)

  if (row.oktmo_code) {
    if (!/^\d{8}$/.test(row.oktmo_code)) {
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
    if (row.verified_at && !isIsoDate(row.verified_at)) {
      errors.push('Invalid verified_at date for ' + id)
    }
    if (row.valid_from && !isIsoDate(row.valid_from)) {
      errors.push('Invalid valid_from date for ' + id)
    }
    if (row.valid_to && !isIsoDate(row.valid_to)) {
      errors.push('Invalid valid_to date for ' + id)
    }
    if (row.valid_from && row.valid_to && row.valid_from > row.valid_to) {
      errors.push('valid_from is after valid_to for ' + id)
    }
  } else if (row.match_status !== 'pending_official_match') {
    errors.push('An empty OKTMO code must remain pending_official_match: ' + id)
  }
}

for (const expected of expectedMunicipalities) {
  if (!seenProjectIds.has(expected.id)) errors.push('Missing project municipality: ' + expected.id)
}

for (const [projectId, projectRows] of rowsByProjectId) {
  const ordered = [...projectRows].filter((row) => row.oktmo_code).sort((a, b) => a.valid_from.localeCompare(b.valid_from))
  for (let i = 1; i < ordered.length; i += 1) {
    if (intervalsOverlap(ordered[i - 1], ordered[i])) {
      errors.push('Overlapping historical OKTMO intervals for ' + projectId + ': ' +
        ordered[i - 1].oktmo_code + ' and ' + ordered[i].oktmo_code)
    }
  }
  if (projectRows.length > 1 && projectRows.some((row) => !row.oktmo_code)) {
    errors.push('Historical rows for ' + projectId + ' must all be resolved before adding multiple intervals')
  }
}

const matchedRows = rows.filter((row) => row.match_status === 'matched' && row.oktmo_code)
const matchedMunicipalities = new Set(matchedRows.map((row) => row.project_municipality_id))
for (let i = 0; i < matchedRows.length; i += 1) {
  for (let j = i + 1; j < matchedRows.length; j += 1) {
    const left = matchedRows[i]
    const right = matchedRows[j]
    if (
      left.project_municipality_id !== right.project_municipality_id &&
      left.oktmo_code === right.oktmo_code &&
      intervalsOverlap(left, right)
    ) {
      errors.push('The same OKTMO code is assigned to different project municipalities during overlapping periods: ' +
        left.oktmo_code + ' (' + left.project_municipality_id + ', ' + right.project_municipality_id + ')')
    }
  }
}

const pendingRows = rows.filter((row) => row.match_status === 'pending_official_match').length
console.log('Crosswalk rows: ' + rows.length + ' (historical intervals allowed)')
console.log('Project municipalities represented: ' + seenProjectIds.size + '/' + expectedMunicipalities.length)
console.log('Officially matched rows: ' + matchedRows.length)
console.log('Officially matched project municipalities: ' + matchedMunicipalities.size + '/' + expectedMunicipalities.length)
console.log('Pending rows: ' + pendingRows)

if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log('Crosswalk structure, temporal intervals and project municipality coverage checks passed.')
}
