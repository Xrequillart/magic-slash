import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createCookieStorage, type KeyValueStorage } from './authStorage'

// Browser Supabase client (anon/publishable key — RLS enforces access, safe to
// ship to the browser). Lazily instantiated so importing this module never runs
// on the server render path. Same project as the desktop app.
let client: SupabaseClient | null = null

/**
 * The session store, wired to the real DOM.
 *
 * This is the only place allowed to touch `document` and `window`: the rules the store
 * actually implements live in `authStorage.ts`, which is kept import-free and global-free
 * so it can be tested without a browser (see vitest.config.ts).
 *
 * `undefined` on the server, where there is no session to keep and supabase-js falls
 * back to its own in-memory store — the same thing it did before cookies.
 */
function sessionStorage(): KeyValueStorage | undefined {
  if (typeof document === 'undefined') return undefined

  return createCookieStorage({
    jar: {
      read: () => document.cookie,
      write: (cookie) => {
        document.cookie = cookie
      },
    },
    hostname: window.location.hostname,
    secure: window.location.protocol === 'https:',
    // Where sessions lived until the store moved to a cookie. Read once, then carried
    // over, so this change does not sign out everyone who was already signed in.
    // Wrapped because localStorage throws rather than returning null when a browser has
    // storage disabled, and a session store must not be the thing that breaks the page.
    legacy: {
      read: (key) => {
        try {
          return window.localStorage.getItem(key)
        } catch {
          return null
        }
      },
      remove: (key) => {
        try {
          window.localStorage.removeItem(key)
        } catch {
          /* nothing to clean up if it was never reachable */
        }
      },
    },
  })
}

export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  client = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      // A cookie on `.magic-slash.io` rather than localStorage, because the session has
      // to survive the hop from `invite.` to `app.` — see `authStorage.ts`.
      storage: sessionStorage(),
    },
  })
  return client
}
