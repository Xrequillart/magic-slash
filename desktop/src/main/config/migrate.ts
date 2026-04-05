import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { readConfig, writeConfig, createDefaultMetadata } from './config'
import { validateConfig } from './schema-validator'
import { DEFAULT_REPOSITORY_FIELDS } from './defaults'
import type { RepositoryConfig } from '../../types'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')
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

export function migrateConfig(): boolean {
  const config = readConfig()
  let changed = false

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

  // Migrate agents
  if (config.agents && Array.isArray(config.agents)) {
    for (const agent of config.agents) {
      if (!agent.repositories) {
        agent.repositories = []
        changed = true
      }
      const defaultMeta = createDefaultMetadata()
      const mergedMeta = { ...defaultMeta, ...agent.metadata }
      if (JSON.stringify(mergedMeta) !== JSON.stringify(agent.metadata)) {
        agent.metadata = mergedMeta
        changed = true
      }
    }
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
  const validCommitModes = ['new', 'amend']

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
