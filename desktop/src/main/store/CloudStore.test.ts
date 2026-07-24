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
  const updates: Record<string, unknown[]> = {}
  const upserts: Record<string, unknown[]> = {}

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
  return { client: { from }, calls, inserts, updates, upserts, from }
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

// ── repositories ─────────────────────────────────────────────────────────────

describe('listRepositories', () => {
  it('maps rows, joins the caller path, and scopes team repos to the active org', async () => {
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

    // r3 (a different org's team repo) is filtered out; r1 personal + r2 active-org team remain.
    expect(repos.map((r) => r.id)).toEqual(['r1', 'r2'])
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

    await new CloudStore().createRepository({
      id: 'new-1', ownerId: null, orgId: null, name: 'demo',
      keywords: ['demo'], color: '#123', languages: { commit: 'fr' },
      commit: { format: 'angular' }, pullRequest: {}, resolve: {}, issues: {}, branches: {}, worktreeFiles: [],
      path: '/Users/me/demo',
    })

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

describe('saveConfig', () => {
  it('never stores repositories in the blob but keeps the shared projection', async () => {
    const { client, upserts } = makeClient({ memberships: membershipsOk, configs: { data: null, error: null } })
    h.state.client = client

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      version: '1',
      launchMode: 'default',
      repositories: { demo: { id: 'r1', path: '/p', keywords: ['kw'], commit: { format: 'angular' } } },
    }
    await new CloudStore().saveConfig(config)

    const savedBlob = (upserts.configs[0] as { data: Record<string, unknown> }).data
    expect(savedBlob).not.toHaveProperty('repositories')
    expect(savedBlob.launchMode).toBe('default')
    // Shared projection derived from the in-memory repos is still mirrored top-level.
    expect(savedBlob.repoKeywords).toEqual({ demo: ['kw'] })
    expect(savedBlob.commit).toEqual({ format: 'angular' })
  })
})
