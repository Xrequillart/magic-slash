import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// os.hostname cannot be spied on (ESM namespaces are not configurable), so the
// module is mocked with mutable hoisted state — the same style as the cloud tests.
const h = vi.hoisted(() => ({ state: { hostname: 'mac-of-xavier' } }))

vi.mock('os', () => ({
  hostname: () => h.state.hostname,
}))

import { computeDeviceId, getAppInstallationInfo, recordAppInstallation } from './app-installation'
import { NOOP_STORE, setStore } from './store/Store'

beforeEach(() => {
  h.state.hostname = 'mac-of-xavier'
})

afterEach(() => {
  vi.restoreAllMocks()
  setStore(NOOP_STORE)
})

describe('computeDeviceId', () => {
  it('is a stable sha256 hex digest for the same machine', () => {
    const first = computeDeviceId()
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(computeDeviceId()).toBe(first)
  })

  it('changes when the hostname changes, so a rename mints a new device row', () => {
    const a = computeDeviceId()
    h.state.hostname = 'mac-b'
    expect(computeDeviceId()).not.toBe(a)
  })

  it('never leaks the raw hostname', () => {
    expect(computeDeviceId()).not.toContain('mac-of-xavier')
  })
})

describe('getAppInstallationInfo', () => {
  it('reports the version alongside this machine identity', () => {
    expect(getAppInstallationInfo('0.52.1')).toEqual({
      deviceId: computeDeviceId(),
      deviceName: 'mac-of-xavier',
      appVersion: '0.52.1',
      platform: process.platform,
      arch: process.arch,
    })
  })
})

describe('recordAppInstallation', () => {
  it('forwards this machine info to the store', async () => {
    const spy = vi.fn(async () => {})
    setStore({ ...NOOP_STORE, recordAppInstallation: spy })

    await recordAppInstallation('0.52.1')

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ appVersion: '0.52.1', deviceName: 'mac-of-xavier' }),
    )
  })

  it('swallows a store failure — version telemetry must never break startup', async () => {
    setStore({
      ...NOOP_STORE,
      recordAppInstallation: async () => { throw new Error('offline') },
    })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(recordAppInstallation('0.52.1')).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()
  })
})
