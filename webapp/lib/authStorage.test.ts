import { describe, it, expect } from 'vitest'
import { cookieDomain, createCookieStorage, type CookieJar } from './authStorage'

/**
 * A cookie jar that behaves like a browser's, in the two ways that matter here:
 * assigning `name=value` replaces that one cookie and leaves the others alone, and
 * `max-age=0` deletes rather than storing an empty string. Anything less and the
 * stale-chunk test would pass against a store that never forgets.
 */
function fakeJar() {
  const cookies = new Map<string, string>()

  const jar: CookieJar & { names(): string[]; writes: string[] } = {
    writes: [],
    read: () =>
      Array.from(cookies, ([name, value]) => `${name}=${value}`).join('; '),
    write: (cookie) => {
      jar.writes.push(cookie)
      const [pair, ...attributes] = cookie.split(';').map((part) => part.trim())
      const eq = pair.indexOf('=')
      const name = pair.slice(0, eq)
      if (attributes.some((a) => a.toLowerCase() === 'max-age=0')) cookies.delete(name)
      else cookies.set(name, pair.slice(eq + 1))
    },
    names: () => Array.from(cookies.keys()),
  }

  return jar
}

const KEY = 'sb-abcdefgh-auth-token'

function prodStore(jar: CookieJar, legacy?: { read(k: string): string | null; remove(k: string): void }) {
  return createCookieStorage({ jar, hostname: 'invite.magic-slash.io', secure: true, legacy })
}

/** A session-shaped blob of `size` characters. */
function session(size: number): string {
  return JSON.stringify({ access_token: 'x'.repeat(size), token_type: 'bearer' })
}

describe('cookieDomain', () => {
  it('scopes to the shared parent from every production host', () => {
    // This is the whole point: a session written on the invite host has to be readable
    // on the app host, or accepting an invitation ends at a login form.
    for (const host of ['magic-slash.io', 'app.magic-slash.io', 'invite.magic-slash.io']) {
      expect(cookieDomain(host)).toBe('.magic-slash.io')
    }
  })

  it('leaves the cookie host-only where there is no shared parent', () => {
    // Naming a domain the browser does not consider a suffix of the current host gets
    // the cookie rejected outright, so dev and previews must not name one.
    expect(cookieDomain('localhost')).toBeNull()
    expect(cookieDomain('magic-slash-git-branch.vercel.app')).toBeNull()
  })

  it('is not fooled by a lookalike domain', () => {
    expect(cookieDomain('magic-slash.io.evil.com')).toBeNull()
  })
})

describe('createCookieStorage', () => {
  it('round-trips a value', () => {
    const jar = fakeJar()
    const store = prodStore(jar)

    store.setItem(KEY, session(10))
    expect(store.getItem(KEY)).toBe(session(10))
  })

  it('returns null for a key it never stored', () => {
    expect(prodStore(fakeJar()).getItem(KEY)).toBeNull()
  })

  it('survives the characters a cookie cannot hold', () => {
    const jar = fakeJar()
    const store = prodStore(jar)
    // A session is JSON: `;`, `,`, `"` and `=` all appear in it, and `;` alone would
    // truncate the cookie at the first one.
    const value = '{"a":"1;2,3","b":"é ✨","c":"x=y"}'

    store.setItem(KEY, value)
    expect(store.getItem(KEY)).toBe(value)
  })

  it('splits a session too large for one cookie, and reads it back whole', () => {
    const jar = fakeJar()
    const store = prodStore(jar)
    const value = session(9000)

    store.setItem(KEY, value)

    expect(jar.names().length).toBeGreaterThan(1)
    // Over the browser's ~4096-byte cap a cookie is dropped silently, so each one has
    // to stay under it on its own — name and attributes included.
    for (const cookie of jar.writes) expect(cookie.length).toBeLessThan(4096)
    expect(store.getItem(KEY)).toBe(value)
  })

  it('reassembles a multi-byte character split across two chunks', () => {
    const jar = fakeJar()
    const store = prodStore(jar)
    // Every `é` is three percent-escapes once encoded, so a boundary is all but
    // guaranteed to fall inside one. Encoding before splitting is what makes this work;
    // splitting first and encoding each piece would corrupt exactly this case, and only
    // for sessions long enough to need a second chunk.
    const value = 'é'.repeat(4000)

    store.setItem(KEY, value)
    expect(store.getItem(KEY)).toBe(value)
  })

  it('drops the chunks a shorter session leaves behind', () => {
    const jar = fakeJar()
    const store = prodStore(jar)

    store.setItem(KEY, session(9000))
    const long = jar.names().length
    store.setItem(KEY, session(10))

    expect(jar.names().length).toBeLessThan(long)
    // Without the cleanup the stale tail is concatenated onto the new value, which
    // parses as a CORRUPT session rather than as no session — the worse failure, and
    // the likely one, since refreshing a token shrinks the blob.
    expect(store.getItem(KEY)).toBe(session(10))
  })

  it('clears every chunk on removal', () => {
    const jar = fakeJar()
    const store = prodStore(jar)

    store.setItem(KEY, session(9000))
    store.removeItem(KEY)

    expect(jar.names()).toEqual([])
    expect(store.getItem(KEY)).toBeNull()
  })

  it('treats an unreadable cookie as no session', () => {
    const jar = fakeJar()
    jar.write(`${KEY}.0=%E0%A4%A`) // truncated escape, as a hand-edited cookie would be

    expect(prodStore(jar).getItem(KEY)).toBeNull()
  })

  it('marks the cookie Secure, Lax and shared on production', () => {
    const jar = fakeJar()
    prodStore(jar).setItem(KEY, session(10))

    const cookie = jar.writes[0]
    expect(cookie).toContain('domain=.magic-slash.io')
    expect(cookie).toContain('SameSite=Lax')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('path=/')
  })

  it('omits Secure and the domain in local development', () => {
    const jar = fakeJar()
    createCookieStorage({ jar, hostname: 'localhost', secure: false }).setItem(KEY, session(10))

    const cookie = jar.writes[0]
    expect(cookie).not.toContain('domain=')
    expect(cookie).not.toContain('Secure')
  })

  describe('carrying over a pre-cookie session', () => {
    function legacyStore(seed: string | null) {
      const held = new Map<string, string>()
      if (seed !== null) held.set(KEY, seed)
      return {
        held,
        read: (key: string) => held.get(key) ?? null,
        remove: (key: string) => void held.delete(key),
      }
    }

    it('adopts what localStorage was holding, then empties it', () => {
      // Otherwise moving the store signs out everyone who was already signed in.
      const jar = fakeJar()
      const legacy = legacyStore(session(10))
      const store = prodStore(jar, legacy)

      expect(store.getItem(KEY)).toBe(session(10))
      expect(legacy.held.has(KEY)).toBe(false)
      // Written to the cookie on the way through, so the next read needs no fallback.
      expect(jar.names().length).toBeGreaterThan(0)
    })

    it('prefers the cookie once there is one', () => {
      const jar = fakeJar()
      const legacy = legacyStore('{"stale":true}')
      const store = prodStore(jar, legacy)
      store.setItem(KEY, session(10))

      expect(store.getItem(KEY)).toBe(session(10))
      // Untouched: nothing read it, so nothing cleaned it up.
      expect(legacy.held.get(KEY)).toBe('{"stale":true}')
    })

    it('empties it on removal too', () => {
      // A sign-out that left the old copy behind would be undone by the next read.
      const legacy = legacyStore(session(10))
      prodStore(fakeJar(), legacy).removeItem(KEY)

      expect(legacy.held.has(KEY)).toBe(false)
    })
  })
})
