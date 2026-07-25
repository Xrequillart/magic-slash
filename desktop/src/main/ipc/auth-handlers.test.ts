import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BrowserWindow } from 'electron'
import type { AuthStatus } from '../../types'

// Mock electron before importing the module under test, capturing every handler
// registered with ipcMain.handle so the tests can invoke them directly.
const handlers = new Map<string, (event: unknown, args?: unknown) => Promise<unknown>>()
const sent: Array<{ channel: string; payload: unknown }> = []

vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (event: unknown, args?: unknown) => Promise<unknown>) => {
      handlers.set(channel, fn)
    },
  },
}))

const LOGGED_OUT: AuthStatus = { enabled: true, loggedIn: false }

const signOut = vi.fn(async () => LOGGED_OUT)
const deleteAccount = vi.fn(async () => LOGGED_OUT)

vi.mock('../cloud/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: () => signOut(),
  getStatus: vi.fn(async () => LOGGED_OUT),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  requestEmailChange: vi.fn(),
  confirmEmailChange: vi.fn(),
  deleteAccount: () => deleteAccount(),
}))

// The teardown collaborators. `calls` records the order across all three so the
// tests can assert the sequence, not just that each one ran.
const calls: string[] = []
const resetHydration = vi.fn(() => { calls.push('resetHydration') })
const teardownAgentSessions = vi.fn(() => { calls.push('teardownAgentSessions') })
const refreshConnectivity = vi.fn(async () => { calls.push('refreshConnectivity') })

vi.mock('../store/hydrate', () => ({ resetHydration: () => resetHydration() }))
vi.mock('./terminal-handlers', () => ({ teardownAgentSessions: () => teardownAgentSessions() }))
vi.mock('./connectivity-handlers', () => ({ refreshConnectivity: () => refreshConnectivity() }))

import { setupAuthHandlers } from './auth-handlers'

const fakeWindow = {
  webContents: {
    send: (channel: string, payload: unknown) => { sent.push({ channel, payload }) },
  },
}

beforeEach(() => {
  handlers.clear()
  sent.length = 0
  calls.length = 0
  vi.clearAllMocks()
  setupAuthHandlers(() => fakeWindow as unknown as BrowserWindow)
})

const invoke = (channel: string) => {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return handler({})
}

describe('auth:logout', () => {
  it('tears the session down so the renderer swaps to the login wall immediately', async () => {
    await invoke('auth:logout')

    expect(signOut).toHaveBeenCalledOnce()
    // The gate probe is what flips the renderer to the auth wall — without it the
    // app keeps rendering as signed in until the next 20s poll.
    expect(refreshConnectivity).toHaveBeenCalledOnce()
    expect(teardownAgentSessions).toHaveBeenCalledOnce()
    expect(resetHydration).toHaveBeenCalledOnce()
  })

  it('drops caches and kills the sessions BEFORE re-probing the gate', async () => {
    await invoke('auth:logout')

    expect(calls).toEqual(['resetHydration', 'teardownAgentSessions', 'refreshConnectivity'])
  })

  it('still emits the logged-out auth status to the renderer', async () => {
    await invoke('auth:logout')

    expect(sent).toEqual([{ channel: 'auth:statusChanged', payload: LOGGED_OUT }])
  })
})

describe('auth:deleteAccount', () => {
  it('runs the same teardown as a sign-out', async () => {
    await invoke('auth:deleteAccount')

    expect(deleteAccount).toHaveBeenCalledOnce()
    expect(calls).toEqual(['resetHydration', 'teardownAgentSessions', 'refreshConnectivity'])
    expect(sent).toEqual([{ channel: 'auth:statusChanged', payload: LOGGED_OUT }])
  })
})

describe('read-only auth paths', () => {
  it('auth:status never tears anything down', async () => {
    await invoke('auth:status')

    expect(calls).toEqual([])
    expect(sent).toEqual([])
  })
})
