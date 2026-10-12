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
 *                                                  ├──────decline──▶ rejected (declined)
 *                                                  └──── 120 s ────▶ rejected (expired)
 *
 * The token is CONSUMED by the first request that opens, whatever follows: a declined phone
 * cannot try again with the same QR, nor can anyone who photographed it after it was scanned.
 * A request carrying an expired or already-used token is answered `pair-rejected` to ITS
 * sender only: the Mac's own screen (the QR and its refresh, or a confirmation) stays as it
 * was, so a phone holding an old QR cannot interrupt the pairing in progress (§7 step 3).
 * A box that does not open, and a token this Mac never issued, are ignored without a word and
 * consume nothing: whoever never saw the QR (it carries the Mac's key and the token) cannot
 * even burn it.
 */
export const TOKEN_TTL_MS = 60_000
/**
 * How long the confirmation stays approvable once the request opened (§7 step 6). Under the
 * phone's 180 s wait, so any approval the Mac can still give reaches a phone still listening.
 */
export const CONFIRM_TTL_MS = 120_000
const TOKEN_BYTES = 32
/**
 * Tokens remembered after they were replaced, so a phone that scanned one of them is told
 * `expired`. Bounded: a QR left up all afternoon issues one a minute, and one older than this
 * is no longer known, so it is ignored like any token never issued.
 */
const REMEMBERED_TOKENS = 32
const NAME_MAX = 64

export type PairingOutgoing =
  | { type: 'pair-accepted'; to: string; key: Buffer; body: PairAcceptedBody }
  | { type: 'pair-rejected'; to: string; reason: PairRejectReason }

/** The `pair-accepted` box (§4): names the request it answers and the pairing it creates. */
export interface PairAcceptedBody {
  macName: string
  /** The `epoch` of the `pair-request` envelope this answers. */
  requestEpoch: string
  /** The stored device's `pairedAt`: the pairing's name (§6). */
  pairedAt: number
}

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
  /** The request envelope's epoch, echoed back in `pair-accepted`. */
  requestEpoch: string
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
  private cancelConfirmDeadline: (() => void) | null = null
  /** When the confirmation was opened: approval is possible until CONFIRM_TTL_MS after it. */
  private confirmOpenedAt = 0
  /** The confirmation deadline passed while an approval was in flight: expire once it settles. */
  private expireAfterApproval = false
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
    this.stopConfirmDeadline()
    this.pending = null
    this.issued = []
  }

  private stopRefresh(): void {
    this.cancelRefresh?.()
    this.cancelRefresh = null
  }

  private stopConfirmDeadline(): void {
    this.cancelConfirmDeadline?.()
    this.cancelConfirmDeadline = null
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
    // Never issued (or long forgotten): ignored, like a box that does not open. Neither
    // reaches the screen, and nothing is said to a sender that never saw the current QR.
    if (!token) return
    let reason: PairRejectReason | null = null
    if (token.used) reason = 'used'
    else if (this.now() > token.exp) reason = 'expired'
    // Consumed on the first request that opens, whatever happens next.
    token.used = true

    if (reason || this.state.phase !== 'waiting') {
      // Answered to that sender only. The Mac's screen stays as it was: a QR keeps refreshing,
      // and a confirmation is never taken away from the user mid-decision.
      this.deps.send({ type: 'pair-rejected', to: phoneId, reason: reason ?? 'used' })
      return
    }

    const name = cleanName(body.name)
    this.pending = { phoneId, phonePub, name, key, requestEpoch: envelope.epoch }
    this.stopRefresh()
    this.confirmOpenedAt = this.now()
    this.expireAfterApproval = false
    this.cancelConfirmDeadline = this.setTimer(() => {
      this.cancelConfirmDeadline = null
      this.expireConfirmation()
    }, CONFIRM_TTL_MS)
    this.emit({
      phase: 'confirm',
      code: pairingCode(token.bytes, this.deps.macPublicRaw, phonePub),
      deviceName: name,
    })
  }

  /**
   * The confirmation's 120 s are up (§7 step 6): the phone is told `expired` and approval is
   * no longer possible. An approval already in flight is let finish (its `pair-accepted` still
   * reaches a phone that waits 180 s); if it fails, the confirmation expires then.
   */
  private expireConfirmation(): void {
    const phone = this.pending
    if (this.closed || this.state.phase !== 'confirm' || !phone) return
    if (this.approving) {
      this.expireAfterApproval = true
      return
    }
    this.deps.send({ type: 'pair-rejected', to: phone.phoneId, reason: 'expired' })
    this.close({ phase: 'rejected', reason: 'expired', deviceName: phone.name })
  }

  /** Whether the confirmation is past its deadline, whatever the timer has done yet. */
  private confirmationExpired(): boolean {
    return this.now() - this.confirmOpenedAt >= CONFIRM_TTL_MS
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
    // A late timer must not leave a window past the deadline: expired is expired.
    if (this.confirmationExpired()) {
      this.expireConfirmation()
      return
    }
    this.approving = true
    try {
      const pairedAt = this.now()
      this.deps.storeDevice({
        phoneId: phone.phoneId,
        name: phone.name,
        pub: phone.phonePub.toString('base64'),
        pairedAt,
      })
      try {
        await this.deps.send({
          type: 'pair-accepted',
          to: phone.phoneId,
          key: phone.key,
          body: { macName: this.deps.macName, requestEpoch: phone.requestEpoch, pairedAt },
        })
      } catch (error) {
        this.deps.forgetDevice?.(phone.phoneId)
        throw error
      }
      this.close({ phase: 'paired', deviceName: phone.name })
    } finally {
      this.approving = false
      if (this.expireAfterApproval) {
        this.expireAfterApproval = false
        this.expireConfirmation()
      }
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
    this.stopConfirmDeadline()
    this.pending = null
    this.emit(final)
    this.issued = []
  }
}
