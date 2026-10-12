import { describe, expect, it } from 'vitest'
import { parseRemotePairing, parseRemoteState } from './remote-guards'

const STATE = {
  enabled: true,
  status: 'live',
  devices: [{ phoneId: 'p1', name: 'iPhone', pairedAt: 1760000000000 }],
  macName: 'MacBook Pro',
}

describe('parseRemoteState', () => {
  it('passes a well-formed state, rebuilt without extra keys', () => {
    expect(parseRemoteState({ ...STATE, secret: 'x', devices: [{ ...STATE.devices[0], pub: 'k' }] })).toEqual(STATE)
  })

  it('drops an unknown status, a malformed device, or anything that is not a record', () => {
    expect(parseRemoteState({ ...STATE, status: 'hacked' })).toBeNull()
    expect(parseRemoteState({ ...STATE, devices: [{ phoneId: 'p1', name: 'x', pairedAt: 'today' }] })).toBeNull()
    expect(parseRemoteState({ ...STATE, devices: 'all' })).toBeNull()
    expect(parseRemoteState({ ...STATE, enabled: 'yes' })).toBeNull()
    expect(parseRemoteState(null)).toBeNull()
    expect(parseRemoteState([STATE])).toBeNull()
  })
})

describe('parseRemotePairing', () => {
  it('passes each phase with its own fields', () => {
    const waiting = { phase: 'waiting', attemptId: 'a1', qr: '{}', expiresAt: 1760000060000 }
    expect(parseRemotePairing(waiting)).toEqual(waiting)
    const confirm = { phase: 'confirm', attemptId: 'a1', code: '0420', deviceName: 'iPhone' }
    expect(parseRemotePairing(confirm)).toEqual(confirm)
    expect(parseRemotePairing({ phase: 'rejected', reason: 'expired' })).toEqual({ phase: 'rejected', reason: 'expired' })
  })

  it('drops an unknown phase or reason, a code that is not 4 digits, and a field of the wrong type', () => {
    expect(parseRemotePairing({ phase: 'done' })).toBeNull()
    expect(parseRemotePairing({ phase: 'rejected', reason: 'because' })).toBeNull()
    expect(parseRemotePairing({ phase: 'confirm', code: '12345' })).toBeNull()
    expect(parseRemotePairing({ phase: 'waiting', qr: 42 })).toBeNull()
    expect(parseRemotePairing({ phase: 'waiting', extra: 'kept?' })).toEqual({ phase: 'waiting' })
    expect(parseRemotePairing('waiting')).toBeNull()
  })
})
