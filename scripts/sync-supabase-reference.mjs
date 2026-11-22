import { createClient } from '@supabase/supabase-js'

const required = (key, fallback) => {
  const value = process.env[key] || fallback
  if (!value) throw new Error(`Не задана переменная окружения ${key}`)
  return value
}

const coreUrl = required('SUPABASE_CORE_URL', 'https://dmbikidqikjupkghywbz.supabase.co')
const coreKey = required('SUPABASE_CORE_SERVICE_ROLE_KEY')
const dataUrl = required('SUPABASE_DATA_URL', 'https://zhywrpguzbtvjnmslwvs.supabase.co')
const dataKey = required('SUPABASE_DATA_SERVICE_ROLE_KEY')
if (coreUrl === dataUrl) throw new Error('DB1 и DB2 должны иметь разные URL')

const options = { auth: { persistSession: false, autoRefreshToken: false } }
const core = createClient(coreUrl, coreKey, options)
const data = createClient(dataUrl, dataKey, options)

async function readAll(table, columns) {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data: page, error } = await data.from(table)
      .select(columns).order('id', { ascending: true }).range(from, from + pageSize - 1)
    if (error) throw new Error(`DB2 public.${table}: ${error.message}`)
    rows.push(...(page || []))
    if (!page || page.length < pageSize) return rows
  }
}

async function writeAll(table, rows) {
  if (!rows.length) return
  const { error } = await core.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`DB1 public.${table}: ${error.message}`)
}

try {
  // Mirror reference fields only; do not replicate statistical observations.
  const [municipalities, sources] = await Promise.all([
    readAll('municipalities', 'id,name'),
    readAll('data_sources', 'id,name,category,url,description'),
  ])
  await writeAll('municipalities', municipalities)
  await writeAll('data_sources', sources)
  process.stdout.write(`Справочники синхронизированы: ${municipalities.length} муниципалитетов, ${sources.length} источников.\n`)
} catch (error) {
  process.stderr.write(`Ошибка синхронизации справочников: ${error.message}\n`)
  process.exitCode = 1
}
