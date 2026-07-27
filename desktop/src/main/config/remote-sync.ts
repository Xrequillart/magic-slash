import type { Config } from '../../types'
import { applySettingsRow, SETTINGS_KEYS, type UserSettingsRow } from '../store/CloudStore'
import { applyAppearanceFromConfig } from '../store/hydrate'
import { hasConfigCache, hydrateConfig, installRemoteConfig, readConfig } from './config'

// ---------------------------------------------------------------------------
// Applies configuration changes that originate ELSEWHERE — the web app, or the
// same account on another machine — to a running app.
//
// The two tables reach us very differently, on purpose:
//
//  - user_settings: the Realtime payload carries the complete new row, and
//    applySettingsRow (the same mapper the read path uses) turns it into config
//    keys. So a preference change costs ZERO round trips: it is applied the
//    moment the event lands, which is what makes the web app feel connected to
//    the desktop rather than merely agreeing with it eventually.
//
//  - repositories: reloaded from the store instead of patched. A repo is keyed by
//    NAME in the config, its local path lives in a separate table the payload
//    knows nothing about, and a rename or an org move changes which repos are
//    visible at all. Reconstructing that from one row would be guesswork.
//
// This module never writes to the store. Everything here came FROM the database.
// ---------------------------------------------------------------------------

/** A config the app has adopted, and what it replaced. */
export interface ConfigChange {
  /** The config in force before the change, or null when the cache was cold. */
  prev: Config | null
  next: Config
}

/** Where an adopted change goes. Injected, mirroring setRealtimeEmitters. */
export interface RemoteSyncEmitters {
  /** Push the new config to the renderer. */
  onConfigChanged: (config: Config) => void
  /** A repository reload landed: re-run the local path validation. */
  onRepositoriesReloaded: () => void
}

let emitters: RemoteSyncEmitters | null = null

/** Wire the emitters. Pass null to clear (e.g. on teardown). */
export function setRemoteSyncEmitters(next: RemoteSyncEmitters | null): void {
  emitters = next
}

// In-process subscribers, for the settings whose effect lives in the main process
// (currently the PR review watcher). Kept separate from the single renderer
// forward above, and isolated from each other: a throw in one never blocks the
// rest or the renderer push. Same shape as addOrgAgentChangeListener.
type ConfigChangeListener = (change: ConfigChange) => void
const listeners = new Set<ConfigChangeListener>()

/**
 * Subscribe to configs adopted from a remote change. Returns an unsubscribe.
 * Listeners are told what the config WAS as well as what it is, because most
 * side effects should only run when their own setting actually moved.
 */
export function addConfigChangeListener(listener: ConfigChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Adopt a change: apply the appearance, notify listeners, push to the renderer. */
function publish(change: ConfigChange): void {
  // Before the listeners and the renderer: the theme and the language are owned
  // by the main process (native chrome, menus, tray, every window), and a
  // listener may read the applied state.
  applyAppearanceFromConfig(change.next)
  for (const listener of listeners) {
    try {
      listener(change)
    } catch (error) {
      console.error('[remote-sync] config change listener failed:', error)
    }
  }
  emitters?.onConfigChanged(change.next)
}

/**
 * A stable string for just the keys user_settings owns.
 *
 * Used to recognise our OWN writes coming back: saving any single preference
 * upserts every settings column (CloudStore.saveUserSettings), so each local
 * toggle produces an event carrying values the app already holds. Ignoring those
 * keeps a Cmd+/ split toggle from costing a repaint, a Claude theme file rewrite
 * and a renderer update for no change at all.
 *
 * Iterating SETTINGS_KEYS rather than stringifying the config gives a
 * deterministic key order, and both sides are built by the same mapper, so
 * nested objects (prReviews, spotlight, dailyDigest, integrations) serialize
 * consistently too.
 */
function settingsFingerprint(config: Config): string {
  const projection: Record<string, unknown> = {}
  for (const key of SETTINGS_KEYS) projection[key] = config[key]
  return JSON.stringify(projection)
}

/**
 * Apply an incoming user_settings row to the cached config.
 *
 * The settings-owned keys are cleared before the row is applied, so a column the
 * row leaves NULL falls back to the app's default instead of keeping whatever
 * value happened to be in memory — applySettingsRow only ever sets keys.
 */
export function applyRemoteSettingsRow(row: UserSettingsRow): void {
  // A cold cache means hydration has not run (or failed) and the interface is
  // still behind the connectivity gate. Installing a settings-only config here
  // would briefly present an app with no repositories; hydration is coming and
  // reads the same row anyway.
  if (!hasConfigCache()) return

  const prev = readConfig()
  const before = settingsFingerprint(prev)

  // Shallow clone: `repositories` is shared with prev by reference, which is
  // correct — this path never touches it — while deleting the settings keys from
  // the draft leaves prev's own values intact for the comparison below.
  const draft: Config = { ...prev }
  for (const key of SETTINGS_KEYS) delete draft[key]
  applySettingsRow(draft, row)

  const next = installRemoteConfig(draft)
  if (settingsFingerprint(next) === before) return

  publish({ prev, next })
}

// A burst of writes (the web app's settings page saves key by key) must not cost
// one full reload each. Coalesce into a single reload shortly after the last one.
const REFRESH_DEBOUNCE_MS = 150
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let refreshInFlight = false
let refreshQueued = false

/**
 * Reload the whole config from the store, debounced. Used for repository changes
 * and after a channel (re)subscribes, where what changed is unknown.
 */
export function scheduleRemoteRefresh(): void {
  if (refreshTimer) return
  refreshTimer = setTimeout(() => {
    refreshTimer = null
    void runRefresh()
  }, REFRESH_DEBOUNCE_MS)
  refreshTimer.unref?.()
}

async function runRefresh(): Promise<void> {
  // A reload is slow (several round trips). Rather than run a second one
  // alongside it, remember that one is wanted and re-arm afterwards.
  if (refreshInFlight) {
    refreshQueued = true
    return
  }
  refreshInFlight = true
  try {
    if (!hasConfigCache()) return
    const prev = readConfig()
    const next = await hydrateConfig()
    // Same object means hydrateConfig discarded its load — either it failed, or a
    // local edit landed mid-flight and is the fresher value. Nothing was adopted.
    if (next === prev) return
    emitters?.onRepositoriesReloaded()
    publish({ prev, next })
  } catch (error) {
    console.error('[remote-sync] refresh failed:', error)
  } finally {
    refreshInFlight = false
    if (refreshQueued) {
      refreshQueued = false
      scheduleRemoteRefresh()
    }
  }
}

/**
 * Drop pending work and subscribers. For TESTS only — deliberately not called on
 * sign-out: the listeners are registered once at setup (setupPRReviewHandlers),
 * so clearing them would leave the watcher deaf for the rest of the process. A
 * pending refresh needs no cancelling either, because it bails on the cold cache
 * that resetHydration() leaves behind.
 */
export function resetRemoteSync(): void {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
  refreshQueued = false
  listeners.clear()
}
