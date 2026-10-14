import { createPrivateKey, sign, type KeyObject } from 'node:crypto'

/**
 * The pure half of `/api/push`: what the Mac may send, what we send Apple, and how we read
 * Apple's answer. No Next, no Supabase, so the root Vitest suite can cover it (see the
 * `webapp/lib/**` note in `vitest.config.ts`); the route only wires it to the network.
 *
 * The one rule this file keeps: it never looks inside `box`. The box is AES-GCM sealed on the
 * Mac with a key only the phone and that Mac hold (`desktop/src/main/remote/PROTOCOL.md`), and
 * all this server does with it is check it LOOKS like base64 of a sensible length and put it in
 * the APNs payload for the phone's Notification Service Extension to open.
 */

export type PushKind = 'waiting' | 'completed'
export type ApnsEnvironment = 'sandbox' | 'production'

export interface PushRequest {
  phoneId: string
  macId: string
  kind: PushKind
  box: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/

/**
 * The smallest box that can be one: 12-byte nonce + 16-byte tag around an empty plaintext is
 * 28 bytes, 40 base64 characters. The largest is a budget, not a format limit — APNs refuses a
 * payload over 4 KB, and the aps block plus the ids take a few hundred bytes of that.
 */
export const MIN_BOX_LENGTH = 40
export const MAX_BOX_LENGTH = 3000

/**
 * The request body, or null. Like the Atlassian route's `parseBody`, it never quotes a value:
 * a malformed request is a 400 and nothing else. Ids are returned lower-case so they compare
 * as the phone and the Mac write them, though the uuid columns would not care.
 */
export function parsePushRequest(body: unknown): PushRequest | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const { phoneId, macId, kind, box } = body as Record<string, unknown>

  if (typeof phoneId !== 'string' || !UUID.test(phoneId)) return null
  if (typeof macId !== 'string' || !UUID.test(macId)) return null
  if (kind !== 'waiting' && kind !== 'completed') return null
  if (typeof box !== 'string') return null
  if (box.length < MIN_BOX_LENGTH || box.length > MAX_BOX_LENGTH) return null
  if (box.length % 4 !== 0 || !BASE64.test(box)) return null

  return { phoneId: phoneId.toLowerCase(), macId: macId.toLowerCase(), kind, box }
}

/**
 * The `.p8` as Vercel hands it over. A multi-line value pasted into an environment variable
 * often arrives with its newlines escaped (`\n` as two characters), and a bare base64 body
 * without the armour is the other common paste. Both are put back into a PEM here so the
 * route fails on a wrong key, not on a formatting accident.
 */
export function normalizeKeyP8(raw: string): string {
  const pem = raw.replace(/\\n/g, '\n').trim()
  if (pem.includes('-----BEGIN')) return pem
  const body = pem.replace(/\s+/g, '').match(/.{1,64}/g)?.join('\n') ?? ''
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

/**
 * A provider token is valid for an hour, and Apple answers 429 TooManyProviderTokenUpdates
 * to one minted on every request. So it is cached per module instance and reminted after
 * 50 minutes — comfortably inside the hour, and well past the 20-minute floor between two
 * refreshes. A serverless cold start simply mints a new one.
 */
export const PROVIDER_TOKEN_TTL_MS = 50 * 60 * 1000

let cached: { cacheKey: string; issuedAt: number; jwt: string } | null = null
let cachedKey: { pem: string; key: KeyObject } | null = null

export interface ProviderTokenInput {
  keyP8: string
  keyId: string
  teamId: string
  /** Milliseconds since the epoch. A parameter so the cache can be tested without a clock. */
  now: number
}

/** An ES256 JWT for APNs token-based authentication, reused while it is fresh. */
export function providerToken({ keyP8, keyId, teamId, now }: ProviderTokenInput): string {
  const cacheKey = `${keyId}.${teamId}`
  if (cached && cached.cacheKey === cacheKey && now - cached.issuedAt >= 0 && now - cached.issuedAt < PROVIDER_TOKEN_TTL_MS) {
    return cached.jwt
  }

  const pem = normalizeKeyP8(keyP8)
  if (!cachedKey || cachedKey.pem !== pem) cachedKey = { pem, key: createPrivateKey(pem) }

  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const claims = base64url(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) }))
  const signingInput = `${header}.${claims}`
  // JOSE wants the raw r‖s pair, not the DER sequence node signs by default.
  const signature = sign('sha256', Buffer.from(signingInput), { key: cachedKey.key, dsaEncoding: 'ieee-p1363' })

  const jwt = `${signingInput}.${base64url(signature)}`
  cached = { cacheKey, issuedAt: now, jwt }
  return jwt
}

/** For the tests: forget the cached token and key. */
export function resetProviderTokenCache(): void {
  cached = null
  cachedKey = null
}

/**
 * What APNs carries. The alert is a pair of LOCALISATION KEYS, not text: if the extension
 * cannot open the box (no key, failed AEAD, replay), iOS shows the phone's own generic
 * wording and the server never had any text to leak. `mutable-content` is what wakes the
 * extension; `thread-id` groups a phone's notifications.
 */
export function buildApnsPayload({ macId, box, phoneId }: { macId: string; box: string; phoneId: string }) {
  return {
    aps: {
      alert: { 'title-loc-key': 'push.fallback.title', 'loc-key': 'push.fallback.body' },
      'mutable-content': 1,
      sound: 'default',
      'thread-id': phoneId,
    },
    ms: { macId, box },
  }
}

/** The APNs gateway a token belongs to. A token sent to the other one is BadDeviceToken. */
export function apnsHost(environment: ApnsEnvironment): string {
  return environment === 'production' ? 'https://api.push.apple.com' : 'https://api.sandbox.push.apple.com'
}

/** What `push_devices.apns_token` allows, checked again before it goes into a URL path. */
export function isApnsToken(token: unknown): token is string {
  return typeof token === 'string' && /^[0-9a-fA-F]{32,200}$/.test(token)
}

const DEAD_REASONS = new Set(['BadDeviceToken', 'Unregistered', 'DeviceTokenNotForTopic'])

/**
 * Whether Apple says this token will never work again, so its row should go. 410 is
 * "Unregistered" (the app was removed, or the token rotated); the 400s are a token that is
 * malformed, from the other environment, or for another bundle. Anything else — 403 on our
 * provider token, 429, 5xx — is ours or Apple's to fix, and must not cost the user their row.
 */
export function isDeadToken(status: number, reason: string | null | undefined): boolean {
  if (status === 410) return true
  return status === 400 && typeof reason === 'string' && DEAD_REASONS.has(reason)
}
