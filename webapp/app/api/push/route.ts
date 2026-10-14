import { connect } from 'node:http2'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import {
  apnsHost,
  buildApnsPayload,
  isApnsToken,
  isDeadToken,
  parsePushRequest,
  providerToken,
  type ApnsEnvironment,
} from '@/lib/apns'

/**
 * The APNs relay for the iPhone companion's notifications (#355).
 *
 * The Mac knows when an agent waits or finishes; only Apple can wake a closed app; and the
 * APNs provider key cannot ship in a desktop binary any more than the Atlassian secret can.
 * So the Mac posts here `{ phoneId, macId, kind, box }` with its Supabase access token, and
 * this route forwards the box to the phone's APNs token.
 *
 * **The route is a postman, not a reader.** `box` is sealed on the Mac with a key the phone
 * gave it over the relay (`desktop/src/main/remote/PROTOCOL.md`); it is checked for shape,
 * copied into the payload and never logged. The alert APNs displays is a pair of localisation
 * keys, so a phone that cannot open the box shows its own generic wording, not ours.
 *
 * **Authorization is the caller's own JWT, under RLS — no service role.** The row for the
 * couple is read with a client that carries the caller's token, so `push_devices`' owner-only
 * policies decide everything: a colleague who knows both ids reads nothing and gets the same
 * 404 as a stranger. The route holds the APNs key and no database privilege at all.
 *
 * Contract (every body is JSON, every response `no-store`):
 *   200 { sent: true }                          delivered to APNs
 *   200 { sent: false, reason: 'disabled' }     the phone turned this kind off
 *   400 { error: 'invalid_body' }               not JSON, or not the shape above
 *   401 { error: 'unauthorized' }               no bearer, or a token Supabase refuses
 *   404 { error: 'not_paired' }                 no row for this couple under the caller
 *   410 { error: 'device_unregistered' }        APNs says the token is dead; the row is gone
 *   413 { error: 'body_too_large' }
 *   500 { error: 'server_not_configured' }      an APNS_* or Supabase variable is missing
 *   502 { error: 'auth_unreachable' | 'database_error' | 'apns_unreachable' }
 *   502 { error: 'apns_error', apnsStatus, apnsReason }   any other APNs refusal
 */

/** Never cached, never prerendered — every call is a delivery. */
export const dynamic = 'force-dynamic'
/** `node:http2` and `node:crypto`: APNs speaks HTTP/2 only, which `fetch` does not. */
export const runtime = 'nodejs'

/**
 * Far above any valid request (a box is at most 3000 characters) and far below anything
 * that would cost us to read. Checked on the header and again on what actually arrived,
 * since a header is only a claim.
 */
const MAX_BODY_BYTES = 8 * 1024

/** One budget for the whole APNs exchange, connection included. */
const APNS_TIMEOUT_MS = 10_000

/**
 * How long APNs keeps trying a phone that is off. An hour: "your agent is waiting" two days
 * late is noise, and the phone's extension refuses anything older than 15 minutes anyway.
 */
const APNS_EXPIRATION_S = 60 * 60

/** Same shape as the Atlassian route: a status, a fixed reason, never a value. */
function fail(status: number, reason: string, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: reason, ...extra }, { status, headers: { 'cache-control': 'no-store' } })
}

function ok(body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, { headers: { 'cache-control': 'no-store' } })
}

interface ApnsResult {
  status: number
  reason: string | null
}

/**
 * Apple's `reason` is one of its documented identifiers (`BadDeviceToken`, …). Anything else
 * is not passed on: this value goes back to the caller and into nothing else.
 */
function readReason(body: string): string | null {
  try {
    const reason = (JSON.parse(body) as { reason?: unknown }).reason
    return typeof reason === 'string' && /^[A-Za-z]{1,64}$/.test(reason) ? reason : null
  } catch {
    return null
  }
}

/**
 * One POST over a fresh HTTP/2 session, closed whatever happens.
 *
 * A session per request rather than a pooled one: a serverless instance may be frozen
 * between two calls, and a pooled connection Apple dropped in the meantime fails on the next
 * push. A notification is a rare, human-paced event; one TLS handshake each is affordable.
 *
 * Rejects with a bare Error and nothing else in it. Node's errors here can quote the
 * request, and the request carries the provider token and the device token.
 */
function sendToApns(input: {
  environment: ApnsEnvironment
  deviceToken: string
  jwt: string
  topic: string
  payload: string
}): Promise<ApnsResult> {
  return new Promise((resolve, reject) => {
    const session = connect(apnsHost(input.environment))
    let settled = false
    const settle = (done: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      session.close()
      done()
    }
    const timer = setTimeout(() => {
      settle(() => reject(new Error('apns_timeout')))
      session.destroy()
    }, APNS_TIMEOUT_MS)

    session.on('error', () => settle(() => reject(new Error('apns_session'))))

    const request = session.request({
      ':method': 'POST',
      ':path': `/3/device/${input.deviceToken}`,
      authorization: `bearer ${input.jwt}`,
      'apns-topic': input.topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': String(Math.floor(Date.now() / 1000) + APNS_EXPIRATION_S),
      'content-type': 'application/json',
    })
    request.setEncoding('utf8')

    let status = 0
    let body = ''
    request.on('response', (headers) => {
      status = Number(headers[':status']) || 0
    })
    request.on('data', (chunk: string) => {
      // An error body is a one-field JSON; anything longer is not one we need.
      if (body.length < 1024) body += chunk
    })
    request.on('end', () => settle(() => resolve({ status, reason: status === 200 ? null : readReason(body) })))
    request.on('error', () => settle(() => reject(new Error('apns_stream'))))
    request.end(input.payload)
  })
}

export async function POST(request: NextRequest) {
  // 1. The body, bounded before it is read whole.
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return fail(413, 'body_too_large')

  let raw: string
  try {
    raw = await request.text()
  } catch {
    return fail(400, 'invalid_body')
  }
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return fail(413, 'body_too_large')

  let parsed: ReturnType<typeof parsePushRequest> = null
  try {
    parsed = parsePushRequest(JSON.parse(raw))
  } catch {
    // Unparseable JSON — said in two words, never quoted.
    return fail(400, 'invalid_body')
  }
  if (!parsed) return fail(400, 'invalid_body')

  // 2. Our configuration. All server-only: the `.p8` is the one secret here, and a
  //    `NEXT_PUBLIC_` copy would inline it into the browser bundle.
  const keyP8 = process.env.APNS_KEY_P8
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const topic = process.env.APNS_TOPIC
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!keyP8 || !keyId || !teamId || !topic || !supabaseUrl || !supabaseAnonKey) {
    return fail(500, 'server_not_configured')
  }

  // 3. The caller. The Mac refreshes its session and retries once on a 401, so a 401 must
  //    mean "this token", never "Supabase did not answer" — that one is a 502.
  const authorization = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)$/i.exec(authorization)
  if (!match) return fail(401, 'unauthorized')
  const jwt = match[1]

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
  if (userError) {
    const status = typeof userError.status === 'number' ? userError.status : 0
    return status >= 400 && status < 500 ? fail(401, 'unauthorized') : fail(502, 'auth_unreachable')
  }
  if (!userData.user) return fail(401, 'unauthorized')
  const userId = userData.user.id

  // 4. The couple, under the caller's RLS. `user_id` is in the filter for the reader's sake;
  //    the policy would enforce it anyway.
  const { data: device, error: deviceError } = await supabase
    .from('push_devices')
    .select('apns_token, environment, notify_waiting, notify_completed')
    .eq('user_id', userId)
    .eq('phone_id', parsed.phoneId)
    .eq('mac_id', parsed.macId)
    .maybeSingle()
  if (deviceError) return fail(502, 'database_error')
  if (!device || !isApnsToken(device.apns_token)) return fail(404, 'not_paired')
  const environment: ApnsEnvironment = device.environment === 'production' ? 'production' : 'sandbox'

  // 5. The phone's toggles are the source of truth, so a disabled kind stops here — the
  //    Mac does not need to know them, and the phone could not drop the push itself.
  const enabled = parsed.kind === 'waiting' ? device.notify_waiting : device.notify_completed
  if (!enabled) return ok({ sent: false, reason: 'disabled' })

  // 6. Apple.
  let providerJwt: string
  try {
    providerJwt = providerToken({ keyP8, keyId, teamId, now: Date.now() })
  } catch {
    // A key that does not parse. Our fault, and nothing about it is the caller's business.
    return fail(500, 'server_not_configured')
  }

  let result: ApnsResult
  try {
    result = await sendToApns({
      environment,
      deviceToken: device.apns_token,
      jwt: providerJwt,
      topic,
      payload: JSON.stringify(buildApnsPayload({ macId: parsed.macId, box: parsed.box, phoneId: parsed.phoneId })),
    })
  } catch {
    return fail(502, 'apns_unreachable')
  }

  if (result.status === 200) return ok({ sent: true })

  if (isDeadToken(result.status, result.reason)) {
    // The owner may delete their row, so the caller's own client does it. Matched on the
    // token too: if the phone re-registered a fresh one in the meantime, that row stays.
    // A failed delete is not reported — the next push will find the same dead token.
    await supabase
      .from('push_devices')
      .delete()
      .eq('user_id', userId)
      .eq('phone_id', parsed.phoneId)
      .eq('mac_id', parsed.macId)
      .eq('apns_token', device.apns_token)
    return fail(410, 'device_unregistered')
  }

  return fail(502, 'apns_error', { apnsStatus: result.status, apnsReason: result.reason })
}
