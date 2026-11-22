import { createClient } from '@supabase/supabase-js'

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

// DB1: прогнозы и структурированные муниципальные паспорта.
const coreUrl = import.meta.env.VITE_SUPABASE_CORE_URL
  || import.meta.env.VITE_SUPABASE_URL
  || 'https://dmbikidqikjupkghywbz.supabase.co'
const coreKey = import.meta.env.VITE_SUPABASE_CORE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY

// DB2: основной массив статистических наблюдений и приём необработанных данных.
const dataUrl = import.meta.env.VITE_SUPABASE_DATA_URL
  || 'https://zhywrpguzbtvjnmslwvs.supabase.co'
const dataKey = import.meta.env.VITE_SUPABASE_DATA_ANON_KEY

export const isCoreSupabaseConfigured = Boolean(coreUrl && coreKey)
export const isDataSupabaseConfigured = Boolean(dataUrl && dataKey)

export const coreSupabase = isCoreSupabaseConfigured
  ? createClient(coreUrl, coreKey, clientOptions)
  : null
export const dataSupabase = isDataSupabaseConfigured
  ? createClient(dataUrl, dataKey, clientOptions)
  : null

// Совместимость со старыми компонентами: сценарные компоненты используют DB1.
export const supabase = coreSupabase
export const isSupabaseConfigured = isCoreSupabaseConfigured || isDataSupabaseConfigured
