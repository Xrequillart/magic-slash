import { NextResponse, type NextRequest } from 'next/server'
import { ATLASSIAN_REDIRECT_URI, ATLASSIAN_TOKEN_URL, upstreamFailure } from '@/lib/atlassianState'

/**
 * The token exchange — the reason the webapp is in the Atlassian flow at all.
 *
 * Atlassian's OAuth 2.0 (3LO) token endpoint wants a `client_secret`, and the desktop app
 * is a binary on a laptop: anything it ships, anyone can read. So the secret lives here,
 * as a Vercel environment variable, and the desktop calls this route over HTTPS instead.
 *
 * The PKCE `code_verifier` goes the other way. It is generated per attempt on the machine
 * that started the flow and is sent here only to be forwarded, never stored — so neither
 * side alone can redeem a code: we hold the secret and never see the verifier before the
 * request that spends it, the desktop holds the verifier and never sees the secret at all.
 *
 * **This route returns the tokens to the caller and keeps nothing.** No database write, no
 * Supabase, no log line. The webapp is a secret-holder, never a token-holder: the access
 * and refresh tokens live in the desktop's keychain and nowhere in the cloud.
 *
 * Both grants are here, and the refresh grant is not an optimisation — an Atlassian access
 * token expires in about an hour and the refresh call needs the same secret, so a version
 * of this route with only `authorization_code` would ship a feature that works until lunch.
 *
 * This is a public endpoint: reachable by anyone who knows the URL, with no session in
 * front of it, because the desktop has no webapp session to present. That is why the body
 * is validated field by field below before anything is forwarded. It is not a hole — the
 * secret alone redeems nothing. Every call needs a live authorization code (single-use,
 * ~10 minutes) with its matching verifier, or a refresh token, and both of those are
 * things the caller had to obtain from Atlassian themselves. The worst use of this route
 * is completing your own OAuth flow, which is what it is for.
 */

/** Never cached, never prerendered — every call carries a single-use credential. */
export const dynamic = 'force-dynamic'

/** What the desktop may ask for. Anything else is a 400 before a byte leaves this process. */
type TokenRequest =
  | { grant_type: 'authorization_code'; code: string; code_verifier: string }
  | { grant_type: 'refresh_token'; refresh_token: string }

/**
 * A short, fixed reason and a status — the only thing that ever reaches the caller when
 * something fails.
 *
 * `no-store` on every one of them: an error response from a token endpoint is as
 * cache-poisonable as a successful one, and Vercel's edge has no way to know that.
 */
function fail(status: number, reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status, headers: { 'cache-control': 'no-store' } })
}

/** Non-empty string, and short enough that nothing absurd is forwarded upstream. */
function isCredential(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 4096
}

/**
 * The request body, or null.
 *
 * Hand-written rather than pulled from a schema library because the webapp has no
 * validator dependency and this is nine lines. Note what it does not do: it never puts a
 * field's VALUE in a message, or anywhere else it could be seen. A validation error says
 * which grant was malformed and stops there.
 */
function parseBody(body: unknown): TokenRequest | null {
  if (typeof body !== 'object' || body === null) return null

  const { grant_type: grantType, code, code_verifier: verifier, refresh_token: refresh } =
    body as Record<string, unknown>

  if (grantType === 'authorization_code') {
    if (!isCredential(code) || !isCredential(verifier)) return null
    return { grant_type: 'authorization_code', code, code_verifier: verifier }
  }

  if (grantType === 'refresh_token') {
    if (!isCredential(refresh)) return null
    return { grant_type: 'refresh_token', refresh_token: refresh }
  }

  return null
}

export async function POST(request: NextRequest) {
  let parsed: TokenRequest | null = null
  try {
    parsed = parseBody(await request.json())
  } catch {
    // Unparseable JSON. Nothing to say about it that would not quote the body — and the
    // caller is our own client, so the shape is a bug on its side, not a mystery.
    return fail(400, 'invalid_body')
  }
  if (!parsed) return fail(400, 'invalid_body')

  const clientId = process.env.ATLASSIAN_CLIENT_ID
  const clientSecret = process.env.ATLASSIAN_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    // Server-only, so deliberately NOT `NEXT_PUBLIC_` — a `NEXT_PUBLIC_` secret is
    // inlined into the browser bundle, which for this one value would mean publishing it.
    // Missing means the environment was never configured on this deployment: a 500,
    // because it is our fault, and a reason the caller can act on without learning
    // anything about our configuration.
    return fail(500, 'server_not_configured')
  }

  // Atlassian's 3LO token endpoint takes JSON. `redirect_uri` is required for the
  // authorization_code grant and must be byte-identical to the one the authorization
  // request used — hence the shared constant rather than a second literal here.
  const payload =
    parsed.grant_type === 'authorization_code'
      ? {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: parsed.code,
          code_verifier: parsed.code_verifier,
          redirect_uri: ATLASSIAN_REDIRECT_URI,
        }
      : {
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: parsed.refresh_token,
        }

  let upstream: Response
  try {
    upstream = await fetch(ATLASSIAN_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch {
    // Caught and discarded on purpose. A fetch error's `message` and `cause` can quote
    // the request, and this request body is a secret plus a single-use credential —
    // letting that reach Vercel's function logs is the leak this whole file avoids.
    return fail(502, 'atlassian_unreachable')
  }

  let body: unknown = null
  try {
    body = await upstream.json()
  } catch {
    body = null
  }

  if (!upstream.ok) {
    // Sanitised status and a short code — never the body. `upstreamFailure` owns the
    // mapping (and is tested next to it, in `lib/atlassianState.test.ts`); the one thing
    // to know here is that a 429 keeps its status rather than reading as a refused
    // request, because the desktop turns a refused request into a "Reconnect" prompt and
    // a rate limit must never do that.
    const { status, reason } = upstreamFailure(upstream.status, body)
    return fail(status, reason)
  }

  if (typeof body !== 'object' || body === null) {
    return fail(502, 'atlassian_error')
  }

  // Straight back to the desktop, unread and unstored. Deliberately passed through whole
  // rather than picked apart: `expires_in` and `scope` are what the desktop schedules its
  // refresh from, and a field Atlassian adds later should not need a deploy here.
  return NextResponse.json(body, { headers: { 'cache-control': 'no-store' } })
}
