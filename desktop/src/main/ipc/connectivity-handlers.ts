import { app, ipcMain, type BrowserWindow } from 'electron'
import type { ConnectivityStatus, StoreWriteKind } from '../store/Store'
import { getStore, setWriteErrorHandler } from '../store/Store'
import { ensureHydrated, rehydrate, resetHydration } from '../store/hydrate'
import { migrateConfig } from '../config/migrate'
import { validateAllRepoPaths } from '../config/repo-validation'
import { restoreAgents } from './terminal-handlers'
import { getCurrentOrg } from '../cloud/org'
import {
  startOrgAgentsRealtime,
  stopOrgAgentsRealtime,
  getActiveRealtimeOrgId,
  setRealtimeEmitters,
} from '../cloud/realtime'

let restoredOnce = false

/**
 * Connectivity + hydration gate for the main process. The renderer polls
 * `connectivity:check` (on an interval, on window focus, and before mutating
 * calls); the whole app is blocked in the renderer until this reports 'ok'.
 *
 *  - 'ok'           → hydrate caches from the store, normalize config, restore
 *                     agents once, and surface any invalid repo paths.
 *  - 'unauthorized' → reset caches + hydration so the next user starts clean.
 *  - 'unreachable'/'disabled' → the renderer shows the corresponding block.
 */
export function setupConnectivityHandlers(getMainWindow: () => BrowserWindow | null): void {
  const emitInvalidRepos = () => {
    const invalid = validateAllRepoPaths()
    getMainWindow()?.webContents.send('repos:invalid', invalid)
  }

  // Forward org-agents realtime events + channel health to the renderer (team
  // dashboard + live indicator). Wired once; the realtime module holds the
  // channel lifecycle.
  setRealtimeEmitters(
    (change) => getMainWindow()?.webContents.send('org:agentsChanged', change),
    (status) => getMainWindow()?.webContents.send('org:realtimeStatusChanged', status),
  )

  const check = async (): Promise<ConnectivityStatus> => {
    const status = await getStore().ping()

    if (status === 'ok') {
      try {
        await ensureHydrated()
        // migrateConfig only ever changes data on the first post-upgrade pass;
        // run it (and restoreAgents) once rather than on every 20s poll/focus.
        if (!restoredOnce) {
          restoredOnce = true
          migrateConfig(app.getVersion())
          restoreAgents()
        }
        emitInvalidRepos()
        // Start the org-agents realtime subscription once the backend is
        // reachable + authed. Idempotent per org; resolve the org only until a
        // channel is live to avoid an extra query on every poll.
        if (!getActiveRealtimeOrgId()) {
          const org = await getCurrentOrg()
          if (org) {
            void startOrgAgentsRealtime(org.id).catch((error) =>
              console.error('[connectivity] failed to start realtime:', error),
            )
          }
        }
      } catch (error) {
        console.error('[connectivity] hydration failed:', error)
      }
    } else if (status === 'unauthorized') {
      restoredOnce = false
      resetHydration()
      // Session gone → tear down the realtime channel so the next user starts clean.
      void stopOrgAgentsRealtime()
    }

    getMainWindow()?.webContents.send('connectivity:statusChanged', status)
    return status
  }

  ipcMain.handle('connectivity:check', async (): Promise<ConnectivityStatus> => check())

  // Report configured repositories whose path is missing or not a git repo.
  ipcMain.handle('repos:getInvalid', async () => validateAllRepoPaths())

  // A write-through to the store failed: the in-memory cache may have diverged
  // from the DB. Tell the renderer (toast) and re-sync the caches from the DB so
  // they converge back rather than staying diverged (the failed change is lost —
  // the user is told so they can retry).
  setWriteErrorHandler((kind: StoreWriteKind, error: unknown) => {
    getMainWindow()?.webContents.send('store:writeError', { kind })
    void rehydrate()
      .then(() => emitInvalidRepos())
      .catch((rehydrateError) => console.error('[connectivity] rehydrate after write error failed:', rehydrateError))
    console.error(`[connectivity] store write failed (${kind}):`, error)
  })
}
