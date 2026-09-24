import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `updatePlanSpec`'s reading of what PostgREST answered — the one place the editor's four
 * outcomes are told apart.
 *
 * The client is a hand-rolled fake of the two query chains the function builds (the
 * filtered UPDATE, and the re-read after it matched nothing), because the real one lives
 * in `@supabase/supabase-js`, which the root `node_modules` this suite runs on does not
 * hold. What the fake records is the point: the patch, and the `updated_at` the filter
 * was given — which must be the caller's string, untouched.
 */
const h = vi.hoisted(() => ({
  client: null as unknown,
}))
vi.mock('./auth', () => ({ getAuthedClient: vi.fn(async () => h.client) }))
vi.mock('./org', () => ({ listMembers: vi.fn(), listOrgsRead: vi.fn() }))
vi.mock('../store/Store', () => ({ getStore: vi.fn() }))

import { addPlanCollaborator, listPlanDetail, removePlanCollaborator, updatePlanEditPolicy, updatePlanSpec } from './plans'

interface Answer { data: unknown; error: { code?: string; message?: string } | null }

/** One fake client: the UPDATE answers `update`, the re-read answers `reread`. */
function fakeClient(update: Answer, reread: Answer = { data: null, error: null }) {
  const calls = { patch: undefined as unknown, filters: [] as [string, unknown][] }
  const client = {
    from: () => ({
      update: (patch: unknown) => {
        calls.patch = patch
        const chain = {
          eq: (column: string, value: unknown) => {
            calls.filters.push([column, value])
            return chain
          },
          select: async () => update,
        }
        return chain
      },
      select: () => ({
        eq: () => ({ maybeSingle: async () => reread }),
      }),
    }),
  }
  return { client, calls }
}

const ID = '11111111-1111-4111-8111-111111111111'
const EXPECTED = '2026-09-22T10:00:00.123456+00:00'
const input = { id: ID, spec: 'the spec', expectedUpdatedAt: EXPECTED }

beforeEach(() => {
  h.client = null
})

describe('updatePlanSpec', () => {
  it('answers saved with the new updated_at, as the raw string', async () => {
    const fake = fakeClient({ data: [{ id: ID, updated_at: '2026-09-22T10:05:00.654321+00:00' }], error: null })
    h.client = fake.client
    expect(await updatePlanSpec(input)).toEqual({ status: 'saved', updatedAt: '2026-09-22T10:05:00.654321+00:00' })
    // The conflict guard reached the query byte for byte — microseconds included.
    expect(fake.calls.filters).toEqual([['id', ID], ['updated_at', EXPECTED]])
  })

  it('sends the spec alone by default: no idea when absent, never a sync stamp unasked', async () => {
    const fake = fakeClient({ data: [{ id: ID, updated_at: EXPECTED }], error: null })
    h.client = fake.client
    await updatePlanSpec(input)
    expect(fake.calls.patch).toEqual({ spec: 'the spec' })
  })

  it('carries idea and spec_synced_at when the caller gives them', async () => {
    const fake = fakeClient({ data: [{ id: ID, updated_at: EXPECTED }], error: null })
    h.client = fake.client
    await updatePlanSpec({ ...input, idea: 'An idea', syncedAt: '2026-09-22T10:05:00.000Z' })
    expect(fake.calls.patch).toEqual({ spec: 'the spec', idea: 'An idea', spec_synced_at: '2026-09-22T10:05:00.000Z' })
  })

  it('answers conflict when nothing matched and the row is still visible', async () => {
    h.client = fakeClient({ data: [], error: null }, { data: { id: ID, owner_id: 'x', spec_key: 'k' }, error: null }).client
    expect(await updatePlanSpec(input)).toEqual({ status: 'conflict' })
  })

  it('answers denied when nothing matched and the row is not visible', async () => {
    h.client = fakeClient({ data: [], error: null }, { data: null, error: null }).client
    expect(await updatePlanSpec(input)).toEqual({ status: 'denied' })
  })

  it('answers failed when nothing matched and the re-read errored', async () => {
    h.client = fakeClient({ data: [], error: null }, { data: null, error: { message: 'down' } }).client
    expect(await updatePlanSpec(input)).toEqual({ status: 'failed' })
  })

  it('answers denied on a 42501 — the WITH CHECK, or the guard trigger', async () => {
    h.client = fakeClient({ data: null, error: { code: '42501', message: 'denied' } }).client
    expect(await updatePlanSpec(input)).toEqual({ status: 'denied' })
  })

  it('answers failed on any other error', async () => {
    h.client = fakeClient({ data: null, error: { code: '08006', message: 'connection' } }).client
    expect(await updatePlanSpec(input)).toEqual({ status: 'failed' })
  })

  it('answers failed with no client to write with', async () => {
    h.client = null
    expect(await updatePlanSpec(input)).toEqual({ status: 'failed' })
  })
})

/**
 * Who may edit a plan (#305): the policy write and the two invitation writes. Each fake
 * answers the one chain the function builds; what is pinned is how a refusal reads.
 */
describe('updatePlanEditPolicy', () => {
  it('answers saved with the new updated_at, sending the policy alone', async () => {
    const fake = fakeClient({ data: [{ updated_at: EXPECTED }], error: null })
    h.client = fake.client
    expect(await updatePlanEditPolicy(ID, 'admins')).toEqual({ status: 'saved', updatedAt: EXPECTED })
    expect(fake.calls.patch).toEqual({ edit_policy: 'admins' })
  })

  it('answers denied on a 42501 (the guard trigger) and on no row', async () => {
    h.client = fakeClient({ data: null, error: { code: '42501' } }).client
    expect(await updatePlanEditPolicy(ID, 'org')).toEqual({ status: 'denied' })
    h.client = fakeClient({ data: [], error: null }).client
    expect(await updatePlanEditPolicy(ID, 'org')).toEqual({ status: 'denied' })
  })
})

function collaboratorClient(answer: Answer) {
  const calls = { inserted: undefined as unknown, filters: [] as [string, unknown][] }
  const chain = {
    eq: (column: string, value: unknown) => {
      calls.filters.push([column, value])
      return chain
    },
    select: async () => answer,
  }
  const client = {
    from: () => ({
      insert: async (row: unknown) => {
        calls.inserted = row
        return answer
      },
      delete: () => chain,
    }),
  }
  return { client, calls }
}

describe('addPlanCollaborator', () => {
  it('inserts the pair and leaves the inviter to the database', async () => {
    const fake = collaboratorClient({ data: null, error: null })
    h.client = fake.client
    expect(await addPlanCollaborator(ID, 'user-b')).toEqual({ status: 'saved' })
    expect(fake.calls.inserted).toEqual({ session_id: ID, user_id: 'user-b' })
  })

  it('reads an invitation already there as saved', async () => {
    h.client = collaboratorClient({ data: null, error: { code: '23505' } }).client
    expect(await addPlanCollaborator(ID, 'user-b')).toEqual({ status: 'saved' })
  })

  it('answers denied on a 42501, failed on anything else', async () => {
    h.client = collaboratorClient({ data: null, error: { code: '42501' } }).client
    expect(await addPlanCollaborator(ID, 'user-b')).toEqual({ status: 'denied' })
    h.client = collaboratorClient({ data: null, error: { code: '08006' } }).client
    expect(await addPlanCollaborator(ID, 'user-b')).toEqual({ status: 'failed' })
  })
})

describe('removePlanCollaborator', () => {
  it('answers saved when a row was removed, filtered on the pair', async () => {
    const fake = collaboratorClient({ data: [{ user_id: 'user-b' }], error: null })
    h.client = fake.client
    expect(await removePlanCollaborator(ID, 'user-b')).toEqual({ status: 'saved' })
    expect(fake.calls.filters).toEqual([['session_id', ID], ['user_id', 'user-b']])
  })

  it('answers denied when the policy filtered every row out', async () => {
    h.client = collaboratorClient({ data: [], error: null }).client
    expect(await removePlanCollaborator(ID, 'user-b')).toEqual({ status: 'denied' })
  })
})

/**
 * The detail read's three queries, each table answering its own `Answer`: the session's
 * chain ends in `maybeSingle`, the tickets' and the collaborators' in an awaited `order`.
 */
function detailClient(answers: Record<'plan_sessions' | 'plan_tickets' | 'plan_collaborators', Answer>) {
  return {
    from: (table: keyof typeof answers) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => answers[table],
          order: async () => answers[table],
        }),
      }),
    }),
  }
}

describe('listPlanDetail', () => {
  const none: Answer = { data: null, error: null }
  const empty: Answer = { data: [], error: null }

  it('lists the invited user ids, and an empty list as empty', async () => {
    h.client = detailClient({ plan_sessions: none, plan_tickets: empty, plan_collaborators: { data: [{ user_id: 'user-b' }], error: null } })
    expect((await listPlanDetail(ID)).collaborators).toEqual(['user-b'])
    h.client = detailClient({ plan_sessions: none, plan_tickets: empty, plan_collaborators: empty })
    expect((await listPlanDetail(ID)).collaborators).toEqual([])
  })

  it('answers null collaborators on a failed read, without failing the page', async () => {
    h.client = detailClient({ plan_sessions: none, plan_tickets: empty, plan_collaborators: { data: null, error: { message: 'down' } } })
    const detail = await listPlanDetail(ID)
    expect(detail.collaborators).toBeNull()
    expect(detail.failed).toBe(false)
  })
})
