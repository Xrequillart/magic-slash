import type { Config, Agent, HistoryEntry, OrgSharedConfig } from '../../types'

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

  loadAgents(): Promise<Agent[]>
  saveAgents(agents: Agent[]): Promise<void>

  /** Most-recent `limit` history entries, oldest-first (matches the legacy read order). */
  loadHistory(limit: number): Promise<HistoryEntry[]>
  appendHistory(entry: HistoryEntry): Promise<void>

  /** Admin-only: push the org's shared config (languages/commit/pullRequest/repoKeywords). */
  setOrgSharedConfig(orgId: string, shared: OrgSharedConfig): Promise<void>

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
  async loadAgents() { return [] },
  async saveAgents() { /* no-op */ },
  async loadHistory() { return [] },
  async appendHistory() { /* no-op */ },
  async setOrgSharedConfig() { /* no-op */ },
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
// The cache modules (config/agents/activity-history) write through to the store
// asynchronously and keep a synchronous read API. When a write-through fails the
// in-memory cache would silently diverge from the DB, so we surface the failure
// through a handler wired in the main process (emits an IPC event + re-hydrates).

/** Which cache write failed to persist to the DB. */
export type StoreWriteKind = 'config' | 'agents' | 'history'

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
