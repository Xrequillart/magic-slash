import { app, ipcMain, type BrowserWindow } from 'electron'
import type { ConnectivityStatus, StoreWriteKind } from '../store/Store'
import { getStore, setWriteErrorHandler } from '../store/Store'
import { ensureHydrated, rehydrate, resetHydration } from '../store/hydrate'
import { migrateConfig } from '../config/migrate'
import { applyRemoteSettingsRow, scheduleRemoteRefresh, setRemoteSyncEmitters } from '../config/remote-sync'
import { recordAppInstallation } from '../app-installation'
import { validateAllRepoPaths } from '../config/repo-validation'
import { restoreAgents } from './terminal-handlers'
import { getCurrentOrg } from '../cloud/org'
import {
  startOrgAgentsRealtime,
  stopOrgAgentsRealtime,
  getActiveRealtimeOrgId,
  setRealtimeEmitters,
} from '../cloud/realtime'
import { loadSession } from '../cloud/session-store'
import {
  getActiveSyncUserId,
  setUserSyncHandlers,
  startUserSyncRealtime,
  stopUserSyncRealtime,
} from '../cloud/settings-realtime'

let restoredOnce = false

/**
 * The gate probe, captured at setup so other IPC paths can drive it. Null until
 * setupConnectivityHandlers() has run.
 */
let runCheck: (() => Promise<ConnectivityStatus>) | null = null

/**
 * Re-run the gate probe NOW and push the result to the renderer.
 *
 * The renderer only polls `connectivity:check` every 20s (and on window focus),
 * so an auth transition triggered from inside the app — signing out from
 * Settings, deleting the account — would otherwise leave the app rendering as if
 * still signed in until the next poll. Calling this makes the renderer's gate
 * flip immediately (and runs the same 'unauthorized' teardown as any other
 * probe). No-op before the handlers are set up.
 */
export async function refreshConnectivity(): Promise<void> {
  await runCheck?.()
}

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

  // Same wiring for the user-scoped channels: a setting or a repository changed
  // on the web app (or on another machine) is adopted by remote-sync, then the
  // renderer is handed the new config so the interface follows without a restart.
  setRemoteSyncEmitters({
    onConfigChanged: (config) => getMainWindow()?.webContents.send('config:changed', config),
    onRepositoriesReloaded: () => emitInvalidRepos(),
  })

  setUserSyncHandlers({
    onSettingsRow: (row) => applyRemoteSettingsRow(row),
    onRepositoriesChanged: () => scheduleRemoteRefresh(),
    // A (re)subscription is the only hint that events were missed: nothing is
    // replayed, so a sleep, a network drop or a token refresh leaves the local
    // copy silently behind. This also covers the FIRST join, which is not waste:
    // hydration runs before the channels open, and a change landing in that gap
    // would otherwise go unseen until the next launch. Both channels joining at
    // once collapses into one reload via the debounce.
    onResubscribed: () => scheduleRemoteRefresh(),
  })

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
          // Record this launch's app version for this machine. Fire-and-forget:
          // it is telemetry and must never delay or break the gate.
          void recordAppInstallation(app.getVersion())
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
        // The settings/repositories channels are USER-scoped: no org is resolved
        // for them, which is deliberate — preferences belong to the account, so
        // they must sync for a user with no membership too, and an org switch must
        // not interrupt them.
        if (!getActiveSyncUserId()) {
          const uid = loadSession()?.user?.id
          if (uid) {
            void startUserSyncRealtime(uid).catch((error) =>
              console.error('[connectivity] failed to start settings realtime:', error),
            )
          }
        }
      } catch (error) {
        console.error('[connectivity] hydration failed:', error)
      }
    } else if (status === 'unauthorized') {
      restoredOnce = false
      resetHydration()
      // Session gone → tear down the realtime channels so the next user starts clean.
      void stopOrgAgentsRealtime()
      void stopUserSyncRealtime()
    }

    getMainWindow()?.webContents.send('connectivity:statusChanged', status)
    return status
  }

  runCheck = check

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
