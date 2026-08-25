import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoisted above the import of the module under test: `getGitHubToken()` spawns
// `gh auth token` through execFileSync, which must never run in the suite.
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execFileSync } from 'child_process'
import { clearGitHubTokenCache } from './github'
import { fetchOpenIssues, OPEN_ISSUES_QUERY } from './github-issues'
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

function payload(nodes: unknown[], totalCount?: number) {
  const issues = totalCount === undefined ? { nodes } : { totalCount, nodes }
  return { data: { rateLimit: { remaining: 4987 }, repository: { issues } } }
}

function okOf(result: IssuesResult): { issues: TaskIssue[]; totalOpen: number } {
  if (isPRStatusError(result)) throw new Error(`expected issues, got ${JSON.stringify(result)}`)
  return result
}

function issuesOf(result: IssuesResult): TaskIssue[] {
  return okOf(result).issues
}

function errorOf(result: IssuesResult): PRStatusError {
  if (!isPRStatusError(result)) throw new Error(`expected an error, got ${JSON.stringify(result)}`)
  return result
}

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
    expect(OPEN_ISSUES_QUERY).not.toContain('UPDATED_AT')
    expect(OPEN_ISSUES_QUERY).toContain('rateLimit { remaining }')
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
    expect(OPEN_ISSUES_QUERY).toContain('parent { number title }')
    expect(OPEN_ISSUES_QUERY).toContain('subIssuesSummary { total completed }')
  })

  it('maps the parent of a sub-issue', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload([
      {
        number: 233,
        title: 'feat(desktop): tasks page',
        url: 'https://github.com/acme/api/issues/233',
        createdAt: '2026-08-20T10:00:00Z',
        parent: { number: 232, title: 'epic: the backlog surface' },
        subIssuesSummary: { total: 0, completed: 0 },
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
