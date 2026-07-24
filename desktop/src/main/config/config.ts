import * as path from 'path'
import * as os from 'os'
import type { Config, RepositoryConfig, LaunchMode, OrgSharedConfig } from '../../types'
import { DEFAULT_REPOSITORY_FIELDS, DEFAULT_SPOTLIGHT, isValidSpotlightConfig } from './defaults'
import { expandPath } from './validation'
import { getStore, reportWriteError } from '../store/Store'

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

function defaultConfig(): Config {
  return {
    version: 'unknown',
    repositories: {},
    splitEnabled: false,
    splitActive: false,
  }
}

/**
 * Fill in missing default fields on a config loaded from the store. Mirrors the
 * defaulting the old file-based reader performed on first load.
 */
function withDefaults(config: Config): Config {
  config.repositories = config.repositories || {}
  if (config.splitEnabled === undefined) config.splitEnabled = false
  if (config.splitActive === undefined) config.splitActive = false
  if (!config.integrations) config.integrations = { github: true, atlassian: true }
  if (!isValidSpotlightConfig(config.spotlight)) {
    config.spotlight = { ...DEFAULT_SPOTLIGHT, ...(typeof config.spotlight === 'object' && config.spotlight !== null ? config.spotlight : {}) }
    if (!isValidSpotlightConfig(config.spotlight)) {
      config.spotlight = { ...DEFAULT_SPOTLIGHT }
    }
  }
  return config
}

// ---------------------------------------------------------------------------
// In-memory config cache. The Supabase database is the SINGLE source of truth
// (see store/CloudStore.ts); there is no local config.json. readConfig() serves
// the cache synchronously, writeConfig() updates it and writes through to the
// store asynchronously, and hydrateConfig() loads it from the store.
// ---------------------------------------------------------------------------

let configCache: Config | null = null

/** Load the config from the store into the cache. Call after auth is established. */
export async function hydrateConfig(): Promise<Config> {
  try {
    const loaded = await getStore().loadConfig()
    configCache = withDefaults(loaded ?? defaultConfig())
  } catch (error) {
    console.error('Error hydrating config:', error)
    configCache = withDefaults(defaultConfig())
  }
  return configCache
}

/** Drop the cached config (on sign-out) so a different user never sees stale data. */
export function resetConfigCache(): void {
  configCache = null
}

export function readConfig(): Config {
  return configCache ?? defaultConfig()
}

export function writeConfig(config: Config): void {
  configCache = config
  void getStore()
    .saveConfig(config)
    .catch((error) => {
      console.error('Error persisting config:', error)
      reportWriteError('config', error)
    })
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

  applySetting(resolve, 'commitMode', settings.commitMode, isOneOf(['new', 'amend', 'ask']))
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

/**
 * Toggle the GDPR usage-logs opt-in. Default OFF: only when this is true does the
 * app write an aggregated usage snapshot to usage_events at session end. Reading
 * the org aggregate is unaffected by this flag.
 */
export function updateUsageLogsEnabled(enabled: boolean): Config {
  const config = readConfig()
  config.usageLogsEnabled = enabled
  writeConfig(config)
  return config
}

/**
 * Toggle the optional daily team digest (opt-in, default OFF). When enabled, the
 * digest scheduler fires one summary notification at 9:00 local. The scheduler
 * re-reads this flag at fire time, so a toggle takes effect on the next run.
 */
export function updateDailyDigestEnabled(enabled: boolean): Config {
  const config = readConfig()
  config.dailyDigest = { enabled }
  writeConfig(config)
  return config
}

/**
 * Toggle an integration flag. github is always true (const true in the schema);
 * only atlassian is user-settable. DISPLAY/detection only — no token is stored.
 */
export function setIntegration(name: 'atlassian', enabled: boolean): Config {
  const config = readConfig()
  config.integrations = config.integrations || { github: true }
  if (name === 'atlassian') {
    config.integrations.atlassian = enabled
  }
  writeConfig(config)
  return config
}

/** Persist which cloud org this install is associated with. */
export function setCurrentOrgId(orgId: string | undefined): Config {
  const config = readConfig()
  if (orgId) {
    config.currentOrgId = orgId
  } else {
    delete config.currentOrgId
  }
  // Point the store at the active org so subsequent reads/writes target it.
  getStore().setActiveOrgId(orgId)
  writeConfig(config)
  return config
}

/**
 * Copy accepted source values onto target. In 'fill' mode only keys the target
 * has not set yet are written (local values win); in 'replace' mode every
 * accepted source key overwrites the target (the org's value wins).
 */
function applyValues(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  accept: (value: unknown) => boolean,
  mode: 'fill' | 'replace',
): void {
  for (const [key, value] of Object.entries(source)) {
    if (!accept(value)) continue
    if (mode === 'replace' || target[key] === undefined) {
      target[key] = value
    }
  }
}

/**
 * Merge an org's shared config into the local config across every existing
 * repository. Only the shared fields are touched — languages, commit/PR format,
 * and repo keywords; local-only bits (repo paths, integration toggles) are never
 * modified. Missing/malformed input is ignored (never throws on data).
 *
 * Two modes:
 *  - 'fill' (default): applied as DEFAULTS — existing local values always win.
 *    Used on invitation onboarding so the invitee keeps anything they set.
 *  - 'replace': the org's values overwrite the local ones for the shared keys.
 *    Used when SWITCHING the active org, so the shared config actually swaps to
 *    reflect the newly-active org instead of retaining the previous org's values.
 */
export function mergeOrgSharedConfig(
  shared: OrgSharedConfig,
  orgId?: string,
  mode: 'fill' | 'replace' = 'fill',
): Config {
  const config = readConfig()
  config.repositories = config.repositories || {}

  for (const repo of Object.values(config.repositories)) {
    if (shared.languages && typeof shared.languages === 'object') {
      repo.languages = repo.languages || {}
      applyValues(repo.languages, shared.languages, (v) => typeof v === 'string', mode)
    }

    if (shared.commit && typeof shared.commit === 'object') {
      repo.commit = repo.commit || {}
      applyValues(repo.commit, shared.commit, (v) => v !== undefined, mode)
    }

    if (shared.pullRequest && typeof shared.pullRequest === 'object') {
      repo.pullRequest = repo.pullRequest || {}
      applyValues(repo.pullRequest, shared.pullRequest, (v) => v !== undefined, mode)
    }
  }

  // Repo keywords keyed by repo name. In 'fill' mode only a repo with no
  // meaningful keywords yet inherits them; in 'replace' mode the matching repo's
  // keywords are overwritten with the org's.
  if (shared.repoKeywords && typeof shared.repoKeywords === 'object') {
    for (const [name, keywords] of Object.entries(shared.repoKeywords)) {
      const repo = config.repositories[name]
      if (!repo || !Array.isArray(keywords) || keywords.length === 0) continue
      if (mode === 'replace') {
        repo.keywords = keywords
      } else {
        const isDefaulted = repo.keywords.length === 0 || (repo.keywords.length === 1 && repo.keywords[0] === name)
        if (isDefaulted) repo.keywords = keywords
      }
    }
  }

  if (orgId) config.currentOrgId = orgId

  writeConfig(config)
  return config
}

export { CONFIG_DIR, CONFIG_FILE }
