import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// The Supabase URL + anon key are injected at build time by vite.config.ts
// (define block on the main-process build). They are public/safe to ship — RLS
// on the database is what actually enforces access. When they are absent the
// cloud features are simply hidden and the app boots + works entirely offline.
const SUPABASE_URL = process.env.MAGIC_SLASH_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.MAGIC_SLASH_SUPABASE_ANON_KEY || ''

let cachedClient: SupabaseClient | null = null

/** True when Supabase env is configured, i.e. cloud features are available. */
export function isCloudEnabled(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

/**
 * Lazy Supabase client factory. Returns null when env is missing so callers can
 * treat cloud as "unavailable" without any special-casing. The client never
 * persists the session itself — we manage that explicitly via session-store so
 * we can encrypt it in the OS keychain (safeStorage). Token refresh is handled
 * in-memory once a session is loaded.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isCloudEnabled()) return null
  if (cachedClient) return cachedClient

  cachedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  return cachedClient
}
