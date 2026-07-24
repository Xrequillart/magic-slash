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

export function repairConfig(): { repaired: boolean; fixes: string[] } {
  // First, normalize to fill in missing fields.
  migrateConfig()

  const config = readConfig()
  let repaired = false
  const fixes: string[] = []

  const validLanguages = ['en', 'fr']
  const validFormats = ['angular', 'conventional', 'gitmoji', 'none']
  const validStyles = ['single-line', 'multi-line']
  const validCommitModes = ['new', 'amend', 'ask']

  if (config.repositories) {
    for (const [name, repo] of Object.entries(config.repositories)) {
      // Fix keywords
      if (!repo.keywords || repo.keywords.length === 0) {
        repo.keywords = [name]
        fixes.push(`${name}.keywords → ["${name}"]`)
        repaired = true
      }

      // Fix languages
      if (repo.languages) {
        for (const key of ['commit', 'pullRequest', 'jiraComment', 'discussion'] as const) {
          const val = repo.languages[key]
          if (val && !validLanguages.includes(val)) {
            const def = DEFAULT_REPOSITORY_FIELDS.languages![key]!
            repo.languages[key] = def
            fixes.push(`${name}.languages.${key}: "${val}" → "${def}"`)
            repaired = true
          }
        }
      }

      // Fix commit settings
      if (repo.commit) {
        if (repo.commit.format && !validFormats.includes(repo.commit.format)) {
          const def = DEFAULT_REPOSITORY_FIELDS.commit!.format!
          fixes.push(`${name}.commit.format: "${repo.commit.format}" → "${def}"`)
          repo.commit.format = def
          repaired = true
        }
        if (repo.commit.style && !validStyles.includes(repo.commit.style)) {
          const def = DEFAULT_REPOSITORY_FIELDS.commit!.style!
          fixes.push(`${name}.commit.style: "${repo.commit.style}" → "${def}"`)
          repo.commit.style = def
          repaired = true
        }
      }

      // Fix resolve settings
      if (repo.resolve) {
        if (repo.resolve.commitMode && !validCommitModes.includes(repo.resolve.commitMode)) {
          const def = DEFAULT_REPOSITORY_FIELDS.resolve!.commitMode!
          fixes.push(`${name}.resolve.commitMode: "${repo.resolve.commitMode}" → "${def}"`)
          repo.resolve.commitMode = def
          repaired = true
        }
        if (repo.resolve.format && !validFormats.includes(repo.resolve.format)) {
          const def = DEFAULT_REPOSITORY_FIELDS.resolve!.format!
          fixes.push(`${name}.resolve.format: "${repo.resolve.format}" → "${def}"`)
          repo.resolve.format = def
          repaired = true
        }
        if (repo.resolve.style && !validStyles.includes(repo.resolve.style)) {
          const def = DEFAULT_REPOSITORY_FIELDS.resolve!.style!
          fixes.push(`${name}.resolve.style: "${repo.resolve.style}" → "${def}"`)
          repo.resolve.style = def
          repaired = true
        }
        if (repo.resolve.replyLanguage && !validLanguages.includes(repo.resolve.replyLanguage)) {
          const def = DEFAULT_REPOSITORY_FIELDS.resolve!.replyLanguage!
          fixes.push(`${name}.resolve.replyLanguage: "${repo.resolve.replyLanguage}" → "${def}"`)
          repo.resolve.replyLanguage = def
          repaired = true
        }
      }
    }
  }

  if (repaired) {
    writeConfig(config)
  }

  return { repaired, fixes }
}
