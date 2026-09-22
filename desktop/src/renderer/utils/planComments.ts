import type { PlanComment } from '../../types'
import { commentAnchorKind } from './commentAnchors'

/**
 * The comments on one plan, shaped: a flat `parent_id` list turned into the threads the
 * page draws.
 *
 * WHY THIS FILE EXISTS AT ALL rather than living in the component. The renderer suite
 * runs on the ROOT `node_modules` with no jsdom, so nothing importing React can be
 * covered — and everything below is a decision with a wrong answer: a reply whose parent
 * was deleted, a thread nested three deep, two turns of the same second. Each of those
 * silently loses or reorders somebody's writing when it is got wrong, and none of them is
 * visible in a screenshot. So they live here, as functions over plain records, with a test
 * beside them.
 *
 * WHICH COMMENTS LOST THEIR ANCHOR is NOT answered here, and deliberately: only the view
 * knows what the spec currently renders as, so `MarkdownCommentLayer` names the ones it
 * could not place and hands them to the page to draw. With ONE exception, below —
 * `isOrphanedPlanCommentThread` — because a thread carrying no quote at all has nothing for
 * that view to search for, and a question no document can answer is not the view's to ask.
 *
 * Pure: no React, no IPC, no Supabase. The read is `window.electronAPI.plans.comments.list()`.
 */

/**
 * One thread: the comment that was left on a passage, and the replies under it.
 *
 * ONE LEVEL DEEP, where the table allows any depth. `plan_comments.parent_id` points at
 * another comment and nothing stops a reply to a reply, but the card draws a
 * conversation, not a tree — GitHub's review threads are flat for the same reason, and a
 * fourth level of indentation inside a card spliced into prose has nowhere to go. So a
 * deep reply is attached to the thread's HEAD rather than to its immediate parent: it
 * stays in the conversation it was written into, in creation order, which is where a
 * reader expects to find it.
 *
 * That is a flattening of the DISPLAY and not of the data — `parentId` is preserved on
 * every comment, so a later story can draw the nesting without a migration or a backfill.
 */
export interface PlanCommentThread {
  /** The comment the passage was quoted on. Its `quote` is the thread's anchor. */
  head: PlanComment
  /** Everything written under it, oldest first. Empty for a thread nobody answered. */
  replies: PlanComment[]
}

/**
 * When a comment was written, as a number, with an unparseable stamp sorting FIRST.
 *
 * Zero for "no such timestamp", the sentinel `planRecency` already uses next door — and
 * the direction is the opposite of that function's for a reason: a list of plans is
 * newest-first, so a row with no date belongs at the bottom, while a conversation is
 * oldest-first and a turn with no date belongs at the top, before everything that can be
 * placed. `created_at` is `not null default now()` in the table, so this only ever
 * catches a value no `Date` can parse.
 */
function commentAt(comment: PlanComment): number {
  if (!comment.createdAt) return 0
  const at = new Date(comment.createdAt).getTime()
  return Number.isNaN(at) ? 0 : at
}

/**
 * Oldest first, ties broken on id — a conversation, in the order it was had.
 *
 * The tie-break is not decoration: two replies posted in the same second would otherwise
 * swap places on every refetch, and the refetch here happens after every write. Returns a
 * new array; the input is left alone.
 */
export function sortPlanComments<T extends PlanComment>(comments: readonly T[]): T[] {
  return [...comments].sort((a, b) => commentAt(a) - commentAt(b) || a.id.localeCompare(b.id))
}

/**
 * How far a parent chain is walked before it is called a cycle.
 *
 * `parent_id` is a self-reference with no constraint against a loop — nothing the app
 * writes could make one, and a database is not a place to be sure about that. A depth
 * limit is what turns "impossible" into "bounded": past it the comment is treated as a
 * head of its own, which keeps it on screen rather than hanging the render.
 */
const MAX_PARENT_DEPTH = 64

/**
 * The threads, from the flat list.
 *
 * NOTHING IS EVER DROPPED, and that is the whole of the design here. Three things can go
 * wrong with a `parent_id` and each has an answer that keeps the writing on screen:
 *
 *  * THE PARENT WAS DELETED. `on delete set null` in the table means this normally
 *    arrives as a null `parent_id`, but the row can also have been deleted between the
 *    read and… nothing, really — the read is one query. It is handled anyway, because the
 *    alternative is a reply that exists in the database and on no screen: a comment whose
 *    parent is not in this list becomes a HEAD.
 *  * THE PARENT IS ITSELF A REPLY. Flattened to the thread's head — see
 *    `PlanCommentThread`.
 *  * THE CHAIN LOOPS. Bounded by `MAX_PARENT_DEPTH`, and the comment becomes a head.
 *
 * Heads come back in creation order, and so do the replies inside each one. The head's own
 * `createdAt` orders the threads, not its newest reply: a thread is placed in the document
 * where its PASSAGE is, and reordering the cards because somebody answered an old comment
 * would move a card away from the text it is about.
 */
export function buildPlanCommentThreads(comments: readonly PlanComment[]): PlanCommentThread[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]))

  /**
   * The head of the thread this comment belongs to — itself, when it is one.
   *
   * Walked rather than memoised: a plan's comments are a page's worth, the chains are one
   * link long in practice, and a cache keyed by id would have to be invalidated by exactly
   * the cycle guard below.
   */
  const headOf = (comment: PlanComment): PlanComment => {
    let current = comment
    for (let depth = 0; depth < MAX_PARENT_DEPTH; depth++) {
      if (!current.parentId) return current
      const parent = byId.get(current.parentId)
      if (!parent || parent.id === current.id) return current
      current = parent
    }
    return current
  }

  const threads = new Map<string, PlanCommentThread>()
  const replies: { comment: PlanComment; headId: string }[] = []

  // TWO PASSES, and the first one cannot be merged into the second: a reply can be read
  // before the comment it answers — `created_at` orders them, and a clock skew of one
  // second between two machines is enough — so the thread it belongs to may not exist yet
  // at the moment the reply is seen.
  //
  // `headOf` is walked ONCE PER COMMENT, in the first pass: the second pass reads the
  // answer it set aside rather than walking the same chain again.
  for (const comment of sortPlanComments(comments)) {
    const head = headOf(comment)
    if (head.id === comment.id) threads.set(comment.id, { head: comment, replies: [] })
    else replies.push({ comment, headId: head.id })
  }
  for (const { comment, headId } of replies) {
    // The head is in the map by construction: `headOf` only ever returns a comment of this
    // list, and every such comment that is its own head got an entry in the pass above.
    threads.get(headId)?.replies.push(comment)
  }

  return [...threads.values()]
}

/**
 * Whether a thread has no passage to attach to AT ALL — an orphan the view could never
 * place, however the spec is currently written.
 *
 * THE DELETION PATH THIS EXISTS FOR. A reply is stored with `quote: ''` on purpose: it
 * inherits its head's passage, so the layer has one quotation to relocate per thread rather
 * than one per turn. `plan_comments.parent_id` is `on delete set null`, so an author
 * deleting their own head comment leaves its replies behind and `buildPlanCommentThreads`
 * promotes them to threads of their own — which is the whole point of that column, and
 * which hands the view a HEAD with an empty quote.
 *
 * Without this, such a head is swallowed. `commentAnchorKind` reads an empty quote as a
 * comment on the whole file — the right answer in a review, where it is exactly what a
 * whole-file note is — so the rendered view drops it from the passages it marks, draws it no
 * card, and, because the lost set is derived from those same passages, does not count it as
 * lost either. The row survives in the database and appears on no screen, with no notice:
 * the one outcome the story's fifth criterion exists to forbid, reached through a deletion
 * the interface itself offers.
 *
 * So it is orphaned instead, and shown under the notice beside the comments whose quote no
 * longer locates. Both are the same sentence to a reader — this comment has no passage to
 * attach to — and both keep the writing on screen, which is what the criterion asks for.
 *
 * CLOUD ONLY, and that is why it is here rather than in `commentAnchors`. In the store's
 * world a quote-less comment is a legitimate note on the whole file and calling it an orphan
 * would break four working call sites; on a plan there is no file to comment on, so the only
 * way to hold an empty quote is to have lost the head that carried one.
 *
 * Read through `commentAnchorKind` rather than testing the quote here, so the discriminant
 * stays spelled in one place: a line-anchored plan comment — the column exists, nothing
 * writes it yet — has a passage of its own and is not an orphan.
 */
export function isOrphanedPlanCommentThread(thread: PlanCommentThread): boolean {
  return commentAnchorKind(thread.head) === 'file'
}

/**
 * Whether this reader may edit or delete a comment: theirs, and nobody else's.
 *
 * THE INTERFACE HIDES IT, THE POLICIES REFUSE IT. This is what decides whether the Edit
 * and Delete buttons are drawn, and it is deliberately the weaker of the two guards —
 * `plan_comments_update` and `plan_comments_delete` test `author_id = auth.uid()` in the
 * database, where a renderer cannot reach them. An org admin is not given the buttons here
 * even though the policies allow them the write: the admin path is moderation, exercised
 * from the webapp, and putting a Delete on every teammate's comment in the app would make
 * the ordinary case look like the exceptional one.
 *
 * `undefined` for the viewer is a signed-out reader, who owns nothing.
 */
export function canEditPlanComment(comment: PlanComment, viewerId: string | undefined): boolean {
  return viewerId !== undefined && comment.authorId === viewerId
}
