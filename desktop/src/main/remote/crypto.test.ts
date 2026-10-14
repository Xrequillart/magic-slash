import { describe, expect, it } from 'vitest'
import vectors from './relay-vectors.json'
import {
  aadFor,
  deriveKey,
  generateKeyPair,
  open,
  openPush,
  pairingCode,
  privateKeyFromRaw,
  privateRawOf,
  publicKeyFromRaw,
  publicRawOf,
  pushAad,
  seal,
  sealPush,
  sign,
  verifySignature,
} from './crypto'

const hex = (s: string) => Buffer.from(s, 'hex')

// The fixture is the contract with the iPhone: ios/relay/main.swift replays the same file
// against RelayCrypto.swift (`npm run ios:relay-check`). If one of these fails, the phone and
// the Mac no longer understand each other.
describe('relay vectors', () => {
  const macPriv = privateKeyFromRaw(hex(vectors.macPrivate))
  const phonePriv = privateKeyFromRaw(hex(vectors.phonePrivate))

  it('round-trips the raw key encodings', () => {
    expect(publicRawOf(macPriv).toString('hex')).toBe(vectors.macPublic)
    expect(privateRawOf(phonePriv).toString('hex')).toBe(vectors.phonePrivate)
  })

  it('derives the same key on both sides, whatever the uuid case', () => {
    expect(deriveKey(macPriv, hex(vectors.phonePublic), vectors.macId, vectors.phoneId).toString('hex')).toBe(vectors.key)
    expect(deriveKey(phonePriv, hex(vectors.macPublic), vectors.macId.toUpperCase(), vectors.phoneId).toString('hex')).toBe(vectors.key)
  })

  it('builds the aad and reproduces the box', () => {
    const aad = aadFor(vectors.header)
    expect(aad.toString('utf8')).toBe(vectors.aad)
    const box = seal(hex(vectors.key), Buffer.from(vectors.plaintext, 'utf8'), aad, hex(vectors.nonce))
    expect(box.toString('base64')).toBe(vectors.box)
    expect(open(hex(vectors.key), box, aad)?.toString('utf8')).toBe(vectors.plaintext)
  })

  it('computes the pairing code', () => {
    expect(pairingCode(Buffer.from(vectors.token, 'base64url'), hex(vectors.macPublic), hex(vectors.phonePublic))).toBe(vectors.pairingCode)
  })

  it('verifies the command signature over the exact payload bytes', () => {
    expect(publicRawOf(privateKeyFromRaw(hex(vectors.signPrivate))).toString('hex')).toBe(vectors.signPublic)
    const payload = Buffer.from(vectors.signedPayload, 'utf8')
    expect(verifySignature(hex(vectors.signPublic), payload, Buffer.from(vectors.signature, 'base64'))).toBe(true)
  })

  it('verifies a signature CryptoKit made, the direction a command travels', () => {
    const payload = Buffer.from(vectors.signedPayload, 'utf8')
    expect(verifySignature(hex(vectors.signPublic), payload, Buffer.from(vectors.signatureCryptoKit, 'base64'))).toBe(true)
  })

  it('builds the push aad and reproduces the push box, whatever the uuid case', () => {
    const kind = vectors.kind as 'waiting' | 'completed'
    const aad = pushAad({ macId: vectors.macId.toUpperCase(), phoneId: vectors.phoneId, pairingId: vectors.pairingId, kind })
    expect(aad.toString('utf8')).toBe(vectors.pushAad)
    const box = sealPush(hex(vectors.pushKey), Buffer.from(vectors.pushPlaintext, 'utf8'), aad, hex(vectors.pushNonce))
    expect(box.toString('base64')).toBe(vectors.pushBox)
    expect(openPush(hex(vectors.pushKey), box, aad)?.toString('utf8')).toBe(vectors.pushPlaintext)
  })
})

describe('verifySignature', () => {
  const pub = hex(vectors.signPublic)
  const payload = Buffer.from(vectors.signedPayload, 'utf8')
  const signature = Buffer.from(vectors.signature, 'base64')

  it('refuses a tampered payload, a tampered signature and another key', () => {
    const tampered = Buffer.from(payload)
    tampered[10] ^= 1
    expect(verifySignature(pub, tampered, signature)).toBe(false)
    const badSig = Buffer.from(signature)
    badSig[5] ^= 1
    expect(verifySignature(pub, payload, badSig)).toBe(false)
    expect(verifySignature(hex(vectors.phonePublic), payload, signature)).toBe(false)
  })

  it('refuses a DER signature, a truncated one and a key that is not a point', () => {
    expect(verifySignature(pub, payload, signature.subarray(0, 63))).toBe(false)
    expect(verifySignature(pub, payload, Buffer.alloc(72))).toBe(false)
    expect(verifySignature(Buffer.alloc(65), payload, signature)).toBe(false)
  })

  it('a fresh signature verifies', () => {
    const k = generateKeyPair()
    expect(verifySignature(k.publicRaw, payload, sign(k.privateKey, payload))).toBe(true)
  })
})

describe('open', () => {
  const key = hex(vectors.key)
  const box = Buffer.from(vectors.box, 'base64')
  const aad = aadFor(vectors.header)

  it('refuses a box replayed under another header', () => {
    expect(open(key, box, aadFor({ ...vectors.header, seq: vectors.header.seq + 1 }))).toBeNull()
  })

  it('refuses a tampered box, a wrong key and a truncated payload', () => {
    const tampered = Buffer.from(box)
    tampered[20] ^= 1
    expect(open(key, tampered, aad)).toBeNull()
    expect(open(Buffer.alloc(32), box, aad)).toBeNull()
    expect(open(key, box.subarray(0, 20), aad)).toBeNull()
  })
})

describe('openPush', () => {
  const key = hex(vectors.pushKey)
  const box = Buffer.from(vectors.pushBox, 'base64')
  const parts = { macId: vectors.macId, phoneId: vectors.phoneId, pairingId: vectors.pairingId, kind: 'waiting' as const }

  it('refuses a box moved to another kind, pairing or phone', () => {
    expect(openPush(key, box, pushAad({ ...parts, kind: 'completed' }))).toBeNull()
    expect(openPush(key, box, pushAad({ ...parts, pairingId: vectors.header.epoch }))).toBeNull()
    expect(openPush(key, box, pushAad({ ...parts, phoneId: vectors.macId }))).toBeNull()
  })

  it('refuses the pair key, a tampered box and a key of the wrong size', () => {
    const aad = pushAad(parts)
    expect(openPush(hex(vectors.key), box, aad)).toBeNull()
    const tampered = Buffer.from(box)
    tampered[20] ^= 1
    expect(openPush(key, tampered, aad)).toBeNull()
    expect(openPush(key.subarray(0, 16), box, aad)).toBeNull()
    expect(() => sealPush(key.subarray(0, 16), Buffer.from('x'), aad)).toThrow()
  })
})

describe('keys', () => {
  it('a fresh pair derives the same key from either side', () => {
    const a = generateKeyPair()
    const b = generateKeyPair()
    expect(deriveKey(a.privateKey, b.publicRaw, 'm', 'p').equals(deriveKey(b.privateKey, a.publicRaw, 'm', 'p'))).toBe(true)
  })

  it('rejects a public key that is not an X9.63 P-256 point', () => {
    expect(() => publicKeyFromRaw(Buffer.alloc(65))).toThrow()
    expect(() => publicKeyFromRaw(Buffer.alloc(33, 2))).toThrow()
    const offCurve = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)])
    expect(() => publicKeyFromRaw(offCurve)).toThrow()
  })
})
