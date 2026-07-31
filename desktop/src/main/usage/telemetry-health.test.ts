import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../config/config', () => ({ readConfig: vi.fn() }))
vi.mock('../cloud/session-store', () => ({ loadSession: vi.fn() }))
vi.mock('../store/outbox', () => ({ outboxStats: vi.fn() }))
vi.mock('./skill-spool', () => ({ spooledSkillRunCount: vi.fn() }))
vi.mock('fs', () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }))
vi.mock('child_process', () => ({ execFileSync: vi.fn() }))

import * as fs from 'fs'
import { execFileSync } from 'child_process'
import { readConfig } from '../config/config'
import { loadSession } from '../cloud/session-store'
import { outboxStats } from '../store/outbox'
import { spooledSkillRunCount } from './skill-spool'
import { telemetryHealth } from './telemetry-health'

const HOOK_INSTALLED = JSON.stringify({
  hooks: {
    PreToolUse: [
      { matcher: 'Bash', hooks: [{ command: 'something-else' }] },
      { matcher: 'Skill', hooks: [{ command: 'jq ... # magic-slash-desktop' }] },
    ],
  },
})

/** Everything working: the baseline each test degrades one thing from. */
beforeEach(() => {
  vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: true })
  vi.mocked(loadSession).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof loadSession>)
  vi.mocked(outboxStats).mockReturnValue({ pending: 0, droppedSinceStart: 0 })
  vi.mocked(spooledSkillRunCount).mockReturnValue(0)
  vi.mocked(fs.existsSync).mockReturnValue(true)
  vi.mocked(fs.readFileSync).mockReturnValue(HOOK_INSTALLED)
  vi.mocked(execFileSync).mockReturnValue(Buffer.from('/usr/bin/jq'))
})

describe('telemetryHealth', () => {
  it('reports no issue when everything records', () => {
    expect(telemetryHealth()).toMatchObject({ recordingEnabled: true, issues: [] })
  })

  // The distinction this whole panel exists for: a user who turned recording OFF has
  // a working app, not a broken one. Reporting their choice as a fault is how a
  // health panel teaches people to ignore it.
  it('treats recording being off as a state, never as an issue', () => {
    vi.mocked(readConfig).mockReturnValue({ version: 'x', repositories: {}, usageLogsEnabled: false })
    vi.mocked(fs.existsSync).mockReturnValue(false) // hook absent too
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('no jq') })

    const health = telemetryHealth()

    expect(health.recordingEnabled).toBe(false)
    // Nothing is SUPPOSED to be recorded, so a missing hook is not a problem to fix.
    expect(health.issues).toEqual([])
  })

  it('flags a missing hook — nothing is counted until it is back', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false)
    expect(telemetryHealth().issues).toContain('hook-missing')
  })

  it('flags a hook entry that is not ours', () => {
    // A user's own Skill hook must not be mistaken for the telemetry one.
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Skill', hooks: [{ command: 'mine.sh' }] }] } }),
    )
    expect(telemetryHealth().issues).toContain('hook-missing')
  })

  it('flags a missing jq — the failure that is otherwise invisible', () => {
    // Without jq the hook emits nothing and exits 0, so the machine looks healthy
    // from every other angle while recording precisely zero runs.
    vi.mocked(execFileSync).mockImplementation(() => { throw new Error('not found') })
    expect(telemetryHealth().issues).toContain('jq-missing')
  })

  it('flags being signed out', () => {
    vi.mocked(loadSession).mockReturnValue(null)
    expect(telemetryHealth().issues).toContain('signed-out')
  })

  it('flags overflow, which is the one loss that cannot be recovered', () => {
    vi.mocked(outboxStats).mockReturnValue({ pending: 5000, droppedSinceStart: 12 })
    expect(telemetryHealth().issues).toContain('queue-overflowed')
  })

  it('does not flag a backlog that is merely waiting', () => {
    // Queued events retry on their own; calling that a fault would cry wolf at every
    // user who spent an afternoon offline.
    vi.mocked(outboxStats).mockReturnValue({ pending: 42, droppedSinceStart: 0 })
    vi.mocked(spooledSkillRunCount).mockReturnValue(7)

    const health = telemetryHealth()

    expect(health.issues).toEqual([])
    expect(health.queuedEvents).toBe(42)
    expect(health.spooledSkillRuns).toBe(7)
  })

  it('survives an unreadable settings.json', () => {
    vi.mocked(fs.readFileSync).mockImplementation(() => { throw new Error('EACCES') })
    expect(() => telemetryHealth()).not.toThrow()
    expect(telemetryHealth().issues).toContain('hook-missing')
  })
})
