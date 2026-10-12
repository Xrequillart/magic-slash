import * as crypto from 'crypto'
import { beforeEach, describe, expect, it } from 'vitest'
import type { RemotePairing } from '../../types'
import { deriveKey, generateKeyPair, pairingCode, type RelayKeyPair } from './crypto'
import { openEnvelope, sealEnvelope, type RelayEnvelope } from './envelope'
import type { StoredRemoteDevice } from './identity-store'
import { PairingSession, TOKEN_TTL_MS, type PairingOutgoing } from './pairing'

// The phone is simulated with crypto.ts itself, which the vectors pin to the Swift side: a
// request built here is byte for byte one the iPhone would send.

const MAC_ID = '11111111-1111-4111-8111-111111111111'

interface Phone {
  id: string
  keys: RelayKeyPair
  key: Buffer
}

let mac: RelayKeyPair
let now: number
let timers: { fn: () => void; at: number; cancelled: boolean }[]
let screens: RemotePairing[]
let sent: PairingOutgoing[]
let stored: StoredRemoteDevice[]
let session: PairingSession

function makePhone(macKeys = mac): Phone {
  const id = crypto.randomUUID()
  const keys = generateKeyPair()
  return { id, keys, key: deriveKey(keys.privateKey, macKeys.publicRaw, MAC_ID, id) }
}

function qr(): { token: string; exp: number; pub: string; macId: string; name: string } {
  return JSON.parse(session.current.qr!)
}

function request(phone: Phone, token: string, opts: { key?: Buffer; name?: string } = {}): RelayEnvelope {
  const header = { type: 'pair-request' as const, from: phone.id, to: MAC_ID, epoch: crypto.randomUUID(), seq: 1 }
  return {
    ...sealEnvelope(header, opts.key ?? phone.key, { token, name: opts.name ?? "Xavier's iPhone" }),
    phonePub: phone.keys.publicRaw.toString('base64'),
  }
}

/** Run the timers that are due by `now`. */
function advance(ms: number): void {
  now += ms
  for (const t of [...timers]) {
    if (!t.cancelled && t.at <= now) {
      t.cancelled = true
      t.fn()
    }
  }
}

beforeEach(() => {
  mac = generateKeyPair()
  now = 1_760_000_000_000
  timers = []
  screens = []
  sent = []
  stored = []
  session = new PairingSession({
    macId: MAC_ID,
    macPrivate: mac.privateKey,
    macPublicRaw: mac.publicRaw,
    macName: 'MacBook Pro',
    onChange: (p) => screens.push(p),
    send: (m) => { sent.push(m) },
    storeDevice: (d) => stored.push(d),
    now: () => now,
    setTimer: (fn, ms) => {
      const t = { fn, at: now + ms, cancelled: false }
      timers.push(t)
      return () => { t.cancelled = true }
    },
  })
  session.start()
})

describe('the QR', () => {
  it('carries the protocol fields and a 60 s, 32-byte token', () => {
    const code = qr()
    expect(code).toMatchObject({ v: 1, macId: MAC_ID, name: 'MacBook Pro', pub: mac.publicRaw.toString('base64'), exp: now + TOKEN_TTL_MS })
    expect(Buffer.from(code.token, 'base64url')).toHaveLength(32)
    expect(session.current).toMatchObject({ phase: 'waiting', expiresAt: now + TOKEN_TTL_MS })
  })

  it('is replaced by a fresh token on expiry', () => {
    const first = qr().token
    advance(TOKEN_TTL_MS)
    expect(session.current.phase).toBe('waiting')
    expect(qr().token).not.toBe(first)
    expect(screens).toHaveLength(2)
  })
})

describe('a request', () => {
  it('that opens with the live token asks for confirmation with the shared code', () => {
    const phone = makePhone()
    const token = qr().token
    session.handleRequest(request(phone, token))
    const expected = pairingCode(Buffer.from(token, 'base64url'), mac.publicRaw, phone.keys.publicRaw)
    expect(session.current).toEqual({ phase: 'confirm', code: expected, deviceName: "Xavier's iPhone" })
    expect(sent).toEqual([])
  })

  it('carrying an expired token is rejected as expired', () => {
    const token = qr().token
    advance(TOKEN_TTL_MS + 1)
    const phone = makePhone()
    session.handleRequest(request(phone, token))
    expect(sent).toEqual([{ type: 'pair-rejected', to: phone.id, reason: 'expired' }])
    expect(session.current).toMatchObject({ phase: 'rejected', reason: 'expired' })
  })

  it('is rejected as expired a millisecond past 60 s even before the refresh fires', () => {
    const token = qr().token
    now += TOKEN_TTL_MS + 1
    const phone = makePhone()
    session.handleRequest(request(phone, token))
    expect(sent[0]).toMatchObject({ type: 'pair-rejected', reason: 'expired' })
  })

  it('carrying a token already used is rejected as used, and the confirmation stays', () => {
    const token = qr().token
    session.handleRequest(request(makePhone(), token))
    const confirm = session.current
    const second = makePhone()
    session.handleRequest(request(second, token))
    expect(sent).toEqual([{ type: 'pair-rejected', to: second.id, reason: 'used' }])
    expect(session.current).toEqual(confirm)
  })

  it('carrying a token that was never issued is rejected as used', () => {
    const phone = makePhone()
    session.handleRequest(request(phone, crypto.randomBytes(32).toString('base64url')))
    expect(sent).toEqual([{ type: 'pair-rejected', to: phone.id, reason: 'used' }])
  })

  it('that does not open is ignored and does NOT consume the token', () => {
    const token = qr().token
    const stranger = makePhone(generateKeyPair()) // derived against another Mac key
    session.handleRequest(request(stranger, token))
    expect(sent).toEqual([])
    expect(session.current.phase).toBe('waiting')
    // The real phone still pairs with the same QR.
    session.handleRequest(request(makePhone(), token))
    expect(session.current.phase).toBe('confirm')
  })

  it('addressed to another Mac, or with a bogus key, is ignored', () => {
    const phone = makePhone()
    session.handleRequest({ ...request(phone, qr().token), to: '22222222-2222-4222-8222-222222222222' })
    session.handleRequest({ ...request(phone, qr().token), phonePub: Buffer.alloc(65).toString('base64') })
    expect(sent).toEqual([])
    expect(session.current.phase).toBe('waiting')
  })
})

describe('the decision', () => {
  it('approve stores the device and sends a pair-accepted the phone can open', async () => {
    const phone = makePhone()
    session.handleRequest(request(phone, qr().token))
    await session.approve()
    expect(stored).toEqual([{ phoneId: phone.id, name: "Xavier's iPhone", pub: phone.keys.publicRaw.toString('base64'), pairedAt: now }])
    expect(sent).toHaveLength(1)
    const accepted = sent[0] as Extract<PairingOutgoing, { type: 'pair-accepted' }>
    expect(accepted).toMatchObject({ type: 'pair-accepted', to: phone.id })
    // As the relay would put it on the wire, then opened with the phone's own derivation.
    const envelope = sealEnvelope({ type: 'pair-accepted', from: MAC_ID, to: phone.id, epoch: crypto.randomUUID(), seq: 1 }, accepted.key, accepted.body)
    expect(openEnvelope(envelope, phone.key)).toEqual({ macName: 'MacBook Pro' })
    expect(session.current).toEqual({ phase: 'paired', deviceName: "Xavier's iPhone" })
  })

  it('approve that cannot store fails before anything is sent', async () => {
    const failing = new PairingSession({
      macId: MAC_ID,
      macPrivate: mac.privateKey,
      macPublicRaw: mac.publicRaw,
      macName: 'MacBook Pro',
      onChange: () => {},
      send: (m) => { sent.push(m) },
      storeDevice: () => { throw new Error('no keychain') },
    })
    failing.start()
    const token = JSON.parse(failing.current.qr!).token
    failing.handleRequest(request(makePhone(), token))
    await expect(failing.approve()).rejects.toThrow('no keychain')
    expect(sent).toEqual([])
    failing.cancel()
  })

  it('approve whose pair-accepted cannot be sent forgets the device and stays on the confirmation', async () => {
    const forgotten: string[] = []
    let refuse = true
    const failing = new PairingSession({
      macId: MAC_ID,
      macPrivate: mac.privateKey,
      macPublicRaw: mac.publicRaw,
      macName: 'MacBook Pro',
      onChange: () => {},
      send: async (m) => {
        if (refuse) throw new Error('relay not live')
        sent.push(m)
      },
      storeDevice: (d) => stored.push(d),
      forgetDevice: (id) => forgotten.push(id),
    })
    failing.start()
    const phone = makePhone()
    failing.handleRequest(request(phone, JSON.parse(failing.current.qr!).token))
    await expect(failing.approve()).rejects.toThrow('relay not live')
    expect(stored.map((d) => d.phoneId)).toEqual([phone.id])
    expect(forgotten).toEqual([phone.id])
    expect(sent).toEqual([])
    expect(failing.current.phase).toBe('confirm')
    // Once the relay is back, the same confirmation can be approved.
    refuse = false
    await failing.approve()
    expect(sent).toMatchObject([{ type: 'pair-accepted', to: phone.id }])
    expect(failing.current.phase).toBe('paired')
  })

  it('decline sends pair-rejected declined and keeps the token spent', () => {
    const phone = makePhone()
    const token = qr().token
    session.handleRequest(request(phone, token))
    session.decline()
    expect(sent).toEqual([{ type: 'pair-rejected', to: phone.id, reason: 'declined' }])
    expect(stored).toEqual([])
    expect(session.current).toMatchObject({ phase: 'rejected', reason: 'declined' })
    session.handleRequest(request(phone, token))
    expect(sent).toHaveLength(1)
  })

  it('cancel stops the refresh and ignores every later request', () => {
    const token = qr().token
    session.cancel()
    const count = screens.length
    advance(TOKEN_TTL_MS * 2)
    session.handleRequest(request(makePhone(), token))
    expect(screens).toHaveLength(count)
    expect(sent).toEqual([])
  })
})
