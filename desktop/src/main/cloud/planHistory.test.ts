import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The plan history's cloud half: the read that merges two tables into one answer, and the
 * pair of texts a diff is made of.
 *
 * What is recorded, and who may read it, is the triggers' and RLS's to prove —
 * `supabase/tests/plan_revisions.test.sql` and `plan_links.test.sql` — so nothing here
 * asserts an authorization rule. The client is a fake: each `from(table)` chain resolves to
 * that table's configured answer.
 */
const h = vi.hoisted(() => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: null as any,
}))
vi.mock('./auth', () => ({ getAuthedClient: vi.fn(async () => h.client) }))
vi.mock('./org', () => ({ listOrgsRead: vi.fn(async () => ({ orgs: [{ id: 'org-1' }], ok: true })) }))
const authors = vi.hoisted(() => ({ fetch: vi.fn() }))
vi.mock('./plans', () => ({ fetchAuthors: (...args: unknown[]) => authors.fetch(...args) }))

import { alignHistory, listPlanHistory, readRevisionTexts, type PlanLinkEventRow, type PlanRevisionRow } from './planHistory'

type Result = { data?: unknown; error?: unknown }

function makeClient(tables: Record<string, Result>) {
  const calls: { table: string; method: string; args: unknown[] }[] = []
  function builder(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {}
    for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
      b[method] = (...args: unknown[]) => { calls.push({ table, method, args }); return b }
    }
    b.then = (resolve: (v: Result) => unknown) => Promise.resolve(tables[table] ?? { data: [], error: null }).then(resolve)
    return b
  }
  return { client: { from: (table: string) => builder(table) }, calls }
}

beforeEach(() => {
  h.client = null
  authors.fetch.mockReset().mockResolvedValue({ emailByOwner: { u1: 'u1@example.com' }, avatarByOwner: {} })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('listPlanHistory', () => {
  const revision = { id: 'r1', author_id: 'u1', source: 'agent', agent_name: 'Planner', created_at: '2026-09-23T10:00:00Z', updated_at: '2026-09-23T10:05:00Z' }
  const event = { id: 'e1', link_id: 'l1', action: 'removed', url: 'https://www.figma.com/design/x', kind: 'figma', title: null, actor_id: null, created_at: '2026-09-23T11:00:00Z' }

  const statusEvent = { id: 's1', from_status: 'planned', to_status: 'done', source: 'human', actor_id: 'u1', created_at: '2026-09-23T12:00:00Z' }

  it('maps the three tables, and resolves the people in them', async () => {
    h.client = makeClient({
      plan_revisions: { data: [revision], error: null },
      plan_link_events: { data: [event], error: null },
      plan_status_events: { data: [statusEvent], error: null },
    }).client
    const read = await listPlanHistory('s1')
    expect(read).toMatchObject({ failed: false, truncated: false, emailByAuthor: { u1: 'u1@example.com' } })
    expect(read.revisions).toEqual([{ id: 'r1', authorId: 'u1', source: 'agent', agentName: 'Planner', createdAt: revision.created_at, updatedAt: revision.updated_at }])
    // A removed link keeps its address and kind; a deleted account leaves no actor.
    expect(read.linkEvents).toEqual([{ id: 'e1', linkId: 'l1', action: 'removed', url: event.url, kind: 'figma', title: undefined, actorId: undefined, createdAt: event.created_at }])
    expect(read.statusEvents).toEqual([{ id: 's1', from: 'planned', to: 'done', source: 'human', actorId: 'u1', createdAt: statusEvent.created_at }])
    expect([...authors.fetch.mock.calls[0][1] as Set<string>]).toEqual(['u1'])
  })

  it('fails as a whole when the status events are refused', async () => {
    h.client = makeClient({
      plan_revisions: { data: [revision], error: null },
      plan_link_events: { data: [event], error: null },
      plan_status_events: { data: null, error: { message: 'no' } },
    }).client
    expect(await listPlanHistory('s1')).toMatchObject({ failed: true, statusEvents: [] })
  })

  it('never asks for the revisions\' text', async () => {
    const { client, calls } = makeClient({ plan_revisions: { data: [], error: null }, plan_link_events: { data: [], error: null } })
    h.client = client
    await listPlanHistory('s1')
    const select = calls.find((c) => c.table === 'plan_revisions' && c.method === 'select')
    expect(select?.args[0]).not.toContain('content')
  })

  it('fails as a whole when either half is refused', async () => {
    h.client = makeClient({ plan_revisions: { data: [revision], error: null }, plan_link_events: { data: null, error: { message: 'no' } } }).client
    expect(await listPlanHistory('s1')).toMatchObject({ failed: true, revisions: [], linkEvents: [] })
  })

  it('says it is truncated when a probe row arrives, and drops it', async () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({ ...revision, id: `r${i}` }))
    h.client = makeClient({ plan_revisions: { data: rows, error: null }, plan_link_events: { data: [], error: null } }).client
    const read = await listPlanHistory('s1')
    expect(read.truncated).toBe(true)
    expect(read.olderRevisions).toBe(true)
    expect(read.revisions).toHaveLength(200)
  })
})

describe('readRevisionTexts', () => {
  it('answers older first, whatever order the caller named them in', async () => {
    h.client = makeClient({
      plan_revisions: {
        data: [
          { id: 'new', session_id: 's1', content: 'v2', updated_at: '2026-09-23T11:00:00.000001+00:00' },
          { id: 'old', session_id: 's1', content: 'v1', updated_at: '2026-09-23T10:00:00.000001+00:00' },
        ],
        error: null,
      },
    }).client
    expect(await readRevisionTexts('new', 'old')).toEqual({ older: 'v1', newer: 'v2' })
  })

  it('compares the first revision against an empty document when it created the plan', async () => {
    h.client = makeClient({
      plan_revisions: { data: [{ id: 'r1', session_id: 's1', content: 'v1', base_content: null, updated_at: 'x' }], error: null },
    }).client
    expect(await readRevisionTexts(null, 'r1')).toEqual({ older: '', newer: 'v1' })
  })

  it('compares the first revision against the text the plan held before its history began', async () => {
    h.client = makeClient({
      plan_revisions: { data: [{ id: 'r1', session_id: 's1', content: 'v0 and five words', base_content: 'v0', updated_at: 'x' }], error: null },
    }).client
    expect(await readRevisionTexts(null, 'r1')).toEqual({ older: 'v0', newer: 'v0 and five words' })
  })

  it('refuses two revisions of two different plans, or one it cannot see', async () => {
    h.client = makeClient({
      plan_revisions: {
        data: [
          { id: 'a', session_id: 's1', content: 'v1', updated_at: '2026-09-23T10:00:00Z' },
          { id: 'b', session_id: 's2', content: 'v2', updated_at: '2026-09-23T11:00:00Z' },
        ],
        error: null,
      },
    }).client
    expect(await readRevisionTexts('a', 'b')).toBeNull()
    h.client = makeClient({ plan_revisions: { data: [{ id: 'a', session_id: 's1', content: 'v1', updated_at: 'x' }], error: null } }).client
    expect(await readRevisionTexts('a', 'b')).toBeNull()
  })
})

describe('alignHistory', () => {
  const at = (minute: number) => new Date(Date.UTC(2026, 8, 23, 0, minute)).toISOString()
  const rev = (minute: number) => ({ id: `r${minute}`, author_id: 'u1', source: 'human', agent_name: null, created_at: at(minute), updated_at: at(minute) }) as PlanRevisionRow
  const evt = (minute: number) => ({ id: `e${minute}`, link_id: 'l', action: 'added', url: 'https://x.dev', kind: 'other', title: null, actor_id: 'u1', created_at: at(minute) }) as PlanLinkEventRow

  it('keeps both lists whole when neither was cut', () => {
    const out = alignHistory([rev(3), rev(1)], [evt(2), evt(0)])
    expect(out.revisionRows).toHaveLength(2)
    expect(out.eventRows).toHaveLength(2)
    expect(out.truncated).toBe(false)
  })

  it('drops revisions older than the oldest event a cut event list still covers', () => {
    // 201 events from minute 1000 down: the kept 200 reach back to minute 801 only.
    const events = Array.from({ length: 201 }, (_, i) => evt(1000 - i))
    const out = alignHistory([rev(900), rev(500)], events)
    expect(out.revisionRows.map((row) => row.id)).toEqual(['r900'])
    expect(out.eventRows).toHaveLength(200)
    expect(out.truncated).toBe(true)
  })
})
