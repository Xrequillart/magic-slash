import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type { Config, RepositoryConfig, LaunchMode } from '../../types'
import { validateConfig, hasCriticalErrors } from './schema-validator'
import { DEFAULT_REPOSITORY_FIELDS, DEFAULT_SPOTLIGHT, isValidSpotlightConfig } from './defaults'
import { expandPath } from './validation'

/** Settings input where each field can be its normal type, 'default', or null (to reset) */
type SettingsInput<T> = {
  [K in keyof T]?: T[K] | 'default' | null
}

/**
 * Applies a single settings field: removes on 'default'/null/resetValue,
 * sets if the value passes the validator.
 */
function applySetting<T extends Record<string, unknown>>(
  obj: T,
  key: keyof T,
  value: unknown,
  validator: (v: unknown) => boolean,
  resetValues: unknown[] = ['default', null],
): void {
  if (value === undefined) return
  if (resetValues.includes(value)) {
    delete obj[key]
  } else if (validator(value)) {
    obj[key] = value as T[keyof T]
  }
}

const isOneOf = (allowed: string[]) => (v: unknown) => typeof v === 'string' && allowed.includes(v)
const isBool = (v: unknown) => typeof v === 'boolean'

const CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

/**
 * Checks if a path should be excluded from repository persistence.
 * Excludes generic paths like Documents, Desktop, Home that are not real project directories.
 */
export function isExcludedRepositoryPath(repoPath: string): boolean {
  const home = os.homedir()
  const normalizedPath = path.normalize(expandPath(repoPath))

  const excludedPaths = [
    path.join(home, 'Documents'),
    path.join(home, 'Desktop'),
    path.join(home, 'Downloads'),
    home,  // Home directory itself
    '/tmp',
    '/var/tmp',
    '/private/tmp'  // macOS /tmp symlink target
  ]

  return excludedPaths.some(excluded => normalizedPath === excluded)
}

/**
 * Filters out excluded paths from a list of repositories.
 */
export function filterValidRepositories(repositories: string[]): string[] {
  return repositories.filter(repo => !isExcludedRepositoryPath(repo))
}

export function readConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      const defaultConfig: Config = {
        version: 'unknown',
        repositories: {},
        splitEnabled: false,
        splitActive: false,
      }
      writeConfig(defaultConfig)
      return defaultConfig
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf8')
    const config: Config = JSON.parse(content)

    // Migration: ensure config fields have default values
    let needsWrite = false

    if (config.splitEnabled === undefined) {
      config.splitEnabled = false
      needsWrite = true
    }

    if (config.splitActive === undefined) {
      config.splitActive = false
      needsWrite = true
    }

    if (!config.integrations) {
      config.integrations = { github: true, atlassian: true }
      needsWrite = true
    }

    if (!isValidSpotlightConfig(config.spotlight)) {
      config.spotlight = { ...DEFAULT_SPOTLIGHT, ...(typeof config.spotlight === 'object' && config.spotlight !== null ? config.spotlight : {}) }
      // Re-validate after merge; if still invalid, reset to pure defaults
      if (!isValidSpotlightConfig(config.spotlight)) {
        config.spotlight = { ...DEFAULT_SPOTLIGHT }
      }
      needsWrite = true
    }

    if (needsWrite) {
      writeConfig(config)
    }

    // Validate config against JSON Schema
    try {
      const validation = validateConfig(config)
      if (!validation.valid) {
        if (hasCriticalErrors(validation.errors)) {
          console.error('Critical config validation errors:', validation.errors)
          throw new Error(`Invalid config: ${validation.errors.join('; ')}`)
        }
        // Non-critical errors: warn but continue (graceful degradation)
        for (const err of validation.errors) {
          console.warn(`Config validation warning: ${err}`)
        }
      }
    } catch (validationError) {
      // Re-throw critical errors, but don't crash on schema loading failures
      if (validationError instanceof Error && validationError.message.startsWith('Invalid config:')) {
        throw validationError
      }
      console.warn('Config schema validation skipped:', validationError)
    }

    return config
  } catch (error) {
    console.error('Error reading config:', error)
    return {
      version: 'unknown',
      repositories: {},
      splitEnabled: false,
      splitActive: false,
    }
  }
}

export function writeConfig(config: Config): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
  } catch (error) {
    console.error('Error writing config:', error)
    throw error
  }
}

export function addRepository(name: string, repoPath: string, keywords: string[] = []): Config {
  const config = readConfig()
  config.repositories = config.repositories || {}
  config.repositories[name] = {
    path: repoPath,
    keywords: keywords.length > 0 ? keywords : [name],
    ...DEFAULT_REPOSITORY_FIELDS,
  }
  writeConfig(config)
  return config
}

export function updateRepository(name: string, updates: Partial<RepositoryConfig>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  if (updates.path !== undefined) {
    config.repositories[name].path = updates.path
  }
  if (updates.keywords !== undefined) {
    config.repositories[name].keywords = updates.keywords
  }
  if (updates.color !== undefined) {
    config.repositories[name].color = updates.color
  }
  if (updates.languages !== undefined) {
    config.repositories[name].languages = updates.languages
  }

  writeConfig(config)
  return config
}

export function updateRepositoryLanguages(name: string, languages: Record<string, string | null>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const validKeys = ['commit', 'pullRequest', 'jiraComment', 'discussion']
  const validValues = ['en', 'fr', null]

  config.repositories[name].languages = config.repositories[name].languages || {}

  for (const [key, value] of Object.entries(languages)) {
    if (validKeys.includes(key)) {
      if (value === null || value === 'default') {
        delete config.repositories[name].languages![key as keyof typeof config.repositories[string]['languages']]
      } else if (validValues.includes(value)) {
        ;(config.repositories[name].languages as Record<string, string>)[key] = value
      }
    }
  }

  // Clean up empty languages object
  if (Object.keys(config.repositories[name].languages || {}).length === 0) {
    delete config.repositories[name].languages
  }

  writeConfig(config)
  return config
}

export function updateRepositoryCommitSettings(name: string, settings: SettingsInput<NonNullable<RepositoryConfig['commit']>>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const commit = config.repositories[name].commit = config.repositories[name].commit || {}

  applySetting(commit, 'style', settings.style, isOneOf(['single-line', 'multi-line']))
  applySetting(commit, 'format', settings.format, isOneOf(['conventional', 'angular', 'gitmoji', 'none']))
  applySetting(commit, 'coAuthor', settings.coAuthor, isBool)
  applySetting(commit, 'includeTicketId', settings.includeTicketId, isBool)

  if (Object.keys(commit).length === 0) {
    delete config.repositories[name].commit
  }

  writeConfig(config)
  return config
}

export function updateRepositoryResolveSettings(name: string, settings: SettingsInput<NonNullable<RepositoryConfig['resolve']>>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const resolve = config.repositories[name].resolve = config.repositories[name].resolve || {}

  applySetting(resolve, 'commitMode', settings.commitMode, isOneOf(['new', 'amend']))
  applySetting(resolve, 'format', settings.format, isOneOf(['conventional', 'angular', 'gitmoji', 'none']))
  applySetting(resolve, 'style', settings.style, isOneOf(['single-line', 'multi-line']))
  applySetting(resolve, 'useCommitConfig', settings.useCommitConfig, isBool)
  applySetting(resolve, 'replyToComments', settings.replyToComments, isBool)
  applySetting(resolve, 'replyLanguage', settings.replyLanguage, isOneOf(['en', 'fr']))

  if (Object.keys(resolve).length === 0) {
    delete config.repositories[name].resolve
  }

  writeConfig(config)
  return config
}

export function updateRepositoryPullRequestSettings(name: string, settings: SettingsInput<NonNullable<RepositoryConfig['pullRequest']>>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const pullRequest = config.repositories[name].pullRequest = config.repositories[name].pullRequest || {}

  applySetting(pullRequest, 'autoLinkTickets', settings.autoLinkTickets, isBool)

  if (Object.keys(pullRequest).length === 0) {
    delete config.repositories[name].pullRequest
  }

  writeConfig(config)
  return config
}

export function updateRepositoryIssuesSettings(name: string, settings: SettingsInput<NonNullable<RepositoryConfig['issues']>>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const issues = config.repositories[name].issues = config.repositories[name].issues || {}
  const isString = (v: unknown) => typeof v === 'string'

  applySetting(issues, 'commentOnPR', settings.commentOnPR, isBool)
  applySetting(issues, 'jiraUrl', settings.jiraUrl, isString, ['', null])
  applySetting(issues, 'githubIssuesUrl', settings.githubIssuesUrl, isString, ['', null])

  if (Object.keys(issues).length === 0) {
    delete config.repositories[name].issues
  }

  writeConfig(config)
  return config
}

export function updateRepositoryBranchSettings(name: string, settings: SettingsInput<NonNullable<RepositoryConfig['branches']>>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const branches = config.repositories[name].branches = config.repositories[name].branches || {}

  applySetting(branches, 'development', settings.development, (v) => typeof v === 'string', ['', null])

  if (Object.keys(branches).length === 0) {
    delete config.repositories[name].branches
  }

  writeConfig(config)
  return config
}

export function updateRepositoryWorktreeFilesSettings(name: string, settings: { worktreeFiles?: string[] | null }): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  // Validate and set worktreeFiles
  if (settings.worktreeFiles !== undefined) {
    if (Array.isArray(settings.worktreeFiles)) {
      const filtered = settings.worktreeFiles.filter((f) => typeof f === 'string' && f.trim().length > 0)
      config.repositories[name].worktreeFiles = filtered.length > 0 ? filtered : []
    } else if (settings.worktreeFiles === null) {
      config.repositories[name].worktreeFiles = []
    }
  }

  writeConfig(config)
  return config
}

export function deleteRepository(name: string): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  delete config.repositories[name]
  writeConfig(config)
  return config
}

export function renameRepository(oldName: string, newName: string): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[oldName]) {
    throw new Error(`Repository '${oldName}' not found`)
  }

  if (config.repositories[newName]) {
    throw new Error(`Repository '${newName}' already exists`)
  }

  // Copy the repo config to the new name and delete the old one
  config.repositories[newName] = config.repositories[oldName]
  delete config.repositories[oldName]

  writeConfig(config)
  return config
}

export function updateSplitEnabled(enabled: boolean): Config {
  const config = readConfig()
  config.splitEnabled = enabled
  writeConfig(config)
  return config
}

export function updateSplitActive(active: boolean): Config {
  const config = readConfig()
  config.splitActive = active
  writeConfig(config)
  return config
}

export function updateLaunchMode(mode: LaunchMode): Config {
  const config = readConfig()
  config.launchMode = mode
  writeConfig(config)
  return config
}

export { CONFIG_DIR, CONFIG_FILE }
