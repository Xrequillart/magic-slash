import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { Agent, Config, PlanSpecInput } from '../../types'
import { NOOP_STORE, setStore } from './Store'

// readConfig is the opt-out gate; readAgents is what the reconcile walks. Both are
// mocked so this suite never touches the real config cache — and mocking config also
// keeps the session store (which resolves its file from it) out of the way.
const cfg = vi.hoisted(() => ({ config: {} as Config }))
vi.mock('../config/config', () => ({
  readConfig: () => cfg.config,
  CONFIG_DIR: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-plan-sync-test-config`,
}))

const agents = vi.hoisted(() => ({ list: [] as Agent[] }))
vi.mock('../config/agents', () => ({ readAgents: () => agents.list }))

vi.mock('../cloud/session-store', () => ({ loadSession: () => ({ user: { id: 'uid-1' } }) }))

// The outbox is a real file elsewhere (its own suite covers it). Here it records what
// a failed upload spooled, which is the only thing this module has to get right.
const spool = vi.hoisted(() => ({ entries: [] as unknown[] }))
vi.mock('./outbox', () => ({ enqueue: (entry: unknown) => spool.entries.push(entry) }))

import {
  flushPlanSpec,
  ideaFrom,
  reconcilePlanSpecs,
  recordPlanSession,
  resetPlanSyncForTests,
  schedulePlanSpecUpload,
  slugFor,
  specKeyFor,
} from './plan-sync'

const TMP = path.join(os.tmpdir(), `magic-slash-plan-sync-${process.pid}`)
// Inside a `.magic` directory, and named `spec-*.md`, because that is the shape the
// uploader accepts — the skill writes exactly here (`references/spec-template.md`).
const MAGIC = path.join(TMP, '.magic')
const SPEC = path.join(MAGIC, 'spec-add-plan-sync-20260821-101500.md')

let saved: PlanSpecInput[]
let failWrites = false

beforeAll(() => {
  fs.mkdirSync(MAGIC, { recursive: true })
})

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true })
})

beforeEach(() => {
  vi.useFakeTimers()
  resetPlanSyncForTests()
  fs.rmSync(SPEC, { force: true })
  cfg.config = {} as Config
  agents.list = []
  spool.entries = []
  saved = []
  failWrites = false
  setStore({
    ...NOOP_STORE,
    savePlanSpec: async (input) => {
      if (failWrites) throw new Error('offline')
      saved.push(input)
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('specKeyFor', () => {
  it('is a stable sha256 of the path, and never the path itself', () => {
    // The row is readable by the whole organization and an absolute path carries the
    // author's home directory — so what identifies a session must not be reversible.
    const key = specKeyFor('/Users/someone/work/api/.magic/spec-idea-20260821.md')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).toBe(specKeyFor('/Users/someone/work/api/.magic/spec-idea-20260821.md'))
    expect(key).not.toContain('someone')
  })

  it('gives two spec files two identities', () => {
    expect(specKeyFor('/a/spec-one.md')).not.toBe(specKeyFor('/a/spec-two.md'))
  })
})

describe('slugFor', () => {
  it('drops the spec- prefix and the .md suffix, and keeps the timestamp', () => {
    // The timestamp is what makes planning the same idea twice two sessions.
    expect(slugFor('/repo/.magic/spec-cloud-plan-sessions-20260821-101500.md'))
      .toBe('cloud-plan-sessions-20260821-101500')
  })

  it('leaves a filename that follows no convention alone', () => {
    expect(slugFor('/repo/.magic/notes.md')).toBe('notes')
  })
})

describe('ideaFrom', () => {
  const spec = [
    '# Spec — Cloud plan sessions',
    '',
    '## Idea',
    '',
    'Persist the sessions so a teammate can read the spec.',
    'Quoted where the wording carries intent.',
    '',
    '## Framing decisions',
    '',
    '| Question | Decision |',
  ].join('\n')

  it('returns the body of the frozen `## Idea` heading', () => {
    expect(ideaFrom(spec)).toBe(
      'Persist the sessions so a teammate can read the spec.\nQuoted where the wording carries intent.',
    )
  })

  it('stops at the next heading of any level', () => {
    const withSubsection = '## Idea\n\nThe idea.\n\n### Non-goals\n\n- not this\n'
    expect(ideaFrom(withSubsection)).toBe('The idea.')
  })

  it('is undefined on a spec whose idea is still empty', () => {
    // The template creates the file with its headings and no body, so this is the
    // shape of every spec for the first few seconds of a session.
    expect(ideaFrom('# Spec\n\n## Idea\n\n## Framing decisions\n')).toBeUndefined()
    expect(ideaFrom('# Spec\n\nno headings at all\n')).toBeUndefined()
  })
})

describe('the debounced upload', () => {
  it('collapses a burst of pings into ONE upsert of the file as it stands', async () => {
    // The spec is written section by section and every write pings. One upload per
    // ping would be a dozen round trips carrying almost the same document.
    fs.writeFileSync(SPEC, '## Idea\n\nfirst\n')
    schedulePlanSpecUpload('claude-1', SPEC)
    schedulePlanSpecUpload('claude-1', SPEC)
    fs.writeFileSync(SPEC, '## Idea\n\nlast\n')
    schedulePlanSpecUpload('claude-1', SPEC)

    expect(saved).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(3000)

    expect(saved).toHaveLength(1)
    // Read when the timer fired, not when the ping arrived: last write wins.
    expect(saved[0]).toEqual({ agentId: 'claude-1', specPath: SPEC, spec: '## Idea\n\nlast\n' })
  })

  it('does nothing at all when the spec file is not there', async () => {
    // The skill announces its spec path before creating the file, so a ping can
    // legitimately arrive first. It is a no-op, never an error.
    schedulePlanSpecUpload('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(3000)
    expect(saved).toEqual([])
    expect(spool.entries).toEqual([])
  })

  it('records the session even when no spec was ever written', async () => {
    // A plan whose agent was closed before anything was written is still a plan.
    recordPlanSession('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(3000)
    expect(saved).toEqual([{ agentId: 'claude-1', specPath: SPEC }])
  })

  it('uploads nothing when the user turned the sync off', async () => {
    cfg.config = { planSyncEnabled: false } as Config
    fs.writeFileSync(SPEC, '## Idea\n\nprivate\n')

    schedulePlanSpecUpload('claude-1', SPEC)
    recordPlanSession('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(3000)

    expect(saved).toEqual([])
    // And nothing is queued either: an opt-out is not a deferral.
    expect(spool.entries).toEqual([])
  })

  it('uploads when the setting was never chosen, which reads as ON', async () => {
    fs.writeFileSync(SPEC, '## Idea\n\ndefault on\n')
    schedulePlanSpecUpload('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(3000)
    expect(saved).toHaveLength(1)
  })

  it('spools the PATH (never the markdown) when the write fails', async () => {
    fs.writeFileSync(SPEC, '## Idea\n\noffline\n')
    failWrites = true

    schedulePlanSpecUpload('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(3000)

    expect(spool.entries).toEqual([
      { kind: 'planSpec', payload: { specPath: SPEC, agentId: 'claude-1', uid: 'uid-1' } },
    ])
  })

  it('sends immediately at session end, without waiting for the debounce', async () => {
    // archiveAgent releases the app id right after this, so there is no later moment.
    fs.writeFileSync(SPEC, '## Idea\n\nfinal\n')
    schedulePlanSpecUpload('claude-1', SPEC)
    flushPlanSpec('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(0)

    expect(saved).toHaveLength(1)
    // The pending timer was dropped rather than left to fire a second upsert.
    await vi.advanceTimersByTimeAsync(3000)
    expect(saved).toHaveLength(1)
  })
})

describe('the launch reconcile', () => {
  const agentWithSpec = (id: string, specPath: string): Agent =>
    ({ id, name: id, repositories: [], metadata: { specPath } }) as Agent

  it('uploads a spec whose file is newer than what the row last received', async () => {
    fs.writeFileSync(SPEC, '## Idea\n\nwritten while offline\n')
    agents.list = [agentWithSpec('claude-1', SPEC)]
    setStore({
      ...NOOP_STORE,
      savePlanSpec: async (input) => { saved.push(input) },
      loadPlanSyncState: async () => [
        { specKey: specKeyFor(SPEC), specSyncedAt: new Date(Date.now() - 60_000).toISOString() },
      ],
    })

    await reconcilePlanSpecs()
    await vi.advanceTimersByTimeAsync(3000)

    expect(saved).toHaveLength(1)
  })

  it('leaves a spec alone once the row is at least as fresh as the file', async () => {
    fs.writeFileSync(SPEC, '## Idea\n\nalready uploaded\n')
    agents.list = [agentWithSpec('claude-1', SPEC)]
    setStore({
      ...NOOP_STORE,
      savePlanSpec: async (input) => { saved.push(input) },
      loadPlanSyncState: async () => [
        { specKey: specKeyFor(SPEC), specSyncedAt: new Date(Date.now() + 60_000).toISOString() },
      ],
    })

    await reconcilePlanSpecs()
    await vi.advanceTimersByTimeAsync(3000)

    expect(saved).toEqual([])
  })

  it('skips an agent whose spec file is gone, and never asks the backend when none has one', async () => {
    let read = false
    agents.list = [agentWithSpec('claude-1', SPEC), { id: 'claude-2', name: 'B', repositories: [] } as Agent]
    setStore({
      ...NOOP_STORE,
      savePlanSpec: async (input) => { saved.push(input) },
      loadPlanSyncState: async () => { read = true; return [] },
    })

    await reconcilePlanSpecs()
    await vi.advanceTimersByTimeAsync(3000)
    // The one agent with a spec path has no file on disk, so nothing is uploaded —
    // but the state WAS read, since that agent was a candidate.
    expect(read).toBe(true)
    expect(saved).toEqual([])

    agents.list = [{ id: 'claude-2', name: 'B', repositories: [] } as Agent]
    read = false
    await reconcilePlanSpecs()
    expect(read).toBe(false)
  })
})

describe('what may be uploaded at all', () => {
  // `specPath` arrives over GET /metadata on a loopback server whose port sits in a
  // world-readable file, and whatever it names is read and published into a table the
  // whole organization can select from. These are the cases that must never upload.
  const rejected = (label: string, p: string): [string, string] => [label, p]

  it.each([
    rejected('a path outside any .magic directory', path.join(TMP, 'spec-elsewhere.md')),
    rejected('a secret dressed as a spec path', path.join(os.homedir(), '.ssh', 'id_rsa')),
    rejected('a .magic sibling that is not a spec', path.join(MAGIC, 'notes.md')),
    rejected('a spec prefix with no name', path.join(MAGIC, 'spec-.md')),
    rejected('a relative path', path.join('.magic', 'spec-relative.md')),
  ])('refuses %s', async (_label, candidate) => {
    fs.mkdirSync(path.dirname(candidate), { recursive: true })
    fs.writeFileSync(candidate, 'PRIVATE\n')

    schedulePlanSpecUpload('claude-1', candidate)
    recordPlanSession('claude-1', candidate)
    flushPlanSpec('claude-1', candidate)
    await vi.advanceTimersByTimeAsync(3000)

    expect(saved).toHaveLength(0)
    // Not spooled either: an entry the guard rejects must not come back at replay.
    expect(spool.entries).toHaveLength(0)
    fs.rmSync(candidate, { force: true })
  })

  it('refuses a spec larger than the ceiling, rather than uploading a truncated half', async () => {
    // A truncated spec reads as complete to whoever opens the page, which is worse
    // than an absent one.
    fs.writeFileSync(SPEC, 'x'.repeat(1024 * 1024 + 1))
    schedulePlanSpecUpload('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(3000)

    expect(saved).toHaveLength(0)
  })

  it('still accepts the ordinary spec the skill writes', async () => {
    fs.writeFileSync(SPEC, '## Idea\n\nship it\n')
    schedulePlanSpecUpload('claude-1', SPEC)
    await vi.advanceTimersByTimeAsync(3000)

    expect(saved).toHaveLength(1)
    expect(saved[0]?.spec).toContain('ship it')
  })
})
