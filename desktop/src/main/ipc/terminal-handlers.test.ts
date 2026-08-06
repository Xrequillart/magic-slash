import { describe, it, expect, vi, beforeEach } from 'vitest'

// terminal-handlers pulls in Electron + node-pty (native) + the config/store
// modules transitively. Mock every dependency so we exercise only the session-end
// dedup logic. Same mock-everything style as config-handlers.test.ts.

// ipcMain.handle registrations are captured so tests can invoke a handler directly.
const handlers = new Map<string, (event: unknown, arg: unknown) => unknown>()
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: (event: unknown, arg: unknown) => unknown) => {
      handlers.set(channel, handler)
    }),
  },
  BrowserWindow: class {},
}))

// terminal-manager is the source of getTerminal (the in-memory usage gauge) and
// createTerminal (whose onExit arg we capture to simulate the natural-exit path).
const term = vi.hoisted(() => ({
  getTerminal: vi.fn(),
  createTerminal: vi.fn(),
  killTerminal: vi.fn(),
}))
// Captured onExit callback from the most recent createTerminal call.
let capturedOnExit: ((code: number) => void) | undefined

vi.mock('../pty/terminal-manager', () => ({
  createTerminal: (...args: unknown[]) => {
    capturedOnExit = args[5] as (code: number) => void
    term.createTerminal(...args)
    return { id: args[0], name: args[1], state: 'idle', repositories: [], branchName: null }
  },
  launchClaude: vi.fn(),
  writeToTerminal: vi.fn(),
  resizeTerminal: vi.fn(),
  killTerminal: (...args: unknown[]) => term.killTerminal(...args),
  getTerminal: (...args: unknown[]) => term.getTerminal(...args),
  getTerminalCwd: vi.fn(),
  getTerminalBuffer: vi.fn(),
  getAllTerminals: vi.fn(() => []),
  cleanupAllTerminals: vi.fn(),
  updateTerminalMetadataFromHook: vi.fn(),
  updateTerminalRepositoriesFromHook: vi.fn(),
}))

const archiveAgent = vi.fn()
vi.mock('../config/agents', () => ({
  saveAgent: vi.fn(),
  archiveAgent: (...args: unknown[]) => archiveAgent(...args),
  readAgents: vi.fn(() => []),
  updateAgentSplitPane: vi.fn(),
}))

vi.mock('../config/activity-history', () => ({ addHistoryEntry: vi.fn() }))

const noteTerminalInput = vi.fn()
vi.mock('../questions/pending-questions', () => ({
  noteTerminalInput: (...args: unknown[]) => noteTerminalInput(...args),
}))

const recordUsageSnapshot = vi.fn()
vi.mock('../usage/usage-events', () => ({
  recordUsageSnapshot: (...args: unknown[]) => recordUsageSnapshot(...args),
}))

vi.mock('../config/config', () => ({ readConfig: vi.fn(() => ({ repositories: {} })) }))
vi.mock('../config/validation', () => ({ expandPath: (p: string) => p }))
vi.mock('../config/repo-validation', () => ({ checkRepoPath: vi.fn(() => ({ valid: true })) }))
vi.mock('../store/hydrate', () => ({ ensureHydrated: vi.fn(async () => {}) }))

import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { setupTerminalHandlers, STATUS_TO_ACTION } from './terminal-handlers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function invoke(channel: string, arg: unknown): any {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return handler({}, arg)
}

// Register a terminal so its onExit callback is captured (natural-exit path).
async function createTerminal(id: string, name = 'Agent') {
  await invoke('terminal:create', { id, name, cwd: '/repo' })
}

beforeEach(() => {
  vi.clearAllMocks()
  handlers.clear()
  capturedOnExit = undefined
  // getMainWindow returns null so onExit's IPC forwarding is a safe no-op.
  setupTerminalHandlers(() => null, vi.fn(), vi.fn())
})

describe('session-end usage flush (terminal:kill)', () => {
  it('records the in-memory usage snapshot exactly once, before archiveAgent', async () => {
    const id = 'claude-kill-1'
    term.getTerminal.mockReturnValue({
      id,
      name: 'Agent',
      metadata: {
        usage: { model: 'Claude Opus', costUsd: 1.23, linesAdded: 10, linesRemoved: 4, durationMs: 5000 },
      },
      repositories: [],
    })

    await invoke('terminal:kill', { id })

    expect(recordUsageSnapshot).toHaveBeenCalledTimes(1)
    expect(recordUsageSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: id,
        model: 'Claude Opus',
        costUsd: 1.23,
        linesAdded: 10,
        linesRemoved: 4,
        durationMs: 5000,
      }),
    )
    expect(archiveAgent).toHaveBeenCalledTimes(1)
    // Flush must happen BEFORE archiveAgent so the store can still resolve the uuid.
    expect(recordUsageSnapshot.mock.invocationCallOrder[0]).toBeLessThan(
      archiveAgent.mock.invocationCallOrder[0],
    )
  })

  it('records nothing when the terminal has no usage metadata', async () => {
    const id = 'claude-kill-2'
    term.getTerminal.mockReturnValue({ id, name: 'Agent', metadata: {}, repositories: [] })

    await invoke('terminal:kill', { id })

    expect(recordUsageSnapshot).not.toHaveBeenCalled()
    expect(archiveAgent).toHaveBeenCalledTimes(1)
  })

  it('writes only ONE snapshot when a stray onExit fires during the kill (usageFlushed guard)', async () => {
    const id = 'claude-kill-3'
    term.getTerminal.mockReturnValue({
      id,
      name: 'Agent',
      metadata: { usage: { model: 'Claude Opus', costUsd: 1, durationMs: 100 } },
      repositories: [],
    })

    // Register the terminal so its onExit callback exists, then make killTerminal
    // fire that onExit — simulating the pty exiting as part of the kill. The
    // natural-exit path would call flushUsageSnapshot again; the guard must dedup.
    await createTerminal(id)
    expect(capturedOnExit).toBeTypeOf('function')
    term.killTerminal.mockImplementation(() => capturedOnExit?.(0))

    await invoke('terminal:kill', { id })

    expect(recordUsageSnapshot).toHaveBeenCalledTimes(1)
  })
})

// ── The status → action contract ────────────────────────────────────────────
//
// Two halves, and both have been broken in production. `CI green` was sent by
// magic-pr for months while being absent from both the TerminalMetadata['status']
// union and the action map: it was written into agents.status as an off-enum value
// and produced no activity event at all, so "the CI went green" was a fact the
// product knew and never recorded.
//
// tsc now enforces one half — STATUS_TO_ACTION is keyed on the union, so a new
// status without an entry does not compile. This test enforces the other half, which
// types cannot see: that no SKILL.md sends a status the union has never heard of.

describe('the status contract with the skills', () => {
  /** Every `status=` value the seven SKILL.md files actually send. */
  function statusesSentBySkills(): { skill: string; status: string }[] {
    const skillsDir = join(__dirname, '..', '..', '..', '..', 'skills')
    return readdirSync(skillsDir)
      .filter((entry) => entry.startsWith('magic-'))
      .flatMap((entry) => {
        const file = join(skillsDir, entry, 'SKILL.md')
        if (!existsSync(file)) return []
        const body = readFileSync(file, 'utf-8')
        // The skills send the status URL-encoded inside a curl query string.
        return [...body.matchAll(/[?&]status=([^"'&\s]+)/g)].map((m) => ({
          skill: entry,
          status: decodeURIComponent(m[1]),
        }))
      })
  }

  it('finds the statuses the skills send, so an empty scan cannot pass silently', () => {
    expect(statusesSentBySkills().length).toBeGreaterThan(5)
  })

  it('maps every status a skill sends to an activity event', () => {
    const unmapped = statusesSentBySkills().filter(({ status }) => !STATUS_TO_ACTION[status as never])
    // A status missing here is silently dropped: agents.status keeps a value nothing
    // can read, and the flow metrics never see the transition.
    expect(unmapped).toEqual([])
  })

  it('leaves no action in the map that nothing can produce', () => {
    // `done` sat in HistoryAction with zero producers. A value in the union that no
    // status maps to is a metric someone will one day try to chart and find empty.
    const produced = new Set(Object.values(STATUS_TO_ACTION).filter(Boolean))
    const fromStatuses: string[] = ['started', 'committed', 'ready_for_pr', 'pr_created',
      'ci_green', 'review', 'review_changes_requested', 'review_addressed', 'merged']
    expect([...produced].sort()).toEqual([...fromStatuses].sort())
  })
})

describe('the pending question and a write from the terminal view (terminal:write)', () => {
  it('reports the data to the question store before writing it', async () => {
    await invoke('terminal:write', { id: 'claude-1', data: 'y' })

    expect(noteTerminalInput).toHaveBeenCalledWith('claude-1', 'y')
  })

  it('reports every keystroke, not only Enter — the store decides what each means', async () => {
    for (const data of ['\x1b[B', 'a', '\r']) {
      noteTerminalInput.mockClear()
      await invoke('terminal:write', { id: 'claude-1', data })
      expect(noteTerminalInput).toHaveBeenCalledWith('claude-1', data)
    }
  })

  it('ignores a write with no data, which cannot be an answer', async () => {
    await invoke('terminal:write', { id: 'claude-1', data: undefined })

    expect(noteTerminalInput).not.toHaveBeenCalled()
  })
})
