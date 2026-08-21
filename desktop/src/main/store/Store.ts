import type { AppInstallationInfo, Config, Agent, HistoryEntry, OrgActivity, OrgSharedConfig, OrgAgent, PlanSession, PlanSpecInput, PlanTicketsInput, SkillCounts, SkillHours, SkillInvocationInput, SkillRunEndInput, UsageEventInput, UsageStats, StoredRepository, RepositoryIdentity, UserProfile } from '../../types'

/**
 * Result of a backend reachability probe.
 *  - 'ok'           reachable + authenticated.
 *  - 'unauthorized' no valid session (logged out, or the refresh token was
 *                   rejected) — the app must fall back to the auth wall.
 *  - 'unreachable'  the backend could not be reached (offline / network error) —
 *                   the app must block with a "connection lost" screen. No grace
 *                   period, no offline mode.
 *  - 'disabled'     Supabase is not configured (isCloudEnabled() === false) —
 *                   the app must show the "cloud not configured" blocking screen.
 */
export type ConnectivityStatus = 'ok' | 'unauthorized' | 'unreachable' | 'disabled'

/**
 * The single persistence contract for config, agents and history. The Supabase
 * database is the single source of truth — there is deliberately NO local JSON
 * persistence behind any implementation of this interface. Callers keep an
 * in-memory cache (hydrated via the load methods) and write through via the
 * save/append methods.
 */
export interface Store {
  loadConfig(): Promise<Config | null>
  saveConfig(config: Config): Promise<void>

  // Repositories are first-class rows (personal or team), separate from the
  // config blob. Identity lives org-wide; the local path is per-user.
  /** Repos visible to the caller (own personal + active-org team), with the caller's own path. */
  listRepositories(): Promise<StoredRepository[]>
  /**
   * Create a repo row (owner = caller). `id` is client-generated; binds `path`
   * when provided. Returns the owner it stamped — the caller's user id — so the
   * in-memory config can hold it right away instead of waiting for the next
   * hydration. Ownership decides who may still edit a repo once it is shared,
   * so a null there would read as "not mine". Null when there is no session.
   */
  createRepository(repo: StoredRepository): Promise<string | null>
  /** Update a repo's shared identity (and org_id when sharing). Never changes owner. */
  updateRepository(id: string, patch: Partial<RepositoryIdentity>): Promise<void>
  /** Delete a repo row (owner or org admin, enforced by RLS). */
  deleteRepository(id: string): Promise<void>
  /**
   * Fill in the repo's shared clone address, if it has none yet.
   *
   * Separate from updateRepository because the capture is done by whoever binds
   * a local folder — typically a plain member, whom the update policy rejects.
   * The backend accepts it only while the column is null. Returns whether it wrote.
   */
  setRepositoryRemoteUrl(id: string, url: string): Promise<boolean>
  /** Set (or clear, when null) the caller's own local path binding for a repo. */
  setRepositoryPath(id: string, path: string | null): Promise<void>

  loadAgents(): Promise<Agent[]>
  /** Upsert the caller's agents. Never destructive: an absent agent is left alone. */
  saveAgents(agents: Agent[]): Promise<void>

  /**
   * Soft-delete ONE agent (the user closed it). Never a hard delete: the row is
   * kept so its activity, usage and skill-invocation events keep their agent
   * link — a deleted row would null those FKs and orphan the history.
   *
   * Idempotent: closing an already-closed agent succeeds and changes nothing. NOT a
   * no-op for an agent the store never loaded, which it used to be — the id→uuid
   * binding is process-local, so "never loaded" describes a cold cache far more
   * often than a nonexistent agent, and returning quietly there is how a close came
   * back as a live agent after the next launch. An implementation must either
   * archive the row, defer the write durably, or reject — never report a write that
   * matched nothing as done. (NOOP_STORE stays a no-op: it persists nothing at all,
   * so it has nothing to lose.)
   */
  archiveAgent(appId: string): Promise<void>

  /** Org-wide agents roster (all members) for the team dashboard. Read-only. */
  loadOrgAgents(): Promise<OrgAgent[]>

  // `/magic:plan` sessions. Upserts, not appends: a session is ONE row per spec
  // file, rewritten as the spec fills in — see main/store/plan-sync.ts, the only
  // caller, which is also where the user's opt-out is enforced.
  /**
   * Upsert ONE plan session from its spec. Creates the row when the spec is still
   * a promise (no file yet), which is what records a plan whose agent was closed
   * before anything was written.
   */
  savePlanSpec(input: PlanSpecInput): Promise<void>
  /**
   * Upsert the tickets ONE plan session created, resolving the session from the
   * spec path. Creates the session first when there is none — the tickets exist
   * in the tracker either way, so dropping them would be the worse loss.
   */
  savePlanTickets(input: PlanTicketsInput): Promise<void>
  /**
   * When each of the caller's own plan sessions last received its spec — the
   * projection the launch reconcile compares file mtimes against. Read-only.
   */
  loadPlanSyncState(): Promise<Pick<PlanSession, 'specKey' | 'specSyncedAt'>[]>

  /**
   * Append ONE activity event (append-only, fire-and-forget). Write-only: the
   * personal History feed that used to read these rows back is gone, and the Team
   * page reads the org-wide aggregate through loadOrgActivity instead.
   */
  appendHistory(entry: HistoryEntry): Promise<void>

  /** Append ONE aggregated usage snapshot at session end (append-only, fire-and-forget). */
  appendUsage(event: UsageEventInput): Promise<void>

  /**
   * OPEN ONE skill run (append-only, fire-and-forget). Driven by the PreToolUse
   * hook, so it fires on every run — including repeats that leave the agent's
   * status unchanged and therefore write nothing to the activity feed.
   */
  recordSkillInvocation(input: SkillInvocationInput): Promise<void>

  /**
   * CLOSE the most recent open run of a skill, recording when and how it ended.
   *
   * The other half of recordSkillInvocation. Sent by the skill's own final step,
   * which is the only thing that knows the workflow finished — so it can legitimately
   * never arrive, and a run left open reads as abandoned rather than as missing.
   * Returns whether a matching open run was found; false is a normal outcome (a run
   * started before this existed, or one whose start was never recorded), not an error.
   */
  closeSkillRun(input: SkillRunEndInput): Promise<boolean>

  /** Org-wide usage rows (all members) for the dashboard, aggregated client-side. Read-only. */
  loadOrgUsageStats(): Promise<UsageStats>

  /**
   * Run count per skill for ONE org, for the Team page. Read-only, open to any member
   * of that org.
   *
   * Aggregated by the DATABASE, unlike loadOrgUsageStats which pulls raw rows and sums
   * them here: skill_invocations gets one row per skill run and an active team reaches
   * thousands, of which the page needs eight numbers. The org is an explicit argument
   * rather than the resolved active one, because the Team page has a tab per org and
   * asks for whichever is open.
   */
  loadOrgSkillCounts(orgId: string): Promise<SkillCounts>

  /**
   * Run count per skill for the CALLER's own work outside any organization — the
   * Team page's Personal tab.
   *
   * Takes no org, and must not: these are the rows with a null org_id, readable by
   * their author alone. A separate method from loadOrgSkillCounts rather than a
   * nullable argument, because the two answer questions of different KINDS (a whole
   * team's work versus one person's) and a lost id would otherwise silently swap one
   * for the other.
   */
  loadPersonalSkillCounts(): Promise<SkillCounts>

  /**
   * How long the CALLER has spent inside the skills — every scope, all time plus the
   * current week.
   *
   * Takes no org and has no org variant, unlike the two rollups above: the RPC scopes
   * itself to the caller, which is what makes this a person's own figure rather than a
   * tab's. `null` means the read FAILED — an empty history is a resolved row of zeros,
   * and the two are shown differently.
   */
  loadSkillHours(): Promise<SkillHours | null>

  /**
   * Org-wide activity events (all members). Read-only, and open to any org
   * member — the RLS select policy is scoped by org, not by user. The only read
   * of activity_events left: nothing reads back the caller's own events.
   */
  loadOrgActivity(sinceMs: number, limit: number): Promise<OrgActivity>

  /** Admin-only: push the org's shared config (languages/commit/pullRequest/repoKeywords). */
  setOrgSharedConfig(orgId: string, shared: OrgSharedConfig): Promise<void>

  // Per-user profile (who the human is) — org-independent. Cloud is the source
  // of truth; the desktop mirrors it to ~/.config/magic-slash/profile.md so the
  // /magic:* skills can read it.
  loadProfile(): Promise<UserProfile | null>
  saveProfile(profile: UserProfile): Promise<void>

  /**
   * Record which app version this machine runs, in `app_installations` (upsert on
   * (user_id, device_id)). Called once per launch after auth is established, so
   * the DB is refreshed at every start and after every auto-update.
   */
  recordAppInstallation(info: AppInstallationInfo): Promise<void>

  /** Lightweight authed reachability probe used by the connectivity gate. */
  ping(): Promise<ConnectivityStatus>

  /** Remember which org subsequent reads/writes target (set on org switch). */
  setActiveOrgId(orgId: string | undefined): void
}

// ---------------------------------------------------------------------------
// Active store registry (dependency injection point)
// ---------------------------------------------------------------------------

/**
 * A do-nothing store used before the real store is wired and in unit tests. It
 * keeps every persistence call a safe no-op and reports the backend as
 * unauthorized so nothing accidentally believes it is connected.
 */
export const NOOP_STORE: Store = {
  async loadConfig() { return null },
  async saveConfig() { /* no-op */ },
  async listRepositories() { return [] },
  async createRepository() { return null },
  async updateRepository() { /* no-op */ },
  async deleteRepository() { /* no-op */ },
  async setRepositoryRemoteUrl() { return false },
  async setRepositoryPath() { /* no-op */ },
  async loadAgents() { return [] },
  async saveAgents() { /* no-op */ },
  async archiveAgent() { /* no-op */ },
  async loadOrgAgents() { return [] },
  async savePlanSpec() { /* no-op */ },
  async savePlanTickets() { /* no-op */ },
  async loadPlanSyncState() { return [] },
  async appendHistory() { /* no-op */ },
  async appendUsage() { /* no-op */ },
  async recordSkillInvocation() { /* no-op */ },
  async closeSkillRun() { return false },
  async loadOrgUsageStats() { return { rows: [], capped: false } },
  async loadOrgSkillCounts() { return {} },
  async loadPersonalSkillCounts() { return {} },
  async loadSkillHours() { return null },
  async loadOrgActivity() { return { events: [], capped: false, since: new Date(0).toISOString() } },
  async setOrgSharedConfig() { /* no-op */ },
  async loadProfile() { return null },
  async saveProfile() { /* no-op */ },
  async recordAppInstallation() { /* no-op */ },
  async ping() { return 'unauthorized' },
  setActiveOrgId() { /* no-op */ },
}

let activeStore: Store = NOOP_STORE

/** Wire the concrete store (CloudStore in production; a fake in tests). */
export function setStore(store: Store): void {
  activeStore = store
}

/** The currently active store. Falls back to a safe no-op store. */
export function getStore(): Store {
  return activeStore
}

// ---------------------------------------------------------------------------
// Write-through failure reporting
// ---------------------------------------------------------------------------
// The cache modules (config/agents) write through to the store asynchronously and
// keep a synchronous read API. When a write-through fails the in-memory cache
// would silently diverge from the DB, so we surface the failure through a handler
// wired in the main process (emits an IPC event + re-hydrates). The append-only
// event tables (activity/usage/skills) are NOT reported here: they back no cache,
// so a lost write diverges nothing and would trigger a pointless rehydrate.

/** Which cache write failed to persist to the DB. */
export type StoreWriteKind = 'config' | 'agents'

type WriteErrorHandler = (kind: StoreWriteKind, error: unknown) => void

let writeErrorHandler: WriteErrorHandler | null = null

/** Wire the handler invoked whenever a write-through to the store fails. */
export function setWriteErrorHandler(handler: WriteErrorHandler | null): void {
  writeErrorHandler = handler
}

/** Report a write-through failure to the wired handler (no-op if none). */
export function reportWriteError(kind: StoreWriteKind, error: unknown): void {
  writeErrorHandler?.(kind, error)
}
