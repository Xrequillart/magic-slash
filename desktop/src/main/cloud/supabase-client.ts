import { createClient, type RealtimeClientOptions, type SupabaseClient } from '@supabase/supabase-js'
import WebSocketImpl from 'ws'
import { saveSession, toStoredSession } from './session-store'

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
    realtime: {
      // Electron's main process is Node 18 — it has NO global WebSocket, and
      // realtime-js only auto-detects a native one (it never falls back to the
      // `ws` package it depends on). Without this the socket silently never
      // connects: no channel ever reaches SUBSCRIBED, no postgres_changes event
      // is ever delivered, and the team dashboard sits on "Reconnecting…"
      // forever. Supplying `ws` explicitly is the documented Node < 22 path;
      // it can go away once Electron ships a runtime with a native WebSocket.
      transport: WebSocketImpl as unknown as RealtimeClientOptions['transport'],
    },
  })

  // THE thing that makes a login survive across restarts. The SDK refreshes the
  // access token on its own timer (autoRefreshToken), and Supabase rotates the
  // refresh token on every refresh (enable_refresh_token_rotation, 10s reuse
  // window). Nothing else writes those rotated tokens back, so without this the
  // copy on disk is revoked seconds after the first background refresh — roughly
  // an hour of uptime — and the next cold start presents a dead token and forces
  // a fresh sign-in. Worse, re-presenting a rotated token reads to GoTrue as a
  // reuse/abuse attempt, which revokes the entire session family.
  cachedClient.auth.onAuthStateChange((event, session) => {
    if (event !== 'TOKEN_REFRESHED' || !session) return
    saveSession(toStoredSession(session))
  })

  return cachedClient
}
