import { describe, expect, it, vi } from 'vitest'
import {
  buildSnapshot,
  HEARTBEAT_MS,
  snapshotFor,
  PRESENCE_DEBOUNCE_MS,
  SnapshotScheduler,
  USAGE_THROTTLE_MS,
  type SchedulerTimers,
  type SnapshotTerminal,
} from './snapshot'

describe('buildSnapshot', () => {
  const terminals: SnapshotTerminal[] = [
    { id: 'claude-1', name: 'Agent 1', state: 'working', metadata: { title: 'PROJ-12: refunds', usage: {
      costUsd: 1.23, contextPercent: 41, model: 'Opus 4.5', fiveHourPercent: 12, fiveHourResetsAt: 1760003600,
      sevenDayPercent: 30, sevenDayResetsAt: 1760500000, transcriptPath: '/secret/path.jsonl', linesAdded: 4,
    } } },
    { id: 'claude-2', name: 'Agent 2', state: 'idle', metadata: { usage: { costUsd: 0.5 } } },
    { id: 'claude-3', name: 'Agent 3', state: 'waiting' },
    { id: 'script-dev', name: 'npm run dev', state: 'working' },
    { id: 'sidebar-shell', name: 'zsh', state: 'idle' },
  ]

  it('drops script- and sidebar- terminals, and titles fall back to the name', () => {
    const snap = buildSnapshot(terminals, 'MacBook Pro', 42, 7, () => true)
    expect(snap.sentAt).toBe(42)
    expect(snap.generation).toBe(7)
    expect(snap.macName).toBe('MacBook Pro')
    expect(snap.agents.map((a) => [a.appAgentId, a.title, a.state])).toEqual([
      ['claude-1', 'PROJ-12: refunds', 'working'],
      ['claude-2', 'Agent 2', 'idle'],
      ['claude-3', 'Agent 3', 'waiting'],
    ])
  })

  it('maps usage to the protocol fields only, with nulls for the missing ones', () => {
    const [first, second, third] = buildSnapshot(terminals, 'Mac', 0, 1, () => true).agents
    expect(first.usage).toEqual({
      costUsd: 1.23, contextPercent: 41, model: 'Opus 4.5', fiveHourPercent: 12, fiveHourResetsAt: 1760003600,
      sevenDayPercent: 30, sevenDayResetsAt: 1760500000,
    })
    expect(second.usage).toEqual({
      costUsd: 0.5, contextPercent: null, model: null, fiveHourPercent: null, fiveHourResetsAt: null,
      sevenDayPercent: null, sevenDayResetsAt: null,
    })
    expect(third.usage).toBeNull()
  })

  it('carries only the terminals the account owns', () => {
    const owners: Record<string, string> = { 'claude-1': 'me', 'claude-2': 'someone-else' }
    const snap = buildSnapshot(terminals, 'Mac', 0, 1, (id) => owners[id] === 'me')
    // claude-2 belongs to another account, claude-3 has no recorded owner: both stay out.
    expect(snap.agents.map((a) => a.appAgentId)).toEqual(['claude-1'])
  })

  it('is addressed per phone by its pairing id, the body shared', () => {
    const body = buildSnapshot(terminals, 'Mac', 42, 3, () => true)
    const mine = snapshotFor(body, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    expect(mine).toEqual({ pairingId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', ...body })
    expect(Object.keys(mine)).toEqual(['pairingId', 'generation', 'sentAt', 'macName', 'agents'])
    expect(body).not.toHaveProperty('pairingId')
  })
})

describe('SnapshotScheduler', () => {
  function setup() {
    vi.useFakeTimers()
    const send = vi.fn()
    const timers: SchedulerTimers = {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
      now: () => Date.now(),
    }
    const scheduler = new SnapshotScheduler(send, timers)
    scheduler.start()
    vi.advanceTimersByTime(0)
    send.mockClear()
    return { send, scheduler }
  }

  it('sends a state change at once, coalescing the same tick', () => {
    const { send, scheduler } = setup()
    scheduler.notifyState()
    scheduler.notifyState()
    scheduler.notifyUsage()
    vi.advanceTimersByTime(0)
    expect(send).toHaveBeenCalledTimes(1)
    scheduler.notifyState()
    vi.advanceTimersByTime(0)
    expect(send).toHaveBeenCalledTimes(2)
    scheduler.stop()
    vi.useRealTimers()
  })

  it('throttles usage to one snapshot every 2 s', () => {
    const { send, scheduler } = setup()
    // The start's snapshot went out just now: usage waits out the 2 s.
    scheduler.notifyUsage()
    vi.advanceTimersByTime(USAGE_THROTTLE_MS - 1)
    expect(send).not.toHaveBeenCalled()
    for (let i = 0; i < 10; i++) scheduler.notifyUsage()
    vi.advanceTimersByTime(1)
    expect(send).toHaveBeenCalledTimes(1)
    // Two seconds later, a usage change goes at once.
    vi.advanceTimersByTime(USAGE_THROTTLE_MS)
    scheduler.notifyUsage()
    vi.advanceTimersByTime(0)
    expect(send).toHaveBeenCalledTimes(2)
    scheduler.stop()
    vi.useRealTimers()
  })

  it('debounces phone joins by 1 s and keeps a 30 s heartbeat', () => {
    const { send, scheduler } = setup()
    scheduler.notifyPresenceJoin()
    vi.advanceTimersByTime(PRESENCE_DEBOUNCE_MS / 2)
    scheduler.notifyPresenceJoin()
    vi.advanceTimersByTime(PRESENCE_DEBOUNCE_MS - 1)
    expect(send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(send).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(HEARTBEAT_MS)
    expect(send).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(HEARTBEAT_MS)
    expect(send).toHaveBeenCalledTimes(3)
    scheduler.stop()
    vi.advanceTimersByTime(HEARTBEAT_MS * 3)
    scheduler.notifyState()
    vi.advanceTimersByTime(0)
    expect(send).toHaveBeenCalledTimes(3)
    vi.useRealTimers()
  })
})
