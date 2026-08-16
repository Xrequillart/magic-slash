import * as path from 'path'
import * as os from 'os'
import { randomUUID } from 'crypto'
import type { Config, RepositoryConfig, LanguageId, LaunchMode, OrgSharedConfig, ThemeId } from '../../types'
import { DEFAULT_REPOSITORY_FIELDS, DEFAULT_SPOTLIGHT, isValidSpotlightConfig } from './defaults'
import { expandPath, getGitHubRepoUrl, getGitHubRepoUrlAsync } from './validation'
import { CONFIG_DIR } from './paths'
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
const isString = (v: unknown) => typeof v === 'string'

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

/**
 * Bumped by EVERY mutation of the cache. Exists because a load from the store is
 * slow (loadConfig makes several sequential round trips) while every local
 * mutation is a synchronous read-modify-write on the cached object — so a load
 * that started before a local edit would, on resolving, reinstall a snapshot
 * taken BEFORE it and silently revert the user's change. Worse, the next write
 * would push that stale snapshot back to the database, because saveUserSettings
 * writes every settings column at once.
 *
 * Callers that load asynchronously capture this counter first and discard their
 * result if it moved (see hydrateConfig).
 */
let configGeneration = 0

/** The current cache generation. Capture before an await, compare after. */
export function configCacheGeneration(): number {
  return configGeneration
}

/** Whether anything has been loaded into the cache yet (a cold cache has not). */
export function hasConfigCache(): boolean {
  return configCache !== null
}

/**
 * Load the config from the store into the cache. Call after auth is established,
 * and again whenever the database may have changed under us (a remote edit).
 *
 * Two guards make it safe to call mid-session rather than only at startup:
 *  - a local mutation during the load wins (see configGeneration), because the
 *    user's just-made change is fresher than a snapshot that predates it;
 *  - a failed or empty load defaults ONLY a cold cache. Replacing a warm cache
 *    with defaults on a transient network error would blank every setting and
 *    make the configured repositories vanish from the interface — and the next
 *    local edit would then persist those defaults.
 */
export async function hydrateConfig(): Promise<Config> {
  const generation = configGeneration
  let loaded: Config | null = null
  try {
    loaded = await getStore().loadConfig()
  } catch (error) {
    console.error('Error hydrating config:', error)
  }

  if (configGeneration !== generation) return readConfig()

  if (loaded) {
    configCache = withDefaults(loaded)
  } else if (!configCache) {
    configCache = withDefaults(defaultConfig())
  }
  // Fill in the clone addresses the repos loaded here are still missing. Not
  // awaited: it spawns a git per repo, and hydration is what the whole interface
  // waits on — see backfillRepoRemotes, which never rejects.
  void backfillRepoRemotes()
  return configCache
}

/**
 * Install a config assembled from the database (a remote edit arriving over
 * Realtime) into the cache, applying the usual defaulting.
 *
 * Deliberately does NOT write through to the store: the value came FROM the
 * database, so echoing it back would be a pointless round trip that also
 * re-broadcasts to every other client. Deliberately does NOT bump the
 * generation either: the counter protects local edits from being reverted by a
 * slow load, and this is not a local edit — bumping it would make an
 * in-flight hydrateConfig() throw away a legitimate reload.
 */
export function installRemoteConfig(config: Config): Config {
  configCache = withDefaults(config)
  return configCache
}

/** Drop the cached config (on sign-out) so a different user never sees stale data. */
export function resetConfigCache(): void {
  configCache = null
  configGeneration++
  capturedRemoteAttempts.clear()
}

export function readConfig(): Config {
  return configCache ?? defaultConfig()
}

export function writeConfig(config: Config): void {
  configCache = config
  configGeneration++
  void getStore()
    .saveConfig(config)
    .catch((error) => {
      console.error('Error persisting config:', error)
      reportWriteError('config', error)
    })
}

// ---------------------------------------------------------------------------
// Repository write-through. Repos live in their own tables (repositories +
// repository_paths), NOT in the config blob. Mutations update the in-memory
// cache synchronously (so readConfig stays correct and the returned Config is
// fresh) and write through to the store per-repo — one repo per call, so a change
// never re-broadcasts every team repo over realtime.
// ---------------------------------------------------------------------------

/** Set the cache without persisting the blob (repo mutations don't touch the blob). */
function setConfigCache(config: Config): void {
  configCache = config
}

/** Push a repo's shared identity to the store (fire-and-forget, reports failures). */
function persistRepoIdentity(name: string): void {
  const repo = readConfig().repositories?.[name]
  if (!repo?.id) return
  void getStore()
    .updateRepository(repo.id, {
      name,
      keywords: repo.keywords,
      color: repo.color,
      languages: repo.languages,
      commit: repo.commit,
      pullRequest: repo.pullRequest,
      resolve: repo.resolve,
      issues: repo.issues,
      branches: repo.branches,
      worktreeFiles: repo.worktreeFiles,
    })
    .catch((error) => reportWriteError('config', error))
}

/**
 * Capture the repo's clone address from the folder that was just bound, when the
 * repo has none yet.
 *
 * Deliberately NOT part of persistRepoIdentity: that write goes through
 * `repositories_update`, which only the owner or an org admin may pass — and the
 * person binding a folder to a team repo is usually neither. The dedicated RPC
 * accepts a member's contribution while the column is null (20260816090000).
 *
 * Fire-and-forget and silent on failure, including the cloud one: this is a bonus
 * that makes a later one-click clone possible for teammates. Failing it must never
 * take the path binding — the thing the user actually asked for — down with it.
 */
function captureRepoRemote(name: string, repoPath: string): void {
  const repo = readConfig().repositories?.[name]
  if (!repo?.id || repo.remoteUrl) return

  const remoteUrl = getGitHubRepoUrl(repoPath)
  if (!remoteUrl) return

  // Reflect it locally right away so a second path change doesn't re-derive it,
  // and so the UI can offer the clone without waiting for a re-hydration.
  repo.remoteUrl = remoteUrl
  void getStore()
    .setRepositoryRemoteUrl(repo.id, remoteUrl)
    .catch((error) => console.error('Error capturing repository remote:', error))
}

/**
 * Repo ids this process has already probed for a remote. Hydration runs more than
 * once per session (a remote edit re-loads the config), and a repo whose folder
 * has no GitHub origin would otherwise pay for a git subprocess every single time.
 * Cleared on sign-out along with the cache, so the next user starts fresh.
 */
const capturedRemoteAttempts = new Set<string>()

/**
 * Fill in `remote_url` for the repositories that already have a local folder.
 *
 * captureRepoRemote only fires when a path CHANGES, so every repo bound before
 * the column existed keeps a null address forever — and an invitee, who is
 * offered the one-click clone precisely on the repos they have no folder for,
 * would never see one until an admin happened to re-pick a folder. This is the
 * pass that gives the feature its data: whoever launches the app first and has
 * the folder contributes the address for everyone else.
 *
 * Three properties this must have, and the reasons:
 *  - through setRepositoryRemoteUrl, never the generic update: that RPC is
 *    fill-only and open to plain members, while `repositories_update` is
 *    owner/admin-only, so routing this through it would fail for exactly the
 *    people it runs for;
 *  - never invents anything: only a repo with a local path on THIS machine is
 *    probed, and only git's own `origin` is used;
 *  - never rejects, never throws: it is called fire-and-forget from hydration,
 *    and a refusal, an offline backend or a broken git must leave hydration, the
 *    badge and every user action untouched.
 *
 * Serial and asynchronous on purpose. `getGitHubRepoUrlAsync` keeps the git calls
 * off the main thread, and doing them one at a time keeps a 40-repo org from
 * launching 40 subprocesses at startup.
 */
export async function backfillRepoRemotes(): Promise<void> {
  for (const [name, repo] of Object.entries(readConfig().repositories ?? {})) {
    if (!repo.id || repo.remoteUrl || !repo.path) continue
    if (capturedRemoteAttempts.has(repo.id)) continue
    capturedRemoteAttempts.add(repo.id)

    try {
      const remoteUrl = await getGitHubRepoUrlAsync(repo.path)
      if (!remoteUrl) continue

      // Re-read: the config may have been reloaded, renamed or deleted while git
      // was running, and writing onto a detached object would be writing nowhere.
      const current = readConfig().repositories?.[name]
      if (current?.id !== repo.id || current.remoteUrl) continue

      current.remoteUrl = remoteUrl
      await getStore().setRepositoryRemoteUrl(repo.id, remoteUrl)
    } catch (error) {
      console.error('Error backfilling repository remote:', error)
    }
  }
}

/** Push the caller's local path binding for a repo (or clear it when empty). */
function persistRepoPath(name: string): void {
  const repo = readConfig().repositories?.[name]
  if (!repo?.id) return
  void getStore()
    .setRepositoryPath(repo.id, repo.path || null)
    .catch((error) => reportWriteError('config', error))
}

export function addRepository(name: string, repoPath: string, keywords: string[] = []): Config {
  const config = readConfig()
  config.repositories = config.repositories || {}
  const id = randomUUID()
  // The repo an admin adds here is the one their invitees will later clone, so
  // the address is read off the folder at creation time. Null when the folder has
  // no GitHub origin — the column simply stays empty and the clone is not offered.
  const remoteUrl = repoPath ? getGitHubRepoUrl(repoPath) : null
  const repo: RepositoryConfig = {
    id,
    orgId: null,
    ownerId: null,
    path: repoPath,
    needsLocalPath: !repoPath,
    remoteUrl,
    keywords: keywords.length > 0 ? keywords : [name],
    ...DEFAULT_REPOSITORY_FIELDS,
  }
  config.repositories[name] = repo
  setConfigCache(config)
  // Create the identity row (personal by default) + bind the local path.
  void getStore()
    .createRepository({
      id,
      ownerId: null,
      orgId: null,
      name,
      keywords: repo.keywords,
      color: repo.color,
      languages: repo.languages,
      commit: repo.commit,
      pullRequest: repo.pullRequest,
      resolve: repo.resolve,
      issues: repo.issues,
      branches: repo.branches,
      worktreeFiles: repo.worktreeFiles,
      remoteUrl,
      path: repoPath || null,
    })
    // The row is created with the caller as owner. Stamp that owner on the
    // cached repo now: sharing it to an org later makes ownership the thing
    // that keeps its creator able to edit it, and the config is only
    // re-hydrated from the cloud at launch — until then a null owner would
    // read as "someone else's repo" and lock the creator out of its settings.
    .then((ownerId) => {
      if (!ownerId) return
      const current = readConfig().repositories?.[name]
      if (current?.id === id) current.ownerId = ownerId
    })
    .catch((error) => reportWriteError('config', error))
  return config
}

export function updateRepository(name: string, updates: Partial<RepositoryConfig>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  let pathChanged = false
  let identityChanged = false
  if (updates.path !== undefined) {
    config.repositories[name].path = updates.path
    config.repositories[name].needsLocalPath = !updates.path
    pathChanged = true
  }
  if (updates.keywords !== undefined) {
    config.repositories[name].keywords = updates.keywords
    identityChanged = true
  }
  if (updates.color !== undefined) {
    config.repositories[name].color = updates.color
    identityChanged = true
  }
  if (updates.languages !== undefined) {
    config.repositories[name].languages = updates.languages
    identityChanged = true
  }

  setConfigCache(config)
  if (pathChanged) {
    persistRepoPath(name)
    // A folder was just bound: it knows the repo's remote, and the repo may not.
    // Every surface that binds a path — both wizards, the repo page, the settings
    // page — goes through here, so the capture happens once, for all of them.
    if (updates.path) captureRepoRemote(name, updates.path)
  }
  if (identityChanged) persistRepoIdentity(name)
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

  setConfigCache(config)
  persistRepoIdentity(name)
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
  applySetting(commit, 'allowOnProtectedBranch', settings.allowOnProtectedBranch, isBool)

  if (Object.keys(commit).length === 0) {
    delete config.repositories[name].commit
  }

  setConfigCache(config)
  persistRepoIdentity(name)
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

  setConfigCache(config)
  persistRepoIdentity(name)
  return config
}

export function updateRepositoryPullRequestSettings(name: string, settings: SettingsInput<NonNullable<RepositoryConfig['pullRequest']>>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const pullRequest = config.repositories[name].pullRequest = config.repositories[name].pullRequest || {}

  applySetting(pullRequest, 'autoLinkTickets', settings.autoLinkTickets, isBool)
  applySetting(pullRequest, 'watchCI', settings.watchCI, isBool)
  applySetting(pullRequest, 'testAccounts', settings.testAccounts, isOneOf(['off', 'reference', 'inline']))
  applySetting(pullRequest, 'testAccountsSource', settings.testAccountsSource, isString, ['', null])

  if (Object.keys(pullRequest).length === 0) {
    delete config.repositories[name].pullRequest
  }

  setConfigCache(config)
  persistRepoIdentity(name)
  return config
}

export function updateRepositoryIssuesSettings(name: string, settings: SettingsInput<NonNullable<RepositoryConfig['issues']>>): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const issues = config.repositories[name].issues = config.repositories[name].issues || {}

  applySetting(issues, 'commentOnPR', settings.commentOnPR, isBool)
  applySetting(issues, 'jiraUrl', settings.jiraUrl, isString, ['', null])
  applySetting(issues, 'githubIssuesUrl', settings.githubIssuesUrl, isString, ['', null])

  if (Object.keys(issues).length === 0) {
    delete config.repositories[name].issues
  }

  setConfigCache(config)
  persistRepoIdentity(name)
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

  setConfigCache(config)
  persistRepoIdentity(name)
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

  setConfigCache(config)
  persistRepoIdentity(name)
  return config
}

export function deleteRepository(name: string): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  const id = config.repositories[name].id
  delete config.repositories[name]
  setConfigCache(config)
  if (id) {
    void getStore()
      .deleteRepository(id)
      .catch((error) => reportWriteError('config', error))
  }
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

  // Copy the repo config to the new name and delete the old one (same id/row).
  config.repositories[newName] = config.repositories[oldName]
  delete config.repositories[oldName]

  setConfigCache(config)
  // The name is a shared identity field — push the rename to the store row.
  persistRepoIdentity(newName)
  return config
}

/**
 * Change a repo's scope: share it to an org (orgId set) or make it personal
 * (orgId null). The shared identity row's org_id is updated; RLS enforces that
 * the caller is a member of the target org when sharing.
 */
export function setRepositoryOrg(name: string, orgId: string | null): Config {
  const config = readConfig()
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`)
  }

  config.repositories[name].orgId = orgId
  setConfigCache(config)
  const id = config.repositories[name].id
  if (id) {
    void getStore()
      .updateRepository(id, { orgId })
      .catch((error) => reportWriteError('config', error))
  }
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

/**
 * Store the chosen appearance. The cloud is the reference (the theme follows the
 * user from machine to machine); the main process separately mirrors it locally
 * so the next launch can paint before the config has hydrated — see main/theme.ts.
 */
export function updateTheme(theme: ThemeId): Config {
  const config = readConfig()
  config.theme = theme
  writeConfig(config)
  return config
}

/**
 * Store the chosen interface language. Same two destinations as the theme: the
 * cloud is the reference (it follows the user from machine to machine) and the
 * main process mirrors it locally so the next launch opens in the right language
 * before the config has hydrated — see main/appearance.ts.
 */
export function updateLanguage(language: LanguageId): Config {
  const config = readConfig()
  config.language = language
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
 * Toggle activity recording. ON by default: the app writes its three event tables
 * (usage, activity, skills) unless this is explicitly false. Reading the org
 * aggregate is unaffected by this flag.
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
 * Patch the OS notification settings (master switch and per-kind opt-outs).
 *
 * Merged rather than replaced so the renderer can send one flag at a time, and
 * so turning the master off KEEPS the per-kind choices — they are hidden while
 * it is off and come back untouched, which is what makes the master usable as a
 * temporary "not now" rather than a reset.
 *
 * Every consumer re-reads the config when it is about to notify, so nothing here
 * needs to restart a worker.
 */
export function updateNotifications(patch: Partial<NonNullable<Config['notifications']>>): Config {
  const config = readConfig()
  config.notifications = { ...config.notifications, ...patch }
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

/**
 * Copy accepted source values onto target. In 'fill' mode only keys the target
 * has not set yet are written (local values win); in 'replace' mode every
 * accepted source key overwrites the target (the org's value wins).
 */
function applyValues(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  accept: (value: unknown) => boolean,
): void {
  for (const [key, value] of Object.entries(source)) {
    if (!accept(value)) continue
    if (target[key] === undefined) target[key] = value
  }
}

/**
 * Merge an organization's shared config into the local config, across THAT
 * organization's repositories. Only the shared fields are touched — languages,
 * commit/PR format, and repo keywords; local-only bits (repo paths, integration
 * toggles) are never modified. Missing/malformed input is ignored (never throws
 * on data).
 *
 * Applied as DEFAULTS: an existing local value always wins, so an invitee keeps
 * whatever they had already set. There used to be a 'replace' mode, for when
 * switching the active org had to swap one org's conventions for another's;
 * with no active org and a per-repo scope, nothing overwrites anything.
 */
export function mergeOrgSharedConfig(shared: OrgSharedConfig, orgId: string): Config {
  const config = readConfig()
  config.repositories = config.repositories || {}

  // Only the repositories of THIS organization. Every org's repos are visible
  // at once now, so applying one org's conventions to all of them would give a
  // repo of org B the commit format of org A. A personal repo inherits from no
  // org at all — it belongs to the user, not to a team.
  const scoped = Object.values(config.repositories).filter((r) => r.orgId === orgId)

  for (const repo of scoped) {
    if (shared.languages && typeof shared.languages === 'object') {
      repo.languages = repo.languages || {}
      applyValues(repo.languages, shared.languages, (v) => typeof v === 'string')
    }

    if (shared.commit && typeof shared.commit === 'object') {
      repo.commit = repo.commit || {}
      applyValues(repo.commit, shared.commit, (v) => v !== undefined)
    }

    if (shared.pullRequest && typeof shared.pullRequest === 'object') {
      repo.pullRequest = repo.pullRequest || {}
      applyValues(repo.pullRequest, shared.pullRequest, (v) => v !== undefined)
    }
  }

  // Repo keywords keyed by repo name. In 'fill' mode only a repo with no
  // meaningful keywords yet inherits them; in 'replace' mode the matching repo's
  // keywords are overwritten with the org's.
  // Keyed by the repo's real NAME, which is its key in the record except when
  // two orgs share a name (see toRepositoryRecord) — so match on `name`, and
  // only within this org's repos.
  if (shared.repoKeywords && typeof shared.repoKeywords === 'object') {
    for (const [name, keywords] of Object.entries(shared.repoKeywords)) {
      if (!Array.isArray(keywords) || keywords.length === 0) continue
      const repo = scoped.find((r) => (r.name ?? '') === name)
      if (!repo) continue
      const isDefaulted = repo.keywords.length === 0 || (repo.keywords.length === 1 && repo.keywords[0] === name)
      if (isDefaulted) repo.keywords = keywords
    }
  }

  // Nothing to persist for team repos: they carry their shared identity
  // centrally in the repositories table, and this merge only ever wrote the
  // org's own values back onto them. Personal repos are not touched by an org's
  // shared config at all any more, so there is nothing to push either.
  writeConfig(config)
  return config
}

export { CONFIG_DIR }
