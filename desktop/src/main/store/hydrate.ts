import { hydrateConfig, resetConfigCache } from '../config/config'
import { hydrateAgents, resetAgentsCache } from '../config/agents'
import { hydrateProfile } from '../config/profile'
import { applyLanguage, applyTheme } from '../appearance'
import type { Config } from '../../types'

// Coordinates a one-time hydration of the in-memory caches (config, agents,
// profile) from the store once auth + connectivity are established. Every mutating
// IPC path awaits ensureHydrated() so it never reads a cold (empty) cache.

let hydrationPromise: Promise<void> | null = null

/**
 * Adopt the cloud language, but only when the row actually carries one.
 *
 * An account that has never chosen a language leaves the column NULL, and
 * `applyLanguage(undefined)` falls back to English *and persists it* — so a user
 * running in French from the local mirror would flip to English seconds after
 * launch, and stay there on every cold launch after that. Silence from the cloud
 * means "no opinion", not "English".
 */
function adoptCloudLanguage(language: Config['language']): void {
  if (language) applyLanguage(language)
}

/**
 * Adopt the appearance a config carries. The cloud is the reference for both the
 * theme and the interface language, so this corrects the local mirror and the
 * native chrome when either was changed elsewhere — on another machine, or on the
 * web app — and repaints/rebuilds every window, the menus and the tray.
 *
 * Extracted so the three places that learn a config is authoritative all apply
 * it the same way: first hydration, a forced rehydrate, and a settings change
 * arriving over Realtime (config/remote-sync.ts). Both appliers self-guard on
 * "actually changed", so calling this with an unchanged config is a no-op —
 * except for the Claude Code theme file, which applyTheme() rewrites
 * unconditionally because `syncClaudeTheme` may be what changed.
 */
export function applyAppearanceFromConfig(config: Config): void {
  applyTheme(config.theme)
  adoptCloudLanguage(config.language)
}

/**
 * Hydrate config, agents and profile from the store exactly once. Subsequent
 * calls return the same in-flight/settled promise.
 */
export function ensureHydrated(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const config = await hydrateConfig()
      applyAppearanceFromConfig(config)
      await hydrateAgents()
      await hydrateProfile()
    })().catch((error) => {
      // Allow a later retry if hydration failed.
      hydrationPromise = null
      throw error
    })
  }
  return hydrationPromise
}

/**
 * Force a fresh reload of all caches from the store, replacing the hydration
 * guard with the new load. Used to re-sync after a write-through failure so the
 * in-memory caches converge back to the DB rather than staying diverged.
 */
export function rehydrate(): Promise<void> {
  hydrationPromise = (async () => {
    const config = await hydrateConfig()
    applyAppearanceFromConfig(config)
    await hydrateAgents()
  })().catch((error) => {
    hydrationPromise = null
    throw error
  })
  return hydrationPromise
}

/**
 * Reset all caches and the hydration guard (on sign-out or when the backend
 * reports the session is no longer authorized), so the next authenticated user
 * re-hydrates cleanly and never sees stale data.
 */
export function resetHydration(): void {
  hydrationPromise = null
  resetConfigCache()
  resetAgentsCache()
}
