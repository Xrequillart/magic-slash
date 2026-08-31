import { describe, it, expect } from 'vitest'

// No mocks, and none needed: the module under test imports `../types` and nothing
// else — no `child_process`, no `fetch`, no `electron`. That isolation is the reason
// the grouping lives in its own file rather than beside the transport.
import {
  groupPullRequestThreads,
  MAX_COMMENTS_PER_THREAD,
  type ThreadablePullRequest,
} from './pr-review-threads'

/** An inline comment node, with only the fields the grouping actually reads. */
function comment(
  id: string,
  login: string,
  createdAt: string,
  bodyText: string,
  replyToId?: string,
) {
  return {
    id,
    author: { login },
    createdAt,
    url: `https://gh/${id}`,
    bodyText,
    replyTo: replyToId ? { id: replyToId } : null,
    pullRequestReview: { id: `rev-${id}` },
  }
}

/** The three connections, with bodies — the shape PR_COMMENTS_QUERY brings back. */
function commentedPR(): ThreadablePullRequest {
  return {
    reviews: {
      nodes: [
        { id: 'r1', author: { login: 'alice' }, state: 'CHANGES_REQUESTED', submittedAt: '2025-01-01T09:00:00Z', url: 'https://gh/r1', bodyText: 'Needs a test.' },
        // Bare approval: a verdict, not a comment.
        { id: 'r2', author: { login: 'bob' }, state: 'APPROVED', submittedAt: '2025-01-01T12:00:00Z', url: 'https://gh/r2', bodyText: '   ' },
      ],
    },
    reviewThreads: {
      nodes: [
        {
          id: 't1',
          isResolved: false,
          isOutdated: false,
          path: 'desktop/src/main/watcher.ts',
          line: 42,
          comments: {
            nodes: [
              comment('c1', 'greptile', '2025-01-01T10:00:00Z', 'Off by one.'),
              comment('c1a', 'xavier', '2025-01-01T10:05:00Z', 'Good catch.', 'c1'),
              comment('c1b', 'greptile', '2025-01-01T10:10:00Z', 'Fixed in 3f2a1c.', 'c1'),
            ],
          },
        },
      ],
    },
    comments: {
      nodes: [comment('c2', 'claude-bot', '2025-01-01T11:00:00Z', 'CI is green.')],
    },
  }
}

describe('groupPullRequestThreads', () => {
  it('collapses a thread and its replies into one row', () => {
    const inline = groupPullRequestThreads(commentedPR()).filter((thread) => thread.kind === 'inline')

    expect(inline).toHaveLength(1)
    expect(inline[0]).toMatchObject({
      id: 't1',
      replyCount: 2,
      path: 'desktop/src/main/watcher.ts',
      line: 42,
      state: 'open',
    })
    // The comment that OPENED it labels the row; the answers hang off it.
    expect(inline[0].root.author).toBe('greptile')
    expect(inline[0].replies.map((reply) => reply.author)).toEqual(['xavier', 'greptile'])
    // The newest comment in the thread, not the root's stamp: a thread rises with
    // its last reply.
    expect(inline[0].updatedAt).toBe('2025-01-01T10:10:00Z')
  })

  it('keeps the three kinds apart, oldest exchange first', () => {
    const threads = groupPullRequestThreads(commentedPR())

    expect(threads.map((thread) => [thread.kind, thread.root.author])).toEqual([
      ['review', 'alice'],
      ['inline', 'greptile'],
      ['conversation', 'claude-bot'],
    ])
    // Only the inline one is a thread GitHub tracks; the other two are singletons.
    expect(threads.filter((thread) => thread.replies.length > 0)).toHaveLength(1)
  })

  it('carries the review verdict onto the review row and the review id onto inline comments', () => {
    const threads = groupPullRequestThreads(commentedPR())

    expect(threads.find((thread) => thread.kind === 'review')?.root.reviewState).toBe('CHANGES_REQUESTED')
    expect(threads.find((thread) => thread.kind === 'inline')?.root.reviewId).toBe('rev-c1')
  })

  it('drops bodyless reviews rather than listing a verdict as a comment', () => {
    // The header badge already says "approved"; a blank row would only push a real
    // exchange further down the fold.
    expect(groupPullRequestThreads(commentedPR()).some((thread) => thread.root.author === 'bob')).toBe(false)
  })

  it('names the three thread states, resolved winning over outdated', () => {
    const pr: ThreadablePullRequest = {
      reviewThreads: {
        nodes: [
          { id: 'open', comments: { nodes: [comment('o1', 'a', '2025-01-01T01:00:00Z', 'still open')] } },
          { id: 'outdated', isOutdated: true, comments: { nodes: [comment('d1', 'a', '2025-01-01T02:00:00Z', 'diff moved')] } },
          { id: 'resolved', isResolved: true, comments: { nodes: [comment('s1', 'a', '2025-01-01T03:00:00Z', 'settled')] } },
          // Both flags: a settled thread is settled whether or not the diff moved.
          { id: 'both', isResolved: true, isOutdated: true, comments: { nodes: [comment('b1', 'a', '2025-01-01T04:00:00Z', 'settled and stale')] } },
        ],
      },
    }

    expect(groupPullRequestThreads(pr).map((thread) => [thread.id, thread.state])).toEqual([
      ['open', 'open'],
      ['outdated', 'outdated'],
      ['resolved', 'resolved'],
      ['both', 'resolved'],
    ])
  })

  it('keeps the root and the newest replies when a thread blows past the cap', () => {
    const nodes = [
      comment('root', 'greptile', '2025-01-01T00:00:00Z', 'the question'),
      ...Array.from({ length: MAX_COMMENTS_PER_THREAD + 5 }, (_, i) =>
        // Zero-padded so string ordering is chronological ordering.
        comment(`reply${i}`, 'bot', `2025-01-01T01:${String(i).padStart(2, '0')}:00Z`, `reply ${i}`, 'root')),
    ]
    const [thread] = groupPullRequestThreads({ reviewThreads: { nodes: [{ id: 't', comments: { nodes } }] } })

    // The root survives the trim by construction — a row with no root comment cannot
    // say what the thread is about.
    expect(thread.root.id).toBe('root')
    expect(thread.replies).toHaveLength(MAX_COMMENTS_PER_THREAD - 1)
    // The TAIL: the recent exchange is what anybody opens the fold for.
    expect(thread.replies.at(-1)?.body).toBe(`reply ${MAX_COMMENTS_PER_THREAD + 4}`)
    // The real count, not the displayed one — otherwise the trim would be invisible.
    expect(thread.replyCount).toBe(MAX_COMMENTS_PER_THREAD + 5)
  })

  it('promotes the oldest comment when the real root fell off the page', () => {
    // `comments(last:20)` ate the opening comment, so every survivor is a reply.
    const nodes = [
      comment('c9', 'bob', '2025-01-01T09:00:00Z', 'later answer', 'gone'),
      comment('c8', 'alice', '2025-01-01T08:00:00Z', 'earlier answer', 'gone'),
    ]
    const [thread] = groupPullRequestThreads({ reviewThreads: { nodes: [{ id: 't', comments: { nodes } }] } })

    expect(thread.root.id).toBe('c8')
    expect(thread.replies.map((reply) => reply.id)).toEqual(['c9'])
    expect(thread.replyCount).toBe(1)
  })

  it('drops a thread whose every body came back empty', () => {
    const pr: ThreadablePullRequest = {
      reviewThreads: {
        nodes: [{ id: 't', comments: { nodes: [comment('c1', 'a', '2025-01-01T00:00:00Z', '   ')] } }],
      },
    }

    expect(groupPullRequestThreads(pr)).toEqual([])
  })

  it('survives a pull request with no comment connections at all', () => {
    expect(groupPullRequestThreads({})).toEqual([])
  })

  it('counts the replies GitHub holds, not the ones the query brought back', () => {
    // `comments(last:20)` cut the head of a 41-comment thread, so counting nodes
    // would read "2 replies" on an exchange that has forty.
    const nodes = [
      comment('c1', 'greptile', '2025-01-01T10:00:00Z', 'root'),
      comment('c2', 'xavier', '2025-01-01T10:05:00Z', 'reply', 'c1'),
      comment('c3', 'greptile', '2025-01-01T10:10:00Z', 'reply', 'c1'),
    ]
    const [thread] = groupPullRequestThreads({
      reviewThreads: { nodes: [{ id: 't', comments: { totalCount: 41, nodes } }] },
    })

    expect(thread.replyCount).toBe(40)
    expect(thread.replies).toHaveLength(2)
  })

  it('never claims fewer replies than it is holding when totalCount is missing or stale', () => {
    const nodes = [
      comment('c1', 'greptile', '2025-01-01T10:00:00Z', 'root'),
      comment('c2', 'xavier', '2025-01-01T10:05:00Z', 'reply', 'c1'),
      comment('c3', 'greptile', '2025-01-01T10:10:00Z', 'reply', 'c1'),
    ]

    const [absent] = groupPullRequestThreads({
      reviewThreads: { nodes: [{ id: 't', comments: { nodes } }] },
    })
    expect(absent.replyCount).toBe(2)

    // A totalCount below what came back is nonsense; the floor is what we hold.
    const [stale] = groupPullRequestThreads({
      reviewThreads: { nodes: [{ id: 't', comments: { totalCount: 1, nodes } }] },
    })
    expect(stale.replyCount).toBe(2)
  })

  it('falls back to originalLine, which is all an outdated thread has left', () => {
    // GitHub nulls `line` once the diff has moved out from under a thread — the one
    // state where the row would otherwise show a bare filename.
    const nodes = [comment('c1', 'greptile', '2025-01-01T10:00:00Z', 'stale hunk')]
    const [thread] = groupPullRequestThreads({
      reviewThreads: {
        nodes: [
          {
            id: 't',
            isOutdated: true,
            path: 'desktop/src/main/watcher.ts',
            line: null,
            originalLine: 117,
            comments: { nodes },
          },
        ],
      },
    })

    expect(thread.state).toBe('outdated')
    expect(thread.line).toBe(117)
  })

  it('prefers line over originalLine while the thread is still current', () => {
    const nodes = [comment('c1', 'greptile', '2025-01-01T10:00:00Z', 'live hunk')]
    const [thread] = groupPullRequestThreads({
      reviewThreads: {
        nodes: [{ id: 't', path: 'a.ts', line: 42, originalLine: 117, comments: { nodes } }],
      },
    })

    expect(thread.line).toBe(42)
  })
})
