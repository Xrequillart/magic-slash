import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearIpLocationCache, isPrivateIp, lookupIpLocation } from './ipLocation'

const fetchMock = vi.fn()

beforeEach(() => {
  clearIpLocationCache()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const answer = (body: unknown, ok = true) => ({ ok, json: async () => body })

describe('lookupIpLocation', () => {
  it('reads the city and the country code', async () => {
    fetchMock.mockResolvedValue(answer({ city: 'Caen', countryCode: 'FR', countryName: 'France' }))
    await expect(lookupIpLocation('82.64.10.3')).resolves.toEqual({ city: 'Caen', countryCode: 'FR' })
    expect(fetchMock).toHaveBeenCalledWith('https://api.db-ip.com/v2/free/82.64.10.3', expect.anything())
  })

  it('asks once per address, misses included', async () => {
    fetchMock.mockResolvedValue(answer({ error: 'quota' }))
    await lookupIpLocation('82.64.10.3')
    await lookupIpLocation('82.64.10.3')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('never sends a private address, and has nothing for none', async () => {
    await expect(lookupIpLocation('192.168.1.4')).resolves.toBeNull()
    await expect(lookupIpLocation(null)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('answers null when the service fails or knows nothing', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'))
    await expect(lookupIpLocation('1.1.1.1')).resolves.toBeNull()
    fetchMock.mockResolvedValueOnce(answer({}, false))
    await expect(lookupIpLocation('8.8.8.8')).resolves.toBeNull()
    fetchMock.mockResolvedValueOnce(answer({ city: '', countryCode: 'ZZ' }))
    await expect(lookupIpLocation('9.9.9.9')).resolves.toBeNull()
  })
})

describe('isPrivateIp', () => {
  it.each(['10.0.0.1', '127.0.0.1', '172.20.1.1', '192.168.0.1', '169.254.1.1', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'])(
    '%s is private',
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  )
  it.each(['82.64.10.3', '172.32.0.1', '8.8.8.8', '2a01:e0a::1'])('%s is public', (ip) => expect(isPrivateIp(ip)).toBe(false))
})
