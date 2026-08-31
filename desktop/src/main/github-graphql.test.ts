import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoisted above the import of the module under test: `getGitHubToken()` spawns
// `gh auth token` through execFileSync, which must never run in the suite.
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execFileSync } from 'child_process'
import { clearGitHubTokenCache } from './github'
import {
  fetchPRStatusGraphQL,
  PR_COMMENTS_QUERY,
  PR_STATUS_QUERY,
  type GQLPullRequest,
} from './github-graphql'
import { isPRStatusError } from '../types'
import type { PRStatusError, PRStatusSnapshot } from '../types'

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

/** A realistic PR: one passing check, one failing, one running, one skipped, plus bots. */
function basePR(): GQLPullRequest {
  return {
    state: 'OPEN',
    isDraft: false,
    mergeable: 'MERGEABLE',
    updatedAt: '2025-01-01T10:00:00Z',
    author: { login: 'xavier' },
    headRefOid: 'abc123def456',
    commits: {
      nodes: [
        {
          commit: {
            statusCheckRollup: {
              state: 'FAILURE',
              contexts: {
                nodes: [
                  { name: 'build', status: 'COMPLETED', conclusion: 'SUCCESS', detailsUrl: 'https://ci/build' },
                  { name: 'lint', status: 'COMPLETED', conclusion: 'FAILURE', detailsUrl: 'https://ci/lint' },
                  { name: 'e2e', status: 'IN_PROGRESS', conclusion: null, detailsUrl: 'https://ci/e2e' },
                  { name: 'optional', status: 'COMPLETED', conclusion: 'SKIPPED', detailsUrl: null },
                  { context: 'vercel/preview', state: 'SUCCESS', targetUrl: 'https://vercel/preview' },
                ],
              },
            },
          },
        },
      ],
    },
    reviews: {
      nodes: [
        { author: { login: 'alice' }, state: 'APPROVED', submittedAt: '2025-01-01T09:00:00Z', body: 'LGTM' },
        { author: { login: 'greptile' }, state: 'COMMENTED', submittedAt: '2025-01-01T09:30:00Z', body: '' },
      ],
    },
    reviewThreads: {
      nodes: [
        { comments: { totalCount: 3, nodes: [{ author: { login: 'greptile' } }] } },
        { comments: { totalCount: 2, nodes: [{ author: { login: 'alice' } }] } },
      ],
    },
    comments: {
      totalCount: 4,
      nodes: [{ author: { login: 'claude-bot' } }, { author: { login: 'alice' } }],
    },
  }
}

function payload(overrides: Partial<GQLPullRequest> = {}, rateLimit: { remaining: number } = { remaining: 4987 }) {
  return { data: { rateLimit, repository: { pullRequest: { ...basePR(), ...overrides } } } }
}

function snapshotOf(result: PRStatusSnapshot | PRStatusError): PRStatusSnapshot {
  if (isPRStatusError(result)) throw new Error(`expected a snapshot, got ${JSON.stringify(result)}`)
  return result
}

describe('fetchPRStatusGraphQL', () => {
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

  it('queries the newest reviews and comments, never the oldest', () => {
    // `first:` returns the OLDEST entries and the bots post late — that is the very
    // defect this query exists to close, so the paging direction is asserted.
    expect(PR_STATUS_QUERY).toContain('comments(last:20)')
    expect(PR_STATUS_QUERY).toContain('reviewThreads(last:50)')
    expect(PR_STATUS_QUERY).not.toContain('reviews(first:')
    // Note: `comments(first:1)` inside reviewThreads is deliberate and unrelated —
    // it reads each thread's ORIGINATING comment to attribute the thread.
  })

  it('takes a full page of reviews, because they decide the verdict', () => {
    // Reviews are not counted, they are REDUCED to a status: `aggregatePRStatus`
    // keeps the latest review per reviewer, so a reviewer falling outside the
    // window makes an approved PR read back as pending. Counts can be truncated
    // safely; verdicts cannot.
    expect(PR_STATUS_QUERY).toContain('reviews(last:100)')
    expect(PR_STATUS_QUERY).toContain('pageInfo { hasPreviousPage startCursor }')
  })

  describe('review pagination', () => {
    type ReviewNode = NonNullable<NonNullable<GQLPullRequest['reviews']>['nodes']>[number]

    /** A first page that declares older reviews behind it. */
    function truncated(nodes: ReviewNode[], cursor = 'CUR1') {
      return payload({ reviews: { pageInfo: { hasPreviousPage: true, startCursor: cursor }, nodes } })
    }

    /** An older page, as returned by REVIEWS_PAGE_QUERY (reviews only). */
    function olderPage(nodes: ReviewNode[], hasPreviousPage = false) {
      return {
        data: {
          rateLimit: { remaining: 4980 },
          repository: {
            pullRequest: { reviews: { pageInfo: { hasPreviousPage, startCursor: null }, nodes } },
          },
        },
      }
    }

    it('does not paginate when the first page is the whole history', async () => {
      // The common case must stay at exactly one request — that is an acceptance
      // criterion, and pagination must not quietly cost every PR a second call.
      mockFetch.mockResolvedValue(graphQLResponse(payload()))
      await fetchPRStatusGraphQL('o', 'r', 1)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('walks older pages and recovers a verdict that fell out of the window', async () => {
      // alice approved long ago; 100+ later reviews pushed her out of the first page.
      // Without pagination the PR reads back as `commented` instead of `approved`.
      mockFetch
        .mockResolvedValueOnce(graphQLResponse(truncated([
          { author: { login: 'greptile' }, state: 'COMMENTED', submittedAt: '2025-01-02T09:00:00Z', body: 'x' },
        ])))
        .mockResolvedValueOnce(graphQLResponse(olderPage([
          { author: { login: 'alice' }, state: 'APPROVED', submittedAt: '2025-01-01T08:00:00Z', body: 'LGTM' },
        ])))

      const snapshot = snapshotOf(await fetchPRStatusGraphQL('o', 'r', 1))
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(snapshot.status).toBe('approved')
      expect(snapshot.reviewers).toContain('alice')
    })

    it('passes the start cursor as `before` when walking back', async () => {
      mockFetch
        .mockResolvedValueOnce(graphQLResponse(truncated([], 'CURSOR_X')))
        .mockResolvedValueOnce(graphQLResponse(olderPage([])))

      await fetchPRStatusGraphQL('o', 'r', 1)
      const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body)
      expect(secondBody.variables.before).toBe('CURSOR_X')
      expect(secondBody.query).toContain('before:$before')
    })

    it('keeps the snapshot when an older page fails, rather than blanking the card', async () => {
      // An incomplete history is still usable; an error here would empty a card
      // over an edge case the user cannot act on.
      mockFetch
        .mockResolvedValueOnce(graphQLResponse(truncated([
          { author: { login: 'alice' }, state: 'APPROVED', submittedAt: '2025-01-02T09:00:00Z', body: 'ok' },
        ])))
        .mockRejectedValue(new Error('socket hang up'))

      const snapshot = snapshotOf(await fetchPRStatusGraphQL('o', 'r', 1))
      expect(snapshot.status).toBe('approved')
    })

    it('retries a transient page failure once before giving up', async () => {
      // Abandoning a page can drop a reviewer's latest verdict, so a blip on one
      // request must not be the end of the walk.
      mockFetch
        .mockResolvedValueOnce(graphQLResponse(truncated([
          { author: { login: 'greptile' }, state: 'COMMENTED', submittedAt: '2025-01-02T09:00:00Z', body: 'x' },
        ])))
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce(graphQLResponse(olderPage([
          { author: { login: 'alice' }, state: 'APPROVED', submittedAt: '2025-01-01T08:00:00Z', body: 'LGTM' },
        ])))

      const snapshot = snapshotOf(await fetchPRStatusGraphQL('o', 'r', 1))
      // 1 first page + 1 failed page + 1 successful retry.
      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(snapshot.status).toBe('approved')
    })

    it('does not retry a rate-limited page', async () => {
      // Rate limiting is a state, not a blip: an immediate second call fails the
      // same way and spends budget GitHub just said we do not have.
      mockFetch
        .mockResolvedValueOnce(graphQLResponse(truncated([])))
        .mockResolvedValue(graphQLResponse({ errors: [{ type: 'RATE_LIMITED', message: 'quota' }] }))

      await fetchPRStatusGraphQL('o', 'r', 1)
      // 1 first page + 1 rate-limited page, and no retry after it.
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('stops after the page ceiling instead of looping forever', async () => {
      // Every page keeps claiming another one behind it, cursor included: without a
      // ceiling this walks until the rate limit stops it.
      mockFetch.mockResolvedValue(graphQLResponse(truncated([], 'C')))

      await fetchPRStatusGraphQL('o', 'r', 1)
      // 1 initial + at most MAX_REVIEW_PAGES (10) follow-ups.
      expect(mockFetch.mock.calls.length).toBe(11)
    })
  })

  it('maps a full response into a snapshot', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload()))

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.state).toBe('open')
    expect(snapshot.merged).toBe(false)
    expect(snapshot.closed).toBe(false)
    expect(snapshot.status).toBe('approved')
    expect(snapshot.reviewers).toEqual(expect.arrayContaining(['alice', 'greptile']))
    expect(snapshot.headSha).toBe('abc123def456')
    expect(snapshot.rollupState).toBe('FAILURE')
    expect(snapshot.mergeable).toBe(true)
    expect(snapshot.updatedAt).toBe(new Date('2025-01-01T10:00:00Z').getTime())

    expect(snapshot.checks).toEqual([
      { name: 'build', state: 'passed', url: 'https://ci/build' },
      { name: 'lint', state: 'failed', url: 'https://ci/lint' },
      { name: 'e2e', state: 'running', url: 'https://ci/e2e' },
      { name: 'optional', state: 'skipped' },
      { name: 'vercel/preview', state: 'passed', url: 'https://vercel/preview' },
    ])
    expect(snapshot.checksSummary).toEqual({ total: 5, passed: 2, failed: 1, running: 1, skipped: 1 })

    // inline = sum of the review threads' own totals (3 + 2), conversation =
    // comments.totalCount (4), reviewSummaries = reviews with a non-empty body (1).
    expect(snapshot.commentCounts).toEqual({ inline: 5, conversation: 4, reviewSummaries: 1 })
    // Backward-compatible total, the one fed to prReviewCommentCount.
    expect(snapshot.commentCount).toBe(10)

    expect(snapshot.commentAuthors).toEqual(['alice', 'greptile', 'claude-bot'])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.github.com/graphql')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body).variables).toEqual({ owner: 'acme', repo: 'web', number: 42 })
  })

  it('reads the budget from rateLimit, not from a REST header', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload()))

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.rateLimitRemaining).toBe(4987)
  })

  it('caps commentAuthors at 8 deduped logins', async () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ author: { login: `bot-${i}` } }))
    mockFetch.mockResolvedValue(graphQLResponse(payload({ comments: { totalCount: 15, nodes: many } })))

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.commentAuthors).toHaveLength(8)
    expect(new Set(snapshot.commentAuthors).size).toBe(8)
  })

  it('does not let a DISMISSED review arriving last undo an earlier APPROVED', async () => {
    mockFetch.mockResolvedValue(
      graphQLResponse(
        payload({
          reviews: {
            nodes: [
              { author: { login: 'alice' }, state: 'APPROVED', submittedAt: '2025-01-01T09:00:00Z', body: 'LGTM' },
              { author: { login: 'bob' }, state: 'DISMISSED', submittedAt: '2025-01-01T09:45:00Z', body: '' },
            ],
          },
        }),
      ),
    )

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.status).toBe('approved')
    expect(snapshot.reviewers).not.toContain('bob')
  })

  it('excludes reviews written by the PR author', async () => {
    mockFetch.mockResolvedValue(
      graphQLResponse(
        payload({
          reviews: {
            nodes: [
              { author: { login: 'xavier' }, state: 'APPROVED', submittedAt: '2025-01-01T09:00:00Z', body: 'shipping' },
            ],
          },
          reviewThreads: { nodes: [] },
          comments: { totalCount: 0, nodes: [] },
        }),
      ),
    )

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.status).toBe('pending')
    expect(snapshot.reviewers).toEqual([])
  })

  it('tolerates a head commit with no checks at all', async () => {
    mockFetch.mockResolvedValue(
      graphQLResponse(payload({ commits: { nodes: [{ commit: { statusCheckRollup: null } }] } })),
    )

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.checks).toEqual([])
    expect(snapshot.checksSummary).toEqual({ total: 0, passed: 0, failed: 0, running: 0, skipped: 0 })
    expect(snapshot.rollupState).toBeUndefined()
  })

  it('tolerates an empty commits connection', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload({ commits: { nodes: [] } })))

    expect(snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42)).checks).toEqual([])
  })

  it('leaves mergeable undefined while GitHub answers UNKNOWN', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload({ mergeable: 'UNKNOWN' })))

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.mergeable).toBeUndefined()
    expect('mergeable' in snapshot).toBe(false)
  })

  it('reports CONFLICTING as a real conflict', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload({ mergeable: 'CONFLICTING' })))

    expect(snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42)).mergeable).toBe(false)
  })

  it('maps a draft PR', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload({ isDraft: true })))

    expect(snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42)).state).toBe('draft')
  })

  it('maps a merged PR, keeping the REST-era merged+closed pair', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload({ state: 'MERGED' })))

    const snapshot = snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42))

    expect(snapshot.state).toBe('merged')
    expect(snapshot.merged).toBe(true)
    expect(snapshot.closed).toBe(true)
  })

  it('maps HTTP 200 + errors[NOT_FOUND] to not-found', async () => {
    // The critical case: a token without the `repo` scope gets a 200, a null
    // repository and no exception at all. Mapping HTTP codes alone leaves a mute card.
    mockFetch.mockResolvedValue(
      graphQLResponse({
        data: { rateLimit: { remaining: 4999 }, repository: null },
        errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to a Repository with the name acme/web.' }],
      }),
    )

    const result = await fetchPRStatusGraphQL('acme', 'web', 42)

    expect(isPRStatusError(result)).toBe(true)
    expect(result).toMatchObject({ error: 'not-found' })
  })

  it('maps HTTP 200 + errors[FORBIDDEN] to forbidden', async () => {
    mockFetch.mockResolvedValue(
      graphQLResponse({ data: null, errors: [{ type: 'FORBIDDEN', message: 'Resource not accessible' }] }),
    )

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toMatchObject({ error: 'forbidden' })
  })

  it('maps HTTP 200 + errors[RATE_LIMITED] to rate-limited, with the reset as retryAtMs', async () => {
    const resetEpochSeconds = 1893456000
    mockFetch.mockResolvedValue(
      graphQLResponse(
        { data: null, errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }] },
        { headers: { 'X-RateLimit-Reset': String(resetEpochSeconds) } },
      ),
    )

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toMatchObject({
      error: 'rate-limited',
      retryAtMs: resetEpochSeconds * 1000,
    })
  })

  it('prefers Retry-After, expressed as an absolute deadline', async () => {
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    mockFetch.mockResolvedValue(
      graphQLResponse(
        { data: null, errors: [{ type: 'RATE_LIMITED', message: 'slow down' }] },
        { headers: { 'Retry-After': '60' } },
      ),
    )

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toMatchObject({
      error: 'rate-limited',
      retryAtMs: now + 60_000,
    })

    nowSpy.mockRestore()
  })

  it('omits retryAtMs when GitHub sends no hint', async () => {
    mockFetch.mockResolvedValue(
      graphQLResponse({ data: null, errors: [{ type: 'RATE_LIMITED', message: 'API rate limit exceeded' }] }),
    )

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toEqual({
      error: 'rate-limited',
      message: 'API rate limit exceeded',
    })
  })

  it('keeps the snapshot when errors[] only names an unmapped field', async () => {
    mockFetch.mockResolvedValue(
      graphQLResponse({
        ...payload(),
        errors: [{ type: 'SOMETHING_ELSE', message: 'partial failure on an unrelated field' }],
      }),
    )

    expect(snapshotOf(await fetchPRStatusGraphQL('acme', 'web', 42)).state).toBe('open')
  })

  it('maps HTTP 401 to no-token', async () => {
    mockFetch.mockResolvedValue(graphQLResponse({ message: 'Bad credentials' }, { status: 401 }))

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toMatchObject({ error: 'no-token' })
  })

  it('maps a 5xx to network', async () => {
    mockFetch.mockResolvedValue(graphQLResponse({ message: 'Server Error' }, { status: 502 }))

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toMatchObject({ error: 'network' })
  })

  it('maps a rejected fetch to network', async () => {
    mockFetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND api.github.com'))

    const result = await fetchPRStatusGraphQL('acme', 'web', 42)

    expect(result).toMatchObject({ error: 'network' })
    expect((result as PRStatusError).message).toContain('ENOTFOUND')
  })

  it('maps a 200 with neither pull request nor errors to not-found', async () => {
    mockFetch.mockResolvedValue(graphQLResponse({ data: { repository: null } }))

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toMatchObject({ error: 'not-found' })
  })

  it('returns no-token without emitting any request when gh has no token', async () => {
    mockExec.mockReturnValue('')
    clearGitHubTokenCache()

    expect(await fetchPRStatusGraphQL('acme', 'web', 42)).toMatchObject({ error: 'no-token' })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('memoises the token instead of spawning `gh` on every request', async () => {
    mockFetch.mockResolvedValue(graphQLResponse(payload()))

    await fetchPRStatusGraphQL('acme', 'web', 42)
    await fetchPRStatusGraphQL('acme', 'web', 43)
    await fetchPRStatusGraphQL('acme', 'web', 44)

    expect(mockExec).toHaveBeenCalledTimes(1)
  })

  it('re-reads the token once a 401 has invalidated the memo', async () => {
    mockFetch.mockResolvedValue(graphQLResponse({ message: 'Bad credentials' }, { status: 401 }))
    await fetchPRStatusGraphQL('acme', 'web', 42)

    mockFetch.mockResolvedValue(graphQLResponse(payload()))
    await fetchPRStatusGraphQL('acme', 'web', 42)

    expect(mockExec).toHaveBeenCalledTimes(2)
  })
})

describe('PR_COMMENTS_QUERY', () => {
  it('asks for plain text and for the newest of each connection', () => {
    // `body` is the markdown source; the card renders text and clamps it.
    expect(PR_COMMENTS_QUERY).toContain('bodyText')
    expect(PR_COMMENTS_QUERY).toContain('comments(last:30)')
    expect(PR_COMMENTS_QUERY).toContain('reviewThreads(last:50)')
    expect(PR_COMMENTS_QUERY).not.toContain('comments(first:')
  })

  it('asks for what makes a thread a thread', () => {
    // The grouping in `pr-review-threads.ts` is only as good as these four fields:
    // without them a reply is indistinguishable from the comment it answers.
    expect(PR_COMMENTS_QUERY).toContain('id isResolved isOutdated path line')
    expect(PR_COMMENTS_QUERY).toContain('replyTo{id}')
    expect(PR_COMMENTS_QUERY).toContain('pullRequestReview{id}')
  })

  it('asks for what survives a truncation', () => {
    // `line` is null on an outdated thread and `last:20` cuts a long exchange, so
    // both rows the card draws — the location and the reply count — need a second
    // field to stay correct.
    expect(PR_COMMENTS_QUERY).toContain('originalLine')
    expect(PR_COMMENTS_QUERY).toContain('comments(last:20){ totalCount')
  })
})
