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
 * How many comments of a single thread survive to the renderer — the root plus
 * `MAX_COMMENTS_PER_THREAD - 1` replies.
 *
 * A cap PER THREAD, replacing the flat list's global one. A global cap cut the list
 * mid-exchange: the newest 60 comments of a busy PR can start at somebody's third
 * reply, so a thread would appear with no root comment to say what it was about. This
 * cap keeps every thread whole and only ever drops the MIDDLE of a long one — the
 * root, which frames it, and the newest replies, which are what is left to answer.
 *
 * Pinned to the `comments(last:20)` the query fetches, which makes it SLACK rather than
 * a live cut: twenty nodes come back, one of them is the root, so `capReplies` never has
 * a twentieth reply to drop. That is the intent, not an oversight — it was 10 while the
 * only reader was a 500 px sidebar row, where the whole exchange was a reply COUNT, and
 * the panel is 70% of the window and shows the conversation, so cutting eight of eighteen
 * replies there is dropping the middle of something somebody is reading. What the
 * constant still does is hold the shape of the truncation for the day the query asks for
 * more: raise `comments(last:)` and this is what decides how much of the middle survives.
 * The two are meant to move together, and this one is the floor.
 *
 * No companion cap on the number of threads: `reviewThreads(last:50)`,
 * `reviews(last:30)` and `comments(last:30)` already bound the set at the query.
 *
 * `countReplies` is unaffected either way — it reports GitHub's own total, so a thread
 * still says how many replies it has rather than how many got through.
 */
export const MAX_COMMENTS_PER_THREAD = 20

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
  /** The markdown SOURCE — see `PRComment.body` for why not `bodyText`. */
  body?: string | null
  createdAt?: string | null
  url?: string | null
  /**
   * Inline only: the unified-diff excerpt, a field of the COMMENT and never of the
   * thread. Only the root's survives the grouping — see `PRReviewThread.diffHunk`.
   */
  diffHunk?: string | null
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
  body?: string | null
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
      /** The head of a multi-line comment's range; null on a single-line one. */
      startLine?: number | null
      /** `startLine`'s outdated twin, in the pre-change numbering. */
      originalStartLine?: number | null
      /** `RIGHT` (the file after the change) or `LEFT` (before it). */
      diffSide?: string | null
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
  /**
   * The comment's own `diffHunk`, held HERE rather than on the comment: only the root's
   * survives, onto the thread (see `PRReviewThread.diffHunk`), and which entry is the
   * root is not known until after the sort below. Parking it on the entry — the shape
   * that exists only for the length of the grouping — is what keeps the nineteen dead
   * copies from ever being built into the payload in the first place.
   */
  diffHunk?: string
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
  const body = (node.body || '').trim()
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
      // No `path`/`line`/`diffHunk` here: those describe the THREAD, and every comment
      // in it shares them, so stamping them per comment would just be the same value
      // copied onto a shape nothing reads it from. GitHub reports `diffHunk` on the
      // comment only because the thread type has no such field, so it rides on the
      // entry below and is lifted onto the thread once the root is known.
      const comment = toComment(node, 'inline', node?.createdAt, `inline:${index}:${position}`, {
        ...(node?.pullRequestReview?.id ? { reviewId: node.pullRequestReview.id } : {}),
      })
      if (!comment) continue
      entries.push({
        comment,
        isReply: !!node?.replyTo?.id,
        ...(node?.diffHunk ? { diffHunk: node.diffHunk } : {}),
      })
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
      // The same four numbers UNMERGED, beside the fallback above rather than instead
      // of it: the card wants one number and does not care which file it counts in,
      // the panel has to highlight a range inside a hunk and therefore cares about
      // nothing else. Collapsing them here is what would make the second impossible.
      ...(typeof thread.originalLine === 'number' ? { originalLine: thread.originalLine } : {}),
      ...(typeof thread.startLine === 'number' ? { startLine: thread.startLine } : {}),
      ...(typeof thread.originalStartLine === 'number' ? { originalStartLine: thread.originalStartLine } : {}),
      ...(thread.diffSide ? { diffSide: thread.diffSide } : {}),
      // The ROOT's excerpt, which is the one the hunk was captured for. The replies'
      // copies of it are dropped with their entries.
      ...(rootEntry.diffHunk ? { diffHunk: rootEntry.diffHunk } : {}),
      state: threadState(thread.isResolved, thread.isOutdated),
      // The newest comment, not the root's stamp — the last time anything happened here.
      // Carried, not sorted on: see the sort below.
      updatedAt: entries[entries.length - 1].comment.createdAt,
    })
  }

  for (const [index, comment] of (pr.comments?.nodes ?? []).entries()) {
    const root = toComment(comment, 'conversation', comment?.createdAt, `conversation:${index}`)
    pushSingleton(threads, root, 'conversation')
  }

  // Oldest first, by when each exchange was OPENED — a review reads as a conversation,
  // not as a feed. Not on `updatedAt`: sorting on the last reply made a thread jump to
  // the bottom of the fold every time somebody answered it, so the list reshuffled under
  // the reader between two refreshes and a row was never where it had been. Creation
  // order is the one that holds still, and it is the order the review was written in.
  threads.sort((a, b) => compareISO(a.root.createdAt, b.root.createdAt))
  return threads
}
