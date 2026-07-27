import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Config } from '../../types'
import type { ConfigChange } from '../config/remote-sync'
import type { PRReviewWatcher } from '../pr-review-watcher/watcher'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  clipboard: { writeText: vi.fn() },
}))

vi.mock('../config/config', () => ({
  readConfig: vi.fn(() => ({ version: '1.0.0', repositories: {} })),
  writeConfig: vi.fn(),
}))

vi.mock('../pty/terminal-manager', () => ({
  writeToTerminal: vi.fn(),
  getTerminal: vi.fn(),
}))

// Capture the listener the setup registers, so the remote path can be driven
// directly instead of through a live Realtime channel.
const h = vi.hoisted(() => ({ listener: null as ((change: ConfigChange) => void) | null }))

vi.mock('../config/remote-sync', () => ({
  addConfigChangeListener: vi.fn((fn: (change: ConfigChange) => void) => {
    h.listener = fn
    return () => { h.listener = null }
  }),
}))

import { setupPRReviewHandlers } from './pr-review-handlers'

const config = (prReviews?: Config['prReviews']): Config =>
  ({ version: '1.0.0', repositories: {}, ...(prReviews ? { prReviews } : {}) }) as Config

let watcher: { setEnabled: ReturnType<typeof vi.fn>; setInterval: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
  h.listener = null
  watcher = { setEnabled: vi.fn(), setInterval: vi.fn() }
  setupPRReviewHandlers(watcher as unknown as PRReviewWatcher)
})

// A PR review setting changed on the web app arrives over Realtime and lands in
// the config. Without this listener it would sit there correct but inert — the
// watcher keeps its old schedule until the app is relaunched.
describe('remote PR review settings', () => {
  it('starts the watcher when the setting is switched on remotely', () => {
    h.listener?.({ prev: config({ enabled: false }), next: config({ enabled: true }) })
    expect(watcher.setEnabled).toHaveBeenCalledWith(true)
  })

  it('stops the watcher when it is switched off remotely', () => {
    h.listener?.({ prev: config({ enabled: true }), next: config({ enabled: false }) })
    expect(watcher.setEnabled).toHaveBeenCalledWith(false)
  })

  it('reads an absent setting as ON, like the watcher itself does', () => {
    // getStatus() and the launch check in main/index.ts both use `!== false`, so a
    // NULL column must not read as "disabled".
    h.listener?.({ prev: config({ enabled: false }), next: config() })
    expect(watcher.setEnabled).toHaveBeenCalledWith(true)

    watcher.setEnabled.mockClear()
    h.listener?.({ prev: config(), next: config({ enabled: true }) })
    expect(watcher.setEnabled).not.toHaveBeenCalled()
  })

  it('leaves the watcher alone when the setting did not move', () => {
    // Every save upserts all the settings columns, so echoes are routine —
    // reacting would restart the poll timer for nothing.
    h.listener?.({ prev: config({ enabled: true }), next: config({ enabled: true }) })
    expect(watcher.setEnabled).not.toHaveBeenCalled()
    expect(watcher.setInterval).not.toHaveBeenCalled()
  })

  it('applies a poll interval within the supported bounds', () => {
    h.listener?.({
      prev: config({ pollIntervalMs: 60_000 }),
      next: config({ pollIntervalMs: 120_000 }),
    })
    expect(watcher.setInterval).toHaveBeenCalledWith(120_000)
  })

  it('refuses an out-of-bounds poll interval', () => {
    // The bounds live in this process: the column's only database constraint is
    // `> 0`, so a row carrying 1000 would poll GitHub every second and burn the
    // rate limit.
    for (const pollIntervalMs of [1_000, 29_999, 600_001, 1_000_000_000]) {
      h.listener?.({ prev: config({ pollIntervalMs: 60_000 }), next: config({ pollIntervalMs }) })
    }
    expect(watcher.setInterval).not.toHaveBeenCalled()
  })

  it('ignores a non-numeric poll interval', () => {
    h.listener?.({
      prev: config({ pollIntervalMs: 60_000 }),
      next: config({ pollIntervalMs: 'soon' as unknown as number }),
    })
    expect(watcher.setInterval).not.toHaveBeenCalled()
  })

  it('does nothing at all when there is no previous config', () => {
    // A diff against "absent" would read every setting as new and restart the
    // watcher on a cold cache.
    h.listener?.({ prev: null, next: config({ enabled: true, pollIntervalMs: 120_000 }) })
    expect(watcher.setEnabled).not.toHaveBeenCalled()
    expect(watcher.setInterval).not.toHaveBeenCalled()
  })
})
