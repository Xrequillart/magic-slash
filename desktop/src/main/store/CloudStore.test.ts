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

function makeClient(resultsByTable: Record<string, QueryResult>) {
  const calls: RecordedCall[] = []
  const inserts: Record<string, unknown[]> = {}

  function builder(table: string) {
    const result = resultsByTable[table] ?? { data: [], error: null }
    const record = (method: string, args: unknown[]) => calls.push({ table, method, args })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: (...args: unknown[]) => { record('select', args); return b },
      eq: (...args: unknown[]) => { record('eq', args); return b },
      order: (...args: unknown[]) => { record('order', args); return b },
      limit: (...args: unknown[]) => { record('limit', args); return b },
      maybeSingle: (...args: unknown[]) => { record('maybeSingle', args); return b },
      insert: (payload: unknown) => {
        record('insert', [payload])
        ;(inserts[table] ??= []).push(payload)
        return b
      },
      then: (resolve: (v: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    }
    return b
  }

  const from = vi.fn((table: string) => builder(table))
  return { client: { from }, calls, inserts, from }
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
  it('inserts a usage_events row scoped to org/user with mapped fields and null tokens', async () => {
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
      org_id: ORG,
      user_id: UID,
      agent_id: null, // no agents loaded → unmapped app id resolves to null
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
    h.state.client = null // getAuthedClient() → null → context() bails

    const store = new CloudStore()
    await expect(store.appendUsage({ agentId: 'claude-1' })).resolves.toBeUndefined()
    expect(from).not.toHaveBeenCalled()
    void client
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
