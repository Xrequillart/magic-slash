import { aadFor, open, seal, type EnvelopeHeader } from './crypto'

/**
 * The relay envelope (PROTOCOL.md §4), shared by the pairing and the relay. Only the shape
 * lives here; the crypto is `crypto.ts`'s.
 */
const RELAY_MESSAGE_TYPES = [
  'pair-request',
  'pair-accepted',
  'pair-rejected',
  'state',
  'revoked',
  'command',
  'command-result',
  'chat-request',
  'chat',
  'state-request',
  'commands',
  'push-key',
] as const

export type RelayMessageType = (typeof RELAY_MESSAGE_TYPES)[number]

export type PairRejectReason = 'expired' | 'used' | 'declined'

export interface RelayEnvelope extends EnvelopeHeader {
  v: 1
  type: RelayMessageType
  /** Absent only on `pair-rejected`. */
  box?: string
  /** `pair-request` only: the phone's X9.63 point, standard base64, in clear. */
  phonePub?: string
  /** `pair-rejected` only. */
  reason?: PairRejectReason
}

/** A lowercase UUID: every id in the protocol (user, Mac, phone) is one. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const TYPES: ReadonlySet<string> = new Set(RELAY_MESSAGE_TYPES)
const REASONS: ReadonlySet<string> = new Set(['expired', 'used', 'declined'])

/**
 * A broadcast payload as an envelope, or null. Everything on the channel comes from clients
 * this Mac does not control (any of the account's sessions may send), so the shape is
 * checked field by field before anything reads it.
 */
export function parseEnvelope(payload: unknown): RelayEnvelope | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Record<string, unknown>
  if (p.v !== 1 || typeof p.type !== 'string' || !TYPES.has(p.type)) return null
  if (typeof p.from !== 'string' || typeof p.to !== 'string' || typeof p.epoch !== 'string') return null
  if (typeof p.seq !== 'number' || !Number.isSafeInteger(p.seq) || p.seq < 1) return null
  if (p.box !== undefined && typeof p.box !== 'string') return null
  if (p.phonePub !== undefined && typeof p.phonePub !== 'string') return null
  if (p.reason !== undefined && (typeof p.reason !== 'string' || !REASONS.has(p.reason))) return null
  return {
    v: 1,
    type: p.type as RelayMessageType,
    from: p.from,
    to: p.to,
    epoch: p.epoch,
    seq: p.seq,
    ...(typeof p.box === 'string' ? { box: p.box } : {}),
    ...(typeof p.phonePub === 'string' ? { phonePub: p.phonePub } : {}),
    ...(typeof p.reason === 'string' ? { reason: p.reason as PairRejectReason } : {}),
  }
}

/** Seal `body` (JSON) under `key` for this header. */
export function sealEnvelope(header: EnvelopeHeader & { type: RelayMessageType }, key: Buffer, body: unknown): RelayEnvelope {
  const box = seal(key, Buffer.from(JSON.stringify(body), 'utf8'), aadFor(header))
  return { v: 1, ...header, box: box.toString('base64') }
}

/** The box's JSON, or null when there is none or it does not open under `key`. */
export function openEnvelope(envelope: RelayEnvelope, key: Buffer): unknown | null {
  if (!envelope.box) return null
  const plain = open(key, Buffer.from(envelope.box, 'base64'), aadFor(envelope))
  if (!plain) return null
  try {
    return JSON.parse(plain.toString('utf8'))
  } catch {
    return null
  }
}
