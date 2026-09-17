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
  // Reached through the email-change watcher, which `setupAuthHandlers` starts at
  // startup. The factory lists every export on purpose: a partial mock fails at
  // PROPERTY ACCESS, which surfaces as an unhandled rejection in whichever test
  // happened to be running rather than as a missing stub here.
  refreshUser: vi.fn(async () => ({ changed: false, pending: false, status: LOGGED_OUT })),
  deleteAccount: () => deleteAccount(),
}))

/**
 * The email-change watcher, mocked whole.
 *
 * It polls on a timer and reads the network, and neither belongs in a test about which
 * handler emits what. Mocked, it also becomes assertable: the three places that must
 * STOP it — sign-out, account deletion, a code typed in — are easy to get wrong and
 * invisible until a poller is found asking a dead session for its email.
 */
const startEmailChangeWatch = vi.fn()
const stopEmailChangeWatch = vi.fn()
const resumeEmailChangeWatch = vi.fn(async () => {})
vi.mock('../cloud/email-change-watcher', () => ({
  // The callback is not forwarded: these assert THAT the watch was started or stopped,
  // and the only argument is the same `emit` every handler already uses. Typing a rest
  // spread through `vi.fn()` costs a tuple type for nothing.
  startEmailChangeWatch: () => startEmailChangeWatch(),
  stopEmailChangeWatch: () => stopEmailChangeWatch(),
  resumeEmailChangeWatch: () => resumeEmailChangeWatch(),
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

const invoke = (channel: string, args: unknown = {}) => {
  const handler = handlers.get(channel)
  if (!handler) throw new Error(`no handler registered for ${channel}`)
  return handler({}, args)
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

/**
 * THE EMAIL-CHANGE WATCH, which is the one piece of this file with no moment of its
 * own: the change is confirmed in a browser, so nothing here ever sees it happen. What
 * these cover is the wiring around that — when the polling starts, and the three ways
 * it has to stop. A watcher left running asks a dead session for its email every
 * fifteen seconds, and can report the PREVIOUS account's address as a change to
 * whoever signs in next.
 */
describe('the email-change watch', () => {
  it('resumes at startup, for a change confirmed while the app was closed', () => {
    // `setupAuthHandlers` ran in beforeEach — this is the ordinary case, since the
    // link is clicked in a browser and there is no reason the app was running.
    expect(resumeEmailChangeWatch).toHaveBeenCalledOnce()
  })

  it('starts watching once a change has actually been requested', async () => {
    await invoke('auth:requestEmailChange', { newEmail: 'new@example.com' })

    expect(startEmailChangeWatch).toHaveBeenCalledOnce()
  })

  it('stops on sign-out, so it cannot outlive the session that started it', async () => {
    await invoke('auth:logout')

    expect(stopEmailChangeWatch).toHaveBeenCalledOnce()
  })

  it('stops on account deletion, which has no session left to ask', async () => {
    await invoke('auth:deleteAccount')

    expect(stopEmailChangeWatch).toHaveBeenCalledOnce()
  })

  it('stops when a code is typed in, because there is nothing left to discover', async () => {
    await invoke('auth:confirmEmailChange', { newEmail: 'new@example.com', code: '123456' })

    expect(stopEmailChangeWatch).toHaveBeenCalledOnce()
  })
})
