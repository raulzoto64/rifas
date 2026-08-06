import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function getClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las credenciales de Supabase. Copiá .env.example a .env y completá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
    )
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!client) client = getClient()
  return client
}