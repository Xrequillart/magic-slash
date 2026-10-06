import { describe, expect, it } from 'vitest'
import type { ChatEntry } from '../../types'
import { DIGEST_BUDGET, DIGEST_SESSIONS, digestSessions } from './session-digest'

const user = (id: string, text: string): ChatEntry => ({ kind: 'user', id, text })
const claude = (id: string, text: string): ChatEntry => ({ kind: 'assistant', id, text })
const tool = (id: string, name: string, summary: string): ChatEntry => ({ kind: 'tool', id, name, summary, status: 'done' })

describe('digestSessions', () => {
  it('is null when no conversation has a prompt', () => {
    expect(digestSessions([])).toBeNull()
    expect(digestSessions([{ startedAt: 1, entries: [claude('a', 'hello')] }])).toBeNull()
  })

  it('keeps each prompt, the answer that closed it and the files changed, not the reads', () => {
    const digest = digestSessions([{
      title: 'Add the sidebar pages',
      startedAt: Date.UTC(2026, 9, 6, 9, 30),
      entries: [
        user('u1', 'Add a settings page'),
        claude('a1', 'Looking at the sidebar first.'),
        tool('t1', 'Read', 'src/Sidebar.tsx'),
        tool('t2', 'Edit', 'src/Sidebar.tsx'),
        claude('a2', 'Done: the page is in the sidebar.'),
      ],
    }])!
    expect(digest).toContain('## 1. Add the sidebar pages (started 2026-10-06 09:30 UTC)')
    expect(digest).toContain('**User:** Add a settings page')
    expect(digest).toContain('**Claude:** Done: the page is in the sidebar.')
    expect(digest).not.toContain('Looking at the sidebar first.')
    expect(digest).toContain('*Files changed:* `src/Sidebar.tsx`')
  })

  it('takes the newest conversations first, at most DIGEST_SESSIONS', () => {
    const sessions = Array.from({ length: DIGEST_SESSIONS + 2 }, (_, i) => ({
      title: `Session ${i}`,
      startedAt: i,
      entries: [user(`u${i}`, `prompt ${i}`)],
    }))
    const digest = digestSessions(sessions)!
    expect(digest.indexOf(`Session ${DIGEST_SESSIONS + 1}`)).toBeLessThan(digest.indexOf(`Session ${DIGEST_SESSIONS}`))
    expect(digest).not.toContain('Session 0')
    expect(digest).not.toContain('Session 1 ')
  })

  it('stays within its budget, keeping the turns a conversation ended on', () => {
    const entries = Array.from({ length: 200 }, (_, i) => [user(`u${i}`, `prompt ${i} ${'x'.repeat(500)}`), claude(`a${i}`, 'ok')]).flat()
    const digest = digestSessions([{ startedAt: 1, entries }])!
    expect(digest.length).toBeLessThan(DIGEST_BUDGET + 2_000)
    expect(digest).toContain('prompt 199')
    expect(digest).not.toContain('prompt 0 ')
    expect(digest).toMatch(/earlier turns left out/)
  })
})
