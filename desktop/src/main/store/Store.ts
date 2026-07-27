import type { AppInstallationInfo, Config, Agent, HistoryEntry, OrgActivity, OrgSharedConfig, OrgAgent, SkillInvocationInput, UsageEventInput, UsageStats, StoredRepository, RepositoryIdentity, UserProfile } from '../../types'

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
  /** Set (or clear, when null) the caller's own local path binding for a repo. */
  setRepositoryPath(id: string, path: string | null): Promise<void>

  loadAgents(): Promise<Agent[]>
  /** Upsert the caller's agents. Never destructive: an absent agent is left alone. */
  saveAgents(agents: Agent[]): Promise<void>

  /**
   * Soft-delete ONE agent (the user closed it). Never a hard delete: the row is
   * kept so its activity, usage and skill-invocation events keep their agent
   * link — a deleted row would null those FKs and orphan the history.
   * Idempotent, and a no-op for an agent the store never loaded.
   */
  archiveAgent(appId: string): Promise<void>

  /** Org-wide agents roster (all members) for the team dashboard. Read-only. */
  loadOrgAgents(): Promise<OrgAgent[]>

  /**
   * Append ONE activity event (append-only, fire-and-forget). Write-only: the
   * personal History feed that used to read these rows back is gone, and the Team
   * page reads the org-wide aggregate through loadOrgActivity instead.
   */
  appendHistory(entry: HistoryEntry): Promise<void>

  /** Append ONE aggregated usage snapshot at session end (append-only, fire-and-forget). */
  appendUsage(event: UsageEventInput): Promise<void>

  /**
   * Append ONE skill invocation (append-only, fire-and-forget). Driven by the
   * PreToolUse hook, so it fires on every run — including repeats that leave the
   * agent's status unchanged and therefore write nothing to the activity feed.
   */
  recordSkillInvocation(input: SkillInvocationInput): Promise<void>

  /** Org-wide usage rows (all members) for the dashboard, aggregated client-side. Read-only. */
  loadOrgUsageStats(): Promise<UsageStats>

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
  async setRepositoryPath() { /* no-op */ },
  async loadAgents() { return [] },
  async saveAgents() { /* no-op */ },
  async archiveAgent() { /* no-op */ },
  async loadOrgAgents() { return [] },
  async appendHistory() { /* no-op */ },
  async appendUsage() { /* no-op */ },
  async recordSkillInvocation() { /* no-op */ },
  async loadOrgUsageStats() { return { rows: [], capped: false } },
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
