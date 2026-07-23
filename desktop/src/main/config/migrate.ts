import * as fs from 'fs'
import * as path from 'path'
import { readConfig, writeConfig, CONFIG_DIR, CONFIG_FILE } from './config'
import { writeAgents, AGENTS_FILE } from './agents'
import { validateConfig } from './schema-validator'
import { DEFAULT_REPOSITORY_FIELDS, DEFAULT_SPOTLIGHT, isValidSpotlightConfig, isValidLaunchMode } from './defaults'
import type { RepositoryConfig } from '../../types'

const CONFIG_BACKUP = path.join(CONFIG_DIR, 'config.json.bak')

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
 * Creates a backup of the current config file before migration.
 * Only creates a backup if the config file exists.
 */
function createBackup(): boolean {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.copyFileSync(CONFIG_FILE, CONFIG_BACKUP)
      return true
    }
  } catch (error) {
    console.warn('Failed to create config backup:', error)
  }
  return false
}

export function migrateConfig(appVersion?: string): boolean {
  let changed = false

  // Migrate agents from config.json to agents.json
  const rawConfig = (() => {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
      }
    } catch { /* ignore */ }
    return null
  })()

  if (rawConfig && Array.isArray(rawConfig.agents) && rawConfig.agents.length > 0 && !fs.existsSync(AGENTS_FILE)) {
    // agents.json doesn't exist yet — migrate agents from config.json
    writeAgents(rawConfig.agents)
  }

  if (rawConfig) {
    // Strip orphaned keys from config.json:
    // - `agents` (migrated to agents.json)
    // - `schedulerEnabled` / `schedulerDefaultTime` (scheduled events feature removed)
    let rawChanged = false
    for (const key of ['agents', 'schedulerEnabled', 'schedulerDefaultTime']) {
      if (key in rawConfig) {
        delete rawConfig[key]
        rawChanged = true
      }
    }
    if (rawChanged) {
      try {
        if (!fs.existsSync(CONFIG_DIR)) {
          fs.mkdirSync(CONFIG_DIR, { recursive: true })
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(rawConfig, null, 2))
      } catch (error) {
        console.error('Error removing orphaned keys from config.json:', error)
      }
      changed = true
    }
  }

  // Clean up agents.json after removing the scheduled events feature:
  // - Drop agents that were enabled scheduled-only records. They were never
  //   interactive sessions (they stayed idle until their configured time and
  //   were excluded from restoreAgents), so keeping them would now wrongly
  //   launch an interactive terminal on the first startup after upgrade.
  // - Strip the orphaned `schedule` field from any remaining agent.
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      const rawAgents = JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf8'))
      if (Array.isArray(rawAgents)) {
        const cleaned = rawAgents.filter(
          (agent) => !(agent && typeof agent === 'object' && agent.schedule?.enabled === true)
        )
        let agentsChanged = cleaned.length !== rawAgents.length
        for (const agent of cleaned) {
          if (agent && typeof agent === 'object' && 'schedule' in agent) {
            delete agent.schedule
            agentsChanged = true
          }
        }
        if (agentsChanged) {
          writeAgents(cleaned)
          changed = true
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning agents.json:', error)
  }

  // Read config AFTER agents migration to avoid re-introducing agents key
  const config = readConfig()

  // Sync config version with app version
  if (appVersion && config.version !== appVersion) {
    config.version = appVersion
    changed = true
  }

  // Migrate repositories
  if (config.repositories) {
    for (const name of Object.keys(config.repositories)) {
      const repo = config.repositories[name]
      const merged = deepMergeDefaults(DEFAULT_REPOSITORY_FIELDS as unknown as Record<string, unknown>, repo as unknown as Record<string, unknown>) as unknown as RepositoryConfig
      if (JSON.stringify(merged) !== JSON.stringify(repo)) {
        config.repositories[name] = merged
        changed = true
      }
    }
  }

  // Migrate integrations (default: both enabled for backward compatibility)
  if (!config.integrations) {
    config.integrations = { github: true, atlassian: true }
    changed = true
  }

  if (!isValidSpotlightConfig(config.spotlight)) {
    config.spotlight = { ...DEFAULT_SPOTLIGHT, ...(typeof config.spotlight === 'object' && config.spotlight !== null ? config.spotlight : {}) }
    // Re-validate after merge; if still invalid, reset to pure defaults
    if (!isValidSpotlightConfig(config.spotlight)) {
      config.spotlight = { ...DEFAULT_SPOTLIGHT }
    }
    changed = true
  }

  if (config.launchMode !== undefined && !isValidLaunchMode(config.launchMode)) {
    config.launchMode = undefined
    changed = true
  }

  if (changed) {
    // Create backup before writing migrated config
    createBackup()
    writeConfig(config)

    // Validate post-migration
    const validation = validateConfig(config)
    if (!validation.valid) {
      for (const err of validation.errors) {
        console.warn(`Post-migration validation warning: ${err}`)
      }
    }
  }

  return changed
}

export function repairConfig(): { repaired: boolean; fixes: string[] } {
  // First, run migration to fill in missing fields
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
    createBackup()
    writeConfig(config)
  }

  return { repaired, fixes }
}
