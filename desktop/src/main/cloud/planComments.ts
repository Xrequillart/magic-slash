import { isPlanCommentAnchor, type NewPlanComment, type PlanComment, type PlanCommentAnchor, type PlanCommentsRead } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'
import { listOrgsRead } from './org'
import { fetchAuthors } from './plans'

/**
 * Comments on a `/magic:plan` session's spec — the READ and the three WRITES onto
 * `public.plan_comments` (20260922100000).
 *
 * THE RENDERER NEVER TALKS TO SUPABASE. This module is the whole of the app's access to
 * that table; `main/ipc/plans-handlers.ts` exposes it on four channels and the preload
 * bridge hands the renderer four functions. Nothing below decides WHO may do anything:
 * the policies do, and they are the only thing that can — a renderer cannot be trusted
 * about whose comment it is asking to delete, and an `author_id` filter added here would
 * be a second, weaker copy of a rule the database already enforces.
 *
 * WHICH IS WHY `author_id` IS SENT AND NOT ASSUMED. `plan_comments_insert` tests
 * `author_id = auth.uid()`, so the column cannot be left to a default and cannot be taken
 * from the renderer either. It comes off the stored session here, which is the same place
 * `listOrgsRead` reads the caller's identity from.
 *
 * NO REALTIME. The table is deliberately not published (see the migration's closing note,
 * and issue #298). Every write below is followed by a refetch on the renderer's side —
 * `usePlanComments` — which is the whole of how a thread stays current.
 */

interface PlanCommentRow {
  id: string
  session_id: string
  author_id: string
  parent_id: string | null
  body: string | null
  anchor: unknown
  quote: string | null
  resolved_at: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Every column the thread draws, named rather than `*`.
 *
 * Spelled out for the reason `LIST_COLUMNS` next door is: a `select('*')` is a promise to
 * ship whatever the table grows next, which on a table holding other people's writing is
 * the wrong default.
 */
const COMMENT_COLUMNS =
  'id, session_id, author_id, parent_id, body, anchor, quote, resolved_at, created_at, updated_at'

/**
 * How many comments one opening of a plan brings back.
 *
 * A CAP THE APP CHOOSES, for `PLAN_LIST_LIMIT`'s reason: PostgREST stops at its own
 * `db-max-rows` anyway, silently, and a read that hits that ceiling without an ORDER BY
 * returns an ARBITRARY page. Ordered by `created_at` ASCENDING here rather than descending,
 * because a conversation cut short has to lose its END and not its beginning — a thread
 * whose head was dropped would have every reply promoted to a thread of its own by
 * `buildPlanCommentThreads`, which is the worst reading of a partial answer.
 *
 * ASKED FOR ONE MORE THAN THIS, AND THE EXTRA ROW IS NEVER SHOWN. A cap that simply cut
 * the list off left the reader with no way to tell a plan with 500 comments from a plan
 * with 5000, and a comment they had just written from one that fell off the end — the
 * refetch after a successful write would come back without it. The probe row is the
 * cheapest possible answer to "is there more?": if it arrives, `truncated` is set, the
 * page says so, and the row itself is dropped so the thread never shows a 501st comment
 * the cap says it is not showing.
 */
const COMMENT_LIMIT = 500

/** The stored value, or null — the shared test, applied to a jsonb column. */
function toAnchor(value: unknown): PlanCommentAnchor | null {
  return isPlanCommentAnchor(value) ? value : null
}

/**
 * One row, as the renderer's types spell it: camelCase, and `undefined` for an absent
 * field rather than `null`. The same mapping discipline `toPlanSession` follows, in the
 * same layer, so the renderer never meets a database row.
 *
 * `quote` falls back to the empty string and `body` with it, because both are `not null` in
 * the table: the coalescing covers the column being widened later, not a row that exists
 * today. An empty quote is a meaningful value — a comment on the document as a whole — and
 * `commentAnchorKind` is what reads it that way.
 */
function toPlanComment(row: PlanCommentRow): PlanComment {
  return {
    id: row.id,
    sessionId: row.session_id,
    authorId: row.author_id,
    parentId: row.parent_id ?? undefined,
    anchor: toAnchor(row.anchor),
    quote: row.quote ?? '',
    body: row.body ?? '',
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }
}

/** An answer with nothing in it and nothing wrong — signed out, or cloud off. */
const NOTHING: PlanCommentsRead = {
  comments: [], emailByAuthor: {}, avatarByAuthor: {}, truncated: false, failed: false,
}

/**
 * Every comment on ONE plan, with the addresses and photos of whoever wrote them.
 *
 * TWO WAVES, and the second one has to be second: the authors can only be narrowed to the
 * people actually on screen once the comments are in, which is the discipline `fetchAuthors`
 * exists to keep — a ten-person organization whose plan two of them commented on downloads
 * two photos, not ten. The organizations are listed alongside the comments rather than
 * behind them, exactly as `listPlanSessions` does it, so the roster call is the only thing
 * waiting on anything.
 *
 * NOT SCOPED BY AUTHOR OR BY ORGANIZATION. `plan_comments_select` returns precisely what
 * this reader may see — the comments of every session they can read — and a filter added
 * here could only hide a row the database chose to show. It is also what makes a
 * COLLEAGUE'S comment visible on my plan, which is half the point of the feature.
 *
 * THE THREE STATES, as everywhere else in this neighbourhood. Nowhere to read from is an
 * unfailed nothing; a query that errored is `failed: true`, because "nobody has commented
 * on this plan" is a claim about a colleague's silence and a dropped connection is no
 * evidence for it.
 *
 * `truncated` IS THE SAME SCRUPLE ONE STEP ON. A capped list that says nothing about being
 * capped is another claim about a colleague's silence — a quieter one, because everything
 * on screen is real. It is reported separately from `failed` because a truncated read is a
 * SUCCESSFUL one: the page draws every comment it got, and adds a line saying there are
 * more.
 *
 * The rosters are outside that judgement, for `fetchAuthors`' own reason: a missing face is
 * not a missing comment, and `planAuthor` already has a defined answer for an
 * address it could not resolve.
 */
export async function listPlanComments(sessionId: string): Promise<PlanCommentsRead> {
  const client = await getAuthedClient()
  if (!client) return NOTHING

  const [read, orgs] = await Promise.all([
    client
      .from('plan_comments')
      .select(COMMENT_COLUMNS)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      // One more than the cap, on purpose — see `COMMENT_LIMIT`. The extra row is a probe
      // for "is there more?" and is dropped below rather than drawn.
      .limit(COMMENT_LIMIT + 1),
    listOrgsRead(),
  ])

  if (read.error || !read.data) return { ...NOTHING, failed: true }

  const rows = read.data as unknown as PlanCommentRow[]
  const truncated = rows.length > COMMENT_LIMIT
  const comments = (truncated ? rows.slice(0, COMMENT_LIMIT) : rows).map(toPlanComment)
  // NOBODY TO NAME, so no roster to fetch. `fetchAuthors` issues one member listing per
  // organization the reader belongs to, and on a plan nobody has commented on every one of
  // them would be answered and thrown away — on the critical path of opening the plan,
  // which today is the overwhelmingly common case.
  if (comments.length === 0) return NOTHING

  const authorIds = new Set(comments.map((comment) => comment.authorId))
  const { emailByOwner, avatarByOwner } = await fetchAuthors(orgs.orgs, authorIds)

  return {
    comments,
    emailByAuthor: emailByOwner,
    avatarByAuthor: avatarByOwner,
    truncated,
    // The org list failing costs every comment its author's name, which `planAuthor`
    // degrades to a short uuid — a page that still reads. It is not a failed READ, and
    // reporting it as one would replace a readable thread with an error block.
    failed: false,
  }
}

/**
 * Whether a write went through — the shape all three of them answer in.
 *
 * A BOOLEAN AND NOT A THROW, and not the written row either. The caller's next move is the
 * same in both directions: refetch. A row handed back would be a second source of truth
 * about a thread the refetch is about to replace wholesale, and the two would differ for
 * exactly as long as it took the refetch to land.
 *
 * `false` IS AN ERROR CAME BACK — a broken connection, no session to sign the write with, or
 * a policy that RAISED. The last of those is the insert alone: a WITH CHECK violation is an
 * error (42501), so a comment the policies will not admit does come back as `false`, and it
 * is deliberately not told apart from the connection failing — the interface has already
 * decided not to offer the action, and a renderer that could distinguish them would be a
 * renderer probing what it may not do.
 *
 * `true` IS NOT "THE ROW CHANGED", and that is the asymmetry to know about here. The update
 * and delete policies restrict through a USING clause, which FILTERS rather than refuses: a
 * write on somebody else's comment simply matches no row, PostgREST reports no error, and
 * `updatePlanComment`/`deletePlanComment` answer `true` having changed nothing.
 * `supabase/tests/plan_comments.test.sql` pins exactly that, which is why its assertions
 * read the row back instead of expecting a rejection.
 *
 * Harmless as the contract stands, because the caller's next move is the same either way:
 * it refetches, and a comment the database kept comes back as it was. Anything that ever
 * needed to REPORT the refusal would have to ask for the affected rows, not read this
 * boolean.
 */
type WriteResult = boolean

/**
 * Leave a comment, or a reply to one.
 *
 * `author_id` COMES OFF THE SESSION, never off the argument: the insert policy tests it
 * against `auth.uid()`, so a value from the renderer could only ever be right by accident
 * or wrong on purpose. No session means nobody to sign it, which is a refusal rather than
 * an anonymous row.
 *
 * `parent_id` is passed through untouched. Whether it names a comment of this very session
 * is the policy's question — see the insert policy's third clause, which is the thing
 * stopping a thread from straddling two plans.
 */
export async function createPlanComment(input: NewPlanComment): Promise<WriteResult> {
  const client = await getAuthedClient()
  if (!client) return false

  const authorId = loadSession()?.user?.id
  if (!authorId) return false

  const { error } = await client.from('plan_comments').insert({
    session_id: input.sessionId,
    author_id: authorId,
    parent_id: input.parentId ?? null,
    anchor: input.anchor,
    quote: input.quote,
    body: input.body,
  })
  return !error
}

/**
 * Rewrite one comment's body, and nothing else about it.
 *
 * THE BODY ALONE is in the patch, which is a narrowing this side gets to make even though
 * the policies do not require it: `plan_comments_update` would let an author move their own
 * comment to another passage or another thread, and there is no interface for either. A
 * patch listing one column cannot be widened by a caller that sends more.
 *
 * Not filtered by author. RLS is what decides, and adding `.eq('author_id', …)` here would
 * silently turn an admin's moderation — which the policy allows — into a no-op.
 */
export async function updatePlanComment(id: string, body: string): Promise<WriteResult> {
  const client = await getAuthedClient()
  if (!client) return false

  const { error } = await client.from('plan_comments').update({ body }).eq('id', id)
  return !error
}

/**
 * Remove one comment.
 *
 * The replies under it survive — `parent_id` is `on delete set null`, so they are promoted
 * to threads of their own rather than going with it. That is a schema decision and it is
 * documented on the column; it is restated here because this is the function somebody will
 * be reading when they wonder where a colleague's reply went.
 */
export async function deletePlanComment(id: string): Promise<WriteResult> {
  const client = await getAuthedClient()
  if (!client) return false

  const { error } = await client.from('plan_comments').delete().eq('id', id)
  return !error
}
