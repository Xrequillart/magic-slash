import { describe, expect, it } from 'vitest'
import vectors from './relay-vectors.json'
import {
  aadFor,
  deriveKey,
  generateKeyPair,
  open,
  pairingCode,
  privateKeyFromRaw,
  privateRawOf,
  publicKeyFromRaw,
  publicRawOf,
  seal,
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
