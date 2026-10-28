import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { safeStorage } from 'electron'
import { CONFIG_DIR } from '../config/paths'
import { generateKeyPair, privateRawOf } from './crypto'
import { UUID_RE } from './envelope'

/**
 * This Mac's relay identity and the phones paired with it (PROTOCOL.md §3), at rest.
 *
 * ONE FILE PER ACCOUNT, `remote-<userId>.enc`: a phone is paired with an account on this
 * Mac, and whoever signs in next must neither see that phone nor seal anything for it. The
 * identity follows the same rule, so two accounts on one Mac are two Macs to their phones.
 *
 * Modelled on `jira/token-store.ts`, for the same two reasons:
 *  1. the file is written with mode 0o600;
 *  2. `save` THROWS when the keychain is unavailable. A pairing that "succeeded" with its
 *     key discarded would show a paired phone that receives nothing after the next launch,
 *     so pairing must fail loudly instead. `load` never throws: a bad file makes the relay
 *     look unpaired rather than taking the app down.
 *
 * Kept out of `types.ts` for token-store's reason: this shape holds the private key, and the
 * renderer only ever sees `RemoteDevice`, which has none.
 */
export interface StoredRemoteDevice {
  /** Lower-case UUID. */
  phoneId: string
  name: string
  /** The phone's X9.63 public point, standard base64. */
  pub: string
  /** Epoch ms, for display only (PROTOCOL.md §7 step 5): no decision reads it. */
  pairedAt: number
  /**
   * Lower-case UUID drawn on approval: the pairing's name (§6). Sent in `pair-accepted`,
   * `revoked` and every snapshot, so the phone drops anything from an earlier pairing.
   */
  pairingId: string
  /**
   * The phone's command-signing key (§3, §10), X9.63, standard base64. Learnt only from the
   * box of the `pair-request` this pairing approved. Absent for a phone paired before
   * commands existed: it still gets every snapshot, and `re-pair` for any command.
   */
  signPub?: string
  /**
   * The pairing's push key (§14), 32 bytes, standard base64: what this Mac seals a
   * notification's box with. Sent by the phone in `push-key` after each unlock, so absent
   * until the first one arrives (and for a phone too old to send it): that phone then gets
   * no notification from here.
   */
  pushKey?: string
  /**
   * Epoch ms of the last message this pairing sent that opened with its key, for display only.
   * Stored at most every `LAST_SEEN_STEP_MS`, so it can lag the truth by that much.
   */
  lastSeenAt?: number
}

export interface RemoteIdentity {
  /** Lower-case UUID. */
  macId: string
  /** The private scalar `d`, 32 bytes, hex. */
  macPrivate: string
  /**
   * Incremented and saved each time the relay starts (§6): the phone orders snapshots by it,
   * never by the Mac's clock. 0 for an identity that has never started a relay.
   */
  generation: number
  devices: StoredRemoteDevice[]
}

/**
 * The keychain is not available, so nothing was stored. Its own class, like token-store's,
 * so the pairing path can tell it apart from a full disk and say so.
 */
export class RemoteKeychainUnavailableError extends Error {
  constructor() {
    super('The OS keychain is unavailable, so the remote access identity cannot be stored')
    this.name = 'RemoteKeychainUnavailableError'
  }
}

/**
 * The account's file. The user id goes into a path, so anything that is not a plain UUID is
 * refused rather than sanitized: a session is the only source of it, and a malformed one is
 * not something to guess a file name from.
 */
function identityFile(userId: string): string {
  const id = userId.toLowerCase()
  if (!UUID_RE.test(id)) throw new Error('remote: not a user id')
  return path.join(CONFIG_DIR, `remote-${id}.enc`)
}

function isDevice(value: unknown): value is StoredRemoteDevice {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return (
    typeof d.phoneId === 'string' &&
    typeof d.name === 'string' &&
    typeof d.pub === 'string' &&
    typeof d.pairedAt === 'number' &&
    typeof d.pairingId === 'string' &&
    UUID_RE.test(d.pairingId)
  )
}

/** The fields of a device record, and only those: a `signPub` or `pushKey` that is not a string is left out. */
function cleanDevice(d: StoredRemoteDevice): StoredRemoteDevice {
  const { phoneId, name, pub, pairedAt, pairingId, signPub, pushKey, lastSeenAt } = d
  return {
    phoneId,
    name,
    pub,
    pairedAt,
    pairingId,
    ...(typeof signPub === 'string' ? { signPub } : {}),
    ...(typeof pushKey === 'string' ? { pushKey } : {}),
    ...(typeof lastSeenAt === 'number' && Number.isFinite(lastSeenAt) ? { lastSeenAt } : {}),
  }
}

/** A stored count, or 0: anything else in that field reads as "never started". */
function cleanGeneration(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
}

/** The stored identity, or null on any failure (no file, locked keychain, corrupt content). */
export function loadIdentity(userId: string): RemoteIdentity | null {
  try {
    const file = identityFile(userId)
    if (!fs.existsSync(file)) return null
    if (!safeStorage.isEncryptionAvailable()) return null
    const parsed = JSON.parse(safeStorage.decryptString(fs.readFileSync(file))) as Partial<RemoteIdentity>
    if (typeof parsed?.macId !== 'string' || typeof parsed.macPrivate !== 'string' || !/^[0-9a-f]{64}$/.test(parsed.macPrivate)) {
      return null
    }
    const stored: unknown[] = Array.isArray(parsed.devices) ? parsed.devices : []
    const devices = stored.filter(isDevice).map(cleanDevice)
    // Records from before pairings were named (no `pairingId`, dev builds only: the feature is
    // unreleased) cannot be addressed under §6, and the phone drops its side of them too.
    if (devices.length < stored.length) {
      console.warn(`[remote] dropped ${stored.length - devices.length} paired device record(s) without a pairing id; pair those phones again`)
    }
    return {
      macId: parsed.macId,
      macPrivate: parsed.macPrivate,
      generation: cleanGeneration(parsed.generation),
      devices,
    }
  } catch (error) {
    // Nothing from this file is worth printing: the fact, not the object.
    console.error('[remote] failed to load the relay identity:', error instanceof Error ? error.name : 'unknown error')
    return null
  }
}

/** Persist the identity, encrypted. THROWS when the keychain is unavailable or the write fails. */
export function saveIdentity(userId: string, identity: RemoteIdentity): void {
  if (!safeStorage.isEncryptionAvailable()) throw new RemoteKeychainUnavailableError()
  const file = identityFile(userId)
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
  fs.writeFileSync(file, safeStorage.encryptString(JSON.stringify(identity)), { mode: 0o600 })
}

/**
 * The account's identity, created and stored on first need. THROWS when it has to be created
 * and cannot be stored: an identity that lives in memory only would hand a phone a key this
 * Mac forgets at the next launch.
 */
export function loadOrCreateIdentity(userId: string): RemoteIdentity {
  const existing = loadIdentity(userId)
  if (existing) return existing
  const identity: RemoteIdentity = {
    macId: crypto.randomUUID().toLowerCase(),
    macPrivate: privateRawOf(generateKeyPair().privateKey).toString('hex'),
    generation: 0,
    devices: [],
  }
  saveIdentity(userId, identity)
  return identity
}

/** The paired phones of the account, `[]` when there is no identity. */
export function listDevices(userId: string): StoredRemoteDevice[] {
  return loadIdentity(userId)?.devices ?? []
}

/**
 * Add (or replace, by `phoneId`) a paired phone. THROWS when there is no identity to add it
 * to or it cannot be stored. Returns the identity as now stored.
 */
export function addDevice(userId: string, device: StoredRemoteDevice): RemoteIdentity {
  const identity = loadIdentity(userId)
  if (!identity) throw new Error('remote: no identity to pair with')
  const next: RemoteIdentity = {
    ...identity,
    devices: [...identity.devices.filter((d) => d.phoneId !== device.phoneId), device],
  }
  saveIdentity(userId, next)
  return next
}

/** Forget a paired phone. THROWS when it cannot be stored. Returns the identity as now stored. */
export function removeDevice(userId: string, phoneId: string): RemoteIdentity | null {
  const identity = loadIdentity(userId)
  if (!identity) return null
  const next: RemoteIdentity = { ...identity, devices: identity.devices.filter((d) => d.phoneId !== phoneId) }
  saveIdentity(userId, next)
  return next
}

/**
 * Store a pairing's push key (§14). Only on the device record of THAT pairing: a `push-key`
 * that reaches the disk after the phone was paired again (or revoked) must not land on the
 * new record. Returns the identity as now stored, or null when nothing was written: no
 * identity, no such pairing, or the same key already there (the phone resends it after every
 * unlock). THROWS when it cannot be stored.
 */
export function setDevicePushKey(userId: string, phoneId: string, pairingId: string, pushKey: string): RemoteIdentity | null {
  const identity = loadIdentity(userId)
  const current = identity?.devices.find((d) => d.phoneId === phoneId)
  if (!identity || !current || current.pairingId !== pairingId || current.pushKey === pushKey) return null
  const next: RemoteIdentity = {
    ...identity,
    devices: identity.devices.map((d) => (d === current ? { ...d, pushKey } : d)),
  }
  saveIdentity(userId, next)
  return next
}

/**
 * Store when a pairing was last heard from. Only on THAT pairing's record, like the push key.
 * Returns the identity as now stored, or null when nothing was written. THROWS when it cannot
 * be stored.
 */
export function setDeviceLastSeen(userId: string, phoneId: string, pairingId: string, lastSeenAt: number): RemoteIdentity | null {
  const identity = loadIdentity(userId)
  const current = identity?.devices.find((d) => d.phoneId === phoneId)
  if (!identity || !current || current.pairingId !== pairingId) return null
  const next: RemoteIdentity = {
    ...identity,
    devices: identity.devices.map((d) => (d === current ? { ...d, lastSeenAt } : d)),
  }
  saveIdentity(userId, next)
  return next
}

/**
 * Record the relay's generation (§6). THROWS when there is no identity or it cannot be
 * stored: the caller keeps the value in memory and runs all the same.
 */
export function saveGeneration(userId: string, generation: number): void {
  const identity = loadIdentity(userId)
  if (!identity) throw new Error('remote: no identity to record a generation in')
  saveIdentity(userId, { ...identity, generation: Math.max(identity.generation, generation) })
}
