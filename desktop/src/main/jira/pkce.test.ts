import { createHash } from 'crypto'
import { describe, it, expect } from 'vitest'
import {
  buildAuthorizeUrl,
  buildState,
  createNonce,
  createPkcePair,
  isNonce,
} from './pkce'

// No electron, no network, no filesystem: the module under test is pure by design
// (see its header), and this suite is what keeps it that way.

describe('createPkcePair', () => {
  it('produces a challenge that is the S256 hash of the verifier', () => {
    // THE relationship the whole flow rests on. If it breaks, Atlassian answers
    // `invalid_grant` at the exchange, three hops from the mistake.
    const { verifier, challenge } = createPkcePair()
    expect(challenge).toBe(createHash('sha256').update(verifier).digest('base64url'))
  })

  it('emits url-safe values that need no further escaping', () => {
    const { verifier, challenge } = createPkcePair()
    // base64url: no `+`, no `/`, no `=` padding — so building the authorize URL
    // cannot double-encode them.
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    // 32 random bytes → 43 base64 characters; the length RFC 7636 recommends.
    expect(verifier).toHaveLength(43)
  })

  it('never repeats a pair', () => {
    const pairs = Array.from({ length: 32 }, () => createPkcePair().verifier)
    expect(new Set(pairs).size).toBe(pairs.length)
  })
})

describe('createNonce', () => {
  it('produces a nonce its own validator accepts, and a state the webapp can split', () => {
    // The generator and the validator must not drift: a nonce this build creates has
    // to survive the round trip through the webapp and back. The `<nonce>.<port>`
    // half is asserted as a literal, because the parser for it lives in the webapp
    // (`webapp/lib/atlassianState.ts`, covered by its own suite).
    for (let i = 0; i < 32; i++) {
      const nonce = createNonce()
      expect(isNonce(nonce), nonce).toBe(true)
      expect(buildState(nonce, 51234)).toBe(`${nonce}.51234`)
      // The separator is what the webapp splits on, so it must never be in a nonce.
      expect(nonce).not.toContain('.')
    }
  })

  it('never repeats', () => {
    const nonces = Array.from({ length: 64 }, createNonce)
    expect(new Set(nonces).size).toBe(nonces.length)
  })
})

describe('buildAuthorizeUrl', () => {
  const url = new URL(
    buildAuthorizeUrl({
      clientId: 'client-123',
      redirectUri: 'https://app.magic-slash.io/api/atlassian/callback',
      scopes: ['read:jira-work', 'offline_access'],
      state: 'abcdefghijklmnop.51234',
      challenge: 'chal-lenge_value',
    }),
  )

  it('targets Atlassian and nothing else', () => {
    expect(url.origin).toBe('https://auth.atlassian.com')
    expect(url.pathname).toBe('/authorize')
  })

  it('carries the parameters Atlassian requires for a 3LO PKCE grant', () => {
    expect(url.searchParams.get('audience')).toBe('api.atlassian.com')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('chal-lenge_value')
    expect(url.searchParams.get('client_id')).toBe('client-123')
    expect(url.searchParams.get('state')).toBe('abcdefghijklmnop.51234')
  })

  it('always asks for consent, so the user sees what is being granted', () => {
    expect(url.searchParams.get('prompt')).toBe('consent')
  })

  it('sends the scopes space-separated and the redirect uri verbatim', () => {
    // Read back through URLSearchParams: what matters is that Atlassian decodes
    // these to the exact registered values, not how they are spelled on the wire.
    expect(url.searchParams.get('scope')).toBe('read:jira-work offline_access')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://app.magic-slash.io/api/atlassian/callback',
    )
  })

  it('never carries the verifier', () => {
    // The verifier stays in this process's memory until the exchange. Anything in
    // this URL is in the user's browser history.
    const pair = createPkcePair()
    const built = buildAuthorizeUrl({
      clientId: 'client-123',
      redirectUri: 'https://app.magic-slash.io/api/atlassian/callback',
      scopes: ['read:jira-work'],
      state: 'abcdefghijklmnop.51234',
      challenge: pair.challenge,
    })
    expect(built).not.toContain(pair.verifier)
  })
})
