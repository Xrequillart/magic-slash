import { readConfig, writeConfig } from './config'
import { DEFAULT_REPOSITORY_FIELDS, DEFAULT_SPOTLIGHT, isValidSpotlightConfig, isValidLaunchMode } from './defaults'
import type { RepositoryConfig } from '../../types'

// NOTE: There is deliberately NO data migration from the legacy local JSON files
// (config.json / agents.json / history.json). The Supabase database is the single
// source of truth and users start from scratch. These functions only normalize
// the in-memory config that was hydrated from the store (fill default repository
// fields, keep enums valid, sync the version) — they never touch the filesystem.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepMergeDefaults(defaults: Record<string, unknown>, existing: Record<string, unknown>): Record<string, unknown> {
  const result = { ...existing }
  for (const key of Object.keys(defaults)) {
    const defVal = defaults[key]
    const resVal = result[key]
    if (!(key in result)) {
      result[key] = isPlainObject(defVal) ? { ...defVal } : defVal
    } else if (isPlainObject(defVal) && isPlainObject(resVal)) {
      result[key] = deepMergeDefaults(defVal, resVal)
    }
  }
  return result
}

/**
 * Normalize the hydrated config: fill missing default repository fields, keep the
 * spotlight/launchMode/integrations values valid, and sync the version. Writes
 * through to the store only when something actually changed.
 */
export function migrateConfig(appVersion?: string): boolean {
  const config = readConfig()
  let changed = false

  if (appVersion && config.version !== appVersion) {
    config.version = appVersion
    changed = true
  }

  if (config.repositories) {
    for (const name of Object.keys(config.repositories)) {
      const repo = config.repositories[name]
      const merged = deepMergeDefaults(
        DEFAULT_REPOSITORY_FIELDS as unknown as Record<string, unknown>,
        repo as unknown as Record<string, unknown>,
      ) as unknown as RepositoryConfig
      if (JSON.stringify(merged) !== JSON.stringify(repo)) {
        config.repositories[name] = merged
        changed = true
      }
    }
  }

  if (!config.integrations) {
    config.integrations = { github: true, atlassian: true }
    changed = true
  }

  if (!isValidSpotlightConfig(config.spotlight)) {
    config.spotlight = { ...DEFAULT_SPOTLIGHT, ...(typeof config.spotlight === 'object' && config.spotlight !== null ? config.spotlight : {}) }
    if (!isValidSpotlightConfig(config.spotlight)) {
      config.spotlight = { ...DEFAULT_SPOTLIGHT }
    }
    changed = true
  }

  if (config.launchMode !== undefined && !isValidLaunchMode(config.launchMode)) {
    delete config.launchMode
    changed = true
  }

  if (changed) {
    writeConfig(config)
  }

  return changed
}
