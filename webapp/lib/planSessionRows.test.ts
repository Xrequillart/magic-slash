import { describe, expect, it } from 'vitest'
import {
  buildPlanCards,
  filterPlanCards,
  groupPlanTickets,
  planAuthor,
  planLabel,
  planRecency,
  planRepoOptions,
  sortPlanSessions,
  toPlanSession,
  toPlanTicket,
  type PlanRepo,
  type PlanSession,
  type PlanSessionRow,
  type PlanTicket,
  type PlanTicketRow,
} from './planSessionRows'

/**
 * Fixture factories, local to this file — same convention as `teamRows.test.ts`.
 * Every field is named here rather than in a shared helper, so a column added to
 * the table shows up as one edit in one place.
 */
function sessionRow(overrides: Partial<PlanSessionRow> = {}): PlanSessionRow {
  return {
    id: 's1',
    owner_id: 'u1',
    repo_id: 'r1',
    org_id: 'org-1',
    agent_id: 'a1',
    slug: 'plans-page',
    spec_key: 'deadbeefcafebabe',
    title: 'Plans page',
    idea: 'A page listing every plan.',
    spec: '# Spec\n',
    status: 'planned',
    spec_synced_at: '2026-08-20T10:00:00Z',
    created_at: '2026-08-20T09:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
    ...overrides,
  }
}

function session(overrides: Partial<PlanSession> = {}): PlanSession {
  return { ...toPlanSession(sessionRow()), ...overrides }
}

function ticketRow(overrides: Partial<PlanTicketRow> = {}): PlanTicketRow {
  return {
    session_id: 's1',
    key: '#1',
    url: 'https://github.com/acme/api/issues/1',
    title: 'Epic',
    kind: 'epic',
    parent_key: null,
    created_at: '2026-08-20T11:00:00Z',
    ...overrides,
  }
}

function ticket(overrides: Partial<PlanTicket> = {}): PlanTicket {
  return { ...toPlanTicket(ticketRow()), ...overrides }
}

const REPOS: PlanRepo[] = [
  { id: 'r1', name: 'magic-slash' },
  { id: 'r2', name: 'aaa-api' },
  { id: 'r3', name: 'side-project' },
]

describe('toPlanSession', () => {
  it('maps every column to its camelCase field', () => {
    expect(toPlanSession(sessionRow())).toEqual({
      id: 's1',
      ownerId: 'u1',
      repoId: 'r1',
      orgId: 'org-1',
      agentId: 'a1',
      slug: 'plans-page',
      specKey: 'deadbeefcafebabe',
      title: 'Plans page',
      idea: 'A page listing every plan.',
      spec: '# Spec\n',
      status: 'planned',
      specSyncedAt: '2026-08-20T10:00:00Z',
      createdAt: '2026-08-20T09:00:00Z',
      updatedAt: '2026-08-20T10:00:00Z',
    })
  })

  it('reads an unknown or missing status as planning', () => {
    expect(toPlanSession(sessionRow({ status: null })).status).toBe('planning')
    expect(toPlanSession(sessionRow({ status: 'abandoned' })).status).toBe('planning')
    expect(toPlanSession(sessionRow({ status: 'planning' })).status).toBe('planning')
  })
})

describe('toPlanTicket', () => {
  it('maps the row and keeps the epic kind', () => {
    expect(toPlanTicket(ticketRow())).toEqual({
      sessionId: 's1',
      key: '#1',
      url: 'https://github.com/acme/api/issues/1',
      title: 'Epic',
      kind: 'epic',
      parentKey: null,
      createdAt: '2026-08-20T11:00:00Z',
    })
  })

  it('reads any other kind as a story, never as an epic', () => {
    // An invented epic would claim a parent for other rows; a leaf claims nothing.
    expect(toPlanTicket(ticketRow({ kind: null })).kind).toBe('story')
    expect(toPlanTicket(ticketRow({ kind: 'task' })).kind).toBe('story')
  })
})

describe('planLabel', () => {
  it('prefers the agreed title, then the slug, then the spec key', () => {
    expect(planLabel(session())).toBe('Plans page')
    expect(planLabel(session({ title: '   ' }))).toBe('plans-page')
    expect(planLabel(session({ title: null, slug: null }))).toBe('deadbeefcafe')
  })
})

describe('planRecency and sortPlanSessions', () => {
  it('dates a session by its update, falling back to its creation', () => {
    expect(planRecency(session({ updatedAt: null }))).toBe(
      new Date('2026-08-20T09:00:00Z').getTime(),
    )
    expect(planRecency(session({ updatedAt: null, createdAt: null }))).toBe(0)
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
    session({ id: 's3', repoId: null }),
  ]

  it('keeps everything when no repository is selected', () => {
    expect(filterPlanCards(cards, null)).toHaveLength(3)
  })

  it('keeps only the sessions planned on the selected repository', () => {
    expect(filterPlanCards(cards, 'r1').map((s) => s.id)).toEqual(['s1'])
    expect(filterPlanCards(cards, 'r2').map((s) => s.id)).toEqual(['s2'])
  })

  it('never matches a session whose repository was deleted', () => {
    // `repo_id` is `on delete set null`, so null is a real state — and it must not
    // be swept into whichever repo happens to be selected.
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
      null,
    )
    expect(planRepoOptions(cards, REPOS).map((r) => r.name)).toEqual(['aaa-api', 'magic-slash'])
  })

  it('ignores sessions whose repository is gone', () => {
    const cards = buildPlanCards([session({ repoId: null })], [], REPOS, {}, null)
    expect(planRepoOptions(cards, REPOS)).toEqual([])
  })
})

describe('planAuthor', () => {
  it('uses the email when the org roster supplies one', () => {
    expect(planAuthor('u1', { u1: 'b.drey@acme.io' })).toBe('b.drey@acme.io')
  })

  it('falls back to a short form of the uuid, never to nothing', () => {
    // `profiles` is own-rows-only, so a teammate's NAME is unreadable; when the
    // email is missing too, a handle beats an empty cell.
    expect(planAuthor('9f8b1c2d-1111-2222-3333-444455556666', {})).toBe('9f8b1c2d')
  })

  it('renders an em dash for a session with no owner', () => {
    expect(planAuthor(null, {})).toBe('—')
  })
})

describe('groupPlanTickets', () => {
  it('nests stories under their epic, in creation order', () => {
    const groups = groupPlanTickets([
      ticket({ key: '#3', kind: 'story', parentKey: '#1', createdAt: '2026-08-20T11:02:00Z' }),
      ticket({ key: '#1', kind: 'epic', createdAt: '2026-08-20T11:00:00Z' }),
      ticket({ key: '#2', kind: 'story', parentKey: '#1', createdAt: '2026-08-20T11:01:00Z' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].epic?.key).toBe('#1')
    expect(groups[0].stories.map((s) => s.key)).toEqual(['#2', '#3'])
  })

  it('keeps two epics apart and never duplicates a story between them', () => {
    const groups = groupPlanTickets([
      ticket({ key: 'E1', kind: 'epic', createdAt: '2026-08-20T11:00:00Z' }),
      ticket({ key: 'E2', kind: 'epic', createdAt: '2026-08-20T11:01:00Z' }),
      ticket({ key: 'S1', kind: 'story', parentKey: 'E2', createdAt: '2026-08-20T11:02:00Z' }),
    ])
    expect(groups.map((g) => g.epic?.key)).toEqual(['E1', 'E2'])
    expect(groups[0].stories).toEqual([])
    expect(groups[1].stories.map((s) => s.key)).toEqual(['S1'])
  })

  it('still renders a story whose parent_key matches no epic', () => {
    // The failure this guards: a partial creation files the stories and loses the
    // epic. Dropping them would under-report the plan on the very page someone
    // opened to find out what was created.
    const groups = groupPlanTickets([
      ticket({ key: 'S1', kind: 'story', parentKey: 'E-GONE', createdAt: '2026-08-20T11:00:00Z' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].epic).toBeNull()
    expect(groups[0].stories.map((s) => s.key)).toEqual(['S1'])
  })

  it('renders a parentless story, which is what a single-story plan is', () => {
    const groups = groupPlanTickets([ticket({ key: '#7', kind: 'story', parentKey: null })])
    expect(groups).toEqual([{ epic: null, stories: [expect.objectContaining({ key: '#7' })] }])
  })

  it('puts the orphans last, after every epic', () => {
    const groups = groupPlanTickets([
      ticket({ key: 'S-ORPHAN', kind: 'story', parentKey: 'E-GONE', createdAt: '2026-08-20T10:00:00Z' }),
      ticket({ key: 'E1', kind: 'epic', createdAt: '2026-08-20T11:00:00Z' }),
      ticket({ key: 'S1', kind: 'story', parentKey: 'E1', createdAt: '2026-08-20T11:01:00Z' }),
    ])
    expect(groups.map((g) => g.epic?.key ?? null)).toEqual(['E1', null])
    expect(groups[1].stories.map((s) => s.key)).toEqual(['S-ORPHAN'])
  })

  it('loses no ticket, whatever the shape of the parent links', () => {
    const tickets = [
      ticket({ key: 'E1', kind: 'epic' }),
      ticket({ key: 'S1', kind: 'story', parentKey: 'E1' }),
      ticket({ key: 'S2', kind: 'story', parentKey: null }),
      ticket({ key: 'S3', kind: 'story', parentKey: 'nope' }),
    ]
    const groups = groupPlanTickets(tickets)
    const rendered = groups.flatMap((g) => [...(g.epic ? [g.epic.key] : []), ...g.stories.map((s) => s.key)])
    expect([...rendered].sort()).toEqual(['E1', 'S1', 'S2', 'S3'])
  })

  it('returns nothing for a session with no tickets yet', () => {
    expect(groupPlanTickets([])).toEqual([])
  })
})

describe('buildPlanCards', () => {
  it('resolves the repository name, the author, the count and the ownership', () => {
    const [card] = buildPlanCards(
      [session({ id: 's1', repoId: 'r1', ownerId: 'u1' })],
      [ticket({ sessionId: 's1', key: '#1' }), ticket({ sessionId: 's1', key: '#2' })],
      REPOS,
      { u1: 'me@acme.io' },
      'u1',
    )
    expect(card.repoName).toBe('magic-slash')
    expect(card.author).toBe('me@acme.io')
    expect(card.ticketCount).toBe(2)
    expect(card.own).toBe(true)
  })

  it('counts only the tickets of its own session', () => {
    const cards = buildPlanCards(
      [session({ id: 's1' }), session({ id: 's2' })],
      [ticket({ sessionId: 's1' }), ticket({ sessionId: 's2' }), ticket({ sessionId: 's2', key: '#9' })],
      REPOS,
      {},
      null,
    )
    expect(cards.find((c) => c.id === 's1')?.ticketCount).toBe(1)
    expect(cards.find((c) => c.id === 's2')?.ticketCount).toBe(2)
  })

  it('keeps a session whose repository is invisible or deleted', () => {
    // RLS decides what a reader sees; a missing repo row means the name is unknown,
    // not that the plan should vanish from their own list.
    const [card] = buildPlanCards([session({ repoId: 'r-unknown' })], [], REPOS, {}, null)
    expect(card.repoName).toBeNull()
    expect(card.ticketCount).toBe(0)
  })

  it("marks a teammate's session as not own", () => {
    const [card] = buildPlanCards([session({ ownerId: 'u2' })], [], REPOS, {}, 'u1')
    expect(card.own).toBe(false)
  })

  it('returns the cards newest first', () => {
    const cards = buildPlanCards(
      [
        session({ id: 'old', updatedAt: '2026-08-01T00:00:00Z' }),
        session({ id: 'new', updatedAt: '2026-08-20T00:00:00Z' }),
      ],
      [],
      REPOS,
      {},
      null,
    )
    expect(cards.map((c) => c.id)).toEqual(['new', 'old'])
  })
})
