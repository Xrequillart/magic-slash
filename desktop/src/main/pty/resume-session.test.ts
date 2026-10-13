import { describe, it, expect, vi, beforeEach } from 'vitest'

const existing = new Set<string>()
const files = new Map<string, string>()
vi.mock('fs', () => {
  const open = new Map<number, string>()
  let next = 3
  return {
    existsSync: (p: string) => existing.has(p),
    openSync: (p: string) => {
      const content = files.get(p)
      if (content === undefined) throw new Error('ENOENT')
      open.set(next, content)
      return next++
    },
    readSync: (fd: number, buffer: Buffer, offset: number, length: number) =>
      Buffer.from(open.get(fd) ?? '', 'utf8').copy(buffer, offset, 0, length),
    closeSync: (fd: number) => open.delete(fd),
    promises: {
    readFile: async (p: string) => {
      const content = files.get(p)
      if (content === undefined) throw new Error('ENOENT')
      return content
    },
  },
  }
})

import { cwdForTranscript, MAX_AGENT_SESSIONS, readSessionTitle, resumableSession, transcriptCwd, withSession } from './resume-session'

const ID = '0b7e3f52-9c1a-4d8e-a2f4-6b5c3d2e1f00'
const CWD = '/Users/me/Documents/magic-slash'
const TRANSCRIPT = `/Users/me/.claude/projects/-Users-me-Documents-magic-slash/${ID}.jsonl`

describe('resumableSession', () => {
  beforeEach(() => {
    existing.clear()
    files.clear()
    existing.add(TRANSCRIPT)
  })

  it('resumes the session the transcript names, where the agent runs', () => {
    expect(resumableSession(TRANSCRIPT, CWD)).toEqual({ id: ID, cwd: CWD })
  })

  it('starts fresh when no transcript was recorded', () => {
    expect(resumableSession(undefined, CWD)).toBeNull()
  })

  it('starts fresh when the file is not on this machine', () => {
    existing.clear()
    expect(resumableSession(TRANSCRIPT, CWD)).toBeNull()
  })

  it('starts fresh when the session belongs to another directory it does not name', () => {
    expect(resumableSession(TRANSCRIPT, '/Users/me/Documents')).toBeNull()
  })

  it('resumes in the checkout a session started in, for an agent since moved to a worktree', () => {
    files.set(TRANSCRIPT, line({ type: 'mode' }) + line({ type: 'user', cwd: CWD }) + line({ type: 'user', cwd: `${CWD}/desktop` }))
    existing.add(CWD)
    expect(resumableSession(TRANSCRIPT, `${CWD}-356`)).toEqual({ id: ID, cwd: CWD })
  })

  it('encodes dots and underscores the way Claude Code does', () => {
    const t = `/Users/me/.claude/projects/-Users-me--config-my-app/${ID}.jsonl`
    existing.add(t)
    expect(resumableSession(t, '/Users/me/.config/my_app')).toEqual({ id: ID, cwd: '/Users/me/.config/my_app' })
  })

  it('refuses a file name that is not a session id', () => {
    const t = '/Users/me/.claude/projects/-Users-me-Documents-magic-slash/$(rm -rf ~).jsonl'
    existing.add(t)
    expect(resumableSession(t, CWD)).toBeNull()
  })
})

const line = (entry: Record<string, unknown>) => `${JSON.stringify(entry)}\n`

describe('transcriptCwd', () => {
  beforeEach(() => {
    existing.clear()
    files.clear()
  })

  it('reads the start directory off the line whose cwd is the file\'s folder', () => {
    files.set(TRANSCRIPT, line({ type: 'user', cwd: `${CWD}/ios` }) + line({ type: 'user', cwd: CWD }))
    existing.add(CWD)
    expect(transcriptCwd(TRANSCRIPT)).toBe(CWD)
  })

  it('says none when that directory is gone, or no line names it', () => {
    files.set(TRANSCRIPT, line({ type: 'user', cwd: CWD }))
    expect(transcriptCwd(TRANSCRIPT)).toBeNull()
    files.set(TRANSCRIPT, line({ type: 'user', cwd: '/elsewhere' }))
    existing.add('/elsewhere')
    expect(transcriptCwd(TRANSCRIPT)).toBeNull()
  })

  it('says none for a file it cannot read', () => {
    expect(transcriptCwd(TRANSCRIPT)).toBeNull()
  })
})

describe('cwdForTranscript', () => {
  beforeEach(() => {
    existing.clear()
    files.clear()
  })

  it('finds the directory the session was started in', () => {
    expect(cwdForTranscript(TRANSCRIPT, ['/Users/me/Documents', CWD])).toBe(CWD)
  })

  it('falls back on the directory the transcript names', () => {
    files.set(TRANSCRIPT, line({ type: 'user', cwd: CWD }))
    existing.add(CWD)
    expect(cwdForTranscript(TRANSCRIPT, ['/Users/me/Documents'])).toBe(CWD)
  })

  it('says none when no candidate matches and the transcript names none', () => {
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
