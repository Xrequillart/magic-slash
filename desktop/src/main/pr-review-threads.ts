/**
 * Turning one PR_COMMENTS_QUERY payload into the threads the card lists.
 *
 * Its own module, and importing nothing but `../types`, for two reasons. The first is
 * testability: this is a pure transformation, and living beside the transport meant
 * covering it through a module that spawns `gh auth token` and calls `fetch`, so every
 * mapping test had to mock `child_process` to assert on a sort order. The second is a
 * cycle — `github-graphql.ts` imports `groupPullRequestThreads`, so this file must
 * never import back from it, which is why the payload shape below is declared
 * STRUCTURALLY here rather than imported as `GQLPullRequest`. TypeScript matches the
 * two by shape, so the caller passes its own type in with no import relationship at
 * all.
 */
import type { PRComment, PRReviewThread } from '../types'

/**
 * How many comments of a single thread the card is willing to hold — the root plus
 * `MAX_COMMENTS_PER_THREAD - 1` replies.
 *
 * A cap PER THREAD, replacing the flat list's global one. A global cap cut the list
 * mid-exchange: the newest 60 comments of a busy PR can start at somebody's third
 * reply, so a thread would appear with no root comment to say what it was about. This
 * cap keeps every thread whole and only ever drops the MIDDLE of a long one — the
 * root, which frames it, and the newest replies, which are what is left to answer.
 *
 * No companion cap on the number of threads: `reviewThreads(last:50)`,
 * `reviews(last:30)` and `comments(last:30)` already bound the set at the query.
 */
export const MAX_COMMENTS_PER_THREAD = 10

// --- The payload, by shape ------------------------------------------------
// Mirrors the connections PR_COMMENTS_QUERY asks for, and nothing else. Every field
// is optional, like the `GQL*` types next door: GitHub documents a partial `data`
// alongside `errors`, so a hole is a normal response rather than a bug.

interface ThreadActor {
  login?: string | null
}

interface ThreadCommentNode {
  id?: string | null
  author?: ThreadActor | null
  bodyText?: string | null
  createdAt?: string | null
  url?: string | null
  /** Null on the comment that opened the thread. */
  replyTo?: { id?: string | null } | null
  pullRequestReview?: { id?: string | null } | null
}

interface ThreadReviewNode {
  id?: string | null
  author?: ThreadActor | null
  state?: string | null
  submittedAt?: string | null
  url?: string | null
  bodyText?: string | null
}

/** The three connections this module reads, as `GQLPullRequest` happens to shape them. */
export interface ThreadablePullRequest {
  reviews?: { nodes?: (ThreadReviewNode | null)[] | null } | null
  reviewThreads?: {
    nodes?: ({
      id?: string | null
      isResolved?: boolean | null
      isOutdated?: boolean | null
      path?: string | null
      line?: number | null
      /** All that survives of the location once the thread is outdated. */
      originalLine?: number | null
      comments?: { totalCount?: number | null; nodes?: (ThreadCommentNode | null)[] | null } | null
    } | null)[] | null
  } | null
  comments?: { nodes?: (ThreadCommentNode | null)[] | null } | null
}

/**
 * A mapped comment plus the one grouping input `PRComment` does not carry.
 *
 * `isReply` travels beside the comment rather than on it: it decides which row opens
 * the thread and is then thrown away, and the card has no use for it — putting it on
 * the shared shape would ship a field to the renderer that means nothing there.
 */
interface ThreadEntry {
  comment: PRComment
  isReply: boolean
}

/**
 * Tri-state ISO-8601 string compare, ascending. Shared by the two orderings this
 * module needs — a thread's own entries, and the threads themselves — so there is
 * one place that says what "oldest first" means rather than two.
 */
function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** Oldest first, and stable on equal stamps — the order a conversation is read in. */
function byCreatedAt(a: ThreadEntry, b: ThreadEntry): number {
  return compareISO(a.comment.createdAt, b.comment.createdAt)
}

/**
 * A comment node as the card holds it, or `null` when there is nothing to show.
 *
 * Empty bodies are dropped rather than listed, exactly as the flat list did: an
 * APPROVED review with nothing written on it is a verdict, which the header badge
 * already states, and a blank row saying "someone approved" is a row spent on
 * nothing.
 */
function toComment(
  node: ThreadCommentNode | ThreadReviewNode | null | undefined,
  kind: PRComment['kind'],
  createdAt: string | null | undefined,
  fallbackId: string,
  extra: Partial<PRComment> = {},
): PRComment | null {
  if (!node) return null
  const body = (node.bodyText || '').trim()
  if (!body) return null
  return {
    // GraphQL always returns an id here; the fallback only keeps React from
    // collapsing two rows onto the same key if it ever did not.
    id: node.id || fallbackId,
    kind,
    author: node.author?.login || 'ghost',
    body,
    createdAt: createdAt || '',
    url: node.url || '',
    ...extra,
  }
}

/**
 * Which of a thread's comments opened it.
 *
 * The one whose `replyTo` is null, normally. When none is, `comments(last:20)` has
 * already eaten the real root, and the oldest surviving comment is promoted rather
 * than producing a thread with no root at all — the row has to be labelled with
 * SOMETHING, and the oldest of what is left is the closest thing to the question the
 * rest answers.
 */
function pickRoot(entries: ThreadEntry[]): ThreadEntry {
  return entries.find((entry) => !entry.isReply) ?? entries[0]
}

/** `resolved` first: a settled thread is settled whether or not the diff moved. */
function threadState(
  isResolved: boolean | null | undefined,
  isOutdated: boolean | null | undefined,
): PRReviewThread['state'] {
  if (isResolved === true) return 'resolved'
  if (isOutdated === true) return 'outdated'
  return 'open'
}

/**
 * Trim a thread's replies to what the card will hold, keeping the newest.
 *
 * The root is never a candidate — it is passed separately for exactly that reason.
 * `replyCount` is computed apart from this (see `countReplies`), so the row can say
 * "5 replies" over the two it shows instead of pretending the other three were never
 * written.
 */
function capReplies(replies: PRComment[]): PRComment[] {
  const room = MAX_COMMENTS_PER_THREAD - 1
  return replies.length > room ? replies.slice(-room) : replies
}

/**
 * How many replies the thread actually has, which is not how many came back.
 *
 * Two truncations sit between GitHub and the row, and this has to survive both.
 * `comments(last:20)` drops the head of a long exchange before the payload is even
 * built, so counting mapped replies would read "19" on a forty-comment thread;
 * `totalCount` is the connection's own total, root included, so one off it is the
 * reply count. The `max` is the floor for the reverse case: a missing or stale
 * `totalCount` must never make the row claim fewer replies than it is holding.
 */
function countReplies(totalCount: number | null | undefined, mapped: number): number {
  const reported = typeof totalCount === 'number' ? totalCount - 1 : mapped
  return Math.max(reported, mapped)
}

/**
 * Push a singleton thread — a `review` or `conversation` root with no replies of its
 * own. The two connections that have no notion of a thread share this shape exactly;
 * only `kind` and how `root` was built differ between them.
 */
function pushSingleton(threads: PRReviewThread[], root: PRComment | null, kind: 'review' | 'conversation'): void {
  if (!root) return
  threads.push({
    id: root.id,
    kind,
    root,
    replies: [],
    replyCount: 0,
    state: 'open',
    updatedAt: root.createdAt,
  })
}

/**
 * Group one PR's comment connections into threads, oldest exchange first.
 *
 * Inline comments come back already grouped by GitHub; the PR conversation and the
 * review summaries have no notion of a thread, so each of their comments becomes a
 * singleton — one root, no replies. The card tells the two apart by `kind`, which is
 * why they are not silently merged into one bucket.
 */
export function groupPullRequestThreads(pr: ThreadablePullRequest): PRReviewThread[] {
  const threads: PRReviewThread[] = []

  for (const [index, review] of (pr.reviews?.nodes ?? []).entries()) {
    const root = toComment(review, 'review', review?.submittedAt, `review:${index}`, {
      ...(review?.state ? { reviewState: review.state } : {}),
    })
    pushSingleton(threads, root, 'review')
  }

  for (const [index, thread] of (pr.reviewThreads?.nodes ?? []).entries()) {
    if (!thread) continue

    const entries: ThreadEntry[] = []
    for (const [position, node] of (thread.comments?.nodes ?? []).entries()) {
      // No `path`/`line` here: those live on the thread itself, below — every
      // comment in it shares the same location, so stamping it a second time per
      // comment would just be the same value copied onto a shape nothing reads it
      // from.
      const comment = toComment(node, 'inline', node?.createdAt, `inline:${index}:${position}`, {
        ...(node?.pullRequestReview?.id ? { reviewId: node.pullRequestReview.id } : {}),
      })
      if (!comment) continue
      entries.push({ comment, isReply: !!node?.replyTo?.id })
    }
    // Every body in the thread was empty, so there is no exchange left to list.
    if (entries.length === 0) continue

    entries.sort(byCreatedAt)
    const rootEntry = pickRoot(entries)
    const root = rootEntry.comment
    const replies = entries.filter((entry) => entry !== rootEntry).map((entry) => entry.comment)

    threads.push({
      // The thread's own id, so the row keeps its React key when its root comment
      // is edited away or a reply lands. The fallback is the root, which is unique
      // across threads even when GitHub somehow answers without an id.
      id: thread.id || `thread:${root.id}`,
      kind: 'inline',
      root,
      replies: capReplies(replies),
      replyCount: countReplies(thread.comments?.totalCount, replies.length),
      ...(thread.path ? { path: thread.path } : {}),
      // `line` first, `originalLine` when it is null — which is precisely what an
      // outdated thread comes back as, so the row that most needs a location does
      // not lose it.
      ...(typeof thread.line === 'number'
        ? { line: thread.line }
        : typeof thread.originalLine === 'number'
          ? { line: thread.originalLine }
          : {}),
      state: threadState(thread.isResolved, thread.isOutdated),
      // The newest comment, not the root's stamp: a thread whose last reply landed
      // this morning belongs at the bottom of the list, wherever it was opened.
      updatedAt: entries[entries.length - 1].comment.createdAt,
    })
  }

  for (const [index, comment] of (pr.comments?.nodes ?? []).entries()) {
    const root = toComment(comment, 'conversation', comment?.createdAt, `conversation:${index}`)
    pushSingleton(threads, root, 'conversation')
  }

  // Oldest first — a review reads as a conversation, not as a feed. Same order the
  // flat list had, so the fold still starts where the PR started.
  threads.sort((a, b) => compareISO(a.updatedAt, b.updatedAt))
  return threads
}
