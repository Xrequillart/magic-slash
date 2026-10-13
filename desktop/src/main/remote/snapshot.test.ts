import { describe, expect, it, vi } from 'vitest'
import {
  buildSnapshot,
  HEARTBEAT_MS,
  snapshotFor,
  PRESENCE_DEBOUNCE_MS,
  SnapshotScheduler,
  USAGE_THROTTLE_MS,
  toRelayQuestion,
  type SchedulerTimers,
  type SnapshotTerminal,
} from './snapshot'
import type { TrayQuestion } from '../../types'

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

  it('carries each agent\'s pending question, and null for the others', () => {
    const question: TrayQuestion = { token: 'tok-1', kind: 'permission', prompt: 'Claude needs your permission to use Bash', options: [], receivedAt: 5 }
    const snap = buildSnapshot(terminals, 'Mac', 0, 1, () => true, (id) => (id === 'claude-3' ? question : undefined))
    expect(snap.agents.map((a) => a.question?.token ?? null)).toEqual([null, null, 'tok-1'])
  })
})

describe('toRelayQuestion', () => {
  const ASK: TrayQuestion = {
    token: 'tok-1',
    kind: 'ask',
    prompt: 'Which database?',
    options: [{ label: 'Postgres', description: 'The default', preview: '```sql\nSELECT 1\n```' }, { label: 'SQLite' }],
    questions: [{ prompt: 'Which database?', header: 'Database', options: [{ label: 'Postgres', description: 'The default', preview: '```sql\nSELECT 1\n```' }, { label: 'SQLite' }] }],
    preview: 'the last lines of the terminal',
    receivedAt: 1760000000000,
  }

  it('is null when nothing is pending', () => {
    expect(toRelayQuestion(undefined)).toBeNull()
  })

  it('publishes an ask in the protocol\'s exact shape, without any preview', () => {
    const published = toRelayQuestion(ASK)
    expect(published).toEqual({
      token: 'tok-1',
      kind: 'ask',
      receivedAt: 1760000000000,
      unsupported: false,
      questions: [{
        prompt: 'Which database?',
        header: 'Database',
        multiSelect: false,
        options: [{ label: 'Postgres', description: 'The default' }, { label: 'SQLite' }],
      }],
    })
    expect(JSON.stringify(published)).not.toContain('SELECT')
    expect(JSON.stringify(published)).not.toContain('terminal')
  })

  it('falls back to the first question when the ask carries no list, multiSelect included', () => {
    const { questions: _questions, ...bare } = ASK
    const published = toRelayQuestion({ ...bare, multiSelect: true })
    expect(published?.questions).toEqual([{
      prompt: 'Which database?',
      multiSelect: true,
      options: [{ label: 'Postgres', description: 'The default' }, { label: 'SQLite' }],
    }])
  })

  it('publishes a permission as one question with no options, with the terminal tail it is about', () => {
    const published = toRelayQuestion({
      token: 'tok-2', kind: 'permission', prompt: 'Claude needs your permission to use Bash', options: [],
      preview: '$ rm -rf build', receivedAt: 1,
    })
    expect(published).toEqual({
      token: 'tok-2',
      kind: 'permission',
      receivedAt: 1,
      unsupported: false,
      questions: [{ prompt: 'Claude needs your permission to use Bash', multiSelect: false, options: [] }],
      preview: '$ rm -rf build',
    })
  })

  it('keeps the end of a long permission preview, where the command is', () => {
    const published = toRelayQuestion({
      token: 'tok-3', kind: 'permission', prompt: 'Claude needs your permission to use Bash', options: [],
      preview: 'x'.repeat(5000) + '$ rm -rf build', receivedAt: 1,
    })!
    expect(published.preview).toHaveLength(4000)
    expect(published.preview!.endsWith('$ rm -rf build')).toBe(true)
    expect(published.unsupported).toBe(false)
  })

  it('says unsupported when the Mac cannot answer it remotely', () => {
    expect(toRelayQuestion({ ...ASK, unsupported: true })?.unsupported).toBe(true)
  })

  it('keeps a held question answerable, several questions included', () => {
    const held = toRelayQuestion({
      ...ASK,
      held: true,
      questions: [ASK.questions![0], { prompt: 'Which colours?', multiSelect: true, options: [{ label: 'Red' }, { label: 'Blue' }] }],
    })
    expect(held?.unsupported).toBe(false)
    expect(held?.questions.map((q) => q.multiSelect)).toEqual([false, true])
  })

  it('bounds every question, option and text', () => {
    const long = 'x'.repeat(5000)
    const options = Array.from({ length: 14 }, (_, i) => ({ label: `Option ${i}`, description: long }))
    const items = Array.from({ length: 3 }, () => ({ prompt: 'Pick one', header: long, options }))
    const published = toRelayQuestion({ ...ASK, held: true, questions: items })!
    expect(published.questions).toHaveLength(3)
    for (const q of published.questions) {
      expect(q.header).toHaveLength(300)
      expect(q.options).toHaveLength(10)
      for (const o of q.options) expect(o.description).toHaveLength(300)
    }
    // Nothing that an answer reads was cut: still answerable.
    expect(published.unsupported).toBe(false)
  })

  it('marks unsupported a question cut where an answer would read it', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ prompt: `Q${i}`, options: [{ label: 'A' }] }))
    const cutCount = toRelayQuestion({ ...ASK, held: true, questions: many })!
    expect(cutCount.questions).toHaveLength(4)
    expect(cutCount.unsupported).toBe(true)

    const cutLabel = toRelayQuestion({ ...ASK, questions: [{ prompt: 'Q', options: [{ label: 'y'.repeat(301) }] }] })!
    expect(cutLabel.questions[0].options[0].label).toHaveLength(300)
    expect(cutLabel.unsupported).toBe(true)

    const cutPrompt = toRelayQuestion({ ...ASK, questions: [{ prompt: 'z'.repeat(2001), options: [{ label: 'A' }] }] })!
    expect(cutPrompt.questions[0].prompt).toHaveLength(2000)
    expect(cutPrompt.unsupported).toBe(true)
  })

  it('never cuts through a character made of two UTF-16 units', () => {
    const published = toRelayQuestion({ ...ASK, questions: [{ prompt: '😀'.repeat(2001), options: [{ label: 'A' }] }] })!
    expect(Array.from(published.questions[0].prompt)).toHaveLength(2000)
    expect(published.questions[0].prompt.endsWith('😀')).toBe(true)
    expect(published.unsupported).toBe(true)
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
