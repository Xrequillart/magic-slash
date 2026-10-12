import type { RemoteDevice, RemotePairing, RemoteRelayStatus, RemoteState } from '../types'

/**
 * Checks for what the remote relay sends across the preload bridge (`remote:*`, #352).
 *
 * The bridge is a trust boundary in both directions, and the TypeScript types on either side
 * describe intent, not what actually arrives. So every value is rebuilt from fields checked one
 * by one: an unknown status, a malformed device or an extra key never reaches the page. A value
 * that does not pass is dropped (`null`), never patched into something plausible.
 *
 * Kept free of `electron` so it can be tested from the root vitest run.
 */

const RELAY_STATUSES: readonly RemoteRelayStatus[] = ['off', 'signed-out', 'reconnecting', 'live']
const PAIRING_PHASES: readonly RemotePairing['phase'][] = ['waiting', 'confirm', 'paired', 'rejected']
const REJECT_REASONS: readonly NonNullable<RemotePairing['reason']>[] = ['expired', 'used', 'declined']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function oneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value)
}

function parseDevice(value: unknown): RemoteDevice | null {
  if (!isRecord(value)) return null
  const { phoneId, name, pairedAt } = value
  if (typeof phoneId !== 'string' || typeof name !== 'string' || !isFiniteNumber(pairedAt)) return null
  return { phoneId, name, pairedAt }
}

export function parseRemoteState(value: unknown): RemoteState | null {
  if (!isRecord(value)) return null
  const { enabled, status, devices, macName } = value
  if (typeof enabled !== 'boolean' || !oneOf(RELAY_STATUSES, status)) return null
  if (!Array.isArray(devices) || typeof macName !== 'string') return null
  const parsed = devices.map(parseDevice)
  if (parsed.some((device) => device === null)) return null
  return { enabled, status, devices: parsed as RemoteDevice[], macName }
}

export function parseRemotePairing(value: unknown): RemotePairing | null {
  if (!isRecord(value) || !oneOf(PAIRING_PHASES, value.phase)) return null
  const pairing: RemotePairing = { phase: value.phase }
  // Optional fields: absent is fine, present with the wrong type rejects the whole value.
  const optional: [keyof RemotePairing, (v: unknown) => boolean][] = [
    ['attemptId', (v) => typeof v === 'string'],
    ['qr', (v) => typeof v === 'string'],
    ['expiresAt', isFiniteNumber],
    ['code', (v) => typeof v === 'string' && /^\d{4}$/.test(v)],
    ['deviceName', (v) => typeof v === 'string'],
    ['reason', (v) => oneOf(REJECT_REASONS, v)],
  ]
  for (const [key, check] of optional) {
    const field = value[key]
    if (field === undefined) continue
    if (!check(field)) return null
    Object.assign(pairing, { [key]: field })
  }
  return pairing
}
