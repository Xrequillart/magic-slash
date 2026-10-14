import { generateKeyPairSync, verify } from 'node:crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  MAX_BOX_LENGTH,
  PROVIDER_TOKEN_TTL_MS,
  apnsHost,
  buildApnsPayload,
  isApnsToken,
  isDeadToken,
  normalizeKeyP8,
  parsePushRequest,
  providerToken,
  resetProviderTokenCache,
} from './apns'

const PHONE = '0f8e3c2a-1b4d-4e5f-8a9b-0c1d2e3f4a5b'
const MAC = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const BOX = Buffer.alloc(60, 7).toString('base64')

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const KEY_P8 = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()

function decode(part: string) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
}

describe('parsePushRequest', () => {
  const valid = { phoneId: PHONE, macId: MAC, kind: 'waiting', box: BOX }

  it('accepts a well-formed request and lower-cases the ids', () => {
    expect(parsePushRequest(valid)).toEqual(valid)
    expect(parsePushRequest({ ...valid, phoneId: PHONE.toUpperCase(), kind: 'completed' })).toEqual({
      ...valid,
      kind: 'completed',
    })
  })

  it('refuses anything that is not an object', () => {
    for (const body of [null, undefined, 'x', 42, [valid]]) expect(parsePushRequest(body)).toBeNull()
  })

  it('refuses ids that are not uuids', () => {
    expect(parsePushRequest({ ...valid, phoneId: 'phone' })).toBeNull()
    expect(parsePushRequest({ ...valid, macId: `${MAC}x` })).toBeNull()
    expect(parsePushRequest({ ...valid, macId: undefined })).toBeNull()
  })

  it('refuses an unknown kind', () => {
    expect(parsePushRequest({ ...valid, kind: 'error' })).toBeNull()
  })

  it('refuses a box that is not base64 of a sensible length', () => {
    expect(parsePushRequest({ ...valid, box: 42 })).toBeNull()
    expect(parsePushRequest({ ...valid, box: 'AAAA' })).toBeNull()
    expect(parsePushRequest({ ...valid, box: `${BOX.slice(0, -4)}!!!!` })).toBeNull()
    expect(parsePushRequest({ ...valid, box: `${BOX}A` })).toBeNull()
    expect(parsePushRequest({ ...valid, box: 'A'.repeat(MAX_BOX_LENGTH) })).not.toBeNull()
    expect(parsePushRequest({ ...valid, box: 'A'.repeat(MAX_BOX_LENGTH + 4) })).toBeNull()
  })
})

describe('normalizeKeyP8', () => {
  it('restores newlines escaped by an environment variable', () => {
    expect(normalizeKeyP8(KEY_P8.replace(/\n/g, '\\n'))).toBe(KEY_P8.trim())
  })

  it('wraps a bare base64 body in its PEM armour', () => {
    const body = KEY_P8.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
    expect(normalizeKeyP8(body)).toBe(KEY_P8.trim())
  })
})

describe('providerToken', () => {
  beforeEach(() => resetProviderTokenCache())

  it('signs an ES256 JWT that the public key verifies', () => {
    const now = 1_760_000_000_000
    const jwt = providerToken({ keyP8: KEY_P8, keyId: 'KEY123', teamId: 'TEAM456', now })
    const [header, claims, signature] = jwt.split('.')

    expect(decode(header)).toEqual({ alg: 'ES256', kid: 'KEY123' })
    expect(decode(claims)).toEqual({ iss: 'TEAM456', iat: now / 1000 })

    const raw = Buffer.from(signature, 'base64url')
    expect(raw).toHaveLength(64) // r‖s, not DER
    expect(
      verify('sha256', Buffer.from(`${header}.${claims}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, raw),
    ).toBe(true)
  })

  it('accepts the key with escaped newlines', () => {
    const jwt = providerToken({ keyP8: KEY_P8.replace(/\n/g, '\\n'), keyId: 'K', teamId: 'T', now: 0 })
    expect(jwt.split('.')).toHaveLength(3)
  })

  it('reuses the token while it is fresh and remints it after 50 minutes', () => {
    const now = 1_760_000_000_000
    const first = providerToken({ keyP8: KEY_P8, keyId: 'K', teamId: 'T', now })
    expect(providerToken({ keyP8: KEY_P8, keyId: 'K', teamId: 'T', now: now + PROVIDER_TOKEN_TTL_MS - 1 })).toBe(first)

    const later = providerToken({ keyP8: KEY_P8, keyId: 'K', teamId: 'T', now: now + PROVIDER_TOKEN_TTL_MS })
    expect(later).not.toBe(first)
    expect(decode(later.split('.')[1]).iat).toBe((now + PROVIDER_TOKEN_TTL_MS) / 1000)
  })

  it('does not reuse a token minted for another key id or team', () => {
    const first = providerToken({ keyP8: KEY_P8, keyId: 'K', teamId: 'T', now: 0 })
    expect(providerToken({ keyP8: KEY_P8, keyId: 'K2', teamId: 'T', now: 0 })).not.toBe(first)
  })
})

describe('buildApnsPayload', () => {
  it('carries localisation keys and the sealed box, never text', () => {
    expect(buildApnsPayload({ macId: MAC, box: BOX, phoneId: PHONE })).toEqual({
      aps: {
        alert: { 'title-loc-key': 'push.fallback.title', 'loc-key': 'push.fallback.body' },
        'mutable-content': 1,
        sound: 'default',
        'thread-id': PHONE,
      },
      ms: { macId: MAC, box: BOX },
    })
  })

  it('stays under the APNs 4 KB limit with the largest box', () => {
    const payload = buildApnsPayload({ macId: MAC, box: 'A'.repeat(MAX_BOX_LENGTH), phoneId: PHONE })
    expect(Buffer.byteLength(JSON.stringify(payload))).toBeLessThan(4096)
  })
})

describe('apnsHost', () => {
  it('maps each environment to its gateway', () => {
    expect(apnsHost('production')).toBe('https://api.push.apple.com')
    expect(apnsHost('sandbox')).toBe('https://api.sandbox.push.apple.com')
  })
})

describe('isApnsToken', () => {
  it('accepts hex only', () => {
    expect(isApnsToken('ab'.repeat(32))).toBe(true)
    expect(isApnsToken('../3/device')).toBe(false)
    expect(isApnsToken(null)).toBe(false)
  })
})

describe('isDeadToken', () => {
  it('treats 410 and the token-level 400s as dead', () => {
    expect(isDeadToken(410, 'Unregistered')).toBe(true)
    expect(isDeadToken(410, null)).toBe(true)
    expect(isDeadToken(400, 'BadDeviceToken')).toBe(true)
    expect(isDeadToken(400, 'DeviceTokenNotForTopic')).toBe(true)
    expect(isDeadToken(400, 'Unregistered')).toBe(true)
  })

  it('keeps the row for everything that is not the token', () => {
    expect(isDeadToken(400, 'PayloadTooLarge')).toBe(false)
    expect(isDeadToken(400, undefined)).toBe(false)
    expect(isDeadToken(403, 'ExpiredProviderToken')).toBe(false)
    expect(isDeadToken(429, 'TooManyRequests')).toBe(false)
    expect(isDeadToken(500, 'InternalServerError')).toBe(false)
  })
})
