import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Agent, AppInstallationInfo, Config, HistoryEntry, OrgAgent, OrgSharedConfig, RepositoryConfig, RepositoryIdentity, SkillInvocationInput, SpotlightConfig, StoredRepository, TerminalMetadata, UsageEventInput, UsageStats, UserProfile } from '../../types'
import { isValidLaunchMode, isValidSpotlightShortcut } from '../config/defaults'
import { getAuthedClient } from '../cloud/auth'
import { loadSession } from '../cloud/session-store'
import { isCloudEnabled } from '../cloud/supabase-client'
import { mapOrgAgentRow, type OrgAgentRow } from '../cloud/realtime'
import type { ConnectivityStatus, Store } from './Store'

// ---------------------------------------------------------------------------
// DB row shapes (no generated database.types.ts exists — declared inline, in the
// same spirit as the OrgRow/MembershipRow shapes in cloud/org.ts).
// ---------------------------------------------------------------------------

interface ConfigRow {
  data: Config & Partial<Record<'languages' | 'commit' | 'pullRequest' | 'repoKeywords', unknown>>
}

interface AgentRow {
  id: string
  org_id: string
  owner_id: string | null
  name: string
  ticket_id: string | null
  description: string | null
  branch_name: string | null
  base_branch: string | null
  status: string | null
  repositories: string[]
  metadata: TerminalMetadata & { __app?: { id: string; tsCreate?: number; splitPane?: 'left' | 'right' } }
}

interface ActivityEventRow {
  id: string
  agent_id: string | null
  action: string
  ticket_id: string | null
  description: string | null
  repositories: string[]
  occurred_at: string
}

interface RepositoryRow {
  id: string
  owner_id: string | null
  org_id: string | null
  name: string
  keywords: string[] | null
  color: string | null
  languages: RepositoryConfig['languages'] | null
  commit: RepositoryConfig['commit'] | null
  pull_request: RepositoryConfig['pullRequest'] | null
  resolve: RepositoryConfig['resolve'] | null
  issues: RepositoryConfig['issues'] | null
  branches: RepositoryConfig['branches'] | null
  worktree_files: string[] | null
}

interface RepositoryPathRow {
  repo_id: string
  path: string
}

interface ProfileRow {
  name: string | null
  role: string | null
  technical_level: string | null
  communication_style: string | null
  languages: string[] | null
  free_text: string | null
}

/**
 * public.user_settings — one row per user, one column per application-level
 * preference (Settings → Features, Launch Mode, Atlassian flag). Every column is
 * nullable and NULL means "the user never chose": the app's withDefaults() owns
 * the defaults, and several settings genuinely treat absent as a third state
 * distinct from false (history is ON when unset; autoStartAtLogin only touches
 * the macOS login item once explicitly set).
 */
interface UserSettingsRow {
  history_enabled: boolean | null
  usage_card_enabled: boolean | null
  usage_card_minimized: boolean | null
  usage_logs_enabled: boolean | null
  daily_digest_enabled: boolean | null
  split_enabled: boolean | null
  split_active: boolean | null
  pr_reviews_enabled: boolean | null
  pr_reviews_poll_interval_ms: number | null
  pr_reviews_auto_launch_skills: boolean | null
  spotlight_enabled: boolean | null
  spotlight_shortcut: string | null
  auto_start_at_login: boolean | null
  launch_mode: string | null
  atlassian_integration_enabled: boolean | null
}

const USER_SETTINGS_COLUMNS =
  'history_enabled, usage_card_enabled, usage_card_minimized, usage_logs_enabled, ' +
  'daily_digest_enabled, split_enabled, split_active, pr_reviews_enabled, ' +
  'pr_reviews_poll_interval_ms, pr_reviews_auto_launch_skills, spotlight_enabled, ' +
  'spotlight_shortcut, auto_start_at_login, launch_mode, atlassian_integration_enabled'

/**
 * Config keys that now live in `user_settings`. Stripped from the org-scoped
 * `configs` blob on every write so there is exactly one source of truth — the
 * blob keeps only what is genuinely org-scoped (the shared-config projection,
 * `currentOrgId`, `version`).
 */
const SETTINGS_KEYS = [
  'historyEnabled',
  'usageCardEnabled',
  'usageCardMinimized',
  'usageLogsEnabled',
  'dailyDigest',
  'splitEnabled',
  'splitActive',
  'prReviews',
  'spotlight',
  'autoStartAtLogin',
  'launchMode',
  'integrations',
] as const

/** `undefined` (key absent from Config) → `null` (column unset). */
function orNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value
}

/** A column that actually carries a value (neither NULL nor missing from the projection). */
function isSet<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/** Project a Config onto its user_settings row. Absent keys become NULL. */
function configToSettingsRow(config: Config): UserSettingsRow {
  return {
    history_enabled: orNull(config.historyEnabled),
    usage_card_enabled: orNull(config.usageCardEnabled),
    usage_card_minimized: orNull(config.usageCardMinimized),
    usage_logs_enabled: orNull(config.usageLogsEnabled),
    daily_digest_enabled: orNull(config.dailyDigest?.enabled),
    split_enabled: orNull(config.splitEnabled),
    split_active: orNull(config.splitActive),
    pr_reviews_enabled: orNull(config.prReviews?.enabled),
    pr_reviews_poll_interval_ms: orNull(config.prReviews?.pollIntervalMs),
    pr_reviews_auto_launch_skills: orNull(config.prReviews?.autoLaunchSkills),
    spotlight_enabled: orNull(config.spotlight?.enabled),
    spotlight_shortcut: orNull(config.spotlight?.shortcut),
    auto_start_at_login: orNull(config.autoStartAtLogin),
    launch_mode: orNull(config.launchMode),
    atlassian_integration_enabled: orNull(config.integrations?.atlassian),
  }
}

/**
 * Apply a user_settings row onto a Config, in place. NULL columns are skipped so
 * the key stays absent and withDefaults() (not this mapper) decides the default.
 * Enum-like columns are re-validated on read: the DB has matching CHECKs, but a
 * value written by a newer app version must not leak through as an invalid enum.
 */
function applySettingsRow(config: Config, row: UserSettingsRow): void {
  if (isSet(row.history_enabled)) config.historyEnabled = row.history_enabled
  if (isSet(row.usage_card_enabled)) config.usageCardEnabled = row.usage_card_enabled
  if (isSet(row.usage_card_minimized)) config.usageCardMinimized = row.usage_card_minimized
  if (isSet(row.usage_logs_enabled)) config.usageLogsEnabled = row.usage_logs_enabled
  if (isSet(row.daily_digest_enabled)) config.dailyDigest = { enabled: row.daily_digest_enabled }
  if (isSet(row.split_enabled)) config.splitEnabled = row.split_enabled
  if (isSet(row.split_active)) config.splitActive = row.split_active
  if (isSet(row.auto_start_at_login)) config.autoStartAtLogin = row.auto_start_at_login
  if (isValidLaunchMode(row.launch_mode)) config.launchMode = row.launch_mode

  const prReviews: NonNullable<Config['prReviews']> = {}
  if (isSet(row.pr_reviews_enabled)) prReviews.enabled = row.pr_reviews_enabled
  if (isSet(row.pr_reviews_poll_interval_ms)) prReviews.pollIntervalMs = row.pr_reviews_poll_interval_ms
  if (isSet(row.pr_reviews_auto_launch_skills)) prReviews.autoLaunchSkills = row.pr_reviews_auto_launch_skills
  if (Object.keys(prReviews).length > 0) config.prReviews = prReviews

  // Spotlight is a two-field object; a partial one is fine because withDefaults()
  // merges DEFAULT_SPOTLIGHT under whatever is present.
  const spotlight: Partial<SpotlightConfig> = {}
  if (isSet(row.spotlight_enabled)) spotlight.enabled = row.spotlight_enabled
  if (isValidSpotlightShortcut(row.spotlight_shortcut)) spotlight.shortcut = row.spotlight_shortcut
  if (Object.keys(spotlight).length > 0) config.spotlight = spotlight as SpotlightConfig

  // github is a const true in the schema; only atlassian is user-settable.
  if (isSet(row.atlassian_integration_enabled)) {
    config.integrations = { github: true, atlassian: row.atlassian_integration_enabled }
  }
}

// numeric/bigint columns come back from PostgREST as strings — coerced on read.
interface UsageEventRow {
  user_id: string | null
  agent_id: string | null
  model: string | null
  cost_usd: string | number | null
  tokens: string | number | null
  lines_added: number | null
  lines_removed: number | null
  duration_ms: string | number | null
  occurred_at: string
}

/** Coerce a numeric/bigint column (string | number | null) to a number, defaulting to 0. */
function toNumber(value: string | number | null): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** The four shareable keys, projected to the TOP LEVEL of the config blob so the
 *  get_org_shared_config SECURITY DEFINER function keeps returning them. */
function projectSharedFields(config: Config): Record<string, unknown> {
  const repos = Object.values(config.repositories ?? {})
  const named = Object.entries(config.repositories ?? {})

  const firstWith = <K extends keyof (typeof repos)[number]>(key: K) =>
    repos.find((r) => r[key] !== undefined)?.[key]

  const repoKeywords: Record<string, string[]> = {}
  for (const [name, repo] of named) {
    if (Array.isArray(repo.keywords) && repo.keywords.length > 0) repoKeywords[name] = repo.keywords
  }

  const shared: Record<string, unknown> = {}
  const languages = firstWith('languages')
  const commit = firstWith('commit')
  const pullRequest = firstWith('pullRequest')
  if (languages) shared.languages = languages
  if (commit) shared.commit = commit
  if (pullRequest) shared.pullRequest = pullRequest
  if (Object.keys(repoKeywords).length > 0) shared.repoKeywords = repoKeywords
  return shared
}

const SHARED_KEYS = ['languages', 'commit', 'pullRequest', 'repoKeywords'] as const

/**
 * Single Supabase-backed Store implementation. Config, agents and history all
 * live in the database — nothing is persisted locally. Reads/writes are scoped
 * to the current user's active organization, and the per-user data inside it
 * (config, agents, activity) is additionally scoped to the signed-in user: only
 * the explicitly org-wide readers (loadOrgAgents, loadOrgUsageStats) span members.
 */
export class CloudStore implements Store {
  private activeOrgId: string | undefined
  /** app agent id ("claude-…") → agents.id (uuid). Rebuilt on every loadAgents. */
  private agentIdMap = new Map<string, string>()
  /** agents.id (uuid) → display name, for reconstructing history entries. */
  private agentNameByUuid = new Map<string, string>()

  setActiveOrgId(orgId: string | undefined): void {
    this.activeOrgId = orgId
  }

  private async context(): Promise<{ client: SupabaseClient; uid: string; orgId: string } | null> {
    const client = await getAuthedClient()
    if (!client) return null
    const uid = loadSession()?.user?.id
    if (!uid) return null
    const orgId = await this.resolveOrgId(client, uid)
    if (!orgId) return null
    return { client, uid, orgId }
  }

  /** Client + uid without requiring an active org (for org-independent data like profiles). */
  private async userContext(): Promise<{ client: SupabaseClient; uid: string } | null> {
    const client = await getAuthedClient()
    if (!client) return null
    const uid = loadSession()?.user?.id
    if (!uid) return null
    return { client, uid }
  }

  private async resolveOrgId(client: SupabaseClient, uid: string): Promise<string | null> {
    const { data, error } = await client
      .from('memberships')
      .select('org_id')
      .eq('user_id', uid)
      .order('created_at', { ascending: true })
    if (error || !data || data.length === 0) return null
    const ids = data.map((r) => (r as { org_id: string }).org_id)
    if (this.activeOrgId && ids.includes(this.activeOrgId)) return this.activeOrgId
    this.activeOrgId = ids[0]
    return ids[0]
  }

  // -------------------------------------------------------------------------
  // Config
  // -------------------------------------------------------------------------

  /** Read the caller's user_settings row, or null when they have none yet. */
  private async fetchUserSettings(ctx: { client: SupabaseClient; uid: string }): Promise<UserSettingsRow | null> {
    const { data, error } = await ctx.client
      .from('user_settings')
      .select(USER_SETTINGS_COLUMNS)
      .eq('user_id', ctx.uid)
      .maybeSingle()
    // maybeSingle yields an object or null; guard the shape anyway so a
    // malformed/empty response can never be applied as a row of undefineds.
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) return null
    return data as unknown as UserSettingsRow
  }

  /**
   * Upsert the caller's settings row. Uses userContext() (not context()) on
   * purpose: preferences belong to the USER, so they must persist even when no
   * org is active — which is exactly the case the old org-scoped blob dropped.
   */
  private async saveUserSettings(config: Config): Promise<void> {
    const ctx = await this.userContext()
    if (!ctx) return
    const { error } = await ctx.client
      .from('user_settings')
      .upsert({ user_id: ctx.uid, ...configToSettingsRow(config) }, { onConflict: 'user_id' })
    if (error) throw new Error(`saveUserSettings failed: ${error.message}`)
  }

  async loadConfig(): Promise<Config | null> {
    const user = await this.userContext()
    if (!user) return null

    // Settings are user-scoped and load without any org. Fetch them first so a
    // user with no membership still gets their preferences back.
    const settings = await this.fetchUserSettings(user)

    const ctx = await this.context()
    if (!ctx) {
      // No active org: there is no config blob and no team repos to read, but the
      // user's own settings and personal repos are still theirs. `version` is
      // rewritten by migrateConfig() from app.getVersion() on the next pass.
      const config: Config = { version: 'unknown', repositories: {} }
      if (settings) applySettingsRow(config, settings)
      config.repositories = this.toRepositoryRecord(await this.fetchRepositories({ ...user, orgId: null }))
      return config
    }

    const { data, error } = await ctx.client
      .from('configs')
      .select('data')
      .eq('org_id', ctx.orgId)
      .eq('user_id', ctx.uid)
      .maybeSingle()

    // A hard query error aborts (caller falls back to defaults); an absent row is
    // fine (new user) — we still assemble repositories, which may include team
    // repos inherited via org membership.
    if (error) return null

    const blob = { ...((data as ConfigRow | null)?.data ?? {}) } as Record<string, unknown>
    // Drop the top-level shared projection — it is a mirror, not part of Config.
    for (const key of SHARED_KEYS) delete blob[key]

    // One-shot migration: repos used to live inside the config blob. Move any
    // that remain into the repositories table (as personal repos) + bind the
    // local path, then strip them from the blob so this never runs again.
    const legacy = blob.repositories
    if (legacy && typeof legacy === 'object' && !Array.isArray(legacy) && Object.keys(legacy).length > 0) {
      await this.migrateLegacyRepositories(ctx, legacy as Record<string, RepositoryConfig>)
      delete blob.repositories
      // Snapshot the blob for the write — `blob` is the same object we return as
      // `config` below and get `repositories` assigned back onto it.
      await ctx.client
        .from('configs')
        .upsert({ org_id: ctx.orgId, user_id: ctx.uid, data: { ...blob } }, { onConflict: 'org_id,user_id' })
    } else {
      delete blob.repositories
    }

    const config = blob as unknown as Config
    // Keep the remembered org id in sync with what we actually loaded.
    if (typeof config.currentOrgId === 'string') {
      this.activeOrgId = config.currentOrgId
    }
    // user_settings is the source of truth for preferences; it is applied OVER
    // any legacy copy left in the blob (pre-migration installs), so the two can
    // never disagree in favour of the stale one.
    if (settings) applySettingsRow(config, settings)
    // Repositories are assembled from their own tables, not the blob.
    config.repositories = this.toRepositoryRecord(await this.fetchRepositories(ctx))
    return config
  }

  async saveConfig(config: Config): Promise<void> {
    // Preferences go to the user-scoped table first — they must be saved even
    // when there is no active org to write the blob against.
    await this.saveUserSettings(config)

    const ctx = await this.context()
    if (!ctx) return

    // Mirror the shareable keys at top level so get_org_shared_config keeps
    // working for org admins. Two families of keys are stripped: `repositories`
    // (persisted in repositories/repository_paths) and every settings key (now
    // owned by user_settings), so the blob holds only org-scoped state.
    const data: Record<string, unknown> = { ...config, ...projectSharedFields(config) }
    delete data.repositories
    for (const key of SETTINGS_KEYS) delete data[key]

    const { error } = await ctx.client
      .from('configs')
      .upsert({ org_id: ctx.orgId, user_id: ctx.uid, data }, { onConflict: 'org_id,user_id' })
    if (error) throw new Error(`saveConfig failed: ${error.message}`)
  }

  // -------------------------------------------------------------------------
  // Repositories (personal + team) — identity in `repositories`, per-user local
  // path in `repository_paths`.
  // -------------------------------------------------------------------------

  private repoIdentityToRow(patch: Partial<RepositoryIdentity>): Record<string, unknown> {
    const row: Record<string, unknown> = {}
    if (patch.name !== undefined) row.name = patch.name
    if (patch.orgId !== undefined) row.org_id = patch.orgId
    if (patch.keywords !== undefined) row.keywords = patch.keywords
    if (patch.color !== undefined) row.color = patch.color ?? null
    if (patch.languages !== undefined) row.languages = patch.languages ?? {}
    if (patch.commit !== undefined) row.commit = patch.commit ?? {}
    if (patch.pullRequest !== undefined) row.pull_request = patch.pullRequest ?? {}
    if (patch.resolve !== undefined) row.resolve = patch.resolve ?? {}
    if (patch.issues !== undefined) row.issues = patch.issues ?? {}
    if (patch.branches !== undefined) row.branches = patch.branches ?? {}
    if (patch.worktreeFiles !== undefined) row.worktree_files = patch.worktreeFiles ?? []
    return row
  }

  private mapRepositoryRow(row: RepositoryRow, path: string | null): StoredRepository {
    return {
      id: row.id,
      ownerId: row.owner_id,
      orgId: row.org_id,
      name: row.name,
      keywords: row.keywords ?? [],
      color: row.color ?? undefined,
      languages: row.languages ?? undefined,
      commit: row.commit ?? undefined,
      pullRequest: row.pull_request ?? undefined,
      resolve: row.resolve ?? undefined,
      issues: row.issues ?? undefined,
      branches: row.branches ?? undefined,
      worktreeFiles: row.worktree_files ?? undefined,
      path,
    }
  }

  /** Map assembled repos to the name-keyed Config.repositories record. */
  private toRepositoryRecord(repos: StoredRepository[]): Record<string, RepositoryConfig> {
    const record: Record<string, RepositoryConfig> = {}
    for (const r of repos) {
      record[r.name] = {
        id: r.id,
        orgId: r.orgId,
        ownerId: r.ownerId,
        path: r.path ?? '',
        needsLocalPath: !r.path,
        keywords: r.keywords,
        color: r.color,
        languages: r.languages,
        commit: r.commit,
        pullRequest: r.pullRequest,
        resolve: r.resolve,
        issues: r.issues,
        branches: r.branches,
        worktreeFiles: r.worktreeFiles,
      }
    }
    return record
  }

  /**
   * Fetch repos visible to the caller (own personal + active-org team) with the
   * caller's own path. `orgId: null` means no active org, which narrows the set to
   * personal repos only.
   */
  private async fetchRepositories(ctx: { client: SupabaseClient; uid: string; orgId: string | null }): Promise<StoredRepository[]> {
    const [reposRes, pathsRes] = await Promise.all([
      ctx.client
        .from('repositories')
        .select('id, owner_id, org_id, name, keywords, color, languages, commit, pull_request, resolve, issues, branches, worktree_files'),
      ctx.client.from('repository_paths').select('repo_id, path'),
    ])
    if (reposRes.error || !reposRes.data) return []

    const pathById = new Map<string, string>()
    if (!pathsRes.error && pathsRes.data) {
      for (const p of pathsRes.data as RepositoryPathRow[]) pathById.set(p.repo_id, p.path)
    }

    return (reposRes.data as RepositoryRow[])
      // RLS returns personal (owned) + team repos of ALL the user's orgs; scope
      // team repos to the ACTIVE org so switching orgs swaps the visible set.
      .filter((r) => r.org_id === null || r.org_id === ctx.orgId)
      .map((r) => this.mapRepositoryRow(r, pathById.get(r.id) ?? null))
  }

  async listRepositories(): Promise<StoredRepository[]> {
    const ctx = await this.context()
    if (!ctx) return []
    return this.fetchRepositories(ctx)
  }

  async createRepository(repo: StoredRepository): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return
    const { error } = await ctx.client.from('repositories').insert({
      id: repo.id,
      owner_id: ctx.uid,
      org_id: repo.orgId ?? null,
      name: repo.name,
      keywords: repo.keywords ?? [],
      color: repo.color ?? null,
      languages: repo.languages ?? {},
      commit: repo.commit ?? {},
      pull_request: repo.pullRequest ?? {},
      resolve: repo.resolve ?? {},
      issues: repo.issues ?? {},
      branches: repo.branches ?? {},
      worktree_files: repo.worktreeFiles ?? [],
    })
    if (error) throw new Error(`createRepository failed: ${error.message}`)
    if (repo.path) await this.setRepositoryPath(repo.id, repo.path)
  }

  async updateRepository(id: string, patch: Partial<RepositoryIdentity>): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return
    const row = this.repoIdentityToRow(patch)
    if (Object.keys(row).length === 0) return
    const { error } = await ctx.client.from('repositories').update(row).eq('id', id)
    if (error) throw new Error(`updateRepository failed: ${error.message}`)
  }

  async deleteRepository(id: string): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return
    const { error } = await ctx.client.from('repositories').delete().eq('id', id)
    if (error) throw new Error(`deleteRepository failed: ${error.message}`)
  }

  async setRepositoryPath(id: string, path: string | null): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return
    if (path && path.trim().length > 0) {
      const { error } = await ctx.client
        .from('repository_paths')
        .upsert({ repo_id: id, user_id: ctx.uid, path }, { onConflict: 'repo_id,user_id' })
      if (error) throw new Error(`setRepositoryPath failed: ${error.message}`)
    } else {
      const { error } = await ctx.client
        .from('repository_paths')
        .delete()
        .eq('repo_id', id)
        .eq('user_id', ctx.uid)
      if (error) throw new Error(`setRepositoryPath (clear) failed: ${error.message}`)
    }
  }

  /**
   * Move legacy repos embedded in the config blob into the repositories table as
   * PERSONAL repos (org_id null), binding the local path. Best-effort and
   * idempotent: a duplicate-name insert (23505) means a prior run already
   * migrated it, so it's skipped rather than fatal.
   */
  private async migrateLegacyRepositories(
    ctx: { client: SupabaseClient; uid: string; orgId: string },
    legacy: Record<string, RepositoryConfig>,
  ): Promise<void> {
    for (const [name, repo] of Object.entries(legacy)) {
      const id = randomUUID()
      const { error } = await ctx.client.from('repositories').insert({
        id,
        owner_id: ctx.uid,
        org_id: null,
        name,
        keywords: repo.keywords ?? [],
        color: repo.color ?? null,
        languages: repo.languages ?? {},
        commit: repo.commit ?? {},
        pull_request: repo.pullRequest ?? {},
        resolve: repo.resolve ?? {},
        issues: repo.issues ?? {},
        branches: repo.branches ?? {},
        worktree_files: repo.worktreeFiles ?? [],
      })
      if (error) {
        // 23505 = already migrated (unique (owner_id, name) where org_id is null).
        if ((error as { code?: string }).code === '23505') continue
        throw new Error(`migrateLegacyRepositories failed: ${error.message}`)
      }
      if (repo.path && repo.path.trim().length > 0) {
        await ctx.client
          .from('repository_paths')
          .upsert({ repo_id: id, user_id: ctx.uid, path: repo.path }, { onConflict: 'repo_id,user_id' })
      }
    }
  }

  // -------------------------------------------------------------------------
  // Agents
  // -------------------------------------------------------------------------

  private toAgentRow(agent: Agent, id: string, orgId: string, uid: string): Record<string, unknown> {
    const meta = agent.metadata
    return {
      id,
      org_id: orgId,
      owner_id: uid,
      name: agent.name,
      ticket_id: meta?.ticketId ?? null,
      description: meta?.description ?? null,
      branch_name: meta?.branchName ?? null,
      base_branch: meta?.baseBranch ?? null,
      status: meta?.status ?? null,
      repositories: agent.repositories ?? [],
      metadata: { ...(meta ?? {}), __app: { id: agent.id, tsCreate: agent.tsCreate, splitPane: agent.splitPane } },
    }
  }

  private fromAgentRow(row: AgentRow): Agent {
    const app = row.metadata?.__app
    const metadata = { ...(row.metadata ?? {}) } as AgentRow['metadata']
    delete metadata.__app
    return {
      id: app?.id ?? row.id,
      name: row.name,
      repositories: Array.isArray(row.repositories) ? row.repositories : [],
      tsCreate: app?.tsCreate,
      metadata: metadata as TerminalMetadata,
      splitPane: app?.splitPane,
    }
  }

  /**
   * The caller's OWN agents in the active org. Scoped by owner_id as well as
   * org_id: RLS lets any member SELECT every agent of the org (the team dashboard
   * needs that — see loadOrgAgents), but this list drives local terminal
   * restoration, so it must never hand one member's agents to another. Rows whose
   * owner_id was nulled by the membership FK (an ex-member's agents) belong to
   * nobody and are deliberately excluded.
   */
  async loadAgents(): Promise<Agent[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('agents')
      .select('id, org_id, owner_id, name, ticket_id, description, branch_name, base_branch, status, repositories, metadata, updated_at')
      .eq('org_id', ctx.orgId)
      .eq('owner_id', ctx.uid)

    if (error || !data) return []

    this.agentIdMap.clear()
    this.agentNameByUuid.clear()
    const agents: Agent[] = []
    for (const raw of data as AgentRow[]) {
      const agent = this.fromAgentRow(raw)
      this.agentIdMap.set(agent.id, raw.id)
      this.agentNameByUuid.set(raw.id, agent.name)
      agents.push(agent)
    }
    return agents
  }

  async saveAgents(agents: Agent[]): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return

    const desired = new Set(agents.map((a) => a.id))

    // Delete rows whose app agent id no longer exists locally. Scoped by owner_id
    // as well: closing an agent must never reach a teammate's row.
    for (const [appId, uuid] of [...this.agentIdMap.entries()]) {
      if (!desired.has(appId)) {
        const { error } = await ctx.client
          .from('agents')
          .delete()
          .eq('org_id', ctx.orgId)
          .eq('owner_id', ctx.uid)
          .eq('id', uuid)
        if (error) throw new Error(`saveAgents (delete) failed: ${error.message}`)
        this.agentIdMap.delete(appId)
        this.agentNameByUuid.delete(uuid)
      }
    }

    // Upsert the desired set.
    const rows = agents.map((a) => {
      const uuid = this.agentIdMap.get(a.id) ?? randomUUID()
      this.agentIdMap.set(a.id, uuid)
      this.agentNameByUuid.set(uuid, a.name)
      return this.toAgentRow(a, uuid, ctx.orgId, ctx.uid)
    })
    if (rows.length === 0) return

    const { error } = await ctx.client.from('agents').upsert(rows, { onConflict: 'id' })
    if (error) throw new Error(`saveAgents failed: ${error.message}`)
  }

  /**
   * Org-wide agents roster for the team dashboard. Unlike loadAgents (which maps
   * to the LOCAL Agent shape and drives terminal restoration), this preserves
   * owner_id + updated_at so the dashboard can group by member and show recency.
   * Read-only: never touches the local agents cache. RLS scopes it to the org.
   */
  async loadOrgAgents(): Promise<OrgAgent[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('agents')
      .select('id, owner_id, name, ticket_id, status, repositories, metadata, updated_at')
      .eq('org_id', ctx.orgId)

    if (error || !data) return []
    return (data as OrgAgentRow[]).map(mapOrgAgentRow)
  }

  // -------------------------------------------------------------------------
  // History (activity_events — append-only, read-limited)
  // -------------------------------------------------------------------------

  /**
   * The caller's OWN activity feed. Scoped by user_id for the same reason as
   * loadAgents: RLS exposes the whole org's events, but the History page is a
   * personal feed and agent names resolve from the caller's own agents cache, so
   * a teammate's events would render name-less anyway.
   */
  async loadHistory(limit: number): Promise<HistoryEntry[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('activity_events')
      .select('id, agent_id, action, ticket_id, description, repositories, occurred_at')
      .eq('org_id', ctx.orgId)
      .eq('user_id', ctx.uid)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    // Reverse to oldest-first to match the legacy read order.
    return (data as ActivityEventRow[]).reverse().map((row) => ({
      id: row.id,
      agentId: row.agent_id ?? '',
      agentName: (row.agent_id ? this.agentNameByUuid.get(row.agent_id) : undefined) ?? '',
      action: row.action as HistoryEntry['action'],
      ticketId: row.ticket_id ?? undefined,
      description: row.description ?? undefined,
      repositories: Array.isArray(row.repositories) ? row.repositories : [],
      timestamp: Date.parse(row.occurred_at) || Date.now(),
    }))
  }

  async appendHistory(entry: HistoryEntry): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return

    const agentUuid = this.agentIdMap.get(entry.agentId) ?? null

    const { error } = await ctx.client.from('activity_events').insert({
      org_id: ctx.orgId,
      user_id: ctx.uid,
      agent_id: agentUuid,
      action: entry.action,
      ticket_id: entry.ticketId ?? null,
      description: entry.description ?? null,
      repositories: entry.repositories ?? [],
      occurred_at: new Date(entry.timestamp).toISOString(),
    })
    if (error) throw new Error(`appendHistory failed: ${error.message}`)
  }

  // -------------------------------------------------------------------------
  // Usage events (usage_events — append-only, opt-in write / open org read)
  // -------------------------------------------------------------------------

  /**
   * Append ONE aggregated usage snapshot at session end. Maps the app agent id to
   * the agents.id uuid via agentIdMap (exactly like appendHistory). tokens is left
   * null on purpose: TerminalUsage.contextTokens is a point-in-time context gauge,
   * not a cumulative session-token count, so it must not be mapped into this row.
   */
  async appendUsage(event: UsageEventInput): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return

    const agentUuid = this.agentIdMap.get(event.agentId) ?? null

    const { error } = await ctx.client.from('usage_events').insert({
      org_id: ctx.orgId,
      user_id: ctx.uid,
      agent_id: agentUuid,
      model: event.model ?? null,
      cost_usd: event.costUsd ?? null,
      tokens: null,
      lines_added: event.linesAdded ?? null,
      lines_removed: event.linesRemoved ?? null,
      duration_ms: event.durationMs ?? null,
      occurred_at: new Date(event.occurredAt ?? Date.now()).toISOString(),
    })
    if (error) throw new Error(`appendUsage failed: ${error.message}`)
  }

  /**
   * Append ONE skill invocation. Same agent-id mapping as appendUsage; an absent
   * or unknown agent yields a null agent_id rather than dropping the row — runs
   * from a terminal the app did not spawn have no agent, and still count.
   */
  async recordSkillInvocation(input: SkillInvocationInput): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return

    const agentUuid = (input.agentId && this.agentIdMap.get(input.agentId)) ?? null

    const { error } = await ctx.client.from('skill_invocations').insert({
      org_id: ctx.orgId,
      user_id: ctx.uid,
      agent_id: agentUuid,
      skill: input.skill,
      occurred_at: new Date(input.occurredAt ?? Date.now()).toISOString(),
    })
    if (error) throw new Error(`recordSkillInvocation failed: ${error.message}`)
  }

  /**
   * Org-wide usage rows for the team dashboard, newest-first. RLS scopes the read
   * to the org (any member may read — the opt-in only gates writing your own data).
   * Returns the raw rows for client-side aggregation.
   */
  async loadOrgUsageStats(): Promise<UsageStats> {
    const ctx = await this.context()
    if (!ctx) return { rows: [], capped: false }

    const LIMIT = 5000
    const { data, error } = await ctx.client
      .from('usage_events')
      .select('user_id, agent_id, model, cost_usd, tokens, lines_added, lines_removed, duration_ms, occurred_at')
      .eq('org_id', ctx.orgId)
      .order('occurred_at', { ascending: false })
      .limit(LIMIT)

    if (error || !data) return { rows: [], capped: false }

    // When the result reaches the cap the aggregated totals are partial; surface it so the UI can warn.
    const capped = data.length === LIMIT
    const rows = (data as UsageEventRow[]).map((r) => ({
      userId: r.user_id,
      agentId: r.agent_id,
      model: r.model,
      costUsd: toNumber(r.cost_usd),
      tokens: r.tokens === null ? null : toNumber(r.tokens),
      linesAdded: r.lines_added ?? 0,
      linesRemoved: r.lines_removed ?? 0,
      durationMs: toNumber(r.duration_ms),
      occurredAt: r.occurred_at,
    }))
    return { rows, capped }
  }

  // -------------------------------------------------------------------------
  // Org shared config (admin write path)
  // -------------------------------------------------------------------------

  async setOrgSharedConfig(orgId: string, shared: OrgSharedConfig): Promise<void> {
    const client = await getAuthedClient()
    if (!client) throw new Error('Cloud features are not available')
    const { error } = await client.rpc('set_org_shared_config', { p_org_id: orgId, p_shared: shared })
    if (error) throw new Error(error.message)
  }

  // -------------------------------------------------------------------------
  // Profile (per-user, org-independent)
  // -------------------------------------------------------------------------

  async loadProfile(): Promise<UserProfile | null> {
    const ctx = await this.userContext()
    if (!ctx) return null

    const { data, error } = await ctx.client
      .from('profiles')
      .select('name, role, technical_level, communication_style, languages, free_text')
      .eq('user_id', ctx.uid)
      .maybeSingle()

    if (error || !data) return null
    const row = data as ProfileRow
    // A profile needs the three required fields to be meaningful.
    if (!row.name || !row.role || !row.technical_level) return null

    const profile: UserProfile = {
      name: row.name,
      role: row.role as UserProfile['role'],
      technical_level: row.technical_level as UserProfile['technical_level'],
    }
    if (row.communication_style) profile.communication_style = row.communication_style as UserProfile['communication_style']
    if (Array.isArray(row.languages) && row.languages.length > 0) profile.languages = row.languages
    if (row.free_text) profile.freeText = row.free_text
    return profile
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const ctx = await this.userContext()
    if (!ctx) return

    const { error } = await ctx.client.from('profiles').upsert(
      {
        user_id: ctx.uid,
        name: profile.name,
        role: profile.role,
        technical_level: profile.technical_level,
        communication_style: profile.communication_style ?? null,
        languages: profile.languages ?? [],
        free_text: profile.freeText ?? null,
      },
      { onConflict: 'user_id' },
    )
    if (error) throw new Error(`saveProfile failed: ${error.message}`)
  }

  // -------------------------------------------------------------------------
  // App installations (per-user, per-device version telemetry)
  // -------------------------------------------------------------------------

  /**
   * Upsert this machine's row in `app_installations`, refreshing `last_seen_at`
   * and `app_version`. Called once per launch, so the DB always reflects the
   * version each user actually runs (an auto-update restarts the app, which
   * re-records the new version on the way back up).
   *
   * Only the columns in the payload are written, so `first_seen_at` keeps its
   * original value across upserts and `app_version_updated_at` is left to the
   * table's trigger (stamped only when the version genuinely changes).
   */
  async recordAppInstallation(info: AppInstallationInfo): Promise<void> {
    const ctx = await this.userContext()
    if (!ctx) return

    const { error } = await ctx.client.from('app_installations').upsert(
      {
        user_id: ctx.uid,
        device_id: info.deviceId,
        device_name: info.deviceName ?? null,
        app_version: info.appVersion,
        platform: info.platform ?? null,
        arch: info.arch ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,device_id' },
    )
    if (error) throw new Error(`recordAppInstallation failed: ${error.message}`)
  }

  // -------------------------------------------------------------------------
  // Connectivity
  // -------------------------------------------------------------------------

  async ping(): Promise<ConnectivityStatus> {
    if (!isCloudEnabled()) return 'disabled'
    const stored = loadSession()
    if (!stored) return 'unauthorized'

    // Applying the session refreshes the token when needed. getAuthedClient
    // clears the session ONLY on a genuine refresh-token rejection (→ null with
    // no session left) and keeps it on a transient/offline error (→ null with
    // the session still present), which lets us tell the two apart.
    const client = await getAuthedClient()
    if (!client) return loadSession() ? 'unreachable' : 'unauthorized'

    try {
      const { error } = await client
        .from('memberships')
        .select('org_id', { count: 'exact', head: true })
        .limit(1)
      if (!error) return 'ok'
      const status = (error as { status?: number }).status
      if (status === 401 || status === 403) return 'unauthorized'
      return 'unreachable'
    } catch {
      return 'unreachable'
    }
  }
}
