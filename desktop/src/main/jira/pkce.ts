import { createHash, randomBytes } from 'crypto'
import { AUTHORIZE_URL } from './constants'

/**
 * The cryptographic bookkeeping of the Atlassian authorization leg: the PKCE pair,
 * the nonce that ties a browser round-trip back to the attempt that started it,
 * and the authorize URL they are assembled into.
 *
 * PURE, and that is a constraint rather than a preference. Two reasons:
 *
 *  1. This is the part of the flow that has to be RIGHT — a verifier that does not
 *     hash to the challenge, or a `state` the webapp parses differently from us,
 *     fails as an opaque "invalid_grant" three network hops away from the mistake.
 *     Pure functions let `pkce.test.ts` assert the relationship directly.
 *  2. The suite runs on the ROOT node_modules, where `electron` is absent. Nothing
 *     here may reach it, at any depth. Node's `crypto` is fine (see
 *     `main/app-installation.ts`, which already uses it).
 *
 * WHY PKCE at all, when the exchange goes through our own webapp and could have
 * carried the client secret alone: the `code` travels through the user's browser
 * and lands in its history, and the loopback server that receives it listens on a
 * port any local process can reach. The verifier never leaves this process's
 * memory, so a `code` observed anywhere on that path is not enough to redeem.
 */

export interface PkcePair {
  /** Kept in RAM only, for the lifetime of one connect attempt. Never persisted, never logged. */
  verifier: string
  /** The S256 hash of the verifier — the only half that travels to Atlassian. */
  challenge: string
}

/**
 * The shape a nonce must have, mirrored by the webapp callback's own validation.
 *
 * 16 characters minimum because the nonce is the only thing binding a callback to
 * a pending attempt; the charset is base64url's, so a nonce can never contain the
 * `.` that separates it from the port.
 */
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,}$/

/**
 * A fresh verifier and its challenge. 32 random bytes, base64url — the length RFC
 * 7636 recommends, and the encoding that needs no further URL escaping.
 */
export function createPkcePair(): PkcePair {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

/**
 * The identifier of one connect attempt. 16 random bytes (22 base64url
 * characters), comfortably past `NONCE_PATTERN`'s floor.
 */
export function createNonce(): string {
  return randomBytes(16).toString('base64url')
}

/**
 * Pack the nonce and this machine's loopback port into the OAuth `state`.
 *
 * The port rides along because the webapp callback is stateless: it has no way to
 * know which of this user's machines — and which ephemeral port on it — started
 * the flow, and it needs both to build the redirect back. `state` is signed by
 * nothing, hence the strict re-validation in `parseState` on the other side.
 */
export function buildState(nonce: string, port: number): string {
  return `${nonce}.${port}`
}

/**
 * Whether a bare `state` is a well-formed nonce.
 *
 * The loopback leg carries the nonce ALONE — the webapp already consumed the port
 * half to build the redirect — so this is the ONLY `state` validation the desktop
 * performs. The `<nonce>.<port>` grammar is parsed in exactly one place, and that
 * place is the webapp callback (`webapp/lib/atlassianState.ts`): a second parser
 * here would have no caller and nothing to keep it honest.
 */
export function isNonce(raw: unknown): raw is string {
  return typeof raw === 'string' && NONCE_PATTERN.test(raw)
}

/**
 * The consent URL the user's browser is sent to.
 *
 * Built with `URLSearchParams` rather than string concatenation so every value is
 * escaped exactly once — the redirect URI and the scope list both contain
 * characters that would otherwise need hand-encoding.
 *
 * `prompt=consent` is deliberate: without it Atlassian silently re-issues a token
 * for an already-approved app, and a user who clicked "Connect" expecting to
 * choose a site would see the browser flash and close with no explanation of what
 * was just granted.
 */
export function buildAuthorizeUrl(options: {
  clientId: string
  redirectUri: string
  scopes: string[]
  state: string
  challenge: string
}): string {
  const params = new URLSearchParams({
    // `api.atlassian.com` is what makes this a 3LO token usable against the Jira
    // REST proxy, rather than an id-token-only grant.
    audience: 'api.atlassian.com',
    client_id: options.clientId,
    scope: options.scopes.join(' '),
    redirect_uri: options.redirectUri,
    state: options.state,
    response_type: 'code',
    prompt: 'consent',
    code_challenge: options.challenge,
    code_challenge_method: 'S256',
  })
  return `${AUTHORIZE_URL}?${params.toString()}`
}
