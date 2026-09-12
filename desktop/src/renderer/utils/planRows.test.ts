import { describe, expect, it } from 'vitest'
import type { PlanRepoRef, PlanSession, PlanTicketRead } from '../../types'
import {
  buildPlanCards,
  filterPlanCards,
  groupPlanTickets,
  planAuthor,
  planLabel,
  planRecency,
  planRepoOptions,
  safeTicketUrl,
  sortPlanSessions,
  toStatus,
} from './planRows'

/**
 * Ported from `webapp/lib/planSessionRows.test.ts`, alongside the module it covers, and
 * kept in step with it: the point of the two copies is that they behave identically, so
 * the assertions have to be the same assertions.
 *
 * What is absent here is what the desktop does not do — there is no row → camelCase
 * mapping on this side, and no `kind` narrowing either: `main/cloud/plans.ts` owns both,
 * which is why the ticket fixtures below start from a `PlanTicketRead` rather than from
 * a database row, exactly as the session fixture starts from a `PlanSession`.
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
    // The column is `not null default false`, and the mapper never invents it: every
    // session answers this, including the ones whose spec simply has not arrived.
    specOversize: false,
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
  it('dates a session by its creation, falling back to its update', () => {
    // Creation wins while it is there, even though the fixture was updated an hour later.
    expect(planRecency(session())).toBe(new Date('2026-08-20T09:00:00Z').getTime())
    expect(planRecency(session({ createdAt: undefined }))).toBe(
      new Date('2026-08-20T10:00:00Z').getTime(),
    )
    expect(planRecency(session({ updatedAt: undefined, createdAt: undefined }))).toBe(0)
    // A stored value no Date can parse must not poison the comparator.
    expect(planRecency(session({ createdAt: 'not-a-date' }))).toBe(
      new Date('2026-08-20T10:00:00Z').getTime(),
    )
  })

  it('puts the most recently created session first', () => {
    const ordered = sortPlanSessions([
      session({ id: 'old', createdAt: '2026-08-01T00:00:00Z' }),
      session({ id: 'new', createdAt: '2026-08-20T00:00:00Z' }),
      session({ id: 'mid', createdAt: '2026-08-10T00:00:00Z' }),
    ])
    expect(ordered.map((s) => s.id)).toEqual(['new', 'mid', 'old'])
  })

  it('ignores when a session was last touched', () => {
    // The whole point of the creation-first order: a plan edited this morning does not
    // jump the queue over one started after it.
    const ordered = sortPlanSessions([
      session({ id: 'started-first', createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-30T00:00:00Z' }),
      session({ id: 'started-second', createdAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-10T00:00:00Z' }),
    ])
    expect(ordered.map((s) => s.id)).toEqual(['started-second', 'started-first'])
  })

  it('breaks ties on id so the order is stable across refetches', () => {
    const same = '2026-08-20T00:00:00Z'
    const first = sortPlanSessions([
      session({ id: 'b', createdAt: same }),
      session({ id: 'a', createdAt: same }),
    ])
    const second = sortPlanSessions([
      session({ id: 'a', createdAt: same }),
      session({ id: 'b', createdAt: same }),
    ])
    expect(first.map((s) => s.id)).toEqual(['a', 'b'])
    expect(second.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('does not mutate the array it was given', () => {
    const input = [session({ id: 'a', createdAt: '2026-08-01T00:00:00Z' }), session({ id: 'b' })]
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

/**
 * The ticket fixtures: a tracker stamps a whole batch to the same second, so `createdAt`
 * is deliberately equal on the stories that test the tiebreak.
 */
function ticket(overrides: Partial<PlanTicketRead> & { key: string }): PlanTicketRead {
  return {
    sessionId: 's1',
    kind: 'story',
    url: 'https://github.com/acme/api/issues/2',
    createdAt: '2026-08-20T09:00:00Z',
    ...overrides,
  }
}

describe('safeTicketUrl', () => {
  it('lets http and https through unchanged', () => {
    expect(safeTicketUrl('https://acme.atlassian.net/browse/PROJ-12'))
      .toBe('https://acme.atlassian.net/browse/PROJ-12')
    expect(safeTicketUrl('http://localhost:3000/issues/4')).toBe('http://localhost:3000/issues/4')
  })

  it('refuses every other scheme', () => {
    // The rows are written by another process, on another version, into a table every
    // member of the organization can read — and a click here runs inside the renderer,
    // not in a sandboxed browser tab.
    expect(safeTicketUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeTicketUrl('file:///etc/passwd')).toBeUndefined()
    expect(safeTicketUrl('data:text/html,<script>')).toBeUndefined()
  })

  it('refuses what is not a URL at all, and passes an absent one through', () => {
    expect(safeTicketUrl('PROJ-12')).toBeUndefined()
    expect(safeTicketUrl('')).toBeUndefined()
    expect(safeTicketUrl(undefined)).toBeUndefined()
  })
})

describe('groupPlanTickets', () => {
  it('files each story under the epic its parentKey names', () => {
    const groups = groupPlanTickets([
      ticket({ key: '#2', parentKey: '#1' }),
      ticket({ key: '#1', kind: 'epic' }),
      ticket({ key: '#3', parentKey: '#1' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.epic?.key).toBe('#1')
    expect(groups[0]?.stories.map((t) => t.key)).toEqual(['#2', '#3'])
  })

  it('orders by creation time, and breaks ties on the key', () => {
    // A tracker files a batch of stories in the same second, so the timestamp alone
    // cannot separate them and an unstable sort would deal them differently on every
    // render of the same plan.
    const groups = groupPlanTickets([
      ticket({ key: '#9', parentKey: '#1' }),
      ticket({ key: '#1', kind: 'epic', createdAt: '2026-08-20T08:00:00Z' }),
      ticket({ key: '#4', parentKey: '#1' }),
      ticket({ key: '#7', parentKey: '#1', createdAt: '2026-08-20T08:30:00Z' }),
    ])
    expect(groups[0]?.stories.map((t) => t.key)).toEqual(['#7', '#4', '#9'])
  })

  it('keeps the stories whose epic is not among the tickets, in a trailing group', () => {
    // A partial creation — the epic call failed, the stories succeeded — is exactly the
    // failure someone opens this page to investigate. Dropping those rows would show
    // the plan as having fewer tickets than it has.
    const groups = groupPlanTickets([
      ticket({ key: '#1', kind: 'epic' }),
      ticket({ key: '#2', parentKey: '#1' }),
      ticket({ key: '#5', parentKey: '#99' }),
      ticket({ key: '#6' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups[1]?.epic).toBeUndefined()
    expect(groups[1]?.stories.map((t) => t.key)).toEqual(['#5', '#6'])
  })

  it('adds no empty trailing group when every story has its epic', () => {
    const groups = groupPlanTickets([
      ticket({ key: '#1', kind: 'epic' }),
      ticket({ key: '#2', parentKey: '#1' }),
    ])
    expect(groups).toHaveLength(1)
  })

  it('files a story under ITS epic when a session has two', () => {
    // `parentKey` is compared to each epic's own key, so a story never lands under both.
    const groups = groupPlanTickets([
      ticket({ key: '#1', kind: 'epic', createdAt: '2026-08-20T08:00:00Z' }),
      ticket({ key: '#2', kind: 'epic', createdAt: '2026-08-20T08:10:00Z' }),
      ticket({ key: '#3', parentKey: '#2' }),
    ])
    expect(groups.map((g) => g.stories.map((t) => t.key))).toEqual([[], ['#3']])
  })

  it('has nothing to group when a plan filed no ticket', () => {
    expect(groupPlanTickets([])).toEqual([])
  })

  it('leaves its input alone', () => {
    const tickets = [ticket({ key: '#2', parentKey: '#1' }), ticket({ key: '#1', kind: 'epic' })]
    groupPlanTickets(tickets)
    expect(tickets.map((t) => t.key)).toEqual(['#2', '#1'])
  })
})
