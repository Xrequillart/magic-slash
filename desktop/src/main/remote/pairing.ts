import * as crypto from 'crypto'
import type { RemotePairing } from '../../types'
import { deriveKey, pairingCode } from './crypto'
import { openEnvelope, UUID_RE, type PairRejectReason, type RelayEnvelope } from './envelope'
import type { StoredRemoteDevice } from './identity-store'

/**
 * One pairing, Mac side (PROTOCOL.md §7). A state machine with every edge injected (time,
 * timers, what is sent, where the device is stored), so the rules the ticket names — 60 s,
 * single use, approval on the Mac only — are tested without a channel or a keychain.
 *
 *   waiting ──request that opens, live token──▶ confirm ──approve──▶ paired
 *      │                                           └──────decline──▶ rejected (declined)
 *      └──request that opens, stale/used token──▶ rejected (expired | used)
 *
 * The token is CONSUMED by the first request that opens, whatever follows: a declined phone
 * cannot try again with the same QR, nor can anyone who photographed it after it was scanned.
 * A box that does not open is ignored without a word and consumes nothing: whoever never saw
 * the QR (it carries the Mac's key and the token) cannot even burn it.
 */
export const TOKEN_TTL_MS = 60_000
const TOKEN_BYTES = 32
/**
 * Tokens remembered after they were replaced, so a phone that scanned one of them is told
 * `expired` rather than `used`. Bounded: a QR left up all afternoon issues one a minute, and
 * one older than this is answered `used`, which is just as final.
 */
const REMEMBERED_TOKENS = 32
const NAME_MAX = 64

export type PairingOutgoing =
  | { type: 'pair-accepted'; to: string; key: Buffer; body: { macName: string } }
  | { type: 'pair-rejected'; to: string; reason: PairRejectReason }

export interface PairingDeps {
  macId: string
  macPrivate: crypto.KeyObject
  macPublicRaw: Buffer
  macName: string
  /** Every change of what the pairing screen shows. */
  onChange: (pairing: RemotePairing) => void
  /**
   * Put a message on the wire. The `pair-accepted` one is awaited: it rejects when the phone
   * cannot be told (relay not live, send refused), and the approval fails with it.
   */
  send: (message: PairingOutgoing) => void | Promise<void>
  /** Store the approved phone. May throw (no keychain): the approval then fails, unsent. */
  storeDevice: (device: StoredRemoteDevice) => void
  /** Undo `storeDevice` when the `pair-accepted` could not be sent. */
  forgetDevice?: (phoneId: string) => void
  now?: () => number
  /** Arm a timer; returns its cancel. */
  setTimer?: (fn: () => void, ms: number) => () => void
  randomBytes?: (n: number) => Buffer
}

interface IssuedToken {
  bytes: Buffer
  exp: number
  used: boolean
}

interface PendingPhone {
  phoneId: string
  phonePub: Buffer
  name: string
  key: Buffer
}

function defaultTimer(fn: () => void, ms: number): () => void {
  const timer = setTimeout(fn, ms)
  // Never hold the process open for a QR nobody is looking at (matters in tests/teardown).
  timer.unref?.()
  return () => clearTimeout(timer)
}

/** A phone's name, as the phone sent it: printable, trimmed, bounded. */
function cleanName(value: unknown): string {
  const text = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').trim() : ''
  return (text || 'iPhone').slice(0, NAME_MAX)
}

export class PairingSession {
  private readonly deps: PairingDeps
  private readonly now: () => number
  private readonly setTimer: (fn: () => void, ms: number) => () => void
  private readonly randomBytes: (n: number) => Buffer
  private issued: IssuedToken[] = []
  private pending: PendingPhone | null = null
  private cancelRefresh: (() => void) | null = null
  private state: RemotePairing = { phase: 'waiting' }
  private closed = false
  private approving = false

  constructor(deps: PairingDeps) {
    this.deps = deps
    this.now = deps.now ?? Date.now
    this.setTimer = deps.setTimer ?? defaultTimer
    this.randomBytes = deps.randomBytes ?? crypto.randomBytes
  }

  /** What the pairing screen should show now. */
  get current(): RemotePairing {
    return this.state
  }

  /** Put the first QR up. */
  start(): RemotePairing {
    this.issueToken()
    return this.state
  }

  /** Close the pairing, wherever it stands. Nothing is sent: the phone times out on its own. */
  cancel(): void {
    this.closed = true
    this.stopRefresh()
    this.pending = null
    this.issued = []
  }

  private stopRefresh(): void {
    this.cancelRefresh?.()
    this.cancelRefresh = null
  }

  private emit(next: RemotePairing): void {
    this.state = next
    if (!this.closed) this.deps.onChange(next)
  }

  /** A fresh token, and the QR that carries it. Re-armed on expiry for as long as the QR is up. */
  private issueToken(): void {
    if (this.closed || this.state.phase !== 'waiting') return
    const token: IssuedToken = { bytes: this.randomBytes(TOKEN_BYTES), exp: this.now() + TOKEN_TTL_MS, used: false }
    this.issued = [...this.issued, token].slice(-REMEMBERED_TOKENS)
    const qr = JSON.stringify({
      v: 1,
      macId: this.deps.macId,
      name: this.deps.macName,
      pub: this.deps.macPublicRaw.toString('base64'),
      token: token.bytes.toString('base64url'),
      exp: token.exp,
    })
    this.emit({ phase: 'waiting', qr, expiresAt: token.exp })
    this.stopRefresh()
    this.cancelRefresh = this.setTimer(() => {
      this.cancelRefresh = null
      this.issueToken()
    }, TOKEN_TTL_MS)
  }

  /** The issued token equal to `candidate`, compared in constant time against every one. */
  private findToken(candidate: Buffer): IssuedToken | null {
    let found: IssuedToken | null = null
    for (const token of this.issued) {
      // Lengths first: timingSafeEqual throws on a mismatch, and a token's length is public.
      if (candidate.length === token.bytes.length && crypto.timingSafeEqual(candidate, token.bytes)) found = token
    }
    return found
  }

  /**
   * A `pair-request` addressed to this Mac. Returns nothing: every outcome is either an
   * envelope sent back or silence.
   */
  handleRequest(envelope: RelayEnvelope): void {
    if (this.closed || envelope.type !== 'pair-request' || envelope.to !== this.deps.macId) return
    // Past `waiting` only a replay or a second phone can arrive: one confirmation at a time,
    // and the token it would carry is already consumed (answered below, screen untouched).
    if (this.state.phase !== 'waiting' && this.state.phase !== 'confirm') return
    const phoneId = envelope.from
    if (!UUID_RE.test(phoneId) || !envelope.phonePub) return

    const phonePub = Buffer.from(envelope.phonePub, 'base64')
    let key: Buffer
    try {
      key = deriveKey(this.deps.macPrivate, phonePub, this.deps.macId, phoneId)
    } catch {
      return // Not a P-256 point: nobody who scanned the QR sent this.
    }
    const body = openEnvelope(envelope, key) as { token?: unknown; name?: unknown } | null
    // A box that does not open is ignored, and consumes nothing (see the header).
    if (!body || typeof body !== 'object' || typeof body.token !== 'string') return

    const token = this.findToken(Buffer.from(body.token, 'base64url'))
    let reason: PairRejectReason | null = null
    if (!token || token.used) reason = 'used'
    else if (this.now() > token.exp) reason = 'expired'
    // Consumed on the first request that opens, whatever happens next.
    if (token) token.used = true

    if (reason || this.state.phase !== 'waiting') {
      this.deps.send({ type: 'pair-rejected', to: phoneId, reason: reason ?? 'used' })
      // A confirmation on screen is never disturbed by another request: that would let a
      // replay of the first one take the code away from the user mid-decision.
      if (this.state.phase === 'waiting') this.close({ phase: 'rejected', reason: reason ?? 'used' })
      return
    }

    const name = cleanName(body.name)
    this.pending = { phoneId, phonePub, name, key }
    this.stopRefresh()
    this.emit({
      phase: 'confirm',
      code: pairingCode(token!.bytes, this.deps.macPublicRaw, phonePub),
      deviceName: name,
    })
  }

  /**
   * The user approved the code on screen: store the phone, then tell it. Stored FIRST, so a
   * keychain that refuses fails the approval before the phone believes it is paired. A
   * `pair-accepted` that cannot be sent takes the phone out again: the Mac must not list a
   * phone that never learnt it was paired. Either failure rejects and leaves the
   * confirmation on screen.
   */
  async approve(): Promise<void> {
    const phone = this.pending
    if (this.closed || this.approving || this.state.phase !== 'confirm' || !phone) return
    this.approving = true
    try {
      this.deps.storeDevice({
        phoneId: phone.phoneId,
        name: phone.name,
        pub: phone.phonePub.toString('base64'),
        pairedAt: this.now(),
      })
      try {
        await this.deps.send({ type: 'pair-accepted', to: phone.phoneId, key: phone.key, body: { macName: this.deps.macName } })
      } catch (error) {
        this.deps.forgetDevice?.(phone.phoneId)
        throw error
      }
      this.close({ phase: 'paired', deviceName: phone.name })
    } finally {
      this.approving = false
    }
  }

  /** The user declined: the phone is told, and the token stays spent. */
  decline(): void {
    const phone = this.pending
    if (this.closed || this.approving || this.state.phase !== 'confirm' || !phone) return
    this.deps.send({ type: 'pair-rejected', to: phone.phoneId, reason: 'declined' })
    this.close({ phase: 'rejected', reason: 'declined', deviceName: phone.name })
  }

  /** A final phase: shown until the screen closes, and nothing else is accepted. */
  private close(final: RemotePairing): void {
    this.stopRefresh()
    this.pending = null
    this.emit(final)
    this.issued = []
  }
}
