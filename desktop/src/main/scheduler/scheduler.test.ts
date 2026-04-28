import { describe, it, expect, vi } from 'vitest'
import type { Schedule } from '../../types'

// Mock heavy/native dependencies that scheduler.ts transitively imports
// so we can test the pure logic without node-pty, electron, etc.
vi.mock('electron', () => ({
  BrowserWindow: class {},
  powerSaveBlocker: { start: vi.fn(() => 1), stop: vi.fn(), isStarted: vi.fn(() => false) },
}))
vi.mock('../config/agents', () => ({
  readAgents: () => [],
  updateAgentSchedule: vi.fn(),
  saveAgent: vi.fn(),
}))
vi.mock('../config/config', () => ({
  readConfig: () => ({ schedulerEnabled: true }),
}))
vi.mock('../pty/terminal-manager', () => ({
  launchClaude: vi.fn(),
  getAllTerminals: () => [],
}))
vi.mock('../ipc/terminal-handlers', () => ({
  createBaseCallbacks: () => ({
    onData: vi.fn(),
    onStateChange: vi.fn(),
    onExit: vi.fn(),
    onBranchChange: vi.fn(),
    onMetadataChange: vi.fn(),
    onRepositoriesChange: vi.fn(),
  }),
}))

import { shouldRunSchedule, shouldCatchUp, formatDateYMD } from './scheduler'

/**
 * Helper: build a valid, enabled schedule with sensible defaults.
 * Override any field via the `overrides` parameter.
 */
function makeSchedule(overrides: Partial<Schedule> = {}): Schedule {
  return {
    enabled: true,
    command: 'npm test',
    frequency: 'daily',
    time: '09:00',
    date: null,
    dayOfWeek: null,
    dayOfMonth: null,
    lastRunAt: null,
    lastRunStatus: null,
    ...overrides,
  }
}

// --- formatDateYMD ---

describe('formatDateYMD', () => {
  it('should format a date as YYYY-MM-DD with zero-padded month and day', () => {
    // 2026-01-05 (months are 0-indexed)
    expect(formatDateYMD(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('should handle double-digit months and days', () => {
    expect(formatDateYMD(new Date(2025, 11, 25))).toBe('2025-12-25')
  })
})

// --- shouldRunSchedule ---

describe('shouldRunSchedule', () => {

  // ---- once frequency ----

  describe('once frequency', () => {
    it('should match when date and time both match', () => {
      const schedule = makeSchedule({
        frequency: 'once',
        time: '14:30',
        date: '2026-03-15',
      })
      // 2026-03-15 14:30
      const now = new Date(2026, 2, 15, 14, 30, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(true)
    })

    it('should NOT match when date matches but time does not', () => {
      const schedule = makeSchedule({
        frequency: 'once',
        time: '14:30',
        date: '2026-03-15',
      })
      const now = new Date(2026, 2, 15, 10, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })

    it('should NOT match when time matches but date does not', () => {
      const schedule = makeSchedule({
        frequency: 'once',
        time: '14:30',
        date: '2026-03-15',
      })
      const now = new Date(2026, 2, 16, 14, 30, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })

    it('should NOT match when date is null', () => {
      const schedule = makeSchedule({
        frequency: 'once',
        time: '09:00',
        date: null,
      })
      const now = new Date(2026, 2, 15, 9, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })
  })

  // ---- daily frequency ----

  describe('daily frequency', () => {
    it('should match when time matches regardless of day', () => {
      const schedule = makeSchedule({ frequency: 'daily', time: '08:00' })
      // Try a Monday
      const monday = new Date(2026, 3, 20, 8, 0, 0) // 2026-04-20 is a Monday
      expect(shouldRunSchedule(schedule, monday)).toBe(true)
      // Try a Saturday
      const saturday = new Date(2026, 3, 25, 8, 0, 0) // 2026-04-25 is a Saturday
      expect(shouldRunSchedule(schedule, saturday)).toBe(true)
    })

    it('should NOT match when time does not match', () => {
      const schedule = makeSchedule({ frequency: 'daily', time: '08:00' })
      const now = new Date(2026, 3, 20, 9, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })
  })

  // ---- weekdays frequency ----

  describe('weekdays frequency', () => {
    it('should match Mon-Fri when time matches', () => {
      const schedule = makeSchedule({ frequency: 'weekdays', time: '10:00' })
      // 2026-04-20 is Monday (day=1) through 2026-04-24 Friday (day=5)
      for (let d = 20; d <= 24; d++) {
        const now = new Date(2026, 3, d, 10, 0, 0)
        expect(shouldRunSchedule(schedule, now)).toBe(true)
      }
    })

    it('should NOT match on Saturday', () => {
      const schedule = makeSchedule({ frequency: 'weekdays', time: '10:00' })
      // 2026-04-25 is Saturday
      const saturday = new Date(2026, 3, 25, 10, 0, 0)
      expect(shouldRunSchedule(schedule, saturday)).toBe(false)
    })

    it('should NOT match on Sunday', () => {
      const schedule = makeSchedule({ frequency: 'weekdays', time: '10:00' })
      // 2026-04-26 is Sunday
      const sunday = new Date(2026, 3, 26, 10, 0, 0)
      expect(shouldRunSchedule(schedule, sunday)).toBe(false)
    })
  })

  // ---- weekly frequency ----

  describe('weekly frequency', () => {
    it('should match only on the correct dayOfWeek when time matches', () => {
      const schedule = makeSchedule({
        frequency: 'weekly',
        time: '12:00',
        dayOfWeek: 3, // Wednesday
      })
      // 2026-04-22 is a Wednesday
      const wednesday = new Date(2026, 3, 22, 12, 0, 0)
      expect(shouldRunSchedule(schedule, wednesday)).toBe(true)
    })

    it('should NOT match on a different day of the week', () => {
      const schedule = makeSchedule({
        frequency: 'weekly',
        time: '12:00',
        dayOfWeek: 3, // Wednesday
      })
      // 2026-04-23 is a Thursday
      const thursday = new Date(2026, 3, 23, 12, 0, 0)
      expect(shouldRunSchedule(schedule, thursday)).toBe(false)
    })

    it('should NOT match when dayOfWeek is null', () => {
      const schedule = makeSchedule({
        frequency: 'weekly',
        time: '12:00',
        dayOfWeek: null,
      })
      const now = new Date(2026, 3, 22, 12, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })
  })

  // ---- monthly frequency ----

  describe('monthly frequency', () => {
    it('should match only on the correct dayOfMonth when time matches', () => {
      const schedule = makeSchedule({
        frequency: 'monthly',
        time: '07:00',
        dayOfMonth: 15,
      })
      const now = new Date(2026, 3, 15, 7, 0, 0) // April 15
      expect(shouldRunSchedule(schedule, now)).toBe(true)
    })

    it('should NOT match on a different dayOfMonth', () => {
      const schedule = makeSchedule({
        frequency: 'monthly',
        time: '07:00',
        dayOfMonth: 15,
      })
      const now = new Date(2026, 3, 16, 7, 0, 0) // April 16
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })

    it('should NOT match when dayOfMonth=31 in a 30-day month (skip)', () => {
      const schedule = makeSchedule({
        frequency: 'monthly',
        time: '07:00',
        dayOfMonth: 31,
      })
      // April has 30 days — the 30th at 07:00
      const now = new Date(2026, 3, 30, 7, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })

    it('should match when dayOfMonth=31 in a 31-day month', () => {
      const schedule = makeSchedule({
        frequency: 'monthly',
        time: '07:00',
        dayOfMonth: 31,
      })
      // March has 31 days
      const now = new Date(2026, 2, 31, 7, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(true)
    })

    it('should NOT match when dayOfMonth is null', () => {
      const schedule = makeSchedule({
        frequency: 'monthly',
        time: '07:00',
        dayOfMonth: null,
      })
      const now = new Date(2026, 3, 15, 7, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })
  })

  // ---- already ran this minute ----

  describe('already ran this minute', () => {
    it('should NOT match when lastRunAt is within the same minute', () => {
      const now = new Date(2026, 3, 22, 9, 0, 30) // 09:00:30
      const schedule = makeSchedule({
        frequency: 'daily',
        time: '09:00',
        lastRunAt: new Date(2026, 3, 22, 9, 0, 5).getTime(), // 09:00:05 same minute
      })
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })

    it('should match when lastRunAt is in a different minute', () => {
      const now = new Date(2026, 3, 22, 9, 0, 30)
      const schedule = makeSchedule({
        frequency: 'daily',
        time: '09:00',
        lastRunAt: new Date(2026, 3, 22, 8, 59, 50).getTime(), // previous minute
      })
      expect(shouldRunSchedule(schedule, now)).toBe(true)
    })

    it('should match when lastRunAt is null', () => {
      const now = new Date(2026, 3, 22, 9, 0, 0)
      const schedule = makeSchedule({
        frequency: 'daily',
        time: '09:00',
        lastRunAt: null,
      })
      expect(shouldRunSchedule(schedule, now)).toBe(true)
    })
  })

  // ---- enabled: false ----

  describe('enabled: false', () => {
    it('should NOT match when schedule is disabled', () => {
      const schedule = makeSchedule({
        enabled: false,
        frequency: 'daily',
        time: '09:00',
      })
      const now = new Date(2026, 3, 22, 9, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })
  })

  // ---- missing / null fields ----

  describe('missing or null fields', () => {
    it('should NOT match when schedule is undefined', () => {
      const now = new Date(2026, 3, 22, 9, 0, 0)
      expect(shouldRunSchedule(undefined, now)).toBe(false)
    })

    it('should NOT match when command is empty', () => {
      const schedule = makeSchedule({
        command: '',
        frequency: 'daily',
        time: '09:00',
      })
      const now = new Date(2026, 3, 22, 9, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })

    it('should NOT match for an unknown frequency', () => {
      const schedule = makeSchedule({
        frequency: 'biweekly' as never,
        time: '09:00',
      })
      const now = new Date(2026, 3, 22, 9, 0, 0)
      expect(shouldRunSchedule(schedule, now)).toBe(false)
    })
  })
})

// --- shouldCatchUp ---

describe('shouldCatchUp', () => {
  it('should catch up when schedule time falls within sleep window', () => {
    const schedule = makeSchedule({ frequency: 'daily', time: '05:00' })
    // Sleep from 4:50 to 5:30
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(true)
  })

  it('should NOT catch up when schedule time is before the sleep window', () => {
    const schedule = makeSchedule({ frequency: 'daily', time: '05:00' })
    // Sleep from 6:00 to 7:00
    const sleepStart = new Date(2026, 3, 28, 6, 0, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 7, 0, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should NOT catch up when schedule time is after wake', () => {
    const schedule = makeSchedule({ frequency: 'daily', time: '08:00' })
    // Sleep from 4:00 to 6:00
    const sleepStart = new Date(2026, 3, 28, 4, 0, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 6, 0, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should NOT catch up when already executed today', () => {
    const schedule = makeSchedule({
      frequency: 'daily',
      time: '05:00',
      lastRunAt: new Date(2026, 3, 28, 5, 0, 10).getTime(),
    })
    // Sleep from 5:30 to 7:00 (but already ran at 5:00)
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 7, 0, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should catch up once frequency with matching date', () => {
    const schedule = makeSchedule({
      frequency: 'once',
      time: '05:00',
      date: '2026-04-28',
    })
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(true)
  })

  it('should NOT catch up once frequency with non-matching date', () => {
    const schedule = makeSchedule({
      frequency: 'once',
      time: '05:00',
      date: '2026-04-29',
    })
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should NOT catch up weekdays frequency on a weekend', () => {
    const schedule = makeSchedule({ frequency: 'weekdays', time: '05:00' })
    // 2026-04-25 is a Saturday
    const sleepStart = new Date(2026, 3, 25, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 25, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should catch up weekdays frequency on a weekday', () => {
    const schedule = makeSchedule({ frequency: 'weekdays', time: '05:00' })
    // 2026-04-28 is a Tuesday
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(true)
  })

  it('should NOT catch up weekly frequency on the wrong day', () => {
    const schedule = makeSchedule({
      frequency: 'weekly',
      time: '05:00',
      dayOfWeek: 3, // Wednesday
    })
    // 2026-04-28 is a Tuesday
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should catch up weekly frequency on the correct day', () => {
    const schedule = makeSchedule({
      frequency: 'weekly',
      time: '05:00',
      dayOfWeek: 2, // Tuesday
    })
    // 2026-04-28 is a Tuesday
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(true)
  })

  it('should NOT catch up when schedule is disabled', () => {
    const schedule = makeSchedule({ enabled: false, frequency: 'daily', time: '05:00' })
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should NOT catch up when schedule is undefined', () => {
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(undefined, sleepStart, wakeTime)).toBe(false)
  })

  it('should NOT catch up when command is empty', () => {
    const schedule = makeSchedule({ command: '', frequency: 'daily', time: '05:00' })
    const sleepStart = new Date(2026, 3, 28, 4, 50, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 5, 30, 0)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(false)
  })

  it('should catch up overnight sleep spanning midnight', () => {
    const schedule = makeSchedule({ frequency: 'daily', time: '05:00' })
    // Sleep from 22:00 on April 27 to 06:00 on April 28
    const sleepStart = new Date(2026, 3, 27, 22, 0, 0).getTime()
    const wakeTime = new Date(2026, 3, 28, 6, 0, 0)
    // scheduledToday = April 28 at 05:00, which is between sleepStart (April 27 22:00) and wakeTime (April 28 06:00)
    expect(shouldCatchUp(schedule, sleepStart, wakeTime)).toBe(true)
  })
})
