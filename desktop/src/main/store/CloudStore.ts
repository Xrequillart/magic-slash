import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Agent, Config, HistoryEntry, OrgAgent, OrgSharedConfig, TerminalMetadata, UsageEventInput, UsageStats } from '../../types'
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
 * to the current user's active organization.
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

  async loadConfig(): Promise<Config | null> {
    const ctx = await this.context()
    if (!ctx) return null

    const { data, error } = await ctx.client
      .from('configs')
      .select('data')
      .eq('org_id', ctx.orgId)
      .eq('user_id', ctx.uid)
      .maybeSingle()

    if (error || !data) return null

    const blob = { ...(data as ConfigRow).data } as Record<string, unknown>
    // Drop the top-level shared projection — it is a mirror, not part of Config.
    for (const key of SHARED_KEYS) delete blob[key]
    const config = blob as unknown as Config
    // Keep the remembered org id in sync with what we actually loaded.
    if (typeof config.currentOrgId === 'string') {
      this.activeOrgId = config.currentOrgId
    }
    return config
  }

  async saveConfig(config: Config): Promise<void> {
    const ctx = await this.context()
    if (!ctx) return

    // Store the full Config blob AND mirror the shareable keys at top level so
    // get_org_shared_config keeps working for org admins.
    const data = { ...config, ...projectSharedFields(config) }

    const { error } = await ctx.client
      .from('configs')
      .upsert({ org_id: ctx.orgId, user_id: ctx.uid, data }, { onConflict: 'org_id,user_id' })
    if (error) throw new Error(`saveConfig failed: ${error.message}`)
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

  async loadAgents(): Promise<Agent[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('agents')
      .select('id, org_id, owner_id, name, ticket_id, description, branch_name, base_branch, status, repositories, metadata, updated_at')
      .eq('org_id', ctx.orgId)

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

    // Delete rows whose app agent id no longer exists locally.
    for (const [appId, uuid] of [...this.agentIdMap.entries()]) {
      if (!desired.has(appId)) {
        const { error } = await ctx.client.from('agents').delete().eq('org_id', ctx.orgId).eq('id', uuid)
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

  async loadHistory(limit: number): Promise<HistoryEntry[]> {
    const ctx = await this.context()
    if (!ctx) return []

    const { data, error } = await ctx.client
      .from('activity_events')
      .select('id, agent_id, action, ticket_id, description, repositories, occurred_at')
      .eq('org_id', ctx.orgId)
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
