import { afterEach, describe, expect, it, vi } from 'vitest'
import { replayHeld, shouldSleep, sleepAfterMs, type SleepCandidate } from './idle-sleep'

const SLEEP_AFTER_MS = 15 * 60_000

const at = 1_000_000_000
const rest: SleepCandidate = { state: 'idle', lastActiveAt: at - SLEEP_AFTER_MS, visible: false, background: 0, asleep: false, restarting: false }

describe('shouldSleep', () => {
  it('puts to sleep an agent at rest, out of sight, left long enough', () => {
    expect(shouldSleep(rest, at, SLEEP_AFTER_MS)).toBe(true)
    expect(shouldSleep({ ...rest, state: 'completed' }, at, SLEEP_AFTER_MS)).toBe(true)
  })

  it('leaves one touched within the delay', () => {
    expect(shouldSleep({ ...rest, lastActiveAt: at - SLEEP_AFTER_MS + 1 }, at, SLEEP_AFTER_MS)).toBe(false)
  })

  it('never touches one at work, on a question or in error', () => {
    for (const state of ['working', 'waiting', 'error'] as const) {
      expect(shouldSleep({ ...rest, state }, at, SLEEP_AFTER_MS)).toBe(false)
    }
  })

  it('never touches one shown, with background agents, asleep already or restarting', () => {
    expect(shouldSleep({ ...rest, visible: true }, at, SLEEP_AFTER_MS)).toBe(false)
    expect(shouldSleep({ ...rest, background: 1 }, at, SLEEP_AFTER_MS)).toBe(false)
    expect(shouldSleep({ ...rest, asleep: true }, at, SLEEP_AFTER_MS)).toBe(false)
    expect(shouldSleep({ ...rest, restarting: true }, at, SLEEP_AFTER_MS)).toBe(false)
  })
})

describe('sleepAfterMs', () => {
  it('reads the setting in minutes, the fallback when unset, and 0 as never', () => {
    expect(sleepAfterMs(30, 15)).toBe(30 * 60_000)
    expect(sleepAfterMs(undefined, 15)).toBe(15 * 60_000)
    expect(sleepAfterMs(0, 15)).toBeNull()
  })
})

describe('replayHeld', () => {
  afterEach(() => { vi.useRealTimers() })

  it('replays the input in order, with the gaps it was written with', () => {
    vi.useFakeTimers()
    const written: string[] = []
    replayHeld([{ data: 'hello', at: 100 }, { data: '\r', at: 400 }], (d) => written.push(d))
    expect(written).toEqual(['hello'])
    vi.advanceTimersByTime(299)
    expect(written).toEqual(['hello'])
    vi.advanceTimersByTime(1)
    expect(written).toEqual(['hello', '\r'])
  })

  it('does nothing with nothing held', () => {
    const write = vi.fn()
    replayHeld([], write)
    expect(write).not.toHaveBeenCalled()
  })
})
