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

const removeAgent = vi.fn()
vi.mock('../config/agents', () => ({
  saveAgent: vi.fn(),
  removeAgent: (...args: unknown[]) => removeAgent(...args),
  readAgents: vi.fn(() => []),
  updateAgentSplitPane: vi.fn(),
}))

vi.mock('../config/activity-history', () => ({ addHistoryEntry: vi.fn() }))

const recordUsageSnapshot = vi.fn()
vi.mock('../usage/usage-events', () => ({
  recordUsageSnapshot: (...args: unknown[]) => recordUsageSnapshot(...args),
}))

vi.mock('../config/config', () => ({ readConfig: vi.fn(() => ({ repositories: {} })) }))
vi.mock('../config/validation', () => ({ expandPath: (p: string) => p }))
vi.mock('../config/repo-validation', () => ({ checkRepoPath: vi.fn(() => ({ valid: true })) }))
vi.mock('../store/hydrate', () => ({ ensureHydrated: vi.fn(async () => {}) }))

import { setupTerminalHandlers } from './terminal-handlers'

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
  it('records the in-memory usage snapshot exactly once, before removeAgent', async () => {
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
    expect(removeAgent).toHaveBeenCalledTimes(1)
    // Flush must happen BEFORE removeAgent so the store can still resolve the uuid.
    expect(recordUsageSnapshot.mock.invocationCallOrder[0]).toBeLessThan(
      removeAgent.mock.invocationCallOrder[0],
    )
  })

  it('records nothing when the terminal has no usage metadata', async () => {
    const id = 'claude-kill-2'
    term.getTerminal.mockReturnValue({ id, name: 'Agent', metadata: {}, repositories: [] })

    await invoke('terminal:kill', { id })

    expect(recordUsageSnapshot).not.toHaveBeenCalled()
    expect(removeAgent).toHaveBeenCalledTimes(1)
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
