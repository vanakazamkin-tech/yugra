import { createClient } from '@supabase/supabase-js'

// URL публичного проекта можно хранить в коде, ключ передаётся через env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dmbikidqikjupkghywbz.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Без ключа приложение продолжает работать на локальном JSON, а не падает при старте.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null
