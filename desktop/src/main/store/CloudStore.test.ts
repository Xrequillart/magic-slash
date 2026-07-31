import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Agent } from '../../types'

// Mock the cloud dependencies so CloudStore exercises only its own mapping /
// query-building logic (no network, no keychain). vi.hoisted shares mutable state
// the factories (hoisted above imports) read per test — same style as auth.test.ts
// and realtime.test.ts.
const h = vi.hoisted(() => {
  const state = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: null as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: null as any,
    cloudEnabled: true as boolean,
  }
  return { state }
})

vi.mock('../cloud/auth', () => ({
  getAuthedClient: vi.fn(async () => h.state.client),
}))

vi.mock('../cloud/session-store', () => ({
  loadSession: () => h.state.session,
}))

vi.mock('../cloud/supabase-client', () => ({
  isCloudEnabled: () => h.state.cloudEnabled,
}))

// mapOrgAgentRow is only reached by loadOrgAgents (not under test here); mock it so
// importing CloudStore does not pull in the realtime module's socket deps.
vi.mock('../cloud/realtime', () => ({
  mapOrgAgentRow: vi.fn(),
}))

import { CloudStore } from './CloudStore'

// ── Supabase client fake ────────────────────────────────────────────────────
//
// The real PostgREST builder is a thenable whose chain methods return the builder
// and which resolves to { data, error } when awaited. We mimic that: every chain
// method returns the same builder, and awaiting it (at any point in the chain)
// resolves to the per-table result. Insert payloads and the full call log are
// recorded so tests can assert what was sent.

type QueryResult = { data?: unknown; error?: unknown }

interface RecordedCall {
  table: string
  method: string
  args: unknown[]
}

function makeClient(
  resultsByTable: Record<string, QueryResult>,
  // Keyed by function name. Separate from the table map because an RPC is not a
  // table and shares no builder chain with one: `client.rpc()` resolves straight
  // to { data, error }.
  resultsByRpc: Record<string, QueryResult> = {},
) {
  const calls: RecordedCall[] = []
  const inserts: Record<string, unknown[]> = {}
  const updates: Record<string, unknown[]> = {}
  const upserts: Record<string, unknown[]> = {}

  function builder(table: string) {
    const result = resultsByTable[table] ?? { data: [], error: null }
    const record = (method: string, args: unknown[]) => calls.push({ table, method, args })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: (...args: unknown[]) => { record('select', args); return b },
      eq: (...args: unknown[]) => { record('eq', args); return b },
      gte: (...args: unknown[]) => { record('gte', args); return b },
      in: (...args: unknown[]) => { record('in', args); return b },
      is: (...args: unknown[]) => { record('is', args); return b },
      order: (...args: unknown[]) => { record('order', args); return b },
      limit: (...args: unknown[]) => { record('limit', args); return b },
      maybeSingle: (...args: unknown[]) => { record('maybeSingle', args); return b },
      insert: (payload: unknown) => {
        record('insert', [payload])
        ;(inserts[table] ??= []).push(payload)
        return b
      },
      update: (payload: unknown) => {
        record('update', [payload])
        ;(updates[table] ??= []).push(payload)
        return b
      },
      upsert: (payload: unknown, ...args: unknown[]) => {
        record('upsert', [payload, ...args])
        ;(upserts[table] ??= []).push(payload)
        return b
      },
      delete: (...args: unknown[]) => { record('delete', args); return b },
      then: (resolve: (v: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    }
    return b
  }

  const from = vi.fn((table: string) => builder(table))
  const rpc = vi.fn((fn: string, args?: unknown) => {
    calls.push({ table: `rpc:${fn}`, method: 'rpc', args: [args] })
    return Promise.resolve(resultsByRpc[fn] ?? { data: [], error: null })
  })
  return { client: { from, rpc }, calls, inserts, updates, upserts, from, rpc }
}

const UID = 'user-1'
const ORG = 'org-1'

/** Standard memberships result so context()/resolveOrgId settle on ORG. */
const membershipsOk: QueryResult = { data: [{ org_id: ORG }], error: null }

beforeEach(() => {
  h.state.session = { user: { id: UID } }
  h.state.cloudEnabled = true
  h.state.client = null
})

// ── appendUsage ─────────────────────────────────────────────────────────────

describe('appendUsage', () => {
  it('maps every field, nulls tokens, and attributes no org when the agent is unmapped', async () => {
    const { client, inserts, from } = makeClient({
      memberships: membershipsOk,
      usage_events: { error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.appendUsage({
      agentId: 'claude-1',
      model: 'Claude Opus',
      costUsd: 1.23,
      linesAdded: 10,
      linesRemoved: 4,
      durationMs: 5000,
      occurredAt: 1000,
    })

    expect(from).toHaveBeenCalledWith('usage_events')
    expect(inserts.usage_events).toHaveLength(1)
    const row = inserts.usage_events[0] as Record<string, unknown>
    expect(row).toMatchObject({
      // No agents loaded → the app id maps to nothing, so there is no agent to
      // derive an org from and the resolved membership must NOT stand in for one.
      // Same rule as skill_invocations; see CloudStore.eventOrgId.
      org_id: null,
      user_id: UID,
      agent_id: null,
      model: 'Claude Opus',
      cost_usd: 1.23,
      tokens: null,
      lines_added: 10,
      lines_removed: 4,
      duration_ms: 5000,
      occurred_at: new Date(1000).toISOString(),
    })
  })

  it('resolves agent_id via agentIdMap once agents are loaded', async () => {
    const agentRow = {
      id: 'uuid-agent-1',
      org_id: ORG,
      owner_id: UID,
      name: 'Agent A',
      ticket_id: null,
      description: null,
      branch_name: null,
      base_branch: null,
      status: null,
      repositories: [],
      metadata: { __app: { id: 'claude-1' } },
    }
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow], error: null },
      usage_events: { error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const agents = await store.loadAgents()
    expect(agents.map((a: Agent) => a.id)).toContain('claude-1')

    await store.appendUsage({ agentId: 'claude-1', model: 'Claude Opus', occurredAt: 1000 })

    const row = inserts.usage_events[0] as Record<string, unknown>
    expect(row.agent_id).toBe('uuid-agent-1')
    // With an agent the org IS sent — not as an attribution (the stamp_event_org
    // trigger overwrites it from the agent) but so the composite FK
    // (org_id, agent_id) is checkable. A null there would make MATCH SIMPLE skip
    // the check and let a stale map entry insert a dangling reference.
    expect(row.org_id).toBe(ORG)
  })

  it('leaves optional fields null when omitted', async () => {
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      usage_events: { error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.appendUsage({ agentId: 'claude-1', occurredAt: 1000 })

    const row = inserts.usage_events[0] as Record<string, unknown>
    expect(row).toMatchObject({
      model: null,
      cost_usd: null,
      tokens: null,
      lines_added: null,
      lines_removed: null,
      duration_ms: null,
    })
  })

  it('propagates the insert error (mirrors appendHistory)', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      usage_events: { error: { message: 'insert boom' } },
    })
    h.state.client = client

    const store = new CloudStore()
    await expect(store.appendUsage({ agentId: 'claude-1' })).rejects.toThrow('appendUsage failed: insert boom')
  })

  it('is a no-op (no insert) when the client is not authed', async () => {
    const { client, from } = makeClient({ memberships: membershipsOk, usage_events: { error: null } })
    h.state.client = null // getAuthedClient() → null → eventContext() bails

    const store = new CloudStore()
    await expect(store.appendUsage({ agentId: 'claude-1' })).resolves.toBeUndefined()
    expect(from).not.toHaveBeenCalled()
    void client
  })

  // No membership is no longer a reason to drop the row: an event's org is derived
  // from its agent by trigger, so a user working on personal repos alone still
  // records their usage. Only the authed client and the actor are required.
  it('records without an organization, attributing no org', async () => {
    const { client, inserts } = makeClient({
      memberships: { data: [], error: null },
      usage_events: { error: null },
    })
    h.state.client = client

    await new CloudStore().appendUsage({ agentId: 'claude-1', costUsd: 2, occurredAt: 1000 })

    expect(inserts.usage_events).toHaveLength(1)
    expect(inserts.usage_events[0]).toMatchObject({ org_id: null, user_id: UID })
  })
})

// ── appendHistory ───────────────────────────────────────────────────────────
//
// The org rule, not the field mapping. activity_events used to send the resolved
// membership for an agentless row while skill_invocations sent null, so ONE run
// counted as the team's in the activity feed and as personal in the skills
// dashboard. These two tests are what keep the three writers agreeing.

describe('appendHistory', () => {
  const entry = { agentId: 'claude-1', agentName: 'Agent A', action: 'started' as const, repositories: [], timestamp: 1000 }

  it('attributes no org when the agent is unmapped, rather than the first membership', async () => {
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      activity_events: { error: null },
    })
    h.state.client = client

    await new CloudStore().appendHistory(entry)

    expect(inserts.activity_events).toHaveLength(1)
    expect(inserts.activity_events[0]).toMatchObject({ org_id: null, user_id: UID, agent_id: null })
  })

  it('sends the org once the agent maps, keeping the composite FK checkable', async () => {
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      agents: {
        data: [{
          id: 'uuid-agent-1', org_id: ORG, owner_id: UID, name: 'Agent A', ticket_id: null,
          description: null, branch_name: null, base_branch: null, status: null,
          repositories: [], metadata: { __app: { id: 'claude-1' } },
        }],
        error: null,
      },
      activity_events: { error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents()
    await store.appendHistory(entry)

    expect(inserts.activity_events[0]).toMatchObject({ org_id: ORG, agent_id: 'uuid-agent-1' })
  })
})

// ── agents (per-user scoping) ───────────────────────────────────────────────

describe('agents', () => {
  const agentRow = (id: string, appId: string, owner: string) => ({
    id,
    org_id: ORG,
    owner_id: owner,
    name: `Agent ${appId}`,
    ticket_id: null,
    description: null,
    branch_name: null,
    base_branch: null,
    status: null,
    repositories: [],
    metadata: { __app: { id: appId } },
  })

  it('loadAgents scopes to the owner across every org, including agents with none', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow('uuid-1', 'claude-1', UID)], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents()

    // Ownership is the scope. Filtering on an org here would drop the caller's
    // agents whose repos are all personal — they have no org to match.
    const agentCalls = calls.filter((c) => c.table === 'agents' && c.method === 'eq')
    expect(agentCalls).toEqual([{ table: 'agents', method: 'eq', args: ['owner_id', UID] }])
  })

  it('loadAgents excludes archived agents, so closed work is never restored', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [], error: null },
    })
    h.state.client = client

    await new CloudStore().loadAgents()

    expect(calls).toContainEqual({ table: 'agents', method: 'is', args: ['archived_at', null] })
  })

  it('loadOrgAgents excludes archived agents from the team roster', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [], error: null },
    })
    h.state.client = client

    await new CloudStore().loadOrgAgents()

    expect(calls).toContainEqual({ table: 'agents', method: 'is', args: ['archived_at', null] })
  })

  it('saveAgents never deletes: an agent missing from the cache keeps its row', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow('uuid-1', 'claude-1', UID)], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents() // populates agentIdMap with claude-1 → uuid-1
    await store.saveAgents([]) // a cache divergence must not destroy the roster

    expect(calls.filter((c) => c.method === 'delete')).toEqual([])
  })

  it('archiveAgent stamps archived_at on the caller\'s own row only', async () => {
    const { client, calls, updates } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow('uuid-1', 'claude-1', UID)], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents()
    await store.archiveAgent('claude-1')

    const payload = (updates.agents[0] as { archived_at: string })
    expect(typeof payload.archived_at).toBe('string')

    // Scoped by owner_id so closing an agent can never reach a teammate's row,
    // and by `archived_at is null` so a second close is a no-op.
    const updateIndex = calls.findIndex((c) => c.table === 'agents' && c.method === 'update')
    expect(calls.slice(updateIndex).filter((c) => c.method === 'eq')).toEqual([
      { table: 'agents', method: 'eq', args: ['owner_id', UID] },
      { table: 'agents', method: 'eq', args: ['id', 'uuid-1'] },
    ])
    expect(calls.slice(updateIndex)).toContainEqual({
      table: 'agents', method: 'is', args: ['archived_at', null],
    })
  })

  it('archiveAgent is a no-op for an agent the store never loaded', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [], error: null },
    })
    h.state.client = client

    await new CloudStore().archiveAgent('claude-unknown')

    expect(calls.filter((c) => c.table === 'agents')).toEqual([])
  })

  it('an app id reused after archiving mints a new row instead of resurrecting the old one', async () => {
    const { client, upserts } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow('uuid-1', 'claude-1', UID)], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents()
    await store.archiveAgent('claude-1')
    await store.saveAgents([{ id: 'claude-1', name: 'Reborn', repositories: [] } as Agent])

    const rows = upserts.agents[0] as Array<Record<string, unknown>>
    expect(rows[0].id).not.toBe('uuid-1')
  })

  // ── columns vs jsonb ──────────────────────────────────────────────────────
  //
  // Every field that has a column used to be written TWICE — once in the column,
  // once inside `metadata` — while loadAgents read only the jsonb. The columns
  // were therefore write-only: nothing in the app would have noticed if they had
  // stopped being filled, which is exactly the state the bug report described.

  it('saveAgents writes each columned field to its column and leaves it out of the jsonb', async () => {
    const { client, upserts } = makeClient({
      memberships: membershipsOk,
      agents: { data: [], error: null },
      agent_repositories: { data: [], error: null },
    })
    h.state.client = client

    await new CloudStore().saveAgents([
      {
        id: 'claude-1',
        name: 'A',
        repositories: [],
        metadata: {
          ticketId: 'PROJ-1',
          description: 'desc',
          branchName: 'feature/x',
          baseBranch: 'main',
          status: 'in progress',
          title: 'kept in the jsonb',
        },
      } as Agent,
    ])

    const row = (upserts.agents[0] as Array<Record<string, unknown>>)[0]
    expect(row.ticket_id).toBe('PROJ-1')
    expect(row.description).toBe('desc')
    expect(row.branch_name).toBe('feature/x')
    expect(row.base_branch).toBe('main')
    expect(row.status).toBe('in progress')

    const meta = row.metadata as Record<string, unknown>
    // No duplication: two copies of one fact is one of them being wrong eventually.
    expect(meta).not.toHaveProperty('branchName')
    expect(meta).not.toHaveProperty('ticketId')
    expect(meta).not.toHaveProperty('status')
    expect(meta).not.toHaveProperty('description')
    expect(meta).not.toHaveProperty('baseBranch')
    // What has no column of its own still travels in the jsonb.
    expect(meta.title).toBe('kept in the jsonb')
    expect(meta.__app).toEqual({ id: 'claude-1', tsCreate: undefined, splitPane: undefined })
  })

  it('loadAgents reads the columns, not the jsonb', async () => {
    const row = {
      ...agentRow('uuid-1', 'claude-1', UID),
      branch_name: 'feature/from-column',
      ticket_id: 'PROJ-9',
      status: 'in review',
      // Deliberately absent from the jsonb: this is what a row written by the
      // current code looks like.
      metadata: { __app: { id: 'claude-1' }, title: 'T' },
    }
    const { client } = makeClient({
      memberships: membershipsOk,
      agents: { data: [row], error: null },
    })
    h.state.client = client

    const [agent] = await new CloudStore().loadAgents()
    expect(agent.metadata?.branchName).toBe('feature/from-column')
    expect(agent.metadata?.ticketId).toBe('PROJ-9')
    expect(agent.metadata?.status).toBe('in review')
    expect(agent.metadata?.title).toBe('T')
  })

  it('loadAgents falls back to the jsonb for a legacy row whose column was never filled', async () => {
    // A row written before toAgentRow mapped the columns: the value exists only in
    // the jsonb, and dropping it would lose the branch of every old agent.
    const row = {
      ...agentRow('uuid-1', 'claude-1', UID),
      branch_name: null,
      metadata: { __app: { id: 'claude-1' }, branchName: 'feature/legacy' },
    }
    const { client } = makeClient({
      memberships: membershipsOk,
      agents: { data: [row], error: null },
    })
    h.state.client = client

    const [agent] = await new CloudStore().loadAgents()
    expect(agent.metadata?.branchName).toBe('feature/legacy')
  })

  it('an empty column does not beat a real jsonb value', async () => {
    // '' is what the app writes for an unset field, so it must lose to a real
    // value rather than shadow it — hence `||` and not `??` in fromAgentRow.
    const row = {
      ...agentRow('uuid-1', 'claude-1', UID),
      branch_name: '',
      metadata: { __app: { id: 'claude-1' }, branchName: 'feature/real' },
    }
    const { client } = makeClient({
      memberships: membershipsOk,
      agents: { data: [row], error: null },
    })
    h.state.client = client

    const [agent] = await new CloudStore().loadAgents()
    expect(agent.metadata?.branchName).toBe('feature/real')
  })

  it('saveAgents links the agent to the repositories it resolved, tolerating a link already there', async () => {
    const { client, calls, upserts } = makeClient({
      memberships: membershipsOk,
      agents: { data: [], error: null },
      agent_repositories: { data: [], error: null },
    })
    h.state.client = client

    await new CloudStore().saveAgents([
      { id: 'claude-1', name: 'A', repositories: ['/repo'], repositoryIds: ['r1', 'r2'] } as Agent,
    ])

    const rows = upserts.agent_repositories[0] as Array<Record<string, unknown>>
    expect(rows.map((r) => r.repo_id)).toEqual(['r1', 'r2'])
    // (agent_id, repo_id) is the primary key, so re-creating a link that exists
    // must be a no-op and not a "failed to save your agents" the user cannot act
    // on. ignoreDuplicates and not a merge: the table grants no UPDATE.
    const upsert = calls.find((c) => c.table === 'agent_repositories' && c.method === 'upsert')
    expect(upsert?.args[1]).toEqual({ onConflict: 'agent_id,repo_id', ignoreDuplicates: true })
  })

  it('saveAgents serializes concurrent writes instead of diffing the links twice', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [], error: null },
      agent_repositories: { data: [], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const agent = { id: 'claude-1', name: 'A', repositories: ['/repo'], repositoryIds: ['r1'] } as Agent

    // What a /magic:start does: a burst of writes over a brand-new agent, fired
    // and forgotten by config/agents.ts. Unserialized, both would compute their
    // link diff against the same empty state (the digest is only set once a write
    // completes) and both would create the same row.
    await Promise.all([store.saveAgents([agent]), store.saveAgents([agent])])

    expect(calls.filter((c) => c.table === 'agent_repositories' && c.method === 'upsert')).toHaveLength(1)
  })

  it('saveAgents skips the round-trip when the links did not change', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow('uuid-1', 'claude-1', UID)], error: null },
      agent_repositories: { data: [{ agent_id: 'uuid-1', repo_id: 'r1' }], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const [agent] = await store.loadAgents()
    expect(agent.repositoryIds).toEqual(['r1'])

    const before = calls.filter((c) => c.table === 'agent_repositories').length
    await store.saveAgents([agent])

    // saveAgents runs on every metadata hook; re-reading the links each time
    // would put a query on the hot path for nothing.
    expect(calls.filter((c) => c.table === 'agent_repositories')).toHaveLength(before)
  })

  it('saveAgents never unlinks an agent whose paths simply could not be resolved', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow('uuid-1', 'claude-1', UID)], error: null },
      agent_repositories: { data: [{ agent_id: 'uuid-1', repo_id: 'r1' }], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents()
    // Config failed to load → no path resolves → repositoryIds is empty, but the
    // agent still has paths. Treating that as "detached" would drop it out of
    // its team's view.
    await store.saveAgents([
      { id: 'claude-1', name: 'A', repositories: ['/repo'], repositoryIds: [] } as Agent,
    ])

    expect(calls.filter((c) => c.table === 'agent_repositories' && c.method === 'delete')).toEqual([])
  })

  it('saveAgents stamps the caller as owner on every upserted row', async () => {
    const { client, upserts } = makeClient({
      memberships: membershipsOk,
      agents: { data: [], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.saveAgents([{ id: 'claude-1', name: 'Agent A', repositories: [] } as Agent])

    const rows = upserts.agents[0] as Array<Record<string, unknown>>
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ owner_id: UID, name: 'Agent A' })
    // The org is derived by the backend from agent_repositories; sending one
    // would fight the trigger, and on an upsert it would overwrite the truth.
    expect(rows[0]).not.toHaveProperty('org_id')
  })
})

// ── loadOrgSkillCounts (per-org, DB-aggregated) ─────────────────────────────

describe('loadOrgSkillCounts', () => {
  /** The org the Team page's open tab asks about — deliberately NOT `ORG`. */
  const OTHER_ORG = 'org-2'

  it('asks about the org it was given, not the resolved active one', async () => {
    const { client, calls } = makeClient(
      { memberships: membershipsOk },
      { org_skill_counts: { data: [], error: null } },
    )
    h.state.client = client

    const store = new CloudStore()
    await store.loadOrgSkillCounts(OTHER_ORG)

    // The whole reason the org is a parameter: the Team page has a tab per
    // organization, and answering about the first membership instead would print one
    // org's numbers under another's name.
    expect(calls).toEqual(
      expect.arrayContaining([
        { table: 'rpc:org_skill_counts', method: 'rpc', args: [{ p_org_id: OTHER_ORG }] },
      ]),
    )
  })

  it('keys the counts by skill and coerces a bigint returned as a string', async () => {
    const { client } = makeClient(
      { memberships: membershipsOk },
      {
        org_skill_counts: {
          // `count(*)` is a bigint, which PostgREST may serialise either way.
          data: [
            { skill: 'magic-commit', total: 12, completed: 10, abandoned: 2, median_duration_ms: 45000 },
            { skill: 'magic-pr', total: '4', completed: '3', abandoned: '1', median_duration_ms: '120000' },
          ],
          error: null,
        },
      },
    )
    h.state.client = client

    const store = new CloudStore()
    const counts = await store.loadOrgSkillCounts(ORG)

    expect(counts).toEqual({
      'magic-commit': { total: 12, completed: 10, abandoned: 2, medianDurationMs: 45000 },
      'magic-pr': { total: 4, completed: 3, abandoned: 1, medianDurationMs: 120000 },
    })
  })

  it('keeps a null median null rather than folding it to zero', async () => {
    // No run has finished yet. "Half of them took no time at all" is a different
    // claim from "there is nothing to take a median of", and only one is true.
    const { client } = makeClient(
      { memberships: membershipsOk },
      {
        org_skill_counts: {
          data: [{ skill: 'magic-commit', total: 3, completed: 0, abandoned: 0, median_duration_ms: null }],
          error: null,
        },
      },
    )
    h.state.client = client

    const counts = await new CloudStore().loadOrgSkillCounts(ORG)

    expect(counts['magic-commit'].medianDurationMs).toBeNull()
  })

  it('does not treat every started run as a finished one', async () => {
    // The counter fires BEFORE the skill body runs, so `total` is what was STARTED.
    // Reporting it as completed is the exact over-count this breakdown exists to end.
    const { client } = makeClient(
      { memberships: membershipsOk },
      {
        org_skill_counts: {
          data: [{ skill: 'magic-pr', total: 10, completed: 6, abandoned: 3, median_duration_ms: 1000 }],
          error: null,
        },
      },
    )
    h.state.client = client

    const counts = await new CloudStore().loadOrgSkillCounts(ORG)

    // 10 started, 6 done, 3 given up, 1 still going — the three do not have to sum
    // to the total, and forcing them to would misreport whichever is in flight.
    expect(counts['magic-pr']).toEqual({ total: 10, completed: 6, abandoned: 3, medianDurationMs: 1000 })
  })

  it('leaves a never-run skill absent rather than zero', async () => {
    const { client } = makeClient(
      { memberships: membershipsOk },
      {
        org_skill_counts: {
          data: [{ skill: 'magic-commit', total: 1, completed: 1, abandoned: 0, median_duration_ms: 500 }],
          error: null,
        },
      },
    )
    h.state.client = client

    const store = new CloudStore()
    const counts = await store.loadOrgSkillCounts(ORG)

    // Absence is the RPC's own shape and the renderer's `?? 0` depends on it: a zero
    // written here would claim the row was read back as 0.
    expect('magic-done' in counts).toBe(false)
  })

  it('degrades to no counts when the RPC errors', async () => {
    const { client } = makeClient(
      { memberships: membershipsOk },
      { org_skill_counts: { data: null, error: { message: 'boom' } } },
    )
    h.state.client = client

    const store = new CloudStore()
    // A non-member gets an empty result rather than an error (the RPC is SECURITY
    // INVOKER and RLS filters), so a genuine failure must not be louder: the Team
    // page shows zeros either way instead of breaking.
    expect(await store.loadOrgSkillCounts(ORG)).toEqual({})
  })
})

// ── loadPersonalSkillCounts (own out-of-org runs) ───────────────────────────

describe('loadPersonalSkillCounts', () => {
  it('calls the personal RPC with no argument at all', async () => {
    const { client, calls } = makeClient(
      { memberships: membershipsOk },
      { personal_skill_counts: { data: [], error: null } },
    )
    h.state.client = client

    const store = new CloudStore()
    await store.loadPersonalSkillCounts()

    // No org id anywhere: these are the rows that HAVE none, and RLS restricts them
    // to their author. An org filter here could only ever exclude the right rows.
    expect(calls).toEqual(
      expect.arrayContaining([
        { table: 'rpc:personal_skill_counts', method: 'rpc', args: [undefined] },
      ]),
    )
  })

  it('keys the counts by skill and coerces a bigint returned as a string', async () => {
    const { client } = makeClient(
      { memberships: membershipsOk },
      {
        personal_skill_counts: {
          data: [
            { skill: 'magic-commit', total: 7, completed: 7, abandoned: 0, median_duration_ms: 30000 },
            { skill: 'magic-start', total: '2', completed: '1', abandoned: '1', median_duration_ms: null },
          ],
          error: null,
        },
      },
    )
    h.state.client = client

    const store = new CloudStore()
    expect(await store.loadPersonalSkillCounts()).toEqual({
      'magic-commit': { total: 7, completed: 7, abandoned: 0, medianDurationMs: 30000 },
      'magic-start': { total: 2, completed: 1, abandoned: 1, medianDurationMs: null },
    })
  })

  it('degrades to no counts when the RPC errors', async () => {
    const { client } = makeClient(
      { memberships: membershipsOk },
      { personal_skill_counts: { data: null, error: { message: 'boom' } } },
    )
    h.state.client = client

    const store = new CloudStore()
    expect(await store.loadPersonalSkillCounts()).toEqual({})
  })
})

// ── loadOrgActivity (org-wide, action-filtered) ─────────────────────────────

describe('loadOrgActivity', () => {
  const SINCE = Date.UTC(2026, 3, 1)

  it('reads the whole org — no user_id filter, since it feeds the Team page', async () => {
    const { client, calls, from } = makeClient({
      memberships: membershipsOk,
      activity_events: { data: [], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadOrgActivity(SINCE, 5000)

    expect(from).toHaveBeenCalledWith('activity_events')
    const activityCalls = calls.filter((c) => c.table === 'activity_events')
    expect(activityCalls).toEqual(
      expect.arrayContaining([
        { table: 'activity_events', method: 'eq', args: ['org_id', ORG] },
        { table: 'activity_events', method: 'gte', args: ['occurred_at', new Date(SINCE).toISOString()] },
        { table: 'activity_events', method: 'order', args: ['occurred_at', { ascending: false }] },
        { table: 'activity_events', method: 'limit', args: [5000] },
      ]),
    )
    // The whole point of this reader: team-level metrics need every member's events.
    expect(activityCalls).not.toEqual(
      expect.arrayContaining([
        { table: 'activity_events', method: 'eq', args: ['user_id', UID] },
      ]),
    )
  })

  it('filters to the flow actions, excluding the high-volume noise', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      activity_events: { data: [], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadOrgActivity(SINCE, 5000)

    const inCall = calls.find((c) => c.table === 'activity_events' && c.method === 'in')
    expect(inCall).toBeDefined()
    const [column, actions] = inCall!.args as [string, string[]]
    expect(column).toBe('action')
    expect(actions).toContain('pr_created')
    expect(actions).toContain('merged')
    expect(actions).toContain('review_addressed')
    // `completed` fires every Claude-Code turn and `committed` every commit; letting
    // them through would let the row cap truncate weeks of flow signal.
    expect(actions).not.toContain('completed')
    expect(actions).not.toContain('committed')
  })

  it('maps rows and keeps capped=false below the limit', async () => {
    const rows = [
      {
        id: 'evt-1',
        user_id: UID,
        agent_id: 'uuid-agent-1',
        action: 'pr_created',
        ticket_id: 'PROJ-1',
        repositories: ['/repo/a'],
        occurred_at: '2026-07-24T10:00:00Z',
      },
    ]
    const { client } = makeClient({
      memberships: membershipsOk,
      activity_events: { data: rows, error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const result = await store.loadOrgActivity(SINCE, 5000)

    expect(result.capped).toBe(false)
    expect(result.since).toBe(new Date(SINCE).toISOString())
    expect(result.events).toEqual([
      {
        id: 'evt-1',
        userId: UID,
        agentId: 'uuid-agent-1',
        action: 'pr_created',
        ticketId: 'PROJ-1',
        repositories: ['/repo/a'],
        occurredAt: '2026-07-24T10:00:00Z',
      },
    ])
  })

  it('on a capped read, trims `since` to the oldest row actually returned', async () => {
    // Rows arrive newest-first, so the last one is the oldest trustworthy point.
    // Reporting the requested window instead would let the UI draw confident
    // zeroes for weeks that were simply cut off by the cap.
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `evt-${i}`,
      user_id: UID,
      agent_id: null,
      action: 'merged',
      ticket_id: `PROJ-${i}`,
      repositories: [],
      occurred_at: `2026-07-2${3 - i}T00:00:00Z`,
    }))
    const { client } = makeClient({
      memberships: membershipsOk,
      activity_events: { data: rows, error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const result = await store.loadOrgActivity(SINCE, 3)

    expect(result.capped).toBe(true)
    expect(result.since).toBe('2026-07-21T00:00:00Z')
  })

  it('degrades to no events when there is no auth context', async () => {
    h.state.client = null

    const store = new CloudStore()
    const result = await store.loadOrgActivity(SINCE, 5000)

    expect(result).toEqual({ events: [], capped: false, since: new Date(SINCE).toISOString() })
  })
})

// ── loadOrgUsageStats ───────────────────────────────────────────────────────

describe('loadOrgUsageStats', () => {
  it('selects usage_events scoped by org_id, newest-first, with the 5000 limit', async () => {
    const { client, calls, from } = makeClient({
      memberships: membershipsOk,
      usage_events: { data: [], error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const result = await store.loadOrgUsageStats()

    expect(result).toEqual({ rows: [], capped: false })
    expect(from).toHaveBeenCalledWith('usage_events')
    const usageCalls = calls.filter((c) => c.table === 'usage_events')
    expect(usageCalls).toEqual(
      expect.arrayContaining([
        { table: 'usage_events', method: 'eq', args: ['org_id', ORG] },
        { table: 'usage_events', method: 'order', args: ['occurred_at', { ascending: false }] },
        { table: 'usage_events', method: 'limit', args: [5000] },
      ]),
    )
  })

  it('flags capped=true when the result reaches the 5000-row limit', async () => {
    const minimalRow = {
      user_id: null, agent_id: null, model: null, cost_usd: 0,
      tokens: null, lines_added: 0, lines_removed: 0, duration_ms: 0,
      occurred_at: '2026-07-24T00:00:00Z',
    }
    const { client } = makeClient({
      memberships: membershipsOk,
      usage_events: { data: Array.from({ length: 5000 }, () => minimalRow), error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const result = await store.loadOrgUsageStats()

    expect(result.capped).toBe(true)
    expect(result.rows).toHaveLength(5000)
  })

  it('maps rows back applying toNumber coercion for string/bigint columns', async () => {
    const rows = [
      {
        user_id: UID,
        agent_id: 'uuid-agent-1',
        model: 'Claude Opus',
        cost_usd: '1.23', // PostgREST returns numeric as a string
        tokens: '4096', // bigint as a string
        lines_added: 10,
        lines_removed: 4,
        duration_ms: '5000',
        occurred_at: '2026-07-24T00:00:00Z',
      },
    ]
    const { client } = makeClient({
      memberships: membershipsOk,
      usage_events: { data: rows, error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const { rows: mapped } = await store.loadOrgUsageStats()

    expect(mapped).toHaveLength(1)
    expect(mapped[0]).toEqual({
      userId: UID,
      agentId: 'uuid-agent-1',
      model: 'Claude Opus',
      costUsd: 1.23,
      tokens: 4096,
      linesAdded: 10,
      linesRemoved: 4,
      durationMs: 5000,
      occurredAt: '2026-07-24T00:00:00Z',
    })
    // Coerced string columns are real numbers, not strings.
    expect(typeof mapped[0].costUsd).toBe('number')
    expect(typeof mapped[0].tokens).toBe('number')
    expect(typeof mapped[0].durationMs).toBe('number')
  })

  it('preserves null tokens but coerces null numerics to 0 (toNumber contract)', async () => {
    const rows = [
      {
        user_id: null,
        agent_id: null,
        model: null,
        cost_usd: null, // null numeric → 0
        tokens: null, // null tokens stay null
        lines_added: null, // ?? 0
        lines_removed: null,
        duration_ms: null, // null numeric → 0
        occurred_at: '2026-07-24T00:00:00Z',
      },
      {
        user_id: null,
        agent_id: null,
        model: null,
        cost_usd: 'not-a-number', // non-finite string → 0
        tokens: '10',
        lines_added: 2,
        lines_removed: 1,
        duration_ms: 42,
        occurred_at: '2026-07-24T01:00:00Z',
      },
    ]
    const { client } = makeClient({
      memberships: membershipsOk,
      usage_events: { data: rows, error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    const { rows: mapped } = await store.loadOrgUsageStats()

    expect(mapped[0]).toEqual({
      userId: null,
      agentId: null,
      model: null,
      costUsd: 0,
      tokens: null,
      linesAdded: 0,
      linesRemoved: 0,
      durationMs: 0,
      occurredAt: '2026-07-24T00:00:00Z',
    })
    expect(mapped[1].costUsd).toBe(0) // non-finite string coerced to 0
    expect(mapped[1].tokens).toBe(10)
    expect(mapped[1].durationMs).toBe(42)
  })

  it('returns empty rows when the client is not authed / cloud disabled', async () => {
    const { client, from } = makeClient({ memberships: membershipsOk })
    h.state.client = null

    const store = new CloudStore()
    await expect(store.loadOrgUsageStats()).resolves.toEqual({ rows: [], capped: false })
    expect(from).not.toHaveBeenCalled()
    void client
  })

  it('returns empty rows when the query errors', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      usage_events: { data: null, error: { message: 'select boom' } },
    })
    h.state.client = client

    const store = new CloudStore()
    await expect(store.loadOrgUsageStats()).resolves.toEqual({ rows: [], capped: false })
  })
})

// ── repositories ─────────────────────────────────────────────────────────────

describe('loadConfig repository keys', () => {
  const row = (id: string, name: string, orgId: string | null) => ({
    id, owner_id: UID, org_id: orgId, name,
    keywords: [], color: null, languages: null, commit: null,
    pull_request: null, resolve: null, issues: null, branches: null, worktree_files: null,
  })

  // Names are unique per SCOPE, not globally. With every org visible at once, a
  // plain record[name] = … would drop one repo with no error whatsoever.
  it('suffixes a colliding name with its organization, keeping the real name intact', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      user_settings: { data: null, error: null },
      configs: { data: { data: {} }, error: null },
      organizations: { data: [{ id: 'org-a', name: 'Acme' }, { id: 'org-b', name: 'Globex' }], error: null },
      repositories: { data: [row('r1', 'api', 'org-a'), row('r2', 'api', 'org-b')], error: null },
      repository_paths: { data: [], error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()
    const keys = Object.keys(config!.repositories)

    expect(keys).toHaveLength(2)
    expect(keys).toContain('api')
    expect(keys).toContain('api (Globex)')
    // Whatever the key, `name` stays the row's real name — writes go through it.
    expect(Object.values(config!.repositories).map((r) => r.name)).toEqual(['api', 'api'])
  })

  it('gives the bare key to the personal repo, and orders orgs by name', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      user_settings: { data: null, error: null },
      configs: { data: { data: {} }, error: null },
      organizations: { data: [{ id: 'org-a', name: 'Acme' }], error: null },
      repositories: { data: [row('r1', 'api', 'org-a'), row('r2', 'api', null)], error: null },
      repository_paths: { data: [], error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()

    // Deterministic regardless of what the database returned first, so the key
    // a skill resolved yesterday is the same one today.
    expect(config!.repositories['api'].id).toBe('r2')
    expect(config!.repositories['api (Acme)'].id).toBe('r1')
  })

  it('leaves distinct names alone', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      user_settings: { data: null, error: null },
      configs: { data: { data: {} }, error: null },
      organizations: { data: [{ id: 'org-a', name: 'Acme' }], error: null },
      repositories: { data: [row('r1', 'api', 'org-a'), row('r2', 'web', 'org-a')], error: null },
      repository_paths: { data: [], error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()
    expect(Object.keys(config!.repositories).sort()).toEqual(['api', 'web'])
  })
})

describe('listRepositories', () => {
  it('maps rows, joins the caller path, and keeps every org the user belongs to', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      repositories: {
        data: [
          { id: 'r1', owner_id: UID, org_id: null, name: 'perso', keywords: ['k'], color: '#fff', languages: { commit: 'en' }, commit: {}, pull_request: {}, resolve: {}, issues: {}, branches: {}, worktree_files: [] },
          { id: 'r2', owner_id: 'someone', org_id: ORG, name: 'team', keywords: [], color: null, languages: null, commit: null, pull_request: null, resolve: null, issues: null, branches: null, worktree_files: null },
          { id: 'r3', owner_id: 'someone', org_id: 'other-org', name: 'foreign', keywords: [], color: null, languages: null, commit: null, pull_request: null, resolve: null, issues: null, branches: null, worktree_files: null },
        ],
        error: null,
      },
      repository_paths: { data: [{ repo_id: 'r1', path: '/Users/me/perso' }], error: null },
    })
    h.state.client = client

    const repos = await new CloudStore().listRepositories()

    // Every repo RLS returned is kept: there is no active org to narrow to, and
    // hiding another org's repos would make them unreachable.
    expect(repos.map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    const perso = repos.find((r) => r.id === 'r1')!
    expect(perso.path).toBe('/Users/me/perso')
    expect(perso.orgId).toBeNull()
    const team = repos.find((r) => r.id === 'r2')!
    expect(team.path).toBeNull() // caller has no local binding for the team repo
    expect(team.orgId).toBe(ORG)
  })
})

describe('createRepository', () => {
  it('inserts an identity row owned by the caller and binds the local path', async () => {
    const { client, inserts, upserts } = makeClient({
      memberships: membershipsOk,
      repositories: { data: null, error: null },
      repository_paths: { data: null, error: null },
    })
    h.state.client = client

    const ownerId = await new CloudStore().createRepository({
      id: 'new-1', ownerId: null, orgId: null, name: 'demo',
      keywords: ['demo'], color: '#123', languages: { commit: 'fr' },
      commit: { format: 'angular' }, pullRequest: {}, resolve: {}, issues: {}, branches: {}, worktreeFiles: [],
      path: '/Users/me/demo',
    })

    // Returned so the caller can stamp the owner on its cached repo.
    expect(ownerId).toBe(UID)
    const row = inserts.repositories[0] as Record<string, unknown>
    expect(row.id).toBe('new-1')
    expect(row.owner_id).toBe(UID)      // owner forced to the caller
    expect(row.org_id).toBeNull()       // personal by default
    expect(row.name).toBe('demo')
    expect(row.pull_request).toEqual({}) // camelCase → snake_case column
    // The local path is bound in repository_paths, never on the identity row.
    expect(row).not.toHaveProperty('path')
    const pathRow = upserts.repository_paths[0] as Record<string, unknown>
    expect(pathRow).toMatchObject({ repo_id: 'new-1', user_id: UID, path: '/Users/me/demo' })
  })
})

describe('updateRepository', () => {
  it('updates only the shared identity (snake_cased), scoped by id, never the owner', async () => {
    const { client, updates, calls } = makeClient({
      memberships: membershipsOk,
      repositories: { data: null, error: null },
    })
    h.state.client = client

    await new CloudStore().updateRepository('r2', { name: 'renamed', pullRequest: { autoLinkTickets: true } })

    const row = updates.repositories[0] as Record<string, unknown>
    expect(row).toEqual({ name: 'renamed', pull_request: { autoLinkTickets: true } })
    expect(row).not.toHaveProperty('owner_id')
    expect(calls.some((c) => c.table === 'repositories' && c.method === 'eq' && c.args[0] === 'id' && c.args[1] === 'r2')).toBe(true)
  })

  it('maps orgId → org_id so sharing / making personal updates the scope', async () => {
    const { client, updates } = makeClient({ memberships: membershipsOk, repositories: { data: null, error: null } })
    h.state.client = client

    const store = new CloudStore()
    await store.updateRepository('r2', { orgId: ORG })     // share
    await store.updateRepository('r2', { orgId: null })    // make personal

    expect(updates.repositories[0]).toEqual({ org_id: ORG })
    expect(updates.repositories[1]).toEqual({ org_id: null })
  })
})

describe('setRepositoryPath', () => {
  it('upserts the binding when a path is given', async () => {
    const { client, upserts } = makeClient({ memberships: membershipsOk, repository_paths: { data: null, error: null } })
    h.state.client = client
    await new CloudStore().setRepositoryPath('r1', '/Users/me/x')
    expect(upserts.repository_paths[0]).toMatchObject({ repo_id: 'r1', user_id: UID, path: '/Users/me/x' })
  })

  it('deletes the binding when the path is null/empty (unbind)', async () => {
    const { client, calls } = makeClient({ memberships: membershipsOk, repository_paths: { data: null, error: null } })
    h.state.client = client
    await new CloudStore().setRepositoryPath('r1', null)
    const del = calls.filter((c) => c.table === 'repository_paths')
    expect(del.some((c) => c.method === 'delete')).toBe(true)
    expect(del.some((c) => c.method === 'eq' && c.args[0] === 'repo_id' && c.args[1] === 'r1')).toBe(true)
    expect(del.some((c) => c.method === 'eq' && c.args[0] === 'user_id' && c.args[1] === UID)).toBe(true)
  })
})

describe('loadConfig', () => {
  it('assembles repositories from the tables and never from the blob', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      configs: { data: { data: { launchMode: 'default' } }, error: null },
      repositories: {
        data: [{ id: 'r1', owner_id: UID, org_id: null, name: 'perso', keywords: ['perso'], color: null, languages: null, commit: null, pull_request: null, resolve: null, issues: null, branches: null, worktree_files: null }],
        error: null,
      },
      repository_paths: { data: [{ repo_id: 'r1', path: '/p' }], error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()
    expect(config?.launchMode).toBe('default')
    expect(Object.keys(config!.repositories)).toEqual(['perso'])
    expect(config!.repositories.perso).toMatchObject({ id: 'r1', path: '/p', needsLocalPath: false })
  })

  it('migrates legacy blob repositories into the repositories table, then strips the blob', async () => {
    const { client, inserts, upserts } = makeClient({
      memberships: membershipsOk,
      configs: { data: { data: { launchMode: 'default', repositories: { legacy: { path: '/old', keywords: ['legacy'] } } } }, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
    })
    h.state.client = client

    await new CloudStore().loadConfig()

    // The legacy repo was inserted as a personal row (org_id null, owner = caller).
    const inserted = inserts.repositories[0] as Record<string, unknown>
    expect(inserted).toMatchObject({ owner_id: UID, org_id: null, name: 'legacy' })
    // Its path was bound for the caller.
    expect(upserts.repository_paths[0]).toMatchObject({ user_id: UID, path: '/old' })
    // The blob is re-written WITHOUT repositories.
    const savedBlob = (upserts.configs[0] as { data: Record<string, unknown> }).data
    expect(savedBlob).not.toHaveProperty('repositories')
    expect(savedBlob.launchMode).toBe('default')
  })
})

// ── user settings (per-user, org-independent) ───────────────────────────────

/** A fully-NULL settings row: the user has a row but never chose anything. */
const emptySettingsRow = {
  usage_card_enabled: null,
  usage_card_minimized: null,
  usage_logs_enabled: null,
  daily_digest_enabled: null,
  split_enabled: null,
  split_active: null,
  pr_reviews_enabled: null,
  pr_reviews_poll_interval_ms: null,
  pr_reviews_auto_launch_skills: null,
  spotlight_enabled: null,
  spotlight_shortcut: null,
  auto_start_at_login: null,
  launch_mode: null,
  atlassian_integration_enabled: null,
  theme: null,
  language: null,
  sync_claude_theme: null,
}

describe('user settings', () => {
  it('maps every settings column onto the config, scoped to the current user', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
      user_settings: {
        data: {
          ...emptySettingsRow,
          usage_card_enabled: true,
          usage_card_minimized: true,
          usage_logs_enabled: true,
          daily_digest_enabled: true,
          split_enabled: true,
          split_active: false,
          pr_reviews_enabled: false,
          pr_reviews_poll_interval_ms: 120_000,
          pr_reviews_auto_launch_skills: true,
          spotlight_enabled: false,
          spotlight_shortcut: 'Alt+Shift+M',
          auto_start_at_login: true,
          launch_mode: 'acceptEdits',
          atlassian_integration_enabled: false,
          sync_claude_theme: false,
        },
        error: null,
      },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()

    expect(config).toMatchObject({
      usageCardEnabled: true,
      usageCardMinimized: true,
      usageLogsEnabled: true,
      dailyDigest: { enabled: true },
      splitEnabled: true,
      splitActive: false,
      prReviews: { enabled: false, pollIntervalMs: 120_000, autoLaunchSkills: true },
      spotlight: { enabled: false, shortcut: 'Alt+Shift+M' },
      autoStartAtLogin: true,
      launchMode: 'acceptEdits',
      integrations: { github: true, atlassian: false },
      syncClaudeTheme: false,
    })
    expect(calls.some((c) => c.table === 'user_settings' && c.method === 'eq' && c.args[0] === 'user_id' && c.args[1] === UID)).toBe(true)
  })

  it('leaves keys ABSENT for NULL columns so the app defaults still apply', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
      user_settings: { data: { ...emptySettingsRow }, error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()

    // NULL must not collapse to false: several settings treat absent as a third
    // state (autoStartAtLogin gates touching the macOS login item at all, and a
    // false there would spam a system notification on the next launch).
    expect(config).not.toHaveProperty('usageLogsEnabled')
    expect(config).not.toHaveProperty('autoStartAtLogin')
    expect(config).not.toHaveProperty('launchMode')
    expect(config).not.toHaveProperty('prReviews')
    expect(config).not.toHaveProperty('spotlight')
    expect(config).not.toHaveProperty('dailyDigest')
  })

  it('lets user_settings win over a legacy copy left in the config blob', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      configs: { data: { data: { launchMode: 'default', usageCardEnabled: true } }, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
      user_settings: { data: { ...emptySettingsRow, launch_mode: 'plan' }, error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()
    expect(config?.launchMode).toBe('plan')
    // A column the user never set falls back to whatever the legacy blob held,
    // so nothing is lost in the transition.
    expect(config?.usageCardEnabled).toBe(true)
  })

  it('ignores an invalid enum written by a newer app version', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
      user_settings: { data: { ...emptySettingsRow, launch_mode: 'someFutureMode', spotlight_shortcut: 'Control+Q', theme: 'solarized' }, error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()
    expect(config).not.toHaveProperty('launchMode')
    expect(config).not.toHaveProperty('spotlight')
    // The theme column takes any short slug so new themes need no migration,
    // which makes this the one setting a client is most likely to meet unknown.
    expect(config).not.toHaveProperty('theme')
  })

  it('reads back a theme it knows', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
      user_settings: { data: { ...emptySettingsRow, theme: 'light' }, error: null },
    })
    h.state.client = client

    expect((await new CloudStore().loadConfig())?.theme).toBe('light')
  })

  it('ignores an interface language a newer build invented', async () => {
    // The column takes any two-letter code so a new language needs no migration,
    // which makes this the second setting a client can meet unknown.
    const { client } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
      user_settings: { data: { ...emptySettingsRow, language: 'de' }, error: null },
    })
    h.state.client = client

    expect(await new CloudStore().loadConfig()).not.toHaveProperty('language')
  })

  it('reads back an interface language it knows', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      repositories: { data: [], error: null },
      repository_paths: { data: [], error: null },
      user_settings: { data: { ...emptySettingsRow, language: 'fr' }, error: null },
    })
    h.state.client = client

    expect((await new CloudStore().loadConfig())?.language).toBe('fr')
  })

  it('upserts settings keyed by user_id, mapping absent keys to NULL', async () => {
    const { client, upserts } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      user_settings: { data: null, error: null },
    })
    h.state.client = client

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      version: '1',
      repositories: {},
      dailyDigest: { enabled: true },
      prReviews: { enabled: true, pollIntervalMs: 60_000 },
      spotlight: { enabled: true, shortcut: 'Control+Space' },
    }
    await new CloudStore().saveConfig(config)

    expect(upserts.user_settings[0]).toEqual({
      user_id: UID,
      usage_card_enabled: null,
      usage_card_minimized: null,
      usage_logs_enabled: null,
      daily_digest_enabled: true,
      split_enabled: null,
      split_active: null,
      pr_reviews_enabled: true,
      pr_reviews_poll_interval_ms: 60_000,
      // Absent within a present nested object still maps to NULL.
      pr_reviews_auto_launch_skills: null,
      spotlight_enabled: true,
      spotlight_shortcut: 'Control+Space',
      auto_start_at_login: null,
      launch_mode: null,
      atlassian_integration_enabled: null,
      theme: null,
      language: null,
      sync_claude_theme: null,
    })
  })

  it('persists settings even when the user has no organization', async () => {
    // memberships empty → no org → the config blob cannot be written, but the
    // user-scoped settings must still land. This is the case the old org-scoped
    // blob silently dropped.
    const { client, upserts } = makeClient({
      memberships: { data: [], error: null },
      user_settings: { data: null, error: null },
    })
    h.state.client = client

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await new CloudStore().saveConfig({ version: '1', repositories: {}, launchMode: 'plan' } as any)

    expect(upserts.user_settings?.[0]).toMatchObject({ user_id: UID, launch_mode: 'plan' })
    expect(upserts.configs).toBeUndefined()
  })

  it('loads settings and personal repos when the user has no organization', async () => {
    const { client } = makeClient({
      memberships: { data: [], error: null },
      user_settings: { data: { ...emptySettingsRow, launch_mode: 'plan' }, error: null },
      repositories: {
        data: [{ id: 'r1', owner_id: UID, org_id: null, name: 'perso', keywords: ['perso'], color: null, languages: null, commit: null, pull_request: null, resolve: null, issues: null, branches: null, worktree_files: null }],
        error: null,
      },
      repository_paths: { data: [{ repo_id: 'r1', path: '/p' }], error: null },
    })
    h.state.client = client

    const config = await new CloudStore().loadConfig()
    expect(config?.launchMode).toBe('plan')
    expect(Object.keys(config!.repositories)).toEqual(['perso'])
  })
})

// ── skill invocations (one row per run) ─────────────────────────────────────

describe('recordSkillInvocation', () => {
  it('sends no org for an unmapped app id, so the run is not attributed to a team', async () => {
    const { client, inserts, from } = makeClient({
      memberships: membershipsOk,
      skill_invocations: { error: null },
    })
    h.state.client = client

    await new CloudStore().recordSkillInvocation({
      agentId: 'claude-1',
      skill: 'magic-commit',
      occurredAt: 1000,
    })

    expect(from).toHaveBeenCalledWith('skill_invocations')
    expect(inserts.skill_invocations).toHaveLength(1)
    expect(inserts.skill_invocations[0]).toMatchObject({
      // No agents loaded, so the app id maps to nothing — and with no agent_id the
      // stamp_event_org trigger keeps what arrives, which makes this value the
      // attribution rather than an FK placeholder. The resolved org would be the
      // user's first membership: an arbitrary pick nothing can ever correct, since
      // sync_event_orgs follows an agent and this row has none.
      org_id: null,
      user_id: UID,
      agent_id: null,
      skill: 'magic-commit',
      occurred_at: new Date(1000).toISOString(),
    })
  })

  it('logs a run with no agent at all (session started outside the app) as personal', async () => {
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      skill_invocations: { error: null },
    })
    h.state.client = client

    await new CloudStore().recordSkillInvocation({ skill: 'magic-commit' })

    expect(inserts.skill_invocations).toHaveLength(1)
    expect(inserts.skill_invocations[0]).toMatchObject({
      org_id: null,
      user_id: UID,
      agent_id: null,
      skill: 'magic-commit',
    })
  })

  it('still sends the org alongside a mapped agent, so the composite FK stays checkable', async () => {
    const agentRow = {
      id: 'uuid-agent-1',
      org_id: ORG,
      owner_id: UID,
      name: 'Agent A',
      ticket_id: null,
      description: null,
      branch_name: null,
      base_branch: null,
      status: null,
      repositories: [],
      metadata: { __app: { id: 'claude-1' } },
    }
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow], error: null },
      skill_invocations: { error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents() // populates agentIdMap with claude-1 → uuid-agent-1
    await store.recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })

    // The trigger overwrites this org from the agent's own, so it is not an
    // attribution — it is what keeps (org_id, agent_id) CHECKABLE. A null here would
    // put a NULL in a referencing column, and MATCH SIMPLE skips the check on a NULL,
    // so a stale map entry pointing at a deleted agent would insert a dangling
    // reference instead of being rejected.
    expect(inserts.skill_invocations[0]).toMatchObject({
      org_id: ORG,
      agent_id: 'uuid-agent-1',
      skill: 'magic-commit',
    })
  })

  it('never stores the skill args', async () => {
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      skill_invocations: { error: null },
    })
    h.state.client = client

    await new CloudStore().recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-plan' })

    expect(inserts.skill_invocations[0]).not.toHaveProperty('args')
  })

  it('resolves agent_id via agentIdMap once agents are loaded', async () => {
    const agentRow = {
      id: 'uuid-agent-1',
      org_id: ORG,
      owner_id: UID,
      name: 'Agent A',
      ticket_id: null,
      description: null,
      branch_name: null,
      base_branch: null,
      status: null,
      repositories: [],
      metadata: { __app: { id: 'claude-1' } },
    }
    const { client, inserts } = makeClient({
      memberships: membershipsOk,
      agents: { data: [agentRow], error: null },
      skill_invocations: { error: null },
    })
    h.state.client = client

    const store = new CloudStore()
    await store.loadAgents()
    await store.recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-pr' })

    expect((inserts.skill_invocations[0] as Record<string, unknown>).agent_id).toBe('uuid-agent-1')
  })

  // An event's org is derived from its agent by trigger, so no membership is needed
  // to record one. Requiring an org used to drop every event of a user working on
  // personal repositories alone — including one who belongs to no org at all.
  it('still records without an organization, attributing no org', async () => {
    const { client, inserts } = makeClient({
      memberships: { data: [], error: null },
      skill_invocations: { error: null },
    })
    h.state.client = client

    await new CloudStore().recordSkillInvocation({ agentId: 'claude-1', skill: 'magic-commit' })

    expect(inserts.skill_invocations).toHaveLength(1)
    expect(inserts.skill_invocations[0]).toMatchObject({ org_id: null, user_id: UID, skill: 'magic-commit' })
  })
})

// ── app installations (per-user, per-device version telemetry) ──────────────

describe('recordAppInstallation', () => {
  it('upserts the device row with the running version, on (user_id, device_id)', async () => {
    const { client, upserts, calls } = makeClient({
      memberships: membershipsOk,
      app_installations: { error: null },
    })
    h.state.client = client

    await new CloudStore().recordAppInstallation({
      deviceId: 'abc123',
      deviceName: 'macbook',
      appVersion: '0.52.1',
      platform: 'darwin',
      arch: 'arm64',
    })

    const row = upserts.app_installations[0] as Record<string, unknown>
    expect(row).toMatchObject({
      user_id: UID,
      device_id: 'abc123',
      device_name: 'macbook',
      app_version: '0.52.1',
      platform: 'darwin',
      arch: 'arm64',
    })
    expect(typeof row.last_seen_at).toBe('string')
    // first_seen_at / app_version_updated_at are left to the table's defaults and
    // trigger, so a re-launch never resets them.
    expect(row).not.toHaveProperty('first_seen_at')
    expect(row).not.toHaveProperty('app_version_updated_at')
    const upsert = calls.find((c) => c.table === 'app_installations' && c.method === 'upsert')
    expect(upsert?.args[1]).toEqual({ onConflict: 'user_id,device_id' })
  })

  it('records without requiring an organization', async () => {
    const { client, upserts } = makeClient({
      memberships: { data: [], error: null },
      app_installations: { error: null },
    })
    h.state.client = client

    await new CloudStore().recordAppInstallation({ deviceId: 'abc123', appVersion: '0.52.1' })

    expect(upserts.app_installations?.[0]).toMatchObject({
      user_id: UID,
      device_id: 'abc123',
      app_version: '0.52.1',
      device_name: null,
      platform: null,
      arch: null,
    })
  })
})

describe('profile', () => {
  it('loads and maps the current user profile from the profiles table', async () => {
    const { client, calls } = makeClient({
      memberships: membershipsOk,
      profiles: {
        data: { name: 'Xavier', role: 'dev', technical_level: 'expert', communication_style: 'technical', languages: ['fr'], free_text: 'likes concise answers' },
        error: null,
      },
    })
    h.state.client = client

    const profile = await new CloudStore().loadProfile()
    expect(profile).toEqual({
      name: 'Xavier',
      role: 'dev',
      technical_level: 'expert',
      communication_style: 'technical',
      languages: ['fr'],
      freeText: 'likes concise answers',
    })
    // Scoped to the current user.
    expect(calls.some((c) => c.table === 'profiles' && c.method === 'eq' && c.args[0] === 'user_id' && c.args[1] === UID)).toBe(true)
  })

  it('returns null when required fields are missing', async () => {
    const { client } = makeClient({
      memberships: membershipsOk,
      profiles: { data: { name: 'Xavier', role: null, technical_level: null, communication_style: null, languages: null, free_text: null }, error: null },
    })
    h.state.client = client
    await expect(new CloudStore().loadProfile()).resolves.toBeNull()
  })

  it('upserts the profile keyed by user_id', async () => {
    const { client, upserts } = makeClient({ memberships: membershipsOk, profiles: { data: null, error: null } })
    h.state.client = client

    await new CloudStore().saveProfile({ name: 'Xavier', role: 'dev', technical_level: 'expert', freeText: 'x' })

    expect(upserts.profiles[0]).toMatchObject({
      user_id: UID,
      name: 'Xavier',
      role: 'dev',
      technical_level: 'expert',
      communication_style: null,
      languages: [],
      free_text: 'x',
    })
  })
})

describe('saveConfig', () => {
  it('never stores repositories or settings in the blob but keeps the shared projection', async () => {
    const { client, upserts } = makeClient({
      memberships: membershipsOk,
      configs: { data: null, error: null },
      user_settings: { data: null, error: null },
    })
    h.state.client = client

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      version: '1',
      launchMode: 'default',
      spotlight: { enabled: true, shortcut: 'Alt+M' },
      repositories: { demo: { id: 'r1', path: '/p', keywords: ['kw'], commit: { format: 'angular' } } },
    }
    await new CloudStore().saveConfig(config)

    const savedBlob = (upserts.configs[0] as { data: Record<string, unknown> }).data
    expect(savedBlob).not.toHaveProperty('repositories')
    // Settings now live in user_settings — the blob must not keep a second copy.
    expect(savedBlob).not.toHaveProperty('launchMode')
    expect(savedBlob).not.toHaveProperty('spotlight')
    expect(savedBlob.version).toBe('1')
    // Shared projection derived from the in-memory repos is still mirrored top-level.
    expect(savedBlob.repoKeywords).toEqual({ demo: ['kw'] })
    expect(savedBlob.commit).toEqual({ format: 'angular' })
  })
})
