import { describe, it, expect } from 'vitest'
import {
  ATLASSIAN_REDIRECT_URI,
  ATLASSIAN_TOKEN_URL,
  loopbackCallbackUrl,
  parseState,
  upstreamFailure,
} from './atlassianState'

/** A plausible desktop nonce — 22 base64url characters, as `randomBytes(16)` produces. */
const NONCE = 'aBcD_eFgH-iJkL1234mnop'

/**
 * `state` is the only field that survives the round trip through Atlassian, so it is how
 * the desktop's loopback port reaches us — and it is fully attacker-controlled on the way
 * back. Every rejection below is a link someone can craft and send.
 */
describe('parseState', () => {
  describe('the shape the desktop builds', () => {
    it('splits `<nonce>.<port>`', () => {
      expect(parseState(`${NONCE}.51337`)).toEqual({ nonce: NONCE, port: 51337 })
    })

    it('accepts both ends of the allowed port range', () => {
      expect(parseState(`${NONCE}.1024`)).toEqual({ nonce: NONCE, port: 1024 })
      expect(parseState(`${NONCE}.65535`)).toEqual({ nonce: NONCE, port: 65535 })
    })

    it('accepts the shortest nonce we consider plausible', () => {
      const short = 'a'.repeat(16)
      expect(parseState(`${short}.8080`)).toEqual({ nonce: short, port: 8080 })
    })

    it('accepts every base64url character in the nonce', () => {
      // `randomBytes(16).toString('base64url')` emits `-` and `_`, and both are safe in a
      // query string — which is why the alphabet is this one and not hex.
      const nonce = 'AZaz09-_AZaz09-_AZaz09-_'
      expect(parseState(`${nonce}.9999`)).toEqual({ nonce, port: 9999 })
    })
  })

  describe('nothing else', () => {
    it('refuses a missing or empty state', () => {
      // Atlassian omits `state` only if we omitted it, so this is a hand-made request.
      expect(parseState(null)).toBeNull()
      expect(parseState('')).toBeNull()
    })

    it('refuses a state with no separator', () => {
      expect(parseState(NONCE)).toBeNull()
      expect(parseState('51337')).toBeNull()
    })

    it('refuses more than one separator', () => {
      // The desktop never builds this, so it comes from someone probing the parser.
      expect(parseState(`${NONCE}.51337.51337`)).toBeNull()
      expect(parseState(`${NONCE}..51337`)).toBeNull()
      expect(parseState(`.${NONCE}.51337`)).toBeNull()
    })

    it('refuses a port that is not a bare number', () => {
      // The whole point of matching the string before converting it: `parseInt` reads
      // every one of these as a number and throws the rest of the input away.
      expect(parseState(`${NONCE}.51337abc`)).toBeNull()
      expect(parseState(`${NONCE}.abc`)).toBeNull()
      expect(parseState(`${NONCE}.51337/evil.com`)).toBeNull()
      expect(parseState(`${NONCE}.`)).toBeNull()
      expect(parseState(`${NONCE}.0x1f90`)).toBeNull()
      expect(parseState(`${NONCE}.5133.7`)).toBeNull()
    })

    it('refuses a port with a leading zero, a sign, or whitespace', () => {
      expect(parseState(`${NONCE}.051337`)).toBeNull()
      expect(parseState(`${NONCE}.08080`)).toBeNull()
      expect(parseState(`${NONCE}.+8080`)).toBeNull()
      expect(parseState(`${NONCE}.-8080`)).toBeNull()
      expect(parseState(`${NONCE}. 8080`)).toBeNull()
      expect(parseState(`${NONCE}.8080 `)).toBeNull()
      expect(parseState(`${NONCE}.\t8080`)).toBeNull()
    })

    it('refuses a port outside 1024-65535', () => {
      // Below 1024 the desktop could not have bound it; above 65535 no socket exists.
      expect(parseState(`${NONCE}.1023`)).toBeNull()
      expect(parseState(`${NONCE}.80`)).toBeNull()
      expect(parseState(`${NONCE}.0`)).toBeNull()
      expect(parseState(`${NONCE}.65536`)).toBeNull()
      expect(parseState(`${NONCE}.99999`)).toBeNull()
      expect(parseState(`${NONCE}.123456`)).toBeNull()
    })

    it('refuses a nonce that is too short', () => {
      expect(parseState('abc.8080')).toBeNull()
      expect(parseState(`${'a'.repeat(15)}.8080`)).toBeNull()
      expect(parseState('.8080')).toBeNull()
    })

    it('refuses a nonce carrying anything that would need escaping', () => {
      // A nonce is echoed back to the loopback URL. Restricting the alphabet means the
      // encoder never has work to do, and nothing in it can be mistaken for structure.
      expect(parseState('aBcD eFgH iJkL 1234.8080')).toBeNull()
      expect(parseState('aBcD/eFgH/iJkL/1234@.8080')).toBeNull()
      expect(parseState('<script>alert(1)</script>x.8080')).toBeNull()
      expect(parseState('aBcDeFgHiJkL1234%26x.8080')).toBeNull()
    })
  })
})

/**
 * The redirect the callback route performs. There is exactly one host it can name, and
 * that is the property worth pinning: a version of this that read the host from anywhere
 * near `state` would be an open redirect on a domain our own users trust.
 */
describe('loopbackCallbackUrl', () => {
  it('builds the desktop loopback callback', () => {
    expect(loopbackCallbackUrl(51337, { code: 'abc123', state: NONCE }))
      .toBe(`http://127.0.0.1:51337/jira/callback?code=abc123&state=${NONCE}`)
  })

  it('hardcodes 127.0.0.1 whatever it is given', () => {
    // The port is the only thing that varies, so a crafted `state` can only ever move
    // this to another port on the visitor's own machine.
    for (const port of [1024, 8080, 51337, 65535]) {
      expect(loopbackCallbackUrl(port, {})).toBe(`http://127.0.0.1:${port}/jira/callback`)
    }
  })

  it('encodes params instead of concatenating them', () => {
    // The bug this prevents: an authorization code or an error description containing
    // `&` or `#` would otherwise open a field of its own — or truncate the URL.
    const url = loopbackCallbackUrl(51337, {
      error: 'access_denied',
      error_description: 'The user did not approve & went back',
      state: NONCE,
    })
    expect(url).toContain('error=access_denied')
    expect(url).toContain('error_description=The+user+did+not+approve+%26+went+back')
    expect(url).toContain(`state=${NONCE}`)
    // One separator, one query string: nothing smuggled a second `?` or a fragment in.
    expect(url.match(/\?/g)).toHaveLength(1)
    expect(url).not.toContain('#')
  })

  it('encodes a value that tries to escape the query string', () => {
    const url = loopbackCallbackUrl(51337, { code: 'a#b?c=d&e/../f' })
    expect(url).toBe('http://127.0.0.1:51337/jira/callback?code=a%23b%3Fc%3Dd%26e%2F..%2Ff')
  })

  it('parses back as the loopback origin', () => {
    // Belt and braces: whatever the string looks like, the browser must resolve it to
    // the loopback host and nowhere else.
    const url = new URL(loopbackCallbackUrl(51337, { code: 'abc123' }))
    expect(url.protocol).toBe('http:')
    expect(url.hostname).toBe('127.0.0.1')
    expect(url.port).toBe('51337')
    expect(url.pathname).toBe('/jira/callback')
  })
})

/**
 * OAuth compares the redirect URI for string equality at both ends of the flow, and the
 * value is registered by hand in the Atlassian developer console. A typo here is a
 * feature that fails at the token exchange with `invalid_grant` and no explanation.
 */
describe('the Atlassian endpoints', () => {
  it('names the callback route on the app host', () => {
    expect(ATLASSIAN_REDIRECT_URI).toBe('https://app.magic-slash.io/api/atlassian/callback')
  })

  it('exchanges tokens over HTTPS on auth.atlassian.com', () => {
    expect(ATLASSIAN_TOKEN_URL).toBe('https://auth.atlassian.com/oauth/token')
  })
})

/**
 * How a failed token exchange is reported to the desktop.
 *
 * This is the webapp's half of a bug that only existed ACROSS the hop: every upstream
 * 4xx used to be folded into a 400, and 400 is the exact shape the desktop reads as a
 * revoked refresh token. An Atlassian rate limit therefore reached the user as
 * "Atlassian refused this connection / Reconnect". The desktop end of the fix is in
 * `desktop/src/main/jira/atlassian-api.ts`, and the two together in
 * `desktop/src/main/jira/revocation.test.ts`.
 */
describe('upstreamFailure', () => {
  it('keeps a rate limit as a rate limit', () => {
    // The whole point: a throttled refresh must not be indistinguishable from a
    // refused one. Safe to pass through because the caller is our own desktop app.
    expect(upstreamFailure(429, {})).toEqual({ status: 429, reason: 'atlassian_error' })
  })

  it('reads every other 4xx as a refused request', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(upstreamFailure(status, {}).status, `HTTP ${status}`).toBe(400)
    }
  })

  it('normalises 5xx — and anything unexpected — to 502', () => {
    for (const status of [500, 502, 503, 504, 0, 302]) {
      expect(upstreamFailure(status, {}).status, `HTTP ${status}`).toBe(502)
    }
  })

  it('forwards the OAuth error code, which is what the desktop actually decides on', () => {
    expect(upstreamFailure(400, { error: 'invalid_grant' })).toEqual({
      status: 400,
      reason: 'invalid_grant',
    })
  })

  it('forwards NOTHING else from the body', () => {
    // The reason the code is whitelisted rather than sanitised: an upstream body can
    // echo the request back, and it can name our own client_id in
    // `error_description`. Both end up in the desktop's logs.
    const body = {
      error: 'invalid_grant',
      error_description: 'client_id 1a2b3c is not allowed to refresh SECRET-TOKEN',
      request: { refresh_token: 'SECRET-TOKEN' },
    }
    const { reason } = upstreamFailure(400, body)
    expect(reason).toBe('invalid_grant')
    expect(JSON.stringify(upstreamFailure(400, body))).not.toContain('SECRET-TOKEN')
  })

  it('drops a code that is not shaped like one', () => {
    for (const error of [
      'Invalid Grant',                    // spaces and capitals: a sentence, not a code
      'a'.repeat(41),                     // longer than any OAuth code
      '',                                 // empty
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX', // a token in the field
      42,
      { error: 'invalid_grant' },
      null,
    ]) {
      expect(upstreamFailure(400, { error }).reason, JSON.stringify(error)).toBe('atlassian_error')
    }
  })

  it('answers with a code even when there is no body at all', () => {
    // An HTML error page from a proxy parses to null, and the desktop still needs
    // something to branch on that is not a bare status.
    for (const body of [null, undefined, 'a string', 42]) {
      expect(upstreamFailure(400, body).reason).toBe('atlassian_error')
    }
  })
})
