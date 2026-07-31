import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import type { SkillInvocationInput, SkillRunEndInput } from '../../types'

// The spool resolves its file from os.homedir() at import time, so the mock has to be
// hoisted above it and the path has to be computable without touching the filesystem.
const { TMP_HOME } = vi.hoisted(() => ({
  TMP_HOME: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-spool-test-${process.pid}`,
}))

vi.mock('os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('os')>()
  return { ...actual, default: { ...actual, homedir: () => TMP_HOME }, homedir: () => TMP_HOME }
})

// The drain's job is to hand records over; what happens to them afterwards (the
// magic-* filter, the opt-in, the outbox) belongs to recordSkillInvocation and is
// tested there.
vi.mock('./skill-invocations', () => ({
  recordSkillInvocation: vi.fn(async () => {}),
  closeSkillRun: vi.fn(async () => {}),
}))
import { closeSkillRun, recordSkillInvocation } from './skill-invocations'
import { drainSkillSpool, spooledSkillRunCount } from './skill-spool'

const CONFIG_DIR = path.join(TMP_HOME, '.config', 'magic-slash')
const SPOOL_FILE = path.join(CONFIG_DIR, 'pending-skills.ndjson')
const DRAINING_FILE = `${SPOOL_FILE}.draining`

/** Append records the way the PreToolUse hook does. */
function spool(...records: object[]): void {
  fs.appendFileSync(SPOOL_FILE, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
}

const start = (skill: string, agentId = 'claude-1') => ({ type: 'start', skill, agentId, occurredAt: 1000 })
const end = (skill: string, outcome = 'success', occurredAt = 9000) =>
  ({ type: 'end', skill, agentId: 'claude-1', outcome, occurredAt })

const recorded = () => vi.mocked(recordSkillInvocation).mock.calls.map((c) => c[0] as SkillInvocationInput)
const closed = () => vi.mocked(closeSkillRun).mock.calls.map((c) => c[0] as SkillRunEndInput)

beforeAll(() => fs.mkdirSync(CONFIG_DIR, { recursive: true }))
afterAll(() => fs.rmSync(TMP_HOME, { recursive: true, force: true }))

beforeEach(() => {
  fs.rmSync(SPOOL_FILE, { force: true })
  fs.rmSync(DRAINING_FILE, { force: true })
  vi.mocked(recordSkillInvocation).mockClear()
  vi.mocked(recordSkillInvocation).mockImplementation(async () => {})
  vi.mocked(closeSkillRun).mockClear()
  vi.mocked(closeSkillRun).mockImplementation(async () => {})
})

describe('drainSkillSpool', () => {
  it('records every spooled run and clears the spool', async () => {
    spool(start('magic-commit'), start('magic-pr'))

    expect(await drainSkillSpool()).toBe(2)
    expect(recorded().map((r) => r.skill)).toEqual(['magic-commit', 'magic-pr'])
    expect(fs.existsSync(SPOOL_FILE)).toBe(false)
    expect(fs.existsSync(DRAINING_FILE)).toBe(false)
  })

  it('preserves the moment the run happened, not the moment it was drained', async () => {
    // The whole point of the spool is that the drain can be hours later — with the
    // app closed overnight, say. Stamping "now" would pile a week of work onto the
    // day the app was next opened.
    spool(start('magic-commit'))
    await drainSkillSpool()
    expect(recorded()[0].occurredAt).toBe(1000)
  })

  it('treats a run with no terminal as agentless rather than as agent ""', async () => {
    // The hook writes an empty string when MAGIC_SLASH_TERMINAL_ID is unset, which
    // is every Claude Code the app did not spawn.
    spool({ type: 'start', skill: 'magic-start', agentId: '', occurredAt: 1000 })
    await drainSkillSpool()
    expect(recorded()[0].agentId).toBeUndefined()
  })

  it('is a no-op on an empty spool', async () => {
    expect(await drainSkillSpool()).toBe(0)
    expect(recordSkillInvocation).not.toHaveBeenCalled()
  })

  it('does not lose a run appended while the drain is in flight', async () => {
    // The hook appends from any number of concurrent sessions. Reading and then
    // truncating would silently discard whatever landed in between.
    spool(start('magic-commit'))
    vi.mocked(recordSkillInvocation).mockImplementation(async () => {
      spool(start('magic-pr')) // a hook fires mid-drain
    })

    expect(await drainSkillSpool()).toBe(1)

    vi.mocked(recordSkillInvocation).mockImplementation(async () => {})
    expect(await drainSkillSpool()).toBe(1)
    expect(recorded().map((r) => r.skill)).toEqual(['magic-commit', 'magic-pr'])
  })

  it('retries a batch the app died in the middle of', async () => {
    // A leftover .draining file is a drain that never finished. Its records are not
    // stranded — retrying is safe because recordSkillInvocation owns the outbox.
    fs.writeFileSync(DRAINING_FILE, JSON.stringify(start('magic-done')) + '\n')
    spool(start('magic-commit'))

    expect(await drainSkillSpool()).toBe(2)
    expect(recorded().map((r) => r.skill)).toEqual(['magic-done', 'magic-commit'])
  })

  it('skips a torn line rather than discarding the batch', async () => {
    spool(start('magic-commit'))
    fs.appendFileSync(SPOOL_FILE, '{"type":"start","ski\n')
    spool(start('magic-pr'))

    expect(await drainSkillSpool()).toBe(2)
    expect(recorded().map((r) => r.skill)).toEqual(['magic-commit', 'magic-pr'])
  })

  it('ignores a record type it does not understand', async () => {
    // Written by a newer version after a downgrade. Recording it as a start would
    // invent a run that never happened.
    spool({ type: 'whatever', skill: 'magic-commit', agentId: 'claude-1' }, start('magic-pr'))

    expect(await drainSkillSpool()).toBe(1)
    expect(recorded().map((r) => r.skill)).toEqual(['magic-pr'])
  })

  it('shares one run between concurrent callers', async () => {
    spool(start('magic-commit'))
    const [a, b] = await Promise.all([drainSkillSpool(), drainSkillSpool()])
    expect([a, b]).toEqual([1, 1])
    expect(recorded()).toHaveLength(1)
  })
})

// The closing half, written by the last step of each SKILL.md. It goes through the
// same spool as the start so it works with the app closed too — which matters most
// here: a close that never arrives leaves the run reading as abandoned.
describe('closing records', () => {
  it('closes a run with the outcome and the moment the skill reported', async () => {
    spool(end('magic-commit', 'success', 9000))

    expect(await drainSkillSpool()).toBe(1)
    expect(closed()).toEqual([
      { skill: 'magic-commit', agentId: 'claude-1', outcome: 'success', occurredAt: 9000 },
    ])
    expect(recorded()).toEqual([])
  })

  it('applies a start before the close that follows it', async () => {
    // close_skill_run only matches a run that is already OPEN. Draining these out of
    // order would find nothing to close and leave a finished run marked abandoned.
    const order: string[] = []
    vi.mocked(recordSkillInvocation).mockImplementation(async () => { order.push('start') })
    vi.mocked(closeSkillRun).mockImplementation(async () => { order.push('end') })

    spool(start('magic-commit'), end('magic-commit'))
    await drainSkillSpool()

    expect(order).toEqual(['start', 'end'])
  })

  it('rejects a close with no outcome rather than guessing one', async () => {
    spool({ type: 'end', skill: 'magic-commit', agentId: 'claude-1', occurredAt: 9000 })
    expect(await drainSkillSpool()).toBe(0)
    expect(closed()).toEqual([])
  })

  it('rejects a close with an outcome it does not know', async () => {
    spool(end('magic-commit', 'kinda-worked'))
    expect(await drainSkillSpool()).toBe(0)
    expect(closed()).toEqual([])
  })

  it('rejects a close with no timestamp rather than stamping the drain time', async () => {
    // Defaulting to now() would turn a night spent with the app closed into a
    // ten-hour /magic:commit.
    spool({ type: 'end', skill: 'magic-commit', agentId: 'claude-1', outcome: 'success' })
    expect(await drainSkillSpool()).toBe(0)
    expect(closed()).toEqual([])
  })

  it('closes an agentless run as agentless', async () => {
    spool({ type: 'end', skill: 'magic-start', agentId: '', outcome: 'success', occurredAt: 9000 })
    await drainSkillSpool()
    expect(closed()[0].agentId).toBeUndefined()
  })
})

describe('spooledSkillRunCount', () => {
  it('reports what is waiting, for the health check', () => {
    expect(spooledSkillRunCount()).toBe(0)
    spool(start('magic-commit'), start('magic-pr'))
    expect(spooledSkillRunCount()).toBe(2)
  })
})
