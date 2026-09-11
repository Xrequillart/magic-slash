import { describe, expect, it } from 'vitest'
import type { PlanRepoRef, PlanSession } from '../../types'
import {
  buildPlanCards,
  filterPlanCards,
  planAuthor,
  planLabel,
  planRecency,
  planRepoOptions,
  sortPlanSessions,
  toStatus,
} from './planRows'

/**
 * Ported from `webapp/lib/planSessionRows.test.ts`, alongside the module it covers, and
 * kept in step with it: the point of the two copies is that they behave identically, so
 * the assertions have to be the same assertions.
 *
 * What is absent here is what the desktop does not do — there is no row → camelCase
 * mapping on this side (`main/cloud/plans.ts` owns that), and no ticket hierarchy (the
 * detail view is not part of this page). The fixture therefore starts from a
 * `PlanSession` rather than from a database row.
 */
function session(overrides: Partial<PlanSession> = {}): PlanSession {
  return {
    id: 's1',
    ownerId: 'u1',
    repoId: 'r1',
    orgId: 'org-1',
    agentId: 'a1',
    slug: 'plans-page',
    specKey: 'deadbeefcafebabe',
    title: 'Plans page',
    idea: 'A page listing every plan.',
    status: 'planned',
    specSyncedAt: '2026-08-20T10:00:00Z',
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z',
    ...overrides,
  }
}

const REPOS: PlanRepoRef[] = [
  { id: 'r1', name: 'magic-slash' },
  { id: 'r2', name: 'aaa-api' },
  { id: 'r3', name: 'side-project' },
]

describe('toStatus', () => {
  it('keeps the two words the app writes', () => {
    expect(toStatus('planned')).toBe('planned')
    expect(toStatus('planning')).toBe('planning')
  })

  it('reads an unknown or missing status as planning', () => {
    // The column declines a CHECK, so a newer build can store a word this one has
    // never heard of. "Not confirmed yet" is the honest reading of it.
    expect(toStatus(undefined)).toBe('planning')
    expect(toStatus('abandoned')).toBe('planning')
  })
})

describe('planLabel', () => {
  it('prefers the agreed title, then the slug, then the spec key', () => {
    expect(planLabel(session())).toBe('Plans page')
    expect(planLabel(session({ title: '   ' }))).toBe('plans-page')
    expect(planLabel(session({ title: undefined, slug: '' }))).toBe('deadbeefcafe')
  })
})

describe('planRecency and sortPlanSessions', () => {
  it('dates a session by its update, falling back to its creation', () => {
    expect(planRecency(session({ updatedAt: undefined }))).toBe(
      new Date('2026-08-20T09:00:00Z').getTime(),
    )
    expect(planRecency(session({ updatedAt: undefined, createdAt: undefined }))).toBe(0)
    // A stored value no Date can parse must not poison the comparator.
    expect(planRecency(session({ updatedAt: 'not-a-date' }))).toBe(
      new Date('2026-08-20T09:00:00Z').getTime(),
    )
  })

  it('puts the most recent session first', () => {
    const ordered = sortPlanSessions([
      session({ id: 'old', updatedAt: '2026-08-01T00:00:00Z' }),
      session({ id: 'new', updatedAt: '2026-08-20T00:00:00Z' }),
      session({ id: 'mid', updatedAt: '2026-08-10T00:00:00Z' }),
    ])
    expect(ordered.map((s) => s.id)).toEqual(['new', 'mid', 'old'])
  })

  it('breaks ties on id so the order is stable across refetches', () => {
    const same = '2026-08-20T00:00:00Z'
    const first = sortPlanSessions([
      session({ id: 'b', updatedAt: same }),
      session({ id: 'a', updatedAt: same }),
    ])
    const second = sortPlanSessions([
      session({ id: 'a', updatedAt: same }),
      session({ id: 'b', updatedAt: same }),
    ])
    expect(first.map((s) => s.id)).toEqual(['a', 'b'])
    expect(second.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the array it was given', () => {
    const input = [session({ id: 'a', updatedAt: '2026-08-01T00:00:00Z' }), session({ id: 'b' })]
    sortPlanSessions(input)
    expect(input.map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('filterPlanCards', () => {
  const cards = [
    session({ id: 's1', repoId: 'r1' }),
    session({ id: 's2', repoId: 'r2' }),
    session({ id: 's3', repoId: undefined }),
  ]

  it('keeps everything when no repository is selected', () => {
    expect(filterPlanCards(cards, null)).toHaveLength(3)
  })

  it('keeps only the sessions planned on the selected repository', () => {
    expect(filterPlanCards(cards, 'r1').map((s) => s.id)).toEqual(['s1'])
    expect(filterPlanCards(cards, 'r2').map((s) => s.id)).toEqual(['s2'])
  })

  it('never matches a session whose repository was deleted', () => {
    // `repo_id` is `on delete set null`, so an absent repository is a real state — and
    // it must not be swept into whichever repo happens to be selected.
    expect(filterPlanCards(cards, 'r3')).toEqual([])
  })
})

describe('planRepoOptions', () => {
  it('offers only the repositories that have a session, alphabetically', () => {
    const cards = buildPlanCards(
      [session({ id: 's1', repoId: 'r1' }), session({ id: 's2', repoId: 'r2' })],
      [],
      REPOS,
      {},
      {},
    )
    expect(planRepoOptions(cards, REPOS).map((r) => r.name)).toEqual(['aaa-api', 'magic-slash'])
  })

  it('ignores sessions whose repository is gone', () => {
    const cards = buildPlanCards([session({ repoId: undefined })], [], REPOS, {}, {})
    expect(planRepoOptions(cards, REPOS)).toEqual([])
  })
})

describe('planAuthor', () => {
  it('uses the email when the org roster supplies one', () => {
    expect(planAuthor('u1', { u1: 'b.drey@acme.io' })).toBe('b.drey@acme.io')
  })

  it('falls back to a short form of the uuid, never to nothing', () => {
    // `profiles` is own-rows-only, so a teammate's NAME is unreadable; when the email
    // is missing too, a handle beats an empty cell.
    expect(planAuthor('9f8b1c2d-1111-2222-3333-444455556666', {})).toBe('9f8b1c2d')
  })
})

describe('buildPlanCards', () => {
  it('resolves the repository name, the author, their photo and the count', () => {
    const [card] = buildPlanCards(
      [session({ id: 's1', repoId: 'r1', ownerId: 'u1' })],
      ['s1', 's1'],
      REPOS,
      { u1: 'me@acme.io' },
      { u1: 'data:image/webp;base64,AAA' },
    )
    expect(card.repoName).toBe('magic-slash')
    expect(card.author).toBe('me@acme.io')
    expect(card.avatarUrl).toBe('data:image/webp;base64,AAA')
    expect(card.ticketCount).toBe(2)
  })

  it('leaves the photo undefined for an owner who has none', () => {
    // The main process ships only the photos that exist, and only for the owners on
    // screen; every other owner falls through to the row's generic icon.
    const [card] = buildPlanCards([session({ ownerId: 'u2' })], [], REPOS, { u2: 'them@acme.io' }, {})
    expect(card.avatarUrl).toBeUndefined()
    expect(card.author).toBe('them@acme.io')
  })

  it('narrows a status the list cannot draw down to one it can', () => {
    const [card] = buildPlanCards([session({ status: 'whatever' })], [], REPOS, {}, {})
    expect(card.status).toBe('planning')
  })

  it('counts only the tickets of its own session', () => {
    const cards = buildPlanCards(
      [session({ id: 's1' }), session({ id: 's2' })],
      ['s1', 's2', 's2'],
      REPOS,
      {},
      {},
    )
    expect(cards.find((c) => c.id === 's1')?.ticketCount).toBe(1)
    expect(cards.find((c) => c.id === 's2')?.ticketCount).toBe(2)
  })

  it('keeps a session whose repository is invisible or deleted', () => {
    // RLS decides what a reader sees; a missing repo row means the name is unknown, not
    // that the plan should vanish from their own list.
    const [card] = buildPlanCards([session({ repoId: 'r-unknown' })], [], REPOS, {}, {})
    expect(card.repoName).toBeUndefined()
    expect(card.ticketCount).toBe(0)
  })

  it('returns the rows newest first', () => {
    const cards = buildPlanCards(
      [
        session({ id: 'old', updatedAt: '2026-08-01T00:00:00Z' }),
        session({ id: 'new', updatedAt: '2026-08-20T00:00:00Z' }),
      ],
      [],
      REPOS,
      {},
      {},
    )
    expect(cards.map((c) => c.id)).toEqual(['new', 'old'])
  })
})
