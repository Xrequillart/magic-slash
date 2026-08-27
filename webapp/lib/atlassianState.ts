/**
 * The `state` parameter of the Atlassian OAuth dance, and the loopback URL it unlocks.
 *
 * Why the webapp is in this flow at all: the desktop app connects a user's own Atlassian
 * account with OAuth 2.0 (3LO) + PKCE, and an Electron binary shipped to laptops cannot
 * hold a `client_secret` — anyone can unzip it. So the secret lives here, on Vercel, and
 * the redirect URI registered with Atlassian is a fixed HTTPS route on this deployment
 * (`/api/atlassian/callback`) rather than a `http://127.0.0.1:<random port>` that could
 * never be registered ahead of time. This half of the app is a SECRET-holder and never a
 * TOKEN-holder: nothing from this flow is persisted in the cloud.
 *
 * That leaves one problem: after Atlassian redirects here, the browser has to be sent
 * back to the little HTTP server the desktop opened on a port it picked at launch. The
 * port has to travel through Atlassian and come back, and the only field that does that
 * round trip is `state` — so the desktop builds it as `<nonce>.<port>`.
 *
 * Which makes `state` attacker-controlled. Anyone can craft a link to our callback with
 * any `state` they like, and a naive implementation would happily redirect the visitor
 * wherever that string said. `parseState` is the gate that stops it, and
 * `loopbackCallbackUrl` is the reason it can never be an open redirect: the host is a
 * hardcoded `127.0.0.1` in this file, and the ONLY thing taken from `state` is an
 * integer port. There is no input that turns this into a redirect off the loopback.
 *
 * It lives in `lib/` and imports nothing but its sibling `inviteLink.ts` (itself
 * import-free) for the same mechanical reason as `hostRouting.ts`: the suite runs on
 * the ROOT node_modules and never installs the webapp's own, so a test that reached
 * `next/server` would fail to RESOLVE rather than fail honestly (see vitest.config.ts).
 * The route handlers keep the framework; this keeps the rules that are worth testing.
 */
import { APP_URL } from './inviteLink'

/**
 * The redirect URI registered with Atlassian, to the character.
 *
 * Exported from this module rather than written twice because OAuth compares it for
 * equality at BOTH ends: the authorization request and the token exchange must send the
 * same string, or Atlassian rejects the exchange with `invalid_grant` and no hint as to
 * why. One constant, two call sites, no chance of a trailing slash drifting between them.
 *
 * Built on `APP_URL` rather than spelling the origin out again: `webapp/lib/` already
 * owns the production hosts, and this is the one URL a third party compares byte for
 * byte, so it is the last one that should have a private copy of the domain.
 */
export const ATLASSIAN_REDIRECT_URI = `${APP_URL}/api/atlassian/callback`

/** Where Atlassian exchanges an authorization code, and refreshes a token. */
export const ATLASSIAN_TOKEN_URL = 'https://auth.atlassian.com/oauth/token'

/**
 * The one field of an upstream error body we are willing to repeat: the OAuth error
 * code, and only when it is shaped like one.
 *
 * A whitelist rather than a sanitiser. `invalid_grant` fits; a token, a URL, a sentence
 * naming our own `client_id` and anything else Atlassian may put in an
 * `error_description` do not. The desktop applies the SAME class to what it reads back
 * (`desktop/src/main/jira/atlassian-api.ts`), so neither end has to trust the other's
 * filtering.
 */
const UPSTREAM_ERROR_CODE = /^[a-z_]{1,40}$/

/**
 * The OAuth error code from an upstream failure, if it is one we can safely repeat.
 *
 * Never the upstream body: it is a third party's JSON, it can carry an
 * `error_description` naming our own `client_id`, and it ends up in the desktop's logs.
 * But `invalid_grant` is genuinely worth knowing — it is how the desktop tells "this
 * refresh token is dead, ask the user to reconnect" from "Atlassian is having a bad
 * afternoon, retry". So: that one field, character-restricted and length-capped, or
 * nothing.
 */
function upstreamErrorCode(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null
  const code = (payload as Record<string, unknown>).error
  if (typeof code !== 'string' || !UPSTREAM_ERROR_CODE.test(code)) return null
  return code
}

/**
 * How a failed call to Atlassian's token endpoint is reported to the desktop: a status
 * and a short code, never the body.
 *
 * Lives here rather than in the route because it is the RULE, and the rule is the part
 * worth testing — the route keeps the framework (see this file's header).
 *
 * ─── Why 429 keeps its own status ───────────────────────────────────────────────
 * Folding every 4xx into 400 costs the caller the only distinction it actually needs.
 * The desktop reads a rejected grant as "the user revoked us" and prompts them to
 * reconnect; a 429 on a refresh means "you asked too often", which is over in a minute
 * and must not put a "Reconnect" banner in front of anyone. Passing 429 through is safe
 * precisely because the caller is our own desktop app rather than an untrusted client:
 * a rate limit is a fact about our traffic, not about our configuration, and it leaks
 * nothing. 5xx stays normalised to 502 — "upstream problem, retry later" is all a
 * caller can do with any of them, and the exact code is Atlassian's business.
 *
 * Everything else 4xx still reads as 400: our request was refused, and the caller can
 * only ever fix its own half.
 */
export function upstreamFailure(
  upstreamStatus: number,
  body: unknown,
): { status: number; reason: string } {
  const status =
    upstreamStatus === 429 ? 429 : upstreamStatus >= 400 && upstreamStatus < 500 ? 400 : 502
  return { status, reason: upstreamErrorCode(body) ?? 'atlassian_error' }
}

/**
 * The nonce half of `state`: the desktop's own CSRF token, which it checks against what
 * it stored before opening the browser.
 *
 * We do not verify it — we cannot, the secret is the desktop's — we only refuse to carry
 * something that could not plausibly be one. Base64url characters, 16 or more of them:
 * long enough that the 128 bits the desktop generates fits, strict enough that nothing
 * needing escaping ever reaches a URL builder.
 */
const NONCE_PATTERN = /^[A-Za-z0-9_-]{16,}$/

/**
 * The port half: 4 or 5 digits, no leading zero.
 *
 * Deliberately stricter than `Number.parseInt`, which is the trap here — it reads
 * `"8080abc"`, `" 8080"`, `"+8080"` and `"08080"` all as 8080 and discards the evidence.
 * A shape check first means the string that built the URL is the number we validated.
 */
const PORT_PATTERN = /^[1-9][0-9]{3,4}$/

/** Unprivileged ports only. Nothing below 1024 can be bound by the desktop app anyway. */
const MIN_PORT = 1024
const MAX_PORT = 65535

/** The path the desktop's loopback server listens on. */
const LOOPBACK_PATH = '/jira/callback'

/**
 * The desktop's `state`, split into its two halves — or null if it is not one of ours.
 *
 * Returns null instead of throwing, on purpose: every caller is a route handler whose
 * answer to a bad `state` is the same static error page, and there is no case here worth
 * a stack trace. A malformed `state` is the normal shape of an attack, not an incident.
 */
export function parseState(raw: string | null): { nonce: string; port: number } | null {
  if (!raw) return null

  // Exactly one separator. Splitting on the last dot and ignoring the rest would accept
  // `<nonce>.<junk>.<port>` — a shape the desktop never produces, so it can only come
  // from someone probing.
  const parts = raw.split('.')
  if (parts.length !== 2) return null

  const [nonce, port] = parts
  if (!NONCE_PATTERN.test(nonce)) return null
  if (!PORT_PATTERN.test(port)) return null

  const parsed = Number(port)
  if (parsed < MIN_PORT || parsed > MAX_PORT) return null

  return { nonce, port: parsed }
}

/**
 * Where to send the browser so the desktop app receives the result.
 *
 * The host is written out here and comes from nowhere else. That single fact is what
 * makes this route safe to hand an attacker-controlled `state`: the worst a crafted link
 * achieves is a redirect to a port on the visitor's own machine that is almost certainly
 * closed. Params are encoded rather than concatenated, so an authorization code or an
 * error description containing `&` cannot inject a field of its own.
 */
export function loopbackCallbackUrl(port: number, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString()
  const url = `http://127.0.0.1:${port}${LOOPBACK_PATH}`
  return query ? `${url}?${query}` : url
}
