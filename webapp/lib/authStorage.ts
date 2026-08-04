/**
 * Where the Supabase session is kept in the browser.
 *
 * WHY NOT localStorage
 * ---------------------------------------------------------------------------
 * localStorage is scoped to ONE origin, and this deployment answers on four hosts.
 * Someone who signed up on `invite.magic-slash.io` therefore had no session on
 * `app.magic-slash.io`: they finished the invitation flow and arrived at the product
 * logged out, asked for the password they had chosen five seconds earlier.
 *
 * A cookie on `.magic-slash.io` is readable from every sub-domain, so the session
 * crosses hosts the way the person using it assumes it already does.
 *
 * It is NOT HttpOnly, and it cannot be: the Supabase browser client reads the token
 * from JavaScript. That is not a regression — localStorage was just as readable — but
 * it is the reason this holds the session and nothing else.
 *
 * WHY THE DOM IS INJECTED
 * ---------------------------------------------------------------------------
 * This module imports nothing and never reaches for a global. The suite runs on the
 * ROOT node_modules with no jsdom and therefore no `document` (see vitest.config.ts),
 * so the two things that can actually break here — the chunking and the domain rule —
 * are only testable if they are handed their world instead of finding it. The browser
 * wiring lives in `supabase.ts`, which is the one file that may touch `document`.
 */

/** The `document.cookie` surface, reduced to what a cookie store needs. */
export interface CookieJar {
  /** Every readable cookie, in `document.cookie` form: `a=1; b=2`. */
  read(): string
  /** One `name=value; attributes` string, as assigned to `document.cookie`. */
  write(cookie: string): void
}

/** The localStorage a session may still be sitting in, from before cookies. */
export interface LegacyStore {
  read(key: string): string | null
  remove(key: string): void
}

export interface CookieStorageOptions {
  jar: CookieJar
  /** `window.location.hostname` — decides the cookie's `domain`. */
  hostname: string
  /** Whether to mark the cookie `Secure`; false on `http://localhost`. */
  secure: boolean
  /** Where to look for a pre-cookie session, so nobody is signed out by this change. */
  legacy?: LegacyStore
}

/** What `createClient({ auth: { storage } })` expects. Declared, not imported. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** The domain every host of the product shares. */
const SHARED_DOMAIN = 'magic-slash.io'

/**
 * How much encoded value goes in one cookie.
 *
 * Browsers cap a single cookie at about 4096 bytes for the name, the value AND the
 * attributes together. A session is a JSON blob holding two JWTs and the user row, and
 * percent-encoding inflates it further, so it does not reliably fit — over the limit a
 * cookie is dropped SILENTLY, which would read as "signed out again" with nothing to
 * show for it. The margin covers the name, the chunk suffix and the attributes.
 */
const CHUNK_SIZE = 3200

/** A year. Long enough that the refresh token, not the cookie, is what expires. */
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60

/**
 * The `domain` for a cookie served from `hostname`, or null to leave it host-only.
 *
 * A leading dot on the shared domain is what makes the session visible from the apex,
 * `app.`, `admin.` and `invite.` alike. Anywhere else — localhost, a Vercel preview —
 * there is no shared parent to scope to, and naming a domain the browser does not
 * consider a suffix of the current host gets the cookie rejected outright.
 *
 * The suffix is matched on a boundary rather than with `endsWith(SHARED_DOMAIN)`, so
 * `magic-slash.io.evil.com` is not mistaken for one of ours.
 */
export function cookieDomain(hostname: string): string | null {
  const host = hostname.toLowerCase()
  if (host === SHARED_DOMAIN || host.endsWith(`.${SHARED_DOMAIN}`)) return `.${SHARED_DOMAIN}`
  return null
}

/** Every cookie the jar can see, by name. */
function readAll(jar: CookieJar): Map<string, string> {
  const out = new Map<string, string>()
  for (const part of jar.read().split(';')) {
    const pair = part.trim()
    if (!pair) continue
    const eq = pair.indexOf('=')
    if (eq < 1) continue
    out.set(pair.slice(0, eq), pair.slice(eq + 1))
  }
  return out
}

/**
 * The name of chunk `index` of `key`.
 *
 * EVERY value is chunked, even one that would fit whole, so there is a single naming
 * convention and a single read path. A store with two shapes is a store with a bug in
 * the shape you tested less.
 */
function chunkName(key: string, index: number): string {
  return `${key}.${index}`
}

function serialize(
  name: string,
  value: string,
  { domain, secure, maxAge }: { domain: string | null; secure: boolean; maxAge: number },
): string {
  const parts = [`${name}=${value}`, 'path=/', `max-age=${maxAge}`, 'SameSite=Lax']
  if (domain) parts.push(`domain=${domain}`)
  // Lax + Secure: the session is sent on top-level navigations between our own hosts,
  // which is exactly the invite → app hop, and never over plain http in production.
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

/**
 * A session store backed by cookies on the shared domain.
 *
 * Values are percent-encoded BEFORE being split. A cookie value cannot contain `;`,
 * `,` or whitespace and a session is JSON, so encoding is not optional — and encoding
 * first means a chunk boundary is free to fall inside a `%C3` escape, because the
 * chunks are concatenated back into one string before anything is decoded. Chunking
 * first and encoding each piece would corrupt exactly those values, and only for
 * sessions long enough to need a second chunk.
 */
export function createCookieStorage({
  jar,
  hostname,
  secure,
  legacy,
}: CookieStorageOptions): KeyValueStorage {
  const domain = cookieDomain(hostname)

  const put = (name: string, value: string) =>
    jar.write(serialize(name, value, { domain, secure, maxAge: MAX_AGE_SECONDS }))

  /** Same name, same domain and path, `max-age=0` — the only way to drop a cookie. */
  const drop = (name: string) =>
    jar.write(serialize(name, '', { domain, secure, maxAge: 0 }))

  const setItem = (key: string, value: string) => {
    const encoded = encodeURIComponent(value)
    const count = Math.max(1, Math.ceil(encoded.length / CHUNK_SIZE))

    for (let i = 0; i < count; i++) {
      put(chunkName(key, i), encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
    }

    // A shorter session than last time leaves chunks behind, and a stale tail would be
    // concatenated onto the new value and parsed as a corrupt session rather than as no
    // session at all. Refreshing a token shrinks the blob often enough for this to be
    // the likely failure, not the exotic one.
    const existing = readAll(jar)
    for (let i = count; existing.has(chunkName(key, i)); i++) drop(chunkName(key, i))
  }

  return {
    getItem(key) {
      const cookies = readAll(jar)
      const chunks: string[] = []
      for (let i = 0; cookies.has(chunkName(key, i)); i++) {
        chunks.push(cookies.get(chunkName(key, i)) as string)
      }

      if (chunks.length > 0) {
        try {
          return decodeURIComponent(chunks.join(''))
        } catch {
          // A truncated or hand-edited cookie. Treat it as no session — returning the
          // raw text would hand the client something it will fail to parse on every
          // call, with no way back short of clearing site data by hand.
          return null
        }
      }

      // Nothing in the cookies: this may be someone who signed in before the store
      // moved. Carry them over rather than signing out everyone once on deploy.
      const carried = legacy?.read(key) ?? null
      if (carried === null) return null
      setItem(key, carried)
      legacy?.remove(key)
      return carried
    },

    setItem,

    removeItem(key) {
      const cookies = readAll(jar)
      for (let i = 0; cookies.has(chunkName(key, i)); i++) drop(chunkName(key, i))
      legacy?.remove(key)
    },
  }
}
