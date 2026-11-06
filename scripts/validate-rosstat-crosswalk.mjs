import { readFileSync } from 'node:fs'

const path = new URL('../data/rosstat/municipality-oktmo-crosswalk.template.csv', import.meta.url)
const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/)
const rows = lines.slice(1).map((line) => {
  const cells = line.split(',')
  return { id: cells[0], oktmo: cells[3], status: cells[8]?.replaceAll('"', '') }
})

const expectedIds = [
  'surgutsky', 'khanty-mansiysk', 'beloyarsky-raion', 'nizhnevartovsky-raion',
  'uray', 'nizhnevartovsk', 'kondinsky-raion', 'langepas', 'october-raion',
  'berezovsky-raion', 'pyt-yah', 'raduzhny', 'megion', 'pokachi', 'ugorsk',
  'surgut', 'nefteyugansk', 'kogalym', 'nefteyugansky-raion', 'nyagan-city',
  'khanty-mansiysky-raion', 'sovetsky-raion',
]
const errors = []
const ids = rows.map((row) => row.id)
for (const id of expectedIds) if (!ids.includes(id)) errors.push('Missing project municipality: ' + id)
for (const id of new Set(ids)) if (ids.filter((candidate) => candidate === id).length > 1) errors.push('Duplicate project municipality: ' + id)
for (const row of rows) {
  if (row.oktmo && !/^\d{8,11}$/.test(row.oktmo)) errors.push('Invalid OKTMO format for ' + row.id + ': ' + row.oktmo)
  if (row.oktmo && row.status === 'pending_official_match') errors.push('Code entered but status still pending: ' + row.id)
}
const filled = rows.filter((row) => row.oktmo).length
console.log('Crosswalk rows: ' + rows.length + '/' + expectedIds.length)
console.log('OKTMO codes filled: ' + filled + '/' + expectedIds.length)
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
else console.log('Structural checks passed. Unfilled codes remain pending official verification.')