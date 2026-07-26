import { hydrateConfig, resetConfigCache } from '../config/config'
import { hydrateAgents, resetAgentsCache } from '../config/agents'
import { hydrateHistory, resetHistoryCache } from '../config/activity-history'
import { hydrateProfile } from '../config/profile'
import { applyTheme } from '../appearance'

// Coordinates a one-time hydration of the in-memory caches (config, agents,
// history) from the store once auth + connectivity are established. Every mutating
// IPC path awaits ensureHydrated() so it never reads a cold (empty) cache.

let hydrationPromise: Promise<void> | null = null

/**
 * Hydrate config, agents and history from the store exactly once. Subsequent
 * calls return the same in-flight/settled promise. Agents must be hydrated
 * before history so history entries can resolve their agent names.
 */
export function ensureHydrated(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = (async () => {
      const config = await hydrateConfig()
      // The cloud is the reference for the theme: adopt it now, which corrects
      // the local cache and the native chrome if it was changed on another
      // machine, and repaints every open window.
      applyTheme(config.theme)
      await hydrateAgents()
      await hydrateHistory()
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
    applyTheme(config.theme)
    await hydrateAgents()
    await hydrateHistory()
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
  resetHistoryCache()
}
