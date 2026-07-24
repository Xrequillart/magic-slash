import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Browser Supabase client (anon/publishable key — RLS enforces access, safe to
// ship to the browser). Lazily instantiated so importing this module never runs
// on the server render path. Same project as the desktop app.
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return client
}
