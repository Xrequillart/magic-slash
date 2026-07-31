import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import type { HistoryEntry, SkillInvocationInput, UsageEventInput } from '../../types'
import type { Store } from './Store'
import { setStore, NOOP_STORE } from './Store'

// The queue resolves its file from os.homedir() at import time, so the mock has to be
// hoisted above it and the path has to be computable without touching the filesystem.
const { TMP_HOME } = vi.hoisted(() => ({
  TMP_HOME: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-outbox-test-${process.pid}`,
}))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, default: { ...actual, homedir: () => TMP_HOME }, homedir: () => TMP_HOME }
})

import { enqueue, flushOutbox, outboxStats, resetOutboxCacheForTests } from './outbox'

const OUTBOX_FILE = path.join(TMP_HOME, '.config', 'magic-slash', 'outbox.ndjson')

const historyEntry = (id: string): HistoryEntry => ({
  agentId: 'claude-1',
  agentName: 'Agent A',
  action: 'started',
  repositories: [],
  timestamp: 1000,
  clientEventId: id,
})

interface Delivered {
  history: HistoryEntry[]
  usage: UsageEventInput[]
  skill: SkillInvocationInput[]
}

let delivered: Delivered

/** A store that records deliveries and can be told to start failing. */
function fakeStore(failFrom?: (entry: HistoryEntry) => boolean): Store {
  return {
    ...NOOP_STORE,
    appendHistory: async (e) => {
      if (failFrom?.(e)) throw new Error('offline')
      delivered.history.push(e)
    },
    appendUsage: async (e) => { delivered.usage.push(e) },
    recordSkillInvocation: async (i) => { delivered.skill.push(i) },
  }
}

beforeAll(() => {
  fs.mkdirSync(path.dirname(OUTBOX_FILE), { recursive: true })
})

afterAll(() => {
  fs.rmSync(TMP_HOME, { recursive: true, force: true })
})

beforeEach(() => {
  fs.rmSync(OUTBOX_FILE, { force: true })
  resetOutboxCacheForTests()
  delivered = { history: [], usage: [], skill: [] }
  setStore(fakeStore())
})

describe('enqueue', () => {
  it('survives the process: the queue is on disk, not in memory', () => {
    enqueue({ kind: 'history', payload: historyEntry('a') })
    expect(fs.existsSync(OUTBOX_FILE)).toBe(true)
    expect(fs.readFileSync(OUTBOX_FILE, 'utf-8').trim().split('\n')).toHaveLength(1)
  })

  it('keeps the queue private to the user', () => {
    enqueue({ kind: 'history', payload: historyEntry('a') })
    // These rows describe what a human did and when. 0600, like the port file.
    expect(fs.statSync(OUTBOX_FILE).mode & 0o777).toBe(0o600)
  })
})

describe('flushOutbox', () => {
  it('delivers every queued event and empties the queue', async () => {
    enqueue({ kind: 'history', payload: historyEntry('a') })
    enqueue({ kind: 'usage', payload: { agentId: 'claude-1', clientEventId: 'b' } })
    enqueue({ kind: 'skill', payload: { skill: 'magic-pr', clientEventId: 'c' } })

    expect(await flushOutbox()).toBe(3)
    expect(delivered.history).toHaveLength(1)
    expect(delivered.usage).toHaveLength(1)
    expect(delivered.skill).toHaveLength(1)
    expect(outboxStats().pending).toBe(0)
  })

  it('replays in the order the events happened', async () => {
    enqueue({ kind: 'history', payload: historyEntry('a') })
    enqueue({ kind: 'history', payload: historyEntry('b') })
    enqueue({ kind: 'history', payload: historyEntry('c') })

    await flushOutbox()

    expect(delivered.history.map((e) => e.clientEventId)).toEqual(['a', 'b', 'c'])
  })

  it('carries the SAME clientEventId the first attempt used', async () => {
    // This is what makes a replay safe. A key minted at replay time would insert a
    // second row for an event whose first write had actually committed.
    enqueue({ kind: 'history', payload: historyEntry('minted-once') })
    await flushOutbox()
    expect(delivered.history[0].clientEventId).toBe('minted-once')
  })

  it('stops at the first failure and keeps the rest, in order', async () => {
    // The failure is almost always "the backend is unreachable". Walking the whole
    // backlog to learn that once per entry would hammer a network already down.
    enqueue({ kind: 'history', payload: historyEntry('a') })
    enqueue({ kind: 'history', payload: historyEntry('b') })
    enqueue({ kind: 'history', payload: historyEntry('c') })
    setStore(fakeStore((e) => e.clientEventId !== 'a'))

    expect(await flushOutbox()).toBe(1)
    expect(delivered.history.map((e) => e.clientEventId)).toEqual(['a'])

    const remaining = fs.readFileSync(OUTBOX_FILE, 'utf-8').trim().split('\n')
    expect(remaining.map((l) => JSON.parse(l).payload.clientEventId)).toEqual(['b', 'c'])
    expect(outboxStats().pending).toBe(2)
  })

  it('leaves the queue untouched when nothing can be delivered', async () => {
    enqueue({ kind: 'history', payload: historyEntry('a') })
    setStore(fakeStore(() => true))

    expect(await flushOutbox()).toBe(0)
    expect(outboxStats().pending).toBe(1)
  })

  it('is a no-op on an empty queue and does not create the file', async () => {
    expect(await flushOutbox()).toBe(0)
    expect(fs.existsSync(OUTBOX_FILE)).toBe(false)
  })

  it('shares one run between concurrent callers', async () => {
    // The connectivity gate polls every 20s and on focus; two overlapping flushes
    // would deliver each event twice within one process.
    enqueue({ kind: 'history', payload: historyEntry('a') })
    const [first, second] = await Promise.all([flushOutbox(), flushOutbox()])
    // Both callers observe the same run, so both see its count — what must not
    // happen is the event reaching the store twice.
    expect([first, second]).toEqual([1, 1])
    expect(delivered.history).toHaveLength(1)
  })

  it('skips a torn line rather than discarding the whole backlog', async () => {
    // A crash mid-append leaves half a line. The other events are still good.
    enqueue({ kind: 'history', payload: historyEntry('a') })
    fs.appendFileSync(OUTBOX_FILE, '{"kind":"history","payl\n')
    enqueue({ kind: 'history', payload: historyEntry('c') })
    resetOutboxCacheForTests()

    expect(await flushOutbox()).toBe(2)
    expect(delivered.history.map((e) => e.clientEventId)).toEqual(['a', 'c'])
  })
})

describe('overflow', () => {
  it('drops the OLDEST events past the cap and counts the loss', () => {
    // Recent activity is the more useful signal, and an overflow is the one loss
    // this design still has — so it is counted, not inferred from a gap in a chart.
    for (let i = 0; i < 5600; i++) enqueue({ kind: 'history', payload: historyEntry(`e${i}`) })

    const stats = outboxStats()
    // Trimming on the first append past the cap would rewrite the whole file on
    // every append after it, so the queue is allowed to overshoot by the 10%
    // compaction slack and is trimmed in one pass. The bound is what matters.
    expect(stats.pending).toBeLessThanOrEqual(5500)
    // The invariant that matters: every event is either still queued or counted as
    // dropped. None may go missing without appearing in the loss figure.
    expect(stats.pending + stats.droppedSinceStart).toBe(5600)

    const lines = fs.readFileSync(OUTBOX_FILE, 'utf-8').trim().split('\n')
    // The newest survived; the oldest did not.
    expect(JSON.parse(lines[lines.length - 1]).payload.clientEventId).toBe('e5599')
    expect(lines.some((l) => JSON.parse(l).payload.clientEventId === 'e0')).toBe(false)
  })
})
