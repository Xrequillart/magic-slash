import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoisted above the import of the module under test: `getGitHubToken()` spawns
// `gh auth token` through execFileSync, which must never run in the suite.
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execFileSync } from 'child_process'
import { clearGitHubTokenCache } from './github'
import {
  CLOSED_WINDOW_DAYS,
  fetchIssueDetail,
  fetchIssueStates,
  fetchOpenIssues,
  buildIssueStatesQuery,
  ISSUE_DETAIL_QUERY,
  ISSUE_STATES_LIMIT,
  OPEN_ISSUES_QUERY,
  recentlyClosed,
} from './github-issues'
import { isPRStatusError } from '../types'
import type { PRStatusError, TaskIssue } from '../types'

const mockExec = execFileSync as unknown as ReturnType<typeof vi.fn>
const mockFetch = vi.fn()

/** A minimal Response stand-in: only what the module actually reads. */
function graphQLResponse(
  body: unknown,
  { status = 200, headers = {} as Record<string, string> } = {},
): unknown {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
  }
}

type IssuesResult = { issues: TaskIssue[]; totalOpen: number } | PRStatusError

function payload(nodes: unknown[], totalCount?: number, closed: unknown[] = []) {
  const issues = totalCount === undefined ? { nodes } : { totalCount, nodes }
  return {
    data: { rateLimit: { remaining: 4987 }, repository: { issues, closed: { nodes: closed } } },
  }
}

/** Generic over the success type: both reads in this file answer `T | PRStatusError`. */
function okOf<T extends object>(result: T | PRStatusError): T {
  if (isPRStatusError(result)) throw new Error(`expected a result, got ${JSON.stringify(result)}`)
  return result
}

function issuesOf(result: IssuesResult): TaskIssue[] {
  return okOf(result).issues
}

function errorOf<T extends object>(result: T | PRStatusError): PRStatusError {
  if (!isPRStatusError(result)) throw new Error(`expected an error, got ${JSON.stringify(result)}`)
  return result
}

describe('recentlyClosed', () => {
  const NOW = Date.parse('2026-09-11T12:00:00Z')

  /** `days` ago, as the ISO string GitHub would have sent. */
  function closedDaysAgo(days: number): TaskIssue {
    return {
      number: 1,
      title: 'A closed issue',
      url: 'https://github.com/acme/api/issues/1',
      createdAt: '2026-01-01T10:00:00Z',
      closedAt: new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString(),
      labels: [],
    }
  }

  it('keeps what closed inside the window', () => {
    expect(recentlyClosed([closedDaysAgo(0), closedDaysAgo(CLOSED_WINDOW_DAYS - 1)], NOW)).toHaveLength(2)
  })

  it('drops what closed before it', () => {
    // The whole reason the window exists: a repository with nine hundred closed issues
    // would otherwise fill the Done column with 2021.
    expect(recentlyClosed([closedDaysAgo(CLOSED_WINDOW_DAYS + 1), closedDaysAgo(400)], NOW)).toEqual([])
  })

  it('drops an issue GitHub gave no closing date for', () => {
    // It really is closed — it arrived on the `closed` connection — but the board
    // would have to place it on a date it does not have.
    const { closedAt: _closedAt, ...undated } = closedDaysAgo(1)
    expect(recentlyClosed([undated], NOW)).toEqual([])
  })

  it('drops a closing date it cannot read', () => {
    expect(recentlyClosed([{ ...closedDaysAgo(1), closedAt: 'not a date' }], NOW)).toEqual([])
  })
})

describe('fetchOpenIssues', () => {
  beforeEach(() => {
    mockExec.mockReset()
    mockExec.mockReturnValue('gho_testtoken\n')
    clearGitHubTokenCache()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearGitHubTokenCache()
  })

  it('asks for the open issues, most recently opened first', () => {
    // The page lists a backlog from the top: the sort field is what decides which
    // fifty come back, so both halves of it are asserted. CREATED_AT, not
    // UPDATED_AT — a comment on an old ticket must not reshuffle the page.
    expect(OPEN_ISSUES_QUERY).toContain('states: OPEN')
    expect(OPEN_ISSUES_QUERY).toContain('orderBy: {field: CREATED_AT, direction: DESC}')
    expect(OPEN_ISSUES_QUERY).toContain('createdAt')
    expect(OPEN_ISSUES_QUERY).toContain('rateLimit { remaining }')
  })

  it('asks for the recently closed ones in the same round trip', () => {
    // The board's Done column. One query and not a second call: same repository, same
    // token, same rate-limit budget. UPDATED_AT is the ordering here — GitHub cannot
    // order by `closedAt`, and closing an issue updates it — which is exactly why the
    // open half above pins CREATED_AT rather than the query as a whole banning
    // UPDATED_AT.
    expect(OPEN_ISSUES_QUERY).toContain('closed: issues(states: CLOSED')
    expect(OPEN_ISSUES_QUERY).toContain('orderBy: {field: UPDATED_AT, direction: DESC}')
    expect(OPEN_ISSUES_QUERY).toContain('closedAt')
  })

  it('returns the open issues and the recently closed ones as one list', async () => {
    const justClosed = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    mockFetch.mockResolvedValue(graphQLResponse(payload(
      [{ number: 1, url: 'https://github.com/acme/api/issues/1', createdAt: '2026-08-20T10:00:00Z' }],
      1,
      [{ number: 2, url: 'https://github.com/acme/api/issues/2', createdAt: '2026-08-01T10:00:00Z', closedAt: justClosed }],
    )))

    const result = okOf(await fetchOpenIssues('acme', 'api'))
    // One array, with `closedAt` telling the two halves apart: the board places a card
    // by asking what column it is in, and two arrays would mean every consumer
    // downstream learning to look in both.
    expect(result.issues.map((i) => i.number)).toEqual([1, 2])
    expect(result.issues[0].closedAt).toBeUndefined()
    expect(result.issues[1].closedAt).toBe(justClosed)
  })

  it('counts only the open half as the total, closed tail or not', async () => {
    const justClosed = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    mockFetch.mockResolvedValue(graphQLResponse(payload(
      [{ number: 1, url: 'https://github.com/acme/api/issues/1', createdAt: '2026-08-20T10:00:00Z' }],
      214,
      [{ number: 2, url: 'https://github.com/acme/api/issues/2', createdAt: '2026-08-01T10:00:00Z', closedAt: justClosed }],
    )))

    // `totalOpen` is what the header's "showing N of M" reads, and a Done column is
    // not backlog.
    expect(okOf(await fetchOpenIssues('acme', 'api')).totalOpen).toBe(214)
  })

  it('asks how many issues are open in total, not just for the page', () => {
    // `first: 50` is a cap. Without totalCount the page can only report the cap,
    // which reads as "50 open" on a repository with two hundred.
    expect(OPEN_ISSUES_QUERY).toContain('totalCount')
  })

  it('carries the total past the page cap', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      { number: 1, url: 'https://github.com/acme/api/issues/1', createdAt: '2026-08-20T10:00:00Z' },
      { number: 2, url: 'https://github.com/acme/api/issues/2', createdAt: '2026-08-19T10:00:00Z' },
    ], 214)))

    const result = okOf(await fetchOpenIssues('acme', 'api'))
    expect(result.issues).toHaveLength(2)
    expect(result.totalOpen).toBe(214)
  })

  it('falls back to what it could read when no total came back', async () => {
    // A missing totalCount must not turn a page of issues into "showing 2 of 0".
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      { number: 1, url: 'https://github.com/acme/api/issues/1', createdAt: '2026-08-20T10:00:00Z' },
      { number: 2, url: 'https://github.com/acme/api/issues/2', createdAt: '2026-08-19T10:00:00Z' },
    ])))

    expect(okOf(await fetchOpenIssues('acme', 'api')).totalOpen).toBe(2)
  })

  it('maps a page of issues, labels included', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 176,
        title: 'feat(skills): /magic:doctor',
        url: 'https://github.com/acme/api/issues/176',
        createdAt: '2026-08-20T10:00:00Z',
        labels: { nodes: [{ name: 'enhancement' }, { name: 'skills' }] },
      },
      {
        number: 161,
        title: 'fix(desktop): repo-level settings',
        url: 'https://github.com/acme/api/issues/161',
        createdAt: '2026-08-19T10:00:00Z',
        labels: { nodes: [] },
      },
    ])))

    expect(issuesOf(await fetchOpenIssues('acme', 'api'))).toEqual([
      {
        number: 176,
        title: 'feat(skills): /magic:doctor',
        url: 'https://github.com/acme/api/issues/176',
        createdAt: '2026-08-20T10:00:00Z',
        labels: ['enhancement', 'skills'],
      },
      {
        number: 161,
        title: 'fix(desktop): repo-level settings',
        url: 'https://github.com/acme/api/issues/161',
        createdAt: '2026-08-19T10:00:00Z',
        labels: [],
      },
    ])
  })

  it('asks who opened each issue', () => {
    // A login and nothing else: the renderer's CSP is `default-src 'self'` with no
    // `img-src`, so an `avatarUrl` in this selection could only be fetched and blocked.
    expect(OPEN_ISSUES_QUERY).toContain('author { login }')
    expect(OPEN_ISSUES_QUERY).not.toContain('avatarUrl')
  })

  it('maps the login that opened the issue', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 176,
        title: 'feat(skills): /magic:doctor',
        url: 'https://github.com/acme/api/issues/176',
        createdAt: '2026-08-20T10:00:00Z',
        author: { login: 'xrequillart' },
      },
    ])))

    expect(issuesOf(await fetchOpenIssues('acme', 'api'))[0].author).toBe('xrequillart')
  })

  it('leaves out the author of an issue opened by a deleted account', async () => {
    // GitHub renders those as "ghost" and returns `author: null`. A row must not
    // end up with an `@undefined` on it.
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 176,
        title: 'feat(skills): /magic:doctor',
        url: 'https://github.com/acme/api/issues/176',
        createdAt: '2026-08-20T10:00:00Z',
        author: null,
      },
    ])))

    expect(issuesOf(await fetchOpenIssues('acme', 'api'))[0]).not.toHaveProperty('author')
  })

  it('asks for the parent and the sub-issue summary in the same read', () => {
    // GitHub's native hierarchy rides along in this query. If it ever leaves the
    // selection, the rows silently lose their badges — no error, just less.
    expect(OPEN_ISSUES_QUERY).toContain('parent { number title url }')
    expect(OPEN_ISSUES_QUERY).toContain('subIssuesSummary { total completed }')
  })

  it('maps the parent of a sub-issue', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 233,
        title: 'feat(desktop): tasks page',
        url: 'https://github.com/acme/api/issues/233',
        createdAt: '2026-08-20T10:00:00Z',
        parent: {
          number: 232,
          title: 'epic: the backlog surface',
          url: 'https://github.com/acme/api/issues/232',
        },
        subIssuesSummary: { total: 0, completed: 0 },
      },
    ])))

    const [issue] = issuesOf(await fetchOpenIssues('acme', 'api'))
    expect(issue.parent).toEqual({
      number: 232,
      title: 'epic: the backlog surface',
      url: 'https://github.com/acme/api/issues/232',
    })
  })

  it('keeps a parent GitHub reported without a url, minus the link', async () => {
    // The number is the only field a parent cannot do without: the issue page then
    // names it instead of linking to it, which beats dropping the hierarchy.
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 233,
        title: 'feat(desktop): tasks page',
        url: 'https://github.com/acme/api/issues/233',
        createdAt: '2026-08-20T10:00:00Z',
        parent: { number: 232, title: 'epic: the backlog surface', url: null },
      },
    ])))

    const [issue] = issuesOf(await fetchOpenIssues('acme', 'api'))
    expect(issue.parent).toEqual({ number: 232, title: 'epic: the backlog surface' })
  })

  it('leaves out the parent of a top-level issue', async () => {
    // `parent: null` is what the API returns for the overwhelming majority of
    // issues, and it must not become a badge with nothing in it.
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 176,
        title: 'feat(skills): /magic:doctor',
        url: 'https://github.com/acme/api/issues/176',
        createdAt: '2026-08-20T10:00:00Z',
        parent: null,
      },
    ])))

    expect(issuesOf(await fetchOpenIssues('acme', 'api'))[0]).not.toHaveProperty('parent')
  })

  it('does not call an issue with no children a parent', async () => {
    // Every leaf issue answers `{ total: 0, completed: 0 }`. Storing that would put
    // "0 sub-issues · 0 done" on nearly every row on the page.
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 176,
        title: 'feat(skills): /magic:doctor',
        url: 'https://github.com/acme/api/issues/176',
        createdAt: '2026-08-20T10:00:00Z',
        subIssuesSummary: { total: 0, completed: 0, percentCompleted: 0 },
      },
    ])))

    expect(issuesOf(await fetchOpenIssues('acme', 'api'))[0]).not.toHaveProperty('subIssues')
  })

  it('maps the progress of an issue that has sub-issues', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 232,
        title: 'epic: the backlog surface',
        url: 'https://github.com/acme/api/issues/232',
        createdAt: '2026-08-20T10:00:00Z',
        subIssuesSummary: { total: 2, completed: 1, percentCompleted: 50 },
      },
    ])))

    const [issue] = issuesOf(await fetchOpenIssues('acme', 'api'))
    expect(issue.subIssues).toEqual({ total: 2, completed: 1 })
  })

  it('never leaves the machine without a token', async () => {
    // Not a 401 waiting to happen: GraphQL has no anonymous access, so the request
    // could only fail — and the message has to name `gh auth login`, not a status code.
    mockExec.mockImplementation(() => { throw new Error('gh: command not found') })
    clearGitHubTokenCache()

    const error = errorOf(await fetchOpenIssues('acme', 'api'))
    expect(error.error).toBe('no-token')
    expect(error.message).toContain('gh auth login')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('reads an errors[] arriving with HTTP 200', async () => {
    // The commonest failure of all — logged in, but the token cannot see the repo —
    // is a 200 with NOT_FOUND in the body. Mapping HTTP alone left it as an empty card.
    mockFetch.mockResolvedValue(graphQLResponse({
      data: { repository: null },
      errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to a Repository' }],
    }))

    expect(errorOf(await fetchOpenIssues('acme', 'ghost'))).toEqual({
      error: 'not-found',
      message: 'Could not resolve to a Repository',
    })
  })

  it('reports a 404 as not-found', async () => {
    mockFetch.mockResolvedValue(graphQLResponse({ message: 'Not Found' }, { status: 404 }))

    expect(errorOf(await fetchOpenIssues('acme', 'api'))).toEqual({
      error: 'not-found',
      message: 'Not Found',
    })
  })

  it('carries the retry deadline of a rate-limited response', async () => {
    // Retry-After is what tells the page when asking again is worth anything; an
    // error without it is a wall with no clock on it.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-25T12:00:00Z'))
    mockFetch.mockResolvedValue(graphQLResponse(
      { message: 'API rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': '60' } },
    ))

    const error = errorOf(await fetchOpenIssues('acme', 'api'))
    expect(error.error).toBe('rate-limited')
    expect(error.retryAtMs).toBe(Date.parse('2026-08-25T12:01:00Z'))
    vi.useRealTimers()
  })

  it('reports an unreachable GitHub rather than throwing at the caller', async () => {
    mockFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))

    const error = errorOf(await fetchOpenIssues('acme', 'api'))
    expect(error.error).toBe('network')
    expect(error.message).toContain('ENOTFOUND')
  })
})

function detailPayload(issue: unknown) {
  return { data: { rateLimit: { remaining: 4987 }, repository: { issue } } }
}

describe('fetchIssueDetail', () => {
  beforeEach(() => {
    mockExec.mockReset()
    mockExec.mockReturnValue('gho_testtoken\n')
    clearGitHubTokenCache()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearGitHubTokenCache()
  })

  it('asks only for what the list read deliberately left behind', () => {
    // The split is the whole point: anything asked for here AND in OPEN_ISSUES_QUERY
    // would be paid for fifty times per repository per reload to be shown once.
    expect(ISSUE_DETAIL_QUERY).toContain('issue(number:$number)')
    expect(ISSUE_DETAIL_QUERY).toContain('body')
    expect(ISSUE_DETAIL_QUERY).toContain('state')
    // The bodies AND the count: the panel renders the thread and says how big it is.
    expect(ISSUE_DETAIL_QUERY).toContain('comments(last: 50)')
    expect(ISSUE_DETAIL_QUERY).toContain('totalCount')
    expect(ISSUE_DETAIL_QUERY).toContain('lastEditedAt')
    // `last:` and not `first:` — a long discussion is read for where it got to.
    expect(ISSUE_DETAIL_QUERY).not.toContain('comments(first:')
    expect(OPEN_ISSUES_QUERY).not.toContain('comments')
    expect(OPEN_ISSUES_QUERY).not.toContain('body')
    // Logins and nothing else, for the same CSP reason as the list's author field.
    expect(ISSUE_DETAIL_QUERY).toContain('assignees(first: 10){ nodes { login } }')
    expect(ISSUE_DETAIL_QUERY).not.toContain('avatarUrl')
  })

  it('asks for one issue by number', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({ state: 'OPEN', body: '' })))

    await fetchIssueDetail('acme', 'api', 234)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.variables).toEqual({ owner: 'acme', repo: 'api', number: 234 })
  })

  it('maps the whole of an issue', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({
      state: 'OPEN',
      body: '## Goal\n\nA right-hand detail panel.',
      assignees: { nodes: [{ login: 'xrequillart' }, { login: 'ghost' }] },
      comments: {
        totalCount: 3,
        nodes: [
          { id: 'IC_1', createdAt: '2026-08-01T09:00:00Z', lastEditedAt: null, body: 'First', author: { login: 'ada' } },
          { id: 'IC_2', createdAt: '2026-08-02T09:00:00Z', lastEditedAt: '2026-08-02T10:00:00Z', body: 'Second', author: { login: 'grace' } },
          { id: 'IC_3', createdAt: '2026-08-03T09:00:00Z', lastEditedAt: null, body: 'Third', author: null },
        ],
      },
    })))

    expect(okOf(await fetchIssueDetail('acme', 'api', 234))).toEqual({
      state: 'OPEN',
      body: '## Goal\n\nA right-hand detail panel.',
      assignees: ['xrequillart', 'ghost'],
      commentCount: 3,
      comments: [
        { id: 'IC_1', author: 'ada', createdAt: '2026-08-01T09:00:00Z', body: 'First' },
        // `lastEditedAt` becomes `updatedAt` only where GitHub reported one.
        { id: 'IC_2', author: 'grace', createdAt: '2026-08-02T09:00:00Z', updatedAt: '2026-08-02T10:00:00Z', body: 'Second' },
        // A since-deleted account: `''`, which the panel treats as "omit the byline".
        { id: 'IC_3', author: '', createdAt: '2026-08-03T09:00:00Z', body: 'Third' },
      ],
    })
  })

  it('reports how many comments the issue HAS, not how many arrived', async () => {
    // `last: 50` is a cap: a hundred-comment issue sends fifty, and a panel that
    // said "50 comments" over them would present a page as the whole conversation.
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({
      state: 'OPEN',
      body: '',
      comments: {
        totalCount: 100,
        nodes: [{ id: 'IC_1', createdAt: '', lastEditedAt: null, body: 'x', author: { login: 'ada' } }],
      },
    })))

    const result = okOf(await fetchIssueDetail('acme', 'api', 234))
    expect(result.commentCount).toBe(100)
    expect(result.comments).toHaveLength(1)
  })

  it('never reports fewer comments than it is about to render', async () => {
    // A missing `totalCount` must not make a thread that IS on screen read as "0
    // comments" — the same floor `fetchOpenIssues` puts under its own count.
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({
      state: 'OPEN',
      body: '',
      comments: {
        nodes: [{ id: 'IC_1', createdAt: '', lastEditedAt: null, body: 'x', author: { login: 'ada' } }],
      },
    })))

    expect(okOf(await fetchIssueDetail('acme', 'api', 234)).commentCount).toBe(1)
  })

  it('drops a comment with no id and keeps the rest of the thread', async () => {
    // The id is the only field a comment cannot be drawn without — it is the React
    // key. Everything else degrades rather than costing the reader a turn of the
    // conversation that really happened.
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({
      state: 'OPEN',
      body: '',
      comments: {
        totalCount: 2,
        nodes: [
          null,
          { id: null, createdAt: '', lastEditedAt: null, body: 'orphan', author: null },
          { id: 'IC_2', createdAt: null, lastEditedAt: null, body: null, author: { login: null } },
        ],
      },
    })))

    expect(okOf(await fetchIssueDetail('acme', 'api', 234)).comments).toEqual([
      { id: 'IC_2', author: '', createdAt: '', body: '' },
    ])
  })

  it('reports an issue closed since the list was read', async () => {
    // The list query filters on OPEN; this one runs later and by number, so the
    // panel must be able to say the issue is no longer open.
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({ state: 'CLOSED', body: 'done' })))

    expect(okOf(await fetchIssueDetail('acme', 'api', 234)).state).toBe('CLOSED')
  })

  it('reads anything that is not CLOSED as open', async () => {
    // A null state, or an enum member GitHub adds later, must not invent a third
    // state in a panel that was opened from a list of open issues.
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({ state: null, body: '' })))

    expect(okOf(await fetchIssueDetail('acme', 'api', 234)).state).toBe('OPEN')
  })

  it('turns every hole into an empty value rather than undefined', async () => {
    // An issue with no body, nobody assigned and no comments is the common case,
    // and the panel renders "no body" copy — not a blank where a string should be.
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload({ state: 'OPEN' })))

    expect(okOf(await fetchIssueDetail('acme', 'api', 234))).toEqual({
      state: 'OPEN',
      body: '',
      assignees: [],
      commentCount: 0,
      comments: [],
    })
  })

  it('reports an issue number that does not exist as not-found', async () => {
    // HTTP 200 with `issue: null` — GitHub's answer for a number nobody opened.
    mockFetch.mockResolvedValue(graphQLResponse(detailPayload(null)))

    const error = errorOf(await fetchIssueDetail('acme', 'api', 99999))
    expect(error.error).toBe('not-found')
    expect(error.message).toContain('#99999')
  })

  it('shares the list read’s error ladder', async () => {
    // Same NOT_FOUND-at-HTTP-200 shape, same mapping: the two reads have one ladder
    // precisely so a private repository cannot fail differently in the two places.
    mockFetch.mockResolvedValue(graphQLResponse({
      data: { repository: null },
      errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible' }],
    }))

    expect(errorOf(await fetchIssueDetail('acme', 'api', 234)).error).toBe('forbidden')
  })

  it('never leaves the machine without a token', async () => {
    mockExec.mockImplementation(() => { throw new Error('gh: command not found') })
    clearGitHubTokenCache()

    expect(errorOf(await fetchIssueDetail('acme', 'api', 234)).error).toBe('no-token')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('reports an unreachable GitHub rather than throwing at the caller', async () => {
    mockFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'))

    expect(errorOf(await fetchIssueDetail('acme', 'api', 234)).error).toBe('network')
  })
})


describe('buildIssueStatesQuery', () => {
  it('asks one aliased issue per number, and nothing but the state', () => {
    const query = buildIssueStatesQuery([412, 7])
    expect(query).toContain('i412: issue(number: 412) { number state }')
    expect(query).toContain('i7: issue(number: 7) { number state }')
    // Not a detail read: a body or a label set here would be paid for on every ticket
    // of every plan that is opened.
    expect(query).not.toContain('body')
    expect(query).not.toContain('comments')
  })

  it('asks one by one rather than filtering a connection', () => {
    // The whole reason for the aliases. `states: OPEN` would answer by OMISSION, and a
    // number missing from the result would mean closed, deleted, or past the page size
    // — three different things the caller could not tell apart.
    expect(buildIssueStatesQuery([1])).not.toContain('states:')
  })

  it('stops at the cap rather than growing the document without bound', () => {
    const numbers = Array.from({ length: ISSUE_STATES_LIMIT + 10 }, (_, i) => i + 1)
    const query = buildIssueStatesQuery(numbers)
    expect(query).toContain(`i${ISSUE_STATES_LIMIT}:`)
    expect(query).not.toContain(`i${ISSUE_STATES_LIMIT + 1}:`)
  })
})

describe('fetchIssueStates', () => {
  beforeEach(() => {
    mockExec.mockReset()
    mockExec.mockReturnValue('gho_testtoken\n')
    clearGitHubTokenCache()
    mockFetch.mockReset()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearGitHubTokenCache()
  })

  it('reads the aliased answer back by issue number', async () => {
    mockFetch.mockResolvedValue(graphQLResponse({
      data: {
        rateLimit: { remaining: 4987 },
        repository: { i412: { number: 412, state: 'OPEN' }, i7: { number: 7, state: 'CLOSED' } },
      },
    }))
    await expect(fetchIssueStates('poppins', 'pex', [412, 7])).resolves.toEqual({
      412: 'OPEN',
      7: 'CLOSED',
    })
  })

  it('omits an issue GitHub answered null for rather than calling it open', async () => {
    // Deleted, transferred, or never filed. The caller renders a missing entry as "no
    // answer", and inventing OPEN for a ticket nobody can find is the one wrong pill.
    mockFetch.mockResolvedValue(graphQLResponse({
      data: { repository: { i412: { number: 412, state: 'OPEN' }, i9: null } },
    }))
    await expect(fetchIssueStates('poppins', 'pex', [412, 9])).resolves.toEqual({ 412: 'OPEN' })
  })

  it('answers an empty map on a failed read instead of an error', async () => {
    // The contract that makes the plan page's pills optional: everything that can go
    // wrong renders as a row without a chip, so there is no error union to branch on.
    mockFetch.mockRejectedValue(new Error('offline'))
    await expect(fetchIssueStates('poppins', 'pex', [412])).resolves.toEqual({})
  })

  it('makes no request at all for an empty list', async () => {
    await expect(fetchIssueStates('poppins', 'pex', [])).resolves.toEqual({})
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
