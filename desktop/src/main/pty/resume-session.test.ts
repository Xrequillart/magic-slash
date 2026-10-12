import { describe, it, expect, vi, beforeEach } from 'vitest'

const existing = new Set<string>()
const files = new Map<string, string>()
vi.mock('fs', () => ({
  existsSync: (p: string) => existing.has(p),
  promises: {
    readFile: async (p: string) => {
      const content = files.get(p)
      if (content === undefined) throw new Error('ENOENT')
      return content
    },
  },
}))

import { cwdForTranscript, MAX_AGENT_SESSIONS, readSessionTitle, resumableSessionId, withSession } from './resume-session'

const ID = '0b7e3f52-9c1a-4d8e-a2f4-6b5c3d2e1f00'
const CWD = '/Users/me/Documents/magic-slash'
const TRANSCRIPT = `/Users/me/.claude/projects/-Users-me-Documents-magic-slash/${ID}.jsonl`

describe('resumableSessionId', () => {
  beforeEach(() => {
    existing.clear()
    existing.add(TRANSCRIPT)
  })

  it('resumes the session the transcript names', () => {
    expect(resumableSessionId(TRANSCRIPT, CWD)).toBe(ID)
  })

  it('starts fresh when no transcript was recorded', () => {
    expect(resumableSessionId(undefined, CWD)).toBeNull()
  })

  it('starts fresh when the file is not on this machine', () => {
    existing.clear()
    expect(resumableSessionId(TRANSCRIPT, CWD)).toBeNull()
  })

  it('starts fresh when the session belongs to another directory', () => {
    expect(resumableSessionId(TRANSCRIPT, '/Users/me/Documents')).toBeNull()
  })

  it('encodes dots and underscores the way Claude Code does', () => {
    const t = `/Users/me/.claude/projects/-Users-me--config-my-app/${ID}.jsonl`
    existing.add(t)
    expect(resumableSessionId(t, '/Users/me/.config/my_app')).toBe(ID)
  })

  it('refuses a file name that is not a session id', () => {
    const t = '/Users/me/.claude/projects/-Users-me-Documents-magic-slash/$(rm -rf ~).jsonl'
    existing.add(t)
    expect(resumableSessionId(t, CWD)).toBeNull()
  })
})

describe('cwdForTranscript', () => {
  it('finds the directory the session was started in', () => {
    expect(cwdForTranscript(TRANSCRIPT, ['/Users/me/Documents', CWD])).toBe(CWD)
  })

  it('says none when no candidate matches', () => {
    expect(cwdForTranscript(TRANSCRIPT, ['/Users/me/Documents'])).toBeNull()
  })
})

describe('withSession', () => {
  it('adds a new session', () => {
    expect(withSession(undefined, TRANSCRIPT, 1)).toEqual([{ transcriptPath: TRANSCRIPT, startedAt: 1 }])
  })

  it('says nothing changed for a known session', () => {
    expect(withSession([{ transcriptPath: TRANSCRIPT, startedAt: 1 }], TRANSCRIPT, 2)).toBeNull()
  })

  it('drops the oldest past the cap', () => {
    const full = Array.from({ length: MAX_AGENT_SESSIONS }, (_, i) => ({ transcriptPath: `/p/${i}.jsonl`, startedAt: i }))
    const next = withSession(full, TRANSCRIPT, 99)!
    expect(next).toHaveLength(MAX_AGENT_SESSIONS)
    expect(next[0].transcriptPath).toBe('/p/1.jsonl')
    expect(next.at(-1)!.transcriptPath).toBe(TRANSCRIPT)
  })
})

describe('readSessionTitle', () => {
  const lines = (...entries: object[]) => entries.map((e) => JSON.stringify(e)).join('\n')

  it('prefers the title the user gave, then the generated one, then the last prompt', async () => {
    files.set(TRANSCRIPT, lines(
      { type: 'last-prompt', lastPrompt: 'fix it' },
      { type: 'ai-title', aiTitle: 'Old title' },
      { type: 'ai-title', aiTitle: 'Fix the restart button' },
    ))
    expect(await readSessionTitle(TRANSCRIPT)).toBe('Fix the restart button')

    files.set(TRANSCRIPT, lines({ type: 'ai-title', aiTitle: 'Generated' }, { type: 'custom-title', customTitle: 'Mine' }))
    expect(await readSessionTitle(TRANSCRIPT)).toBe('Mine')

    files.set(TRANSCRIPT, lines({ type: 'last-prompt', lastPrompt: 'fix it' }) + '\n{"type":"ai-title","aiT')
    expect(await readSessionTitle(TRANSCRIPT)).toBe('fix it')
  })

  it('is undefined for a file it cannot read', async () => {
    files.delete(TRANSCRIPT)
    expect(await readSessionTitle(TRANSCRIPT)).toBeUndefined()
  })
})
