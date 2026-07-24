import { describe, it, expect } from 'vitest'
import { msUntilNextDigest } from './daily-digest'

// msUntilNextDigest is pure: given a fixed `now` it returns the number of ms
// until the next 9:00 local boundary. Passing a fixed Date keeps the tests
// deterministic without touching the system clock.
const DIGEST_HOUR = 9
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** The local Date that lands `delay` ms after `now`. */
const landing = (now: Date, delay: number) => new Date(now.getTime() + delay)

describe('msUntilNextDigest', () => {
  it('returns the ms until 9:00 later the same day', () => {
    const now = new Date(2026, 6, 24, 8, 0, 0, 0) // 08:00 local
    expect(msUntilNextDigest(now)).toBe(HOUR_MS)
  })

  it('rolls to the next day when now is exactly 9:00', () => {
    const now = new Date(2026, 6, 24, 9, 0, 0, 0) // 09:00 local
    expect(msUntilNextDigest(now)).toBe(DAY_MS)
  })

  it('rolls to the next day when now is past 9:00', () => {
    const now = new Date(2026, 6, 24, 10, 30, 0, 0) // 10:30 local
    expect(msUntilNextDigest(now)).toBe(DAY_MS - 90 * 60 * 1000)
  })

  it('is always a positive delay', () => {
    for (const hour of [0, 8, 9, 10, 15, 23]) {
      const now = new Date(2026, 6, 24, hour, 17, 42, 500)
      expect(msUntilNextDigest(now)).toBeGreaterThan(0)
    }
  })

  it('always lands exactly on a 9:00:00.000 local boundary', () => {
    const nows = [
      new Date(2026, 6, 24, 0, 0, 0, 0),
      new Date(2026, 6, 24, 8, 59, 59, 500),
      new Date(2026, 6, 24, 9, 0, 0, 1),
      new Date(2026, 6, 24, 23, 59, 59, 999),
      // Month/day rollover: 09:30 on the last day of a month.
      new Date(2026, 6, 31, 9, 30, 0, 0),
    ]
    for (const now of nows) {
      const at = landing(now, msUntilNextDigest(now))
      expect(at.getHours()).toBe(DIGEST_HOUR)
      expect(at.getMinutes()).toBe(0)
      expect(at.getSeconds()).toBe(0)
      expect(at.getMilliseconds()).toBe(0)
    }
  })

  it('crosses a day boundary correctly at month end', () => {
    const now = new Date(2026, 6, 31, 9, 30, 0, 0) // 2026-07-31 09:30 local
    const at = landing(now, msUntilNextDigest(now))
    expect(at.getDate()).toBe(1)
    expect(at.getMonth()).toBe(7) // August
    expect(at.getHours()).toBe(DIGEST_HOUR)
  })
})
