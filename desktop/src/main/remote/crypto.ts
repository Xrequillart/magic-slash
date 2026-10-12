import * as crypto from 'crypto'

/**
 * The relay's cryptography, byte for byte what `ios/MagicSlash/Remote/RelayCrypto.swift`
 * does with CryptoKit. `PROTOCOL.md` (next to this file) is the contract; `relay-vectors.json`
 * pins it, and both this module's tests and the Swift check replay that fixture.
 *
 * P-256 everywhere, because it is the only curve the iPhone's Secure Enclave holds. Keys
 * travel as X9.63 uncompressed points (65 bytes, `04‖X‖Y`), the `x963Representation` of
 * CryptoKit; Node has no raw import for EC public keys, so they go through a JWK.
 */

export const HKDF_INFO = 'magic-slash relay v1'
const NONCE_BYTES = 12
const TAG_BYTES = 16

export interface RelayKeyPair {
  privateKey: crypto.KeyObject
  /** X9.63 uncompressed public point, 65 bytes. */
  publicRaw: Buffer
}

function b64urlToBuffer(s: string): Buffer {
  return Buffer.from(s, 'base64url')
}

export function generateKeyPair(): RelayKeyPair {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' })
  return { privateKey, publicRaw: publicRawOf(publicKey) }
}

/** The X9.63 point of a public (or private) EC key. */
export function publicRawOf(key: crypto.KeyObject): Buffer {
  const jwk = (key.type === 'private' ? crypto.createPublicKey(key) : key).export({ format: 'jwk' })
  return Buffer.concat([Buffer.from([4]), b64urlToBuffer(jwk.x as string), b64urlToBuffer(jwk.y as string)])
}

/** Throws on anything that is not a point of P-256 — a forged key never reaches ECDH. */
export function publicKeyFromRaw(raw: Buffer): crypto.KeyObject {
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('relay: not an X9.63 P-256 public key')
  return crypto.createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: raw.subarray(1, 33).toString('base64url'),
      y: raw.subarray(33, 65).toString('base64url'),
    },
    format: 'jwk',
  })
}

/** The private scalar `d`, 32 bytes — CryptoKit's `rawRepresentation`. */
export function privateRawOf(key: crypto.KeyObject): Buffer {
  return b64urlToBuffer(key.export({ format: 'jwk' }).d as string)
}

export function privateKeyFromRaw(d: Buffer): crypto.KeyObject {
  // The public half is required by the JWK import; derive it from d with ECDH.
  const ecdh = crypto.createECDH('prime256v1')
  ecdh.setPrivateKey(d)
  const pub = ecdh.getPublicKey()
  return crypto.createPrivateKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      d: d.toString('base64url'),
      x: pub.subarray(1, 33).toString('base64url'),
      y: pub.subarray(33, 65).toString('base64url'),
    },
    format: 'jwk',
  })
}

/**
 * The symmetric key a Mac and one phone share. ECDH gives the X coordinate (32 bytes, what
 * CryptoKit's `SharedSecret` holds); HKDF-SHA256 with salt `macId‖phoneId` (lower-case UUID
 * strings, UTF-8) and info `magic-slash relay v1` stretches it to an AES-256 key. Either
 * side computes the same key from its own private key and the other's public point.
 */
export function deriveKey(privateKey: crypto.KeyObject, peerPublicRaw: Buffer, macId: string, phoneId: string): Buffer {
  const shared = crypto.diffieHellman({ privateKey, publicKey: publicKeyFromRaw(peerPublicRaw) })
  const salt = Buffer.from(macId.toLowerCase() + phoneId.toLowerCase(), 'utf8')
  return Buffer.from(crypto.hkdfSync('sha256', shared, salt, Buffer.from(HKDF_INFO, 'utf8'), 32))
}

export interface EnvelopeHeader {
  type: string
  from: string
  to: string
  epoch: string
  seq: number
}

/** `v1|type|from|to|epoch|seq` in UTF-8: what the AES-GCM tag authenticates beside the box. */
export function aadFor(h: EnvelopeHeader): Buffer {
  return Buffer.from(`v1|${h.type}|${h.from}|${h.to}|${h.epoch}|${h.seq}`, 'utf8')
}

/** AES-256-GCM, returned as CryptoKit's `combined`: nonce(12) ‖ ciphertext ‖ tag(16). */
export function seal(key: Buffer, plaintext: Buffer, aad: Buffer, nonce: Buffer = crypto.randomBytes(NONCE_BYTES)): Buffer {
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(aad)
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return Buffer.concat([nonce, ct, cipher.getAuthTag()])
}

/** Null on any failure — a wrong key, a tampered box or header, a truncated payload. */
export function open(key: Buffer, combined: Buffer, aad: Buffer): Buffer | null {
  if (combined.length < NONCE_BYTES + TAG_BYTES) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, combined.subarray(0, NONCE_BYTES))
    decipher.setAAD(aad)
    decipher.setAuthTag(combined.subarray(combined.length - TAG_BYTES))
    return Buffer.concat([decipher.update(combined.subarray(NONCE_BYTES, combined.length - TAG_BYTES)), decipher.final()])
  } catch {
    return null
  }
}

/**
 * The 4-digit code both screens show: SHA-256(token ‖ macPub ‖ phonePub), first 4 bytes as
 * a big-endian UInt32, mod 10000, zero-padded. The token is the 32 raw bytes from the QR.
 */
export function pairingCode(token: Buffer, macPublicRaw: Buffer, phonePublicRaw: Buffer): string {
  const digest = crypto.createHash('sha256').update(token).update(macPublicRaw).update(phonePublicRaw).digest()
  return String(digest.readUInt32BE(0) % 10000).padStart(4, '0')
}
