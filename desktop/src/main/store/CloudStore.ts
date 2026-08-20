import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Agent, AppInstallationInfo, Config, HistoryAction, HistoryEntry, OrgActivity, OrgAgent, OrgSharedConfig, RepositoryConfig, RepositoryIdentity, SkillCounts, SkillHours, SkillInvocationInput, SkillRunEndInput, StoredRepository, TerminalMetadata, UsageEventInput, UsageStats, UserProfile } from '../../types'
import { getAuthedClient } from '../cloud/auth'
import { loadSession } from '../cloud/session-store'
import { isCloudEnabled } from '../cloud/supabase-client'
import { mapOrgAgentRow, type OrgAgentRow } from '../cloud/realtime'
import type { ConnectivityStatus, Store } from './Store'
import { enqueuePendingArchive, resolvePendingArchive } from './pending-archives'
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
  // The app's own agent id ("claude-…"), and the key every write arbitrates on
  // since 20260814090000. Null on a row no desktop wrote, and on every archived
  // row — hence the jsonb fallback in fromAgentRow.
  app_agent_id: string | null
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
 * The app id where archiving cannot erase it: inside the metadata jsonb.
 *
 * PostgREST's jsonb path syntax — `->` walks, `->>` takes the leaf as text, which is
 * what makes it comparable to a `claude-…` string. The same path migration
 * 20260814090000 backfilled `app_agent_id` from, and the same one fromAgentRow falls
 * back to. Its column namesake is nulled by the archive statement itself, so this is
 * the ONLY way to recognise a row that is already archived. See isAlreadyArchived.
 */
const APP_ID_IN_METADATA = 'metadata->__app->>id'

/**
 * How many rows the already-archived probe reads.
 *
 * More than one because an app id may legitimately repeat across ARCHIVED rows (see
 * isAlreadyArchived), bounded because the answer is a yes/no and a user who cycled
 * one id a hundred times has already been answered by the first few.
 */
const ARCHIVED_PROBE_LIMIT = 20

/**
 * What the already-archived probe could establish — three states, not a boolean.
 *
 * `live` and `unknown` used to be the same answer (`false`), and they have OPPOSITE
 * consequences for the write-ahead entry. `live` is a verdict: the row exists and is
 * not stamped, so this update will match exactly as many rows next time and the
 * entry must go. `unknown` is the absence of a verdict — a dropped connection, an
 * expired token, PostgREST answering 5xx — and dropping the entry there voids the
 * retry guarantee at the precise moment the backend is flaky, which is the moment
 * the spool exists for. It also blamed the wrong thing, reporting `no agent row
 * matched` for a question that was never answered.
 */
type ArchiveProbe =
  | { state: 'archived' }
  | { state: 'live' }
  | { state: 'unknown'; reason: string }

/** The message of whatever PostgREST (or the transport) handed back. */
function probeFailure(error: unknown): string {
  const message = (error as { message?: unknown } | null)?.message
  return typeof message === 'string' && message !== '' ? message : 'the query failed'
}

/**
 * Actions the flow metrics can actually use.
 *
 * `completed` (every Claude-Code turn), `committed` (every commit) and
 * `agent_renamed` are excluded on purpose: they dwarf these in volume, or in the
 * rename's case describe metadata rather than progress, and would eat the row budget
 * without informing a single metric. They are still WRITTEN — the criterion here is
 * what a reader can measure, not what is worth recording.
 */
const FLOW_ACTIONS: readonly HistoryAction[] = [
  'started',
  'ready_for_pr',
  'pr_created',
  // Once per PR, and the far end of a real interval: how long a branch waits for its
  // pipeline is a flow question, and until now nothing recorded that it ever passed.
  'ci_green',
  'review',
  'review_addressed',
  'review_approved',
  'review_changes_requested',
  'merged',
  'agent_created',
  'agent_closed',
  // Rare, and the one event that explains a gap in all the others: an agent that died
  // stops producing them, which otherwise reads as a person who simply stopped.
  'agent_errored',
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
  // Optional because the mapper must tolerate the key being absent as well as
  // null, both meaning "nothing chosen" — which resolves to the shipped defaults.
  //
  // That tolerance is NOT a safety net for an un-migrated database, and must not
  // be read as one: the select below names `plan` explicitly, so against a
  // database that has not run 20260819090000 PostgREST fails the whole query
  // (42703, undefined column) and fetchRepositories returns [] — every repository
  // disappears rather than degrading. Deploy the migration before the clients.
  plan?: RepositoryConfig['plan'] | null
  branches: RepositoryConfig['branches'] | null
  worktree_files: string[] | null
  // Absent (not just null) on a database that has not run 20260816090000 yet —
  // the mapper treats both as "no known remote".
  remote_url?: string | null
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

/**
 * The IANA zone this machine is in, for the week boundary `skill_hours()` computes.
 *
 * Falls back to UTC rather than throwing: a machine whose ICU data cannot name its zone
 * still deserves a total, and the only thing at stake is which midnight the week opens on.
 */
function machineTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * The single row `skill_hours()` returns, as PostgREST serialises it.
 *
 * `last_run_agent` is OPTIONAL where its neighbours are not, and that is about
 * deployment rather than about the data: a database still on 20260814120000 answers with
 * a row that has no such key at all. Typing it as always-present would let the compiler
 * bless a value that is `undefined` at runtime.
 */
interface SkillHoursRow {
  total_seconds: string | number | null
  week_seconds: string | number | null
  first_measured_at: string | null
  last_run_at: string | null
  last_run_agent?: string | null
}

/** One row of any of the three skill rollups; they return an identical shape. */
interface SkillCountRow {
  skill: string
  total: string | number | null
  completed: string | number | null
  abandoned: string | number | null
  median_duration_ms: string | number | null
}

/**
 * Shape the rollup rows the two readers share.
 *
 * `median_duration_ms` stays NULL rather than becoming 0: no run has finished yet, and
 * "half of them took no time at all" is a different claim from "there is nothing to
 * average". toNumber would flatten the two.
 */
function mapSkillCountRows(data: unknown): SkillCounts {
  const counts: SkillCounts = {}
  for (const row of data as SkillCountRow[]) {
    counts[row.skill] = {
      total: toNumber(row.total),
      completed: toNumber(row.completed),
      abandoned: toNumber(row.abandoned),
      medianDurationMs: row.median_duration_ms === null || row.median_duration_ms === undefined
        ? null
        : toNumber(row.median_duration_ms),
    }
  }
  return counts
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
/**
 * Whether an event insert failed because that exact event is ALREADY in the table.
 *
 * The three event tables carry a unique `client_event_id`, minted once when the event
 * happens (store/outbox.ts). A retry of a write whose commit landed but whose response
 * was lost therefore comes back as a unique violation — which is the database telling
 * us the row is safely recorded, not that anything went wrong. Treating it as success
 * is what lets the outbox retry freely without inventing duplicate activity.
 *
 * 23505 is Postgres' unique_violation. Narrowed to that code on purpose: any OTHER
 * constraint failure (a dangling agent reference, a violated check) is a real error
 * that must keep the event in the queue and stay loud.
 */
function isAlreadyRecorded(error: { code?: string } | null): boolean {
  return error?.code === '23505'
}

/** Everything a query needs: an authed client, the caller, and the active org. */
interface CloudContext {
  client: SupabaseClient
  uid: string
  orgId: string
}

export class CloudStore implements Store {
  private activeOrgId: string | undefined
  /**
   * app agent id ("claude-…") → agents.id (uuid). Rebuilt on every loadAgents and
   * refreshed from what each agent upsert returns — never invented here, which is
   * what used to duplicate rows (see migration 20260814090000).
   */
  private agentIdMap = new Map<string, string>()
  /** app agent id → digest of its last-synced repository ids (see syncRepoLinks). */
  private agentRepoKey = new Map<string, string>()
  /**
   * Tail of the agent-write chain — see queueAgentWrite.
   */
  private agentWrites: Promise<unknown> = Promise.resolve()

  setActiveOrgId(orgId: string | undefined): void {
    this.activeOrgId = orgId
  }

  /**
   * Run an agent write once every one queued before it has settled.
   *
   * saveAgents and archiveAgent are read-modify-writes over state this instance
   * caches (agentIdMap, agentRepoKey) and over rows another one of them may be
   * mid-way through changing: saveAgents diffs the DB's link rows against the
   * digest, then inserts and deletes to close the gap, and only THEN updates the
   * digest. Nothing serialized them — writeAgents() fires and forgets
   * (config/agents.ts) and the metadata hooks call it on every agent mutation —
   * so two overlapping writes both diffed against the same pre-write state and
   * both tried to create the link rows the other was already creating. That
   * surfaced as a "failed to save your agents" toast for a change that was in
   * fact fine, most reliably when a /magic:start on two agents at once produced
   * two bursts of writes over freshly created agents (every new agent has no
   * digest yet, so its links are always in the diff).
   *
   * A chain, not a lock: the writes must also stay in the order they were made,
   * since an archive following a save means something different than the reverse.
   *
   * loadAgents rides it too, despite the name: it is a read-then-replace of those
   * same caches, so it belongs in the same order as the writes (see loadAgents).
   */
  private queueAgentWrite<T>(task: () => Promise<T>): Promise<T> {
    const run = this.agentWrites.then(task, task)
    // The chain waits on outcomes, not successes: one failed write must not
    // reject every later one. The caller still gets the real rejection — it
    // awaits `run`, not the swallowed copy the chain holds.
    //
    // The fulfilment value is dropped as deliberately as the rejection. loadAgents
    // rides this chain too and returns the whole roster, and a bare `.catch()`
    // passes that value through — the tail would then hold every hydrated Agent
    // alive until the next write replaced it, on a store that lives as long as the
    // process and outlives a sign-out.
    this.agentWrites = run.then(() => {}, () => {})
    return run
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
   * attribution for a row carrying no agent at all — an event from a terminal the
   * app never spawned — which is the one case the trigger has nothing to derive
   * from. Null when the user belongs to no organization. See eventOrgId, which
   * decides whether that fallback is used at all.
   */
  private async eventContext(): Promise<{ client: SupabaseClient; uid: string; orgId: string | null } | null> {
    const user = await this.userContext()
    if (!user) return null
    return { ...user, orgId: await this.resolveOrgId(user.client, user.uid) }
  }

  /**
   * The `org_id` to send with an event row, given the agent it resolved to.
   *
   * WITH AN AGENT the value sent is overwritten by the stamp_event_org trigger from
   * the agent's own org, so it is not an attribution — it is what makes the
   * composite FK (org_id, agent_id) CHECKABLE. Sending null there would leave a NULL
   * in a referencing column, and MATCH SIMPLE skips the check entirely on a NULL, so
   * a stale agentIdMap entry pointing at a deleted agent would insert a dangling
   * reference instead of being rejected. See 20260727180000, which spells out that
   * trade.
   *
   * WITH NO AGENT the trigger returns early and keeps whatever arrived, so this IS
   * the attribution — and the resolved org is the wrong one to give it. There is no
   * agent, therefore no repository, therefore nothing that says this event belongs
   * to a team: `resolveOrgId` would hand over the user's FIRST MEMBERSHIP, which is
   * an arbitrary pick for anyone in more than one org. Worse, nothing can ever
   * correct it — sync_event_orgs follows an agent, and these rows have none, so the
   * guess is permanent.
   *
   * `null` is the honest answer: the event counts as the author's own work, outside
   * any org. It under-reports a team whose member worked in a terminal the app did
   * not open, and that is the direction to err in — an org's numbers are read by
   * other people to judge adoption, where invented activity is invisible and missing
   * activity is not.
   *
   * ALL THREE event writers share this rule, and they did not always: only
   * skill_invocations applied it, while activity_events and usage_events sent the
   * resolved org unconditionally. The same agentless run was therefore personal in
   * the skills dashboard and the team's in the activity feed — two surfaces that
   * cannot both be right, reported as data loss whichever one a reader trusted.
   */
  private eventOrgId(orgId: string | null, agentUuid: string | null): string | null {
    return agentUuid ? orgId : null
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
    if (patch.plan !== undefined) row.plan = patch.plan ?? {}
    if (patch.branches !== undefined) row.branches = patch.branches ?? {}
    if (patch.worktreeFiles !== undefined) row.worktree_files = patch.worktreeFiles ?? []
    // No remote_url branch: RepositoryIdentity excludes it, so setRepositoryRemoteUrl
    // stays its only writer after creation.
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
      plan: row.plan ?? undefined,
      branches: row.branches ?? undefined,
      worktreeFiles: row.worktree_files ?? undefined,
      remoteUrl: row.remote_url ?? null,
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
        plan: r.plan,
        branches: r.branches,
        worktreeFiles: r.worktreeFiles,
        remoteUrl: r.remoteUrl ?? null,
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
        .select('id, owner_id, org_id, name, keywords, color, languages, commit, pull_request, resolve, issues, plan, branches, worktree_files, remote_url'),
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
      plan: repo.plan ?? {},
      branches: repo.branches ?? {},
      worktree_files: repo.worktreeFiles ?? [],
      remote_url: repo.remoteUrl ?? null,
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

  /** See Store.setRepositoryRemoteUrl. Fill-only, enforced server-side (20260816090000). */
  async setRepositoryRemoteUrl(id: string, url: string): Promise<boolean> {
    const ctx = await this.context()
    if (!ctx) return false
    const { data, error } = await ctx.client.rpc('set_repository_remote_url', {
      p_repo_id: id,
      p_url: url,
    })
    if (error) throw new Error(`setRepositoryRemoteUrl failed: ${error.message}`)
    return data === true
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
        plan: repo.plan ?? {},
        branches: repo.branches ?? {},
        worktree_files: repo.worktreeFiles ?? [],
        remote_url: repo.remoteUrl ?? null,
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
   *
   * `id` is absent for the same reason, and it matters more: the row's uuid is
   * the database's to mint. Left out, an update keeps the value the row already
   * has and an insert takes the column's `gen_random_uuid()` default — so no
   * client can name an identity, and the only key it asserts is `app_agent_id`,
   * which the unique index arbitrates on (20260814090000). The app id also stays
   * in the jsonb: rows written before that migration carry it only there, and
   * readers that predate the column still look for it.
   */
  private toAgentRow(agent: Agent, uid: string): Record<string, unknown> {
    // The five fields that HAVE a column are peeled off the metadata rather than
    // copied into it. They used to be written twice — once in the column, once
    // inside the jsonb — while fromAgentRow read only the jsonb, which made every
    // column write-only decoration and the JSON the de facto store. Two copies of
    // one fact is one of them being wrong eventually; the column is the one every
    // other reader can query, index and join on (mapOrgAgentRow and the webapp's
    // admin_list_user_agents already read the columns).
    const { ticketId, description, branchName, baseBranch, status, ...rest } = agent.metadata ?? {}
    return {
      app_agent_id: agent.id,
      owner_id: uid,
      name: agent.name,
      ticket_id: ticketId ?? null,
      description: description ?? null,
      branch_name: branchName ?? null,
      base_branch: baseBranch ?? null,
      status: status ?? null,
      repositories: agent.repositories ?? [],
      // What is left has no column of its own: title, fullStackTaskId,
      // relatedWorktrees, repositoryMetadata, usage — plus __app, which carries
      // tsCreate and splitPane, neither of which has anywhere else to live. Its
      // `id` is the one field now duplicated, and only for compatibility: a build
      // older than 20260814090000 reads the app id from here and nowhere else.
      metadata: { ...rest, __app: { id: agent.id, tsCreate: agent.tsCreate, splitPane: agent.splitPane } },
    }
  }

  private fromAgentRow(row: AgentRow): Agent {
    const app = row.metadata?.__app
    const rest = { ...(row.metadata ?? {}) } as AgentRow['metadata']
    delete rest.__app

    return {
      // Column first, jsonb second, uuid last. The jsonb still answers for rows an
      // older installed build writes — it sends `id` with onConflict 'id' and
      // leaves the column null — so both levels stay until no such build is in the
      // field, at which point toAgentRow can stop mirroring the id and this rung
      // can go. The uuid is the last resort for a row no desktop ever wrote.
      id: row.app_agent_id ?? app?.id ?? row.id,
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
   *
   * Queued behind the pending agent writes (see queueAgentWrite), like the two
   * writers: hydrating is a read-then-replace of the very caches saveAgents and
   * archiveAgent read and update, and interleaving the two is how a save came to
   * see a half-built map. The cost is real — a hydration now waits for the
   * writes in flight — and accepted: those writes are single round-trips, and
   * hydration happens on launch and on org switches, not on the hot path. No
   * deadlock either: loadAgents has exactly one caller (config/agents.ts), and
   * nothing on the write chain calls it.
   */
  async loadAgents(): Promise<Agent[]> {
    return this.queueAgentWrite(() => this.readAgentRows())
  }

  private async readAgentRows(): Promise<Agent[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('agents')
      .select('id, app_agent_id, org_id, owner_id, name, ticket_id, description, branch_name, base_branch, status, repositories, metadata, updated_at')
      .eq('owner_id', ctx.uid)
      .is('archived_at', null)

    if (error || !data) return []

    const rows = data as AgentRow[]
    const linksByAgent = await this.fetchRepoLinks(ctx, rows.map((r) => r.id))

    // Built locally, published at the end. These used to be cleared here, before
    // the fetchRepoLinks await — so anything reading them in that window (a
    // write's uuid lookup, an event's agent_id) saw an EMPTY map and concluded
    // the agents were new. Replacing the maps in one synchronous step means a
    // reader sees either the previous hydration's answer or this one's, never a
    // half-filled map. The early returns above leave both intact on purpose: a
    // failed read is not evidence that the roster is gone.
    const idMap = new Map<string, string>()
    const repoKey = new Map<string, string>()

    const agents: Agent[] = []
    for (const raw of rows) {
      const agent = this.fromAgentRow(raw)
      agent.repositoryIds = linksByAgent.get(raw.id) ?? []
      idMap.set(agent.id, raw.id)
      repoKey.set(agent.id, agent.repositoryIds.join(','))
      agents.push(agent)
    }

    this.agentIdMap = idMap
    this.agentRepoKey = repoKey
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

    // The assertion holds because of what ran immediately before: writeAgentRows
    // upserted a row for every one of these app ids and refreshed the map from the
    // response, which PostgREST returns in full — ON CONFLICT DO UPDATE touches
    // every row, and agents_select admits them all on `owner_id = auth.uid()`,
    // which is the owner they were just written with. A guard here would be a
    // branch nothing can take; if the invariant ever did break, the missing
    // agent_id fails the insert loudly rather than writing anything wrong.
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
      // Idempotent on purpose. (agent_id, repo_id) is the primary key, so a link
      // that is already there comes back as a unique violation — the database
      // saying the row is recorded, not that the write went wrong. Reporting that
      // to the user asks them to retry a change that already landed, and a
      // rehydrate cannot fix what is not broken. queueAgentWrite closes the race
      // that used to produce these; this keeps the outcome harmless if any other
      // path (a retry, a link created from another machine) recreates one.
      //
      // ignoreDuplicates, not a merge: the table grants no UPDATE — both columns
      // are the key, so a link is created or removed, never edited — and this
      // resolution compiles to ON CONFLICT DO NOTHING, which needs INSERT alone.
      const { error } = await ctx.client
        .from('agent_repositories')
        .upsert(toInsert, { onConflict: 'agent_id,repo_id', ignoreDuplicates: true })
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
   *
   * Serialized against every other agent write (see queueAgentWrite): the repo-link
   * reconciliation it ends with is a diff, and a diff computed while another one is
   * being applied is a diff against a state that no longer exists.
   */
  async saveAgents(agents: Agent[]): Promise<void> {
    return this.queueAgentWrite(() => this.writeAgentRows(agents))
  }

  private async writeAgentRows(agents: Agent[]): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return

    // One row per app id. `(owner_id, app_agent_id)` is what the upsert arbitrates
    // on, and Postgres refuses a statement that would hit the same conflict target
    // twice — 21000, "ON CONFLICT DO UPDATE command cannot affect row a second
    // time" — which would fail the WHOLE roster over one duplicated cache entry.
    // The later entry wins: it is the more recent state of the same agent.
    const byAppId = new Map(agents.map((a) => [a.id, a]))
    const unique = [...byAppId.values()]
    const rows = unique.map((a) => this.toAgentRow(a, ctx.uid))
    if (rows.length === 0) return

    // The database resolves identity, and says so: an app id it already knows
    // returns the uuid of the row that holds it, a new one returns the uuid the
    // column default just minted. Reading the binding back from the response is
    // what replaced `agentIdMap.get(a.id) ?? randomUUID()` — a local cache miss
    // used to mint a SECOND identity for an agent that already had one, which is
    // the duplication migration 20260814090000 exists to end.
    const { data, error } = await ctx.client
      .from('agents')
      .upsert(rows, { onConflict: 'owner_id,app_agent_id' })
      .select('id, app_agent_id')
    if (error) throw new Error(`saveAgents failed: ${error.message}`)

    for (const row of (data ?? []) as { id: string; app_agent_id: string | null }[]) {
      if (row.app_agent_id) this.agentIdMap.set(row.app_agent_id, row.id)
    }

    // After the upsert: the link rows reference agents that must already exist.
    // The deduplicated list, for the same reason the upsert got it — a repeated app
    // id would otherwise have its links diffed twice against one uuid, so the stale
    // entry issues a delete the fresh entry immediately undoes.
    await this.syncRepoLinks(ctx, unique)
  }

  /**
   * Archive ONE agent: the row stays, stamped with archived_at, so the activity,
   * usage and skill-invocation rows that reference it keep their link (a delete
   * would null those FKs — see the migration). Scoped by owner_id like every
   * agent write: closing an agent must never reach a teammate's row.
   *
   * Queued behind the pending agent writes (see queueAgentWrite) so it cannot drop
   * the id→uuid binding from under a save that is still using it, and so a save
   * that was already in flight cannot re-upsert the row it just stamped archived.
   *
   * Write-ahead logged (see pending-archives): the close is on disk before this
   * method even joins the queue, so it is replayed rather than lost when the write
   * cannot be made now — and when it CAN be made and still matches nothing, that is
   * reported instead of passing for success.
   */
  async archiveAgent(appId: string): Promise<void> {
    // Ahead of the QUEUE, not merely ahead of the PATCH — and synchronously, before
    // this method's first await. Inside archiveAgentRow the enqueue would run only
    // once the agent-write chain had drained, and that chain is routinely holding a
    // network round-trip: writeAgents() fires on every metadata mutation and
    // loadAgents rides the same chain. Quit in that window and nothing was ever
    // spooled — which is failure mode 3 of the ticket, the close whose PATCH dies
    // with the process, and there is deliberately no `before-quit` hook to catch it
    // (Electron does not await that handler anyway).
    //
    // loadSession() rather than userContext(): the uid has to be read WITHOUT an
    // await, since awaiting anything at all is what this line exists to avoid. It is
    // the same synchronous read context()/userContext() do, so it yields the same
    // uid they would. Empty when no session is loaded, which the spool tolerates by
    // design — replaying such an entry is scoped by owner_id all the same (see the
    // header of pending-archives).
    //
    // The answer matters: everything downstream that stays QUIET about an
    // unfinished archive does so because this file holds the intent. If the spool
    // could not be written, that justification is gone and silence becomes the
    // original bug again.
    const spooled = enqueuePendingArchive({ appId, uid: loadSession()?.user?.id ?? '' })

    return this.queueAgentWrite(() => this.archiveAgentRow(appId, spooled))
  }

  private async archiveAgentRow(appId: string, spooled = true): Promise<void> {
    // Read the uuid before any await: a concurrent write must not observe a
    // half-updated map, and callers flush usage right before closing. It may
    // legitimately be missing — the binding is process-local, so a cold map (a
    // close before the first hydration, a replay after a restart) knows nothing.
    // That is a reason to match the row differently, not a reason to give up: an
    // archive that does not happen is an agent that comes back live on the next
    // launch.
    const uuid = this.agentIdMap.get(appId)

    // The write-ahead entry is already on disk — archiveAgent() spooled it before
    // queueing this task, which is the only placement that survives a quit while
    // another agent write holds the chain. Nothing to record here; from here on the
    // job is to SETTLE that entry, and to leave it alone whenever the outcome is
    // still open.

    // userContext, not context: this write never reads ctx.orgId — it is scoped by
    // owner_id — so requiring a resolved membership only meant silently dropping
    // the archives of anyone working on personal repositories alone.
    const ctx = await this.userContext()
    if (!ctx) {
      // Offline, no session, or cloud disabled. The entry stays in the spool and
      // hydration already hides the agent, so this is a DEFERRED write, not a lost
      // one — nothing to report to the user, and nothing to throw at the caller.
      //
      // Unless the spool never took it. Then there is no entry to replay and no
      // hydration filter hiding the agent: the close would vanish here in silence
      // and the agent would come back with a fresh PTY at the next launch, which is
      // precisely what deferring quietly is allowed to do only when the intent is
      // durable. Report it instead — the toast is the only remaining trace.
      if (!spooled) {
        throw new Error(
          `archiveAgent failed: ${appId} could not be written now and could not be spooled for retry`
        )
      }
      return
    }

    // Scoped by owner, not by org: an agent on a personal repo has no org, and
    // ownership is the real permission boundary anyway.
    //
    // app_agent_id is released in the same statement as archived_at, and that is
    // the whole reason a closed agent cannot be resurrected. App ids are
    // `claude-${Date.now()}`, so a later agent may carry the same one; with the
    // id still on the archived row, its upsert would conflict onto it and — since
    // toAgentRow never sets archived_at — bring back a row the user closed, live
    // in the database yet filtered out of every read. Null is also what keeps the
    // unique index total-index-safe: any number of archived rows may share an app
    // id, because null keys are distinct (see 20260814090000).
    const patch = ctx.client
      .from('agents')
      .update({ archived_at: new Date().toISOString(), app_agent_id: null })
      .eq('owner_id', ctx.uid)

    // The uuid when the map has it, the app id ONLY as the cold-map fallback —
    // never the other way round. fromAgentRow reads the app id from the column,
    // the jsonb, then the uuid precisely because an older installed build still
    // upserts `onConflict: 'id'` and leaves the column null; migration
    // 20260814090000 backfilled the rows that existed then, not the ones such a
    // build writes afterwards. Matching on app_agent_id alone would find 0 rows
    // for those and report an archive that in fact should have worked.
    const scoped = uuid ? patch.eq('id', uuid) : patch.eq('app_agent_id', appId)

    // `.select()` is what turns "the statement ran" into "a row changed". Without
    // it PostgREST answers the same for 0 rows matched as for 1, so every way this
    // write can miss its row — a stale binding, a filter that matches nothing —
    // reported as a success.
    const { data, error } = await scoped.is('archived_at', null).select('id')
    if (error) throw new Error(`archiveAgent failed: ${error.message}`)

    if ((data ?? []).length > 0) {
      this.settleArchive(appId, ctx.uid)
      return
    }

    // Zero rows. Two very different situations look identical from here, and only
    // the row itself can tell them apart: the agent was ALREADY archived (a second
    // close matches nothing, since app_agent_id is null and archived_at is set), or
    // the update never found its agent at all.
    //
    // Asked with or WITHOUT a uuid, which is the whole point of the write-ahead
    // spool: flushPendingArchives() runs before ensureHydrated(), so the canonical
    // replay — the first PATCH committed, its response was lost with the process —
    // arrives here on a cold map. Skipping the question there would throw
    // `no agent row matched` and toast a failure for an archive that provably
    // succeeded, which is the exact failure this ticket removes.
    const probe = await this.isAlreadyArchived(ctx, uuid, appId)

    if (probe.state === 'archived') {
      this.settleArchive(appId, ctx.uid)
      return
    }

    if (probe.state === 'unknown') {
      // The probe never got an answer, so nothing has been proved about this agent.
      // KEEP the entry: this is a transient backend failure, and the connectivity
      // gate will replay the close once the backend answers again — dropping it here
      // would spend the retry guarantee on the one condition it was written for. The
      // message names the probe, because `no agent row matched` would assert
      // something this pass is in no position to assert.
      throw new Error(`archiveAgent failed: could not confirm whether ${appId} is already archived: ${probe.reason}`)
    }

    // A genuine miss: the row is there and still live, or it is gone entirely. Drop
    // the spool entry first: replaying this exact update would match exactly as many
    // rows next time, and an entry that can never be resolved would hide the app id
    // from every hydration forever. Then throw, so config/agents.ts reports the
    // failure instead of the user discovering it when the agent reappears.
    //
    // `unmatched`, which is what stops this from eating an unattributed entry. A
    // close recorded with no session is replayed under whoever signs in next; if that
    // guess was wrong the update lands here, and deleting the entry would destroy the
    // real owner's only durable record of it.
    resolvePendingArchive(appId, ctx.uid, 'unmatched')
    throw new Error(`archiveAgent failed: no agent row matched ${appId}`)
  }

  /** The archive landed: forget the pending entry and the now-meaningless bindings. */
  private settleArchive(appId: string, uid: string): void {
    resolvePendingArchive(appId, uid, 'landed')
    // The local binding goes too: nothing in this process should keep pointing an
    // app id at a row that no longer answers to it.
    this.agentIdMap.delete(appId)
    this.agentRepoKey.delete(appId)
  }

  /**
   * Whether the row this archive targeted is already stamped — i.e. the update
   * matched nothing because the work was done, not because it was lost.
   *
   * A plain read of the caller's own row: `agents_select` (migration
   * 20260727160000) lets an owner read back their agents, personal null-org ones
   * included, so no policy has to change for this. Never `archived` on a doubt —
   * reporting a doubtful archive is the pessimistic direction, and the right one.
   *
   * But a read that FAILS answers `unknown`, not `live`: it establishes nothing, and
   * treating it as a verdict would delete the durable entry over a dropped
   * connection. A read that succeeds and finds nothing does answer `live` — a row
   * that is not there will not be there next time either (see ArchiveProbe).
   *
   * Two ways in, because the archive itself destroys the obvious one. Archiving
   * nulls `app_agent_id` in the same statement that stamps `archived_at`, so the
   * column cannot find an already-archived row, and the uuid is only known while
   * the process that hydrated the map is still alive. What survives BOTH is the
   * copy in the jsonb: toAgentRow always writes `metadata.__app.id` (it is the
   * rung fromAgentRow falls back to, and what migration 20260814090000 backfilled
   * the column from), and no archive path ever touches metadata.
   */
  private async isAlreadyArchived(
    ctx: { client: SupabaseClient; uid: string },
    uuid: string | undefined,
    appId: string,
  ): Promise<ArchiveProbe> {
    const scoped = ctx.client.from('agents').select('archived_at').eq('owner_id', ctx.uid)

    // Warm map: the uuid is the primary key, so at most one row can answer.
    if (uuid) {
      const { data, error } = await scoped.eq('id', uuid).maybeSingle()
      if (error) return { state: 'unknown', reason: probeFailure(error) }
      const row = data as { archived_at?: string | null } | null
      // No row is a verdict of its own: the agent this update targeted does not
      // exist under this owner, and no amount of replaying will make it appear.
      return row?.archived_at ? { state: 'archived' } : { state: 'live' }
    }

    // Cold map — a replay after a restart, or a close before the first hydration.
    // NOT maybeSingle: several rows may legitimately carry this app id in their
    // jsonb, because the invariant "only a LIVE agent holds an app id" is enforced
    // on the column alone (20260814090000). Closing and reusing an id leaves one
    // archived row per cycle, and the duplicates that migration folded are archived
    // rows carrying it too.
    const { data, error } = await scoped.eq(APP_ID_IN_METADATA, appId).limit(ARCHIVED_PROBE_LIMIT)
    if (error) return { state: 'unknown', reason: probeFailure(error) }

    const rows = (data ?? []) as { archived_at?: string | null }[]
    // EVERY row, not merely one of them. The update above already proved no live row
    // holds this id in the COLUMN; a live row that still matches here is one an older
    // build wrote with a null column, and for it the archive genuinely did not
    // happen. Answering `archived` on the strength of an unrelated archived namesake
    // would swallow exactly the loss this path exists to report.
    const archived = rows.length > 0 && rows.every((row) => Boolean(row.archived_at))
    return archived ? { state: 'archived' } : { state: 'live' }
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
   * Append ONE activity event. The BEFORE INSERT trigger overrides `org_id` from the
   * agent whenever agent_id resolves, because an event belongs where its agent
   * belongs and not where the user happens to be looking; an event with no agent
   * keeps what is sent here. See eventOrgId() for why that is null.
   */
  async appendHistory(entry: HistoryEntry): Promise<void> {
    const ctx = await this.eventContext()
    if (!ctx) return

    const agentUuid = this.agentIdMap.get(entry.agentId) ?? null

    const { error } = await ctx.client.from('activity_events').insert({
      org_id: this.eventOrgId(ctx.orgId, agentUuid),
      user_id: ctx.uid,
      agent_id: agentUuid,
      action: entry.action,
      ticket_id: entry.ticketId ?? null,
      description: entry.description ?? null,
      repositories: entry.repositories ?? [],
      occurred_at: new Date(entry.timestamp).toISOString(),
      client_event_id: entry.clientEventId ?? null,
    })
    if (isAlreadyRecorded(error)) return
    if (error) throw new Error(`appendHistory failed: ${error.message}`)
  }

  // -------------------------------------------------------------------------
  // Usage events (usage_events — append-only, opt-in write / open org read)
  // -------------------------------------------------------------------------

  /**
   * Append ONE aggregated usage snapshot at session end. Maps the app agent id to
   * the agents.id uuid via agentIdMap, and attributes the org exactly like
   * appendHistory (see eventOrgId). tokens is left null on purpose:
   * TerminalUsage.contextTokens is a point-in-time context gauge, not a cumulative
   * session-token count, so it must not be mapped into this row. context_window_size
   * IS written: it is a capacity of the model, not a counter, so it says nothing
   * false about the session.
   */
  async appendUsage(event: UsageEventInput): Promise<void> {
    const ctx = await this.eventContext()
    if (!ctx) return

    const agentUuid = this.agentIdMap.get(event.agentId) ?? null

    const { error } = await ctx.client.from('usage_events').insert({
      org_id: this.eventOrgId(ctx.orgId, agentUuid),
      user_id: ctx.uid,
      agent_id: agentUuid,
      model: event.model ?? null,
      model_id: event.modelId ?? null,
      context_window_size: event.contextWindowSize ?? null,
      model_ids: event.modelIds ?? null,
      cost_usd: event.costUsd ?? null,
      tokens: null,
      lines_added: event.linesAdded ?? null,
      lines_removed: event.linesRemoved ?? null,
      duration_ms: event.durationMs ?? null,
      occurred_at: new Date(event.occurredAt ?? Date.now()).toISOString(),
      client_event_id: event.clientEventId ?? null,
    })
    if (isAlreadyRecorded(error)) return
    if (error) throw new Error(`appendUsage failed: ${error.message}`)
  }

  /**
   * Append ONE skill invocation, OPEN — `ended_at` stays null until the skill's own
   * closing ping reaches closeSkillRun. Same agent-id mapping and same org rule as
   * appendUsage (see eventOrgId); an absent or unknown agent yields a null agent_id
   * rather than dropping the row, because runs from a terminal the app did not spawn
   * have no agent and still count.
   */
  async recordSkillInvocation(input: SkillInvocationInput): Promise<void> {
    const ctx = await this.eventContext()
    if (!ctx) return

    const agentUuid = (input.agentId && this.agentIdMap.get(input.agentId)) ?? null

    const { error } = await ctx.client.from('skill_invocations').insert({
      org_id: this.eventOrgId(ctx.orgId, agentUuid),
      user_id: ctx.uid,
      agent_id: agentUuid,
      skill: input.skill,
      occurred_at: new Date(input.occurredAt ?? Date.now()).toISOString(),
      client_event_id: input.clientEventId ?? null,
    })
    if (isAlreadyRecorded(error)) return
    if (error) throw new Error(`recordSkillInvocation failed: ${error.message}`)
  }

  /**
   * Close the most recent open run of a skill. The matching rule lives in the RPC
   * (20260801090000), not here — it needs the rows to pick among.
   *
   * No idempotence key: closing is naturally idempotent, because the RPC only ever
   * matches a run that is still OPEN. A replay finds nothing the second time and
   * reports false. `occurred_at` is the end moment the skill reported, which is what
   * keeps a close that sat in the outbox from inflating the duration.
   */
  async closeSkillRun(input: SkillRunEndInput): Promise<boolean> {
    const ctx = await this.eventContext()
    if (!ctx) return false

    const agentUuid = (input.agentId && this.agentIdMap.get(input.agentId)) ?? null

    const { data, error } = await ctx.client.rpc('close_skill_run', {
      p_agent_id: agentUuid,
      p_skill: input.skill,
      p_outcome: input.outcome,
      p_occurred_at: new Date(input.occurredAt).toISOString(),
    })
    if (error) throw new Error(`closeSkillRun failed: ${error.message}`)
    return data === true
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
    return mapSkillCountRows(data)
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
    return mapSkillCountRows(data)
  }

  /**
   * How long the CALLER has spent running skills — every scope, all time, plus the
   * current week.
   *
   * EVERY SCOPE, unlike the two rollups above, and no org argument: the RPC scopes itself
   * to `auth.uid()`, which is what makes this the viewer's own figure rather than a tab's.
   *
   * `p_tz` is the MACHINE's timezone, and the week boundary is computed from it inside the
   * RPC. Monday-to-Sunday in the user's own zone, not a rolling seven days — a Monday
   * morning is meant to read as a fresh week.
   *
   * `null` is a FAILED read, distinct from a successful read of an empty history (a row of
   * zeros with null dates). The card hides itself on the first and explains itself on the
   * second, which are different things to show — so this must not flatten one into the
   * other by answering zeros on an error.
   */
  async loadSkillHours(): Promise<SkillHours | null> {
    const ctx = await this.userContext()
    if (!ctx) return null

    const { data, error } = await ctx.client.rpc('skill_hours', { p_tz: machineTimeZone() })
    // Always one row, never zero — the RPC aggregates without a GROUP BY precisely so a
    // user with no runs still has something to read.
    const row = (data as SkillHoursRow[] | null)?.[0]
    if (error || !row) return null

    return {
      totalSeconds: toNumber(row.total_seconds),
      weekSeconds: toNumber(row.week_seconds),
      firstMeasuredAt: row.first_measured_at ?? null,
      lastRunAt: row.last_run_at ?? null,
      // Absent (a database that has not run 20260814140000 yet) and null (a run with no
      // readable agent) are the same answer to the caller: there is no name to print.
      lastRunAgent: row.last_run_agent ?? null,
    }
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
