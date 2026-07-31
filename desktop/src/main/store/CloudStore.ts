import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Agent, AppInstallationInfo, Config, HistoryAction, HistoryEntry, OrgActivity, OrgAgent, OrgSharedConfig, RepositoryConfig, RepositoryIdentity, SkillCounts, SkillInvocationInput, StoredRepository, TerminalMetadata, UsageEventInput, UsageStats, UserProfile } from '../../types'
import { getAuthedClient } from '../cloud/auth'
import { loadSession } from '../cloud/session-store'
import { isCloudEnabled } from '../cloud/supabase-client'
import { mapOrgAgentRow, type OrgAgentRow } from '../cloud/realtime'
import type { ConnectivityStatus, Store } from './Store'
import {
  applySettingsRow,
  configToSettingsRow,
  SETTINGS_KEYS,
  USER_SETTINGS_COLUMNS,
  type UserSettingsRow,
} from './user-settings-mapper'

// ---------------------------------------------------------------------------
// DB row shapes (no generated database.types.ts exists — declared inline, in the
// same spirit as the OrgRow/MembershipRow shapes in cloud/org.ts).
// ---------------------------------------------------------------------------

interface ConfigRow {
  data: Config & Partial<Record<'languages' | 'commit' | 'pullRequest' | 'repoKeywords', unknown>>
}

interface AgentRow {
  id: string
  // DERIVED from the agent's repositories, and null for an agent on personal repos
  // only (or on none yet) — see migration 20260727160000. Selected but never read:
  // the client is not allowed an opinion on it.
  org_id: string | null
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

/**
 * The only read of activity_events: the org-wide one behind the Team page. It
 * selects `user_id` (to attribute in-flight work) and skips `description` (free
 * text nobody aggregates).
 */
interface OrgActivityEventRow {
  id: string
  user_id: string | null
  agent_id: string | null
  action: string
  ticket_id: string | null
  repositories: string[]
  occurred_at: string
}

/**
 * Actions the flow metrics can actually use. `completed` (every Claude-Code turn)
 * and `committed` (every commit) are excluded on purpose: they dwarf these in
 * volume and would eat the row budget without informing a single metric.
 */
const FLOW_ACTIONS: readonly HistoryAction[] = [
  'started',
  'pr_created',
  'review',
  'review_addressed',
  'review_approved',
  'review_changes_requested',
  'merged',
  'agent_created',
  'agent_closed',
]

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
 * Single Supabase-backed Store implementation. Config, agents and the event
 * tables all live in the database — nothing is persisted locally. Reads/writes are
 * scoped to the current user's active organization, and the per-user data inside it
 * (config, agents) is additionally scoped to the signed-in user: only the
 * explicitly org-wide readers (loadOrgAgents, loadOrgUsageStats, loadOrgActivity)
 * span members. The event tables are append-only and write-only from here, save
 * for those org-wide readers.
 */
/** Everything a query needs: an authed client, the caller, and the active org. */
interface CloudContext {
  client: SupabaseClient
  uid: string
  orgId: string
}

export class CloudStore implements Store {
  private activeOrgId: string | undefined
  /** app agent id ("claude-…") → agents.id (uuid). Rebuilt on every loadAgents. */
  private agentIdMap = new Map<string, string>()
  /** app agent id → digest of its last-synced repository ids (see syncRepoLinks). */
  private agentRepoKey = new Map<string, string>()

  setActiveOrgId(orgId: string | undefined): void {
    this.activeOrgId = orgId
  }

  private async context(): Promise<CloudContext | null> {
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

  /**
   * Context for the three append-only event tables: an authed client, the actor,
   * and the active organization WHEN THERE IS ONE.
   *
   * Deliberately not context(), which bails without a membership: an event's
   * organization is not the writer's to choose. A BEFORE INSERT trigger stamps it
   * from the referenced agent, whose own org_id is derived from its repositories
   * (migrations 20260727160000 / 20260727180000) — so nothing needs an org
   * resolved in order to record. Requiring one only meant dropping every event of
   * a user who works on personal repositories alone.
   *
   * `orgId` therefore is NOT the row's organization. It is the fallback
   * attribution for a row carrying no agent at all — a skill run in a terminal the
   * app never spawned — which is the one case the trigger has nothing to derive
   * from. Null when the user belongs to no organization.
   */
  private async eventContext(): Promise<{ client: SupabaseClient; uid: string; orgId: string | null } | null> {
    const user = await this.userContext()
    if (!user) return null
    return { ...user, orgId: await this.resolveOrgId(user.client, user.uid) }
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
      // No membership at all: there is no config blob to read, but the user's
      // own settings and repos are still theirs. `version` is rewritten by
      // migrateConfig() from app.getVersion() on the next pass.
      const config: Config = { version: 'unknown', repositories: {} }
      if (settings) applySettingsRow(config, settings)
      config.repositories = this.toRepositoryRecord(
        await this.fetchRepositories(user),
        await this.fetchOrgNames(user),
      )
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
    // user_settings is the source of truth for preferences; it is applied OVER
    // any legacy copy left in the blob (pre-migration installs), so the two can
    // never disagree in favour of the stale one.
    if (settings) applySettingsRow(config, settings)
    // Repositories are assembled from their own tables, not the blob.
    config.repositories = this.toRepositoryRecord(
      await this.fetchRepositories(ctx),
      await this.fetchOrgNames(ctx),
    )
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
  /**
   * Name-keyed record, as the /magic:* skills expect (they look a repo up by
   * matching $PWD against `.repositories.<key>.path`, then read settings off
   * that key).
   *
   * Names are unique per SCOPE, not globally: `uq_repositories_org_name` and
   * `uq_repositories_owner_name`. Two of the user's orgs can each have an `api`,
   * and now that every org's repos are visible at once, a plain `record[name] =`
   * would drop one of them with no error at all. So a colliding repo gets its
   * org appended to its KEY — `api`, then `api (Acme)` — while `name` keeps the
   * real one for anything writing back to the table.
   *
   * Order decides who keeps the bare key, so it must not depend on what the
   * database happened to return first: personal repos, then orgs by name.
   */
  private toRepositoryRecord(
    repos: StoredRepository[],
    orgNameById: Map<string, string> = new Map(),
  ): Record<string, RepositoryConfig> {
    const ordered = [...repos].sort((a, b) => {
      const orgA = a.orgId ? orgNameById.get(a.orgId) ?? a.orgId : ''
      const orgB = b.orgId ? orgNameById.get(b.orgId) ?? b.orgId : ''
      return orgA.localeCompare(orgB) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
    })

    const record: Record<string, RepositoryConfig> = {}
    for (const r of ordered) {
      let key = r.name
      if (record[key]) {
        const suffix = r.orgId ? orgNameById.get(r.orgId) ?? r.orgId : 'personal'
        key = `${r.name} (${suffix})`
        // Two orgs with the same NAME would collide again; the id ends it.
        if (record[key]) key = `${r.name} (${suffix} · ${r.id.slice(0, 6)})`
      }
      record[key] = {
        id: r.id,
        name: r.name,
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
   * Every repository the caller can see — their own, plus the team repos of ALL
   * the organizations they belong to — with their own local path.
   *
   * No org filter: there is no active organization any more. RLS already returns
   * exactly the visible set, and an agent's organization comes from the repo it
   * works on, so hiding the other orgs' repos would only make them unreachable.
   */
  private async fetchRepositories(ctx: { client: SupabaseClient; uid: string }): Promise<StoredRepository[]> {
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

    return (reposRes.data as RepositoryRow[]).map((r) => this.mapRepositoryRow(r, pathById.get(r.id) ?? null))
  }

  /** Org id → name, for disambiguating repositories that share a name. */
  private async fetchOrgNames(ctx: { client: SupabaseClient }): Promise<Map<string, string>> {
    const names = new Map<string, string>()
    const { data, error } = await ctx.client.from('organizations').select('id, name')
    if (error || !data) return names
    for (const row of data as { id: string; name: string }[]) names.set(row.id, row.name)
    return names
  }

  async listRepositories(): Promise<StoredRepository[]> {
    const ctx = await this.context()
    if (!ctx) return []
    return this.fetchRepositories(ctx)
  }

  async createRepository(repo: StoredRepository): Promise<string | null> {
    const ctx = await this.context()
    if (!ctx) return null
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
    return ctx.uid
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

  /**
   * `org_id` is deliberately absent: an agent has no organization of its own.
   * The backend derives it from agent_repositories (see the derive_agent_org
   * trigger), so sending one here would fight the trigger — and on an upsert an
   * omitted column is left untouched, which is exactly what we want.
   */
  private toAgentRow(agent: Agent, id: string, uid: string): Record<string, unknown> {
    // The five fields that HAVE a column are peeled off the metadata rather than
    // copied into it. They used to be written twice — once in the column, once
    // inside the jsonb — while fromAgentRow read only the jsonb, which made every
    // column write-only decoration and the JSON the de facto store. Two copies of
    // one fact is one of them being wrong eventually; the column is the one every
    // other reader can query, index and join on (mapOrgAgentRow and the webapp's
    // admin_list_user_agents already read the columns).
    const { ticketId, description, branchName, baseBranch, status, ...rest } = agent.metadata ?? {}
    return {
      id,
      owner_id: uid,
      name: agent.name,
      ticket_id: ticketId ?? null,
      description: description ?? null,
      branch_name: branchName ?? null,
      base_branch: baseBranch ?? null,
      status: status ?? null,
      repositories: agent.repositories ?? [],
      // What is left has no column of its own: title, fullStackTaskId,
      // relatedWorktrees, repositoryMetadata, usage — plus __app, the app-side
      // identity (its local id, creation stamp and pane) that has nowhere else to
      // live because the row's own id is a uuid the app never sees.
      metadata: { ...rest, __app: { id: agent.id, tsCreate: agent.tsCreate, splitPane: agent.splitPane } },
    }
  }

  private fromAgentRow(row: AgentRow): Agent {
    const app = row.metadata?.__app
    const rest = { ...(row.metadata ?? {}) } as AgentRow['metadata']
    delete rest.__app

    return {
      id: app?.id ?? row.id,
      name: row.name,
      repositories: Array.isArray(row.repositories) ? row.repositories : [],
      repositoryIds: [],
      tsCreate: app?.tsCreate,
      // Column first, jsonb second. The fallback is for rows written before
      // toAgentRow stopped duplicating: they still carry the value in both places,
      // so reading the column alone would be correct for them too — but a row
      // written by an even older build, with a jsonb value and a null column,
      // would silently lose it. `||` rather than `??` because the unset value the
      // app writes is '' and an empty string must not beat a real one.
      metadata: {
        ...rest,
        ticketId: row.ticket_id || rest.ticketId,
        description: row.description || rest.description,
        branchName: row.branch_name || rest.branchName,
        baseBranch: row.base_branch || rest.baseBranch,
        status: (row.status || rest.status) as TerminalMetadata['status'],
      } as TerminalMetadata,
      splitPane: app?.splitPane,
    }
  }

  /**
   * The caller's OWN agents, across every organization — and the ones with no
   * organization at all.
   *
   * Scoped by owner_id, and by owner_id ONLY: an agent belongs to its owner, and
   * its organization is derived from its repositories, so an agent working on a
   * personal repo has none. Filtering on an org here would silently drop those
   * from terminal restoration. RLS lets any member SELECT the whole org's agents
   * (the team page needs that — see loadOrgAgents), so this filter is what
   * narrows the list to the caller, not a redundancy. Rows whose owner_id was
   * nulled by the membership FK belong to nobody and stay excluded.
   *
   * Archived agents are excluded too: they are closed work kept only for the
   * history they are attached to. Without this filter, restoreAgents() would
   * spawn a PTY for every agent ever closed.
   */
  async loadAgents(): Promise<Agent[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('agents')
      .select('id, org_id, owner_id, name, ticket_id, description, branch_name, base_branch, status, repositories, metadata, updated_at')
      .eq('owner_id', ctx.uid)
      .is('archived_at', null)

    if (error || !data) return []

    this.agentIdMap.clear()
    this.agentRepoKey.clear()
    const rows = data as AgentRow[]
    const linksByAgent = await this.fetchRepoLinks(ctx, rows.map((r) => r.id))

    const agents: Agent[] = []
    for (const raw of rows) {
      const agent = this.fromAgentRow(raw)
      agent.repositoryIds = linksByAgent.get(raw.id) ?? []
      this.agentIdMap.set(agent.id, raw.id)
      this.agentRepoKey.set(agent.id, agent.repositoryIds.join(','))
      agents.push(agent)
    }
    return agents
  }

  /**
   * agent uuid → attached repository ids, in attachment order (which is what
   * decides the derived organization, so the order is data).
   */
  private async fetchRepoLinks(ctx: CloudContext, agentUuids: string[]): Promise<Map<string, string[]>> {
    const byAgent = new Map<string, string[]>()
    if (agentUuids.length === 0) return byAgent

    const { data, error } = await ctx.client
      .from('agent_repositories')
      .select('agent_id, repo_id')
      .in('agent_id', agentUuids)
      .order('created_at', { ascending: true })
    if (error || !data) return byAgent

    for (const row of data as { agent_id: string; repo_id: string }[]) {
      const list = byAgent.get(row.agent_id) ?? []
      list.push(row.repo_id)
      byAgent.set(row.agent_id, list)
    }
    return byAgent
  }

  /**
   * Reconcile agent_repositories for the agents whose links actually changed.
   *
   * saveAgents runs on EVERY agent mutation — including each metadata hook — so
   * this is gated on a per-agent digest of the ids: unchanged agents cost
   * nothing. Rows are diffed rather than deleted-and-reinserted, because
   * created_at ordering is what picks the derived organization; recreating the
   * links would let it flip.
   */
  private async syncRepoLinks(ctx: CloudContext, agents: Agent[]): Promise<void> {
    const changed = agents.filter(
      (a) => this.agentRepoKey.get(a.id) !== (a.repositoryIds ?? []).join(','),
    )
    if (changed.length === 0) return

    const uuidByAppId = new Map(changed.map((a) => [a.id, this.agentIdMap.get(a.id)!]))
    const existing = await this.fetchRepoLinks(ctx, [...uuidByAppId.values()])

    const toInsert: { agent_id: string; repo_id: string }[] = []
    for (const agent of changed) {
      const uuid = uuidByAppId.get(agent.id)!
      const desired = agent.repositoryIds ?? []
      const before = existing.get(uuid) ?? []

      for (const repoId of desired) {
        if (!before.includes(repoId)) toInsert.push({ agent_id: uuid, repo_id: repoId })
      }

      // "Resolved nothing" is not "detached from everything": a config that
      // failed to load leaves every path unresolvable, and deleting on that
      // would drop the agent out of its team's view until someone re-attaches a
      // repo by hand. Only an agent with no paths at all is a genuine detach.
      const unresolved = desired.length === 0 && agent.repositories.length > 0
      const stale = unresolved ? [] : before.filter((repoId) => !desired.includes(repoId))
      if (stale.length > 0) {
        const { error } = await ctx.client
          .from('agent_repositories')
          .delete()
          .eq('agent_id', uuid)
          .in('repo_id', stale)
        if (error) throw new Error(`syncRepoLinks (delete) failed: ${error.message}`)
      }
    }

    if (toInsert.length > 0) {
      const { error } = await ctx.client.from('agent_repositories').insert(toInsert)
      if (error) throw new Error(`syncRepoLinks (insert) failed: ${error.message}`)
    }

    for (const agent of changed) {
      this.agentRepoKey.set(agent.id, (agent.repositoryIds ?? []).join(','))
    }
  }

  /**
   * Upsert the caller's agents. Deliberately NOT destructive.
   *
   * This used to reconcile by absence: an app id missing from `agents` meant
   * "deleted", and the row was dropped. But the only legitimate producer of an
   * absence is a user closing an agent — which now goes through archiveAgent().
   * Every other absence is a cache divergence (hydrateAgents() empties its cache
   * when a load throws, while loadAgents() returns [] without clearing
   * agentIdMap), and reconciling on it would silently destroy a member's whole
   * roster. The DB is the source of truth: a row that vanishes from the local
   * cache for any other reason simply comes back at the next hydration.
   */
  async saveAgents(agents: Agent[]): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return

    const rows = agents.map((a) => {
      const uuid = this.agentIdMap.get(a.id) ?? randomUUID()
      this.agentIdMap.set(a.id, uuid)
      return this.toAgentRow(a, uuid, ctx.uid)
    })
    if (rows.length === 0) return

    const { error } = await ctx.client.from('agents').upsert(rows, { onConflict: 'id' })
    if (error) throw new Error(`saveAgents failed: ${error.message}`)

    // After the upsert: the link rows reference agents that must already exist.
    await this.syncRepoLinks(ctx, agents)
  }

  /**
   * Archive ONE agent: the row stays, stamped with archived_at, so the activity,
   * usage and skill-invocation rows that reference it keep their link (a delete
   * would null those FKs — see the migration). Scoped by owner_id like every
   * agent write: closing an agent must never reach a teammate's row.
   */
  async archiveAgent(appId: string): Promise<void> {
    // Read the uuid before any await: a concurrent write must not observe a
    // half-updated map, and callers flush usage right before closing.
    const uuid = this.agentIdMap.get(appId)
    if (!uuid) return

    const ctx = await this.context()
    if (!ctx) return

    // Scoped by owner, not by org: an agent on a personal repo has no org, and
    // ownership is the real permission boundary anyway.
    const { error } = await ctx.client
      .from('agents')
      .update({ archived_at: new Date().toISOString() })
      .eq('owner_id', ctx.uid)
      .eq('id', uuid)
      .is('archived_at', null)
    if (error) throw new Error(`archiveAgent failed: ${error.message}`)

    // Drop the app id → uuid binding so a future agent reusing this app id
    // (ids are `claude-${Date.now()}`) mints a fresh row instead of upserting
    // onto the archived one — which, since toAgentRow never sets archived_at,
    // would resurrect it as an invisible agent.
    this.agentIdMap.delete(appId)
    this.agentRepoKey.delete(appId)
  }

  /**
   * The agents roster behind the Team page: every agent the caller can see —
   * their own, plus those of every organization they belong to. Unlike
   * loadAgents (which maps to the LOCAL Agent shape and drives terminal
   * restoration), this preserves owner_id, org_id and updated_at so the page can
   * put each agent under the right organization and show recency.
   *
   * No org filter: RLS already returns exactly the visible set, and the page has
   * a tab per org rather than one active org. Archived (closed) agents are
   * filtered out — the roster is live work.
   */
  async loadOrgAgents(): Promise<OrgAgent[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('agents')
      .select('id, org_id, owner_id, name, ticket_id, status, repositories, metadata, updated_at')
      .is('archived_at', null)

    if (error || !data) return []

    // The links come from their own table, so the roster carries the portable
    // agent→repository relation rather than the owner's local paths.
    const rows = data as OrgAgentRow[]
    const linksByAgent = await this.fetchRepoLinks(ctx, rows.map((r) => r.id))
    return rows.map((row) => ({ ...mapOrgAgentRow(row), repositoryIds: linksByAgent.get(row.id) ?? [] }))
  }

  // -------------------------------------------------------------------------
  // Activity events (activity_events — append-only, write-only from here)
  // -------------------------------------------------------------------------

  /**
   * Append ONE activity event. `org_id` is sent for the agent-less case only — the
   * BEFORE INSERT trigger overrides it from the agent whenever agent_id resolves,
   * because an event belongs where its agent belongs and not where the user
   * happens to be looking. See eventContext().
   */
  async appendHistory(entry: HistoryEntry): Promise<void> {
    const ctx = await this.eventContext()
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
   * the agents.id uuid via agentIdMap, and leaves `org_id` to the trigger, exactly
   * like appendHistory. tokens is left null on purpose: TerminalUsage.contextTokens
   * is a point-in-time context gauge, not a cumulative session-token count, so it
   * must not be mapped into this row.
   */
  async appendUsage(event: UsageEventInput): Promise<void> {
    const ctx = await this.eventContext()
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
   * from a terminal the app did not spawn have no agent, and still count. Those are
   * also the only rows whose `org_id` survives as sent: with no agent, the trigger
   * has nothing to derive an organization from.
   */
  async recordSkillInvocation(input: SkillInvocationInput): Promise<void> {
    const ctx = await this.eventContext()
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

  /**
   * Run count per skill for ONE org, for the Team page's stats row.
   *
   * Three things worth naming:
   *
   * 1. THE DATABASE AGGREGATES. `org_skill_counts` groups and counts server-side, so
   *    this pulls seven-ish rows instead of the thousands loadOrgUsageStats has to
   *    pull and sum here. There is no row cap for the same reason — the count is
   *    exact however long the team has been running, where a capped raw read would
   *    silently start under-reporting.
   * 2. `userContext()`, not `context()`. The org comes from the CALLER (the Team page
   *    has a tab per org), so requiring a resolved active org would be asking for a
   *    value this read does not use.
   * 3. The RPC is SECURITY INVOKER: RLS on skill_invocations is what scopes it, so a
   *    request for an org the user is not in returns no rows rather than an error.
   *    That is why a non-member's answer here is `{}` and not a thrown failure.
   */
  async loadOrgSkillCounts(orgId: string): Promise<SkillCounts> {
    const ctx = await this.userContext()
    if (!ctx) return {}

    const { data, error } = await ctx.client.rpc('org_skill_counts', { p_org_id: orgId })
    if (error || !data) return {}

    const counts: SkillCounts = {}
    for (const row of data as Array<{ skill: string; total: number }>) {
      counts[row.skill] = toNumber(row.total)
    }
    return counts
  }

  /**
   * Run count per skill for the caller's own out-of-org work — the Personal tab.
   *
   * `userContext()` and no org at all: the rows this counts are precisely the ones
   * with none. The RPC is SECURITY INVOKER and the RLS policy's own-rows arm is the
   * only one matching a null org, so the database itself guarantees this returns
   * nobody else's history — there is no org id here that could be got wrong.
   */
  async loadPersonalSkillCounts(): Promise<SkillCounts> {
    const ctx = await this.userContext()
    if (!ctx) return {}

    const { data, error } = await ctx.client.rpc('personal_skill_counts')
    if (error || !data) return {}

    const counts: SkillCounts = {}
    for (const row of data as Array<{ skill: string; total: number }>) {
      counts[row.skill] = toNumber(row.total)
    }
    return counts
  }

  /**
   * Org-wide activity events for the Team page's flow metrics — the only read of
   * activity_events left, now that the personal History feed is gone.
   *
   * Two things to note:
   *
   * 1. NO user_id filter. The RLS select policy is `is_org_member(org_id)`, so any
   *    member may read the whole org — that is what makes team-level flow metrics
   *    possible.
   * 2. An action allowlist. `completed` fires on every Claude-Code turn and
   *    `committed` on every commit, so they outnumber the flow-relevant actions by
   *    an order of magnitude. Without the filter the row cap below would silently
   *    truncate weeks of flow signal for a team that is merely chatty.
   */
  async loadOrgActivity(sinceMs: number, limit: number): Promise<OrgActivity> {
    const sinceIso = new Date(sinceMs).toISOString()
    const empty: OrgActivity = { events: [], capped: false, since: sinceIso }

    const ctx = await this.context()
    if (!ctx) return empty

    const { data, error } = await ctx.client
      .from('activity_events')
      .select('id, user_id, agent_id, action, ticket_id, repositories, occurred_at')
      .eq('org_id', ctx.orgId)
      .gte('occurred_at', sinceIso)
      .in('action', FLOW_ACTIONS)
      .order('occurred_at', { ascending: false })
      .limit(limit)

    if (error || !data) return empty

    const capped = data.length === limit
    const events = (data as OrgActivityEventRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      agentId: row.agent_id,
      action: row.action as HistoryAction,
      ticketId: row.ticket_id,
      repositories: Array.isArray(row.repositories) ? row.repositories : [],
      occurredAt: row.occurred_at,
    }))

    // Rows come newest-first, so on a capped read the LAST row is the oldest the
    // caller may trust. Reporting the requested window instead would invite the
    // UI to draw confident zeroes for weeks that were simply cut off.
    const since = capped && events.length > 0 ? events[events.length - 1].occurredAt : sinceIso
    return { events, capped, since }
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
