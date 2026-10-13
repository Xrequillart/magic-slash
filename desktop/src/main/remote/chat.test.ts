import { describe, expect, it } from 'vitest'
import type { ChatEntry } from '../../types'
import { CHAT_LEASE_MS, CHAT_LIMITS, ChatLeases, toRelayChat } from './chat'

const say = (i: number, text = `message ${i}`): ChatEntry => ({ kind: 'assistant', id: `a${i}`, text })

describe('toRelayChat', () => {
  it('keeps text, tool names and summaries, and leaves outputs and diffs on the Mac', () => {
    const body = toRelayChat({
      entries: [
        { kind: 'user', id: 'u1', text: 'Fix it', at: 5 },
        { kind: 'tool', id: 't1', name: 'Bash', summary: 'npm test', status: 'done', output: 'secret', diffs: [] },
      ],
      queue: [{ id: 'q1', text: 'Then commit', at: 9 }],
      background: [],
    }, 'claude-1', 3)
    expect(body).toEqual({
      appAgentId: 'claude-1',
      generation: 3,
      entries: [
        { kind: 'user', id: 'u1', text: 'Fix it', at: 5 },
        { kind: 'tool', id: 't1', name: 'Bash', summary: 'npm test', status: 'done' },
      ],
      queue: [{ id: 'q1', text: 'Then commit' }],
      hasEarlier: false,
    })
  })

  it('keeps the newest entries when there are too many, and says older ones exist', () => {
    const entries = Array.from({ length: CHAT_LIMITS.entries + 5 }, (_, i) => say(i))
    const body = toRelayChat({ entries, queue: [], background: [] }, 'claude-1', 1)
    expect(body.entries).toHaveLength(CHAT_LIMITS.entries)
    expect(body.entries.at(-1)).toMatchObject({ id: `a${CHAT_LIMITS.entries + 4}` })
    expect(body.hasEarlier).toBe(true)
  })

  it('stays under the byte budget, and cuts a long message and marks it', () => {
    const long = 'é'.repeat(CHAT_LIMITS.text + 10)
    const entries = Array.from({ length: 60 }, (_, i) => say(i, long))
    const body = toRelayChat({ entries, queue: [], background: [] }, 'claude-1', 1)
    expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThan(CHAT_LIMITS.bytes + 500)
    expect(body.entries.at(-1)).toMatchObject({ id: 'a59', cut: true })
    expect(Array.from((body.entries[0] as { text: string }).text)).toHaveLength(CHAT_LIMITS.text)
    expect(body.hasEarlier).toBe(true)
  })
})

describe('ChatLeases', () => {
  it('one agent per phone, until the lease runs out', () => {
    const leases = new ChatLeases()
    leases.renew('p1', 'a', 0)
    leases.renew('p2', 'a', 0)
    leases.renew('p2', 'b', 10)
    expect(leases.readers('a', 1)).toEqual(['p1'])
    expect(leases.readers('b', 1)).toEqual(['p2'])
    expect(leases.readers('a', CHAT_LEASE_MS)).toEqual([])
  })
})
