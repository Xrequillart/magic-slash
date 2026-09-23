import { ipcMain } from 'electron'
import { EMPTY_PLAN_HISTORY, isPlanCommentAnchor, type NewPlanComment, type PlanCommentsRead, type PlanDetail, type PlanHistoryRead, type PlanLinksRead, type PlanLocalSpec, type PlanOverview, type PlanRevisionDiff, type PlanSpecUpdateResult, type PlanStatus, type PlanStatusUpdateResult, type PlanTicketOrigin, PLAN_STATUSES } from '../../types'
import { findPlanForTicket, listPlanDetail, listPlanSessions, updatePlanStatus } from '../cloud/plans'
import {
  createPlanComment, deletePlanComment, listPlanComments, updatePlanComment,
} from '../cloud/planComments'
import { resolveLocalSpecPath, saveEditedPlanSpec } from '../store/plan-edit'
import { createPlanLink, deletePlanLink, listPlanLinks } from '../cloud/planLinks'
import { listPlanHistory, readRevisionTexts } from '../cloud/planHistory'
import { unifiedSpecDiff } from '../store/specDiff'
import { annotateAgainstDiff, highlightNumbered, previewShikiTheme } from './config-handlers'

/**
 * The renderer is expected to send back a uuid it got from `plans:list`, and RLS would
 * answer `session: null` for anything else. The guard is here anyway, because "the
 * caller is well behaved" is not a property this side of the bridge can check: every
 * other handler in this directory validates its arguments, and a channel that trusts its
 * input is the one that stops being true the day something else calls it.
 *
 * It is a SHAPE check, not an authorization check — that stays with RLS, which is the
 * only thing that knows which sessions this reader may see. So a malformed id gets the
 * same answer a well-formed unknown one does, rather than a distinguishable rejection:
 * the renderer draws one "this plan is not available" state either way.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `plan_links`' own caps: `plan_links_url_http` and `plan_links_title_length`. */
const MAX_LINK_URL = 2048
const MAX_LINK_TITLE = 200

/** An http(s) address with a host and no whitespace — the table's CHECK, said in TypeScript. */
export function isHttpUrl(value: string): boolean {
  if (value.length > MAX_LINK_URL || /\s/.test(value)) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
  } catch {
    return false
  }
}

/**
 * The Plans page's two channels: the list, and one plan.
 *
 * Beyond that guard these are pass-throughs, like `org-handlers.ts`: there is nothing to
 * decide here. Both reads answer whatever happens — each carries `failed` for a read
 * that errored, and an empty, unfailed answer for an app with nowhere to read from — so
 * there is no rejection for a try/catch to turn into anything the renderer does not
 * already draw from the answer itself.
 *
 * The renderer never talks to Supabase. This is the whole of its access to
 * `plan_sessions` and to `plan_comments`. Both are written through here: the first by
 * `plans:updateSpec` alone (the in-app editor), the second by the comment channels at
 * the bottom of this file.
 */

/**
 * The longest body a comment may carry across the bridge.
 *
 * A SHAPE CHECK LIKE THE OTHERS, and the one place a length belongs at all: `body` is `text`
 * with no constraint on it, so without a ceiling a renderer bug — a paste loop, a component
 * re-submitting on every keystroke — would push megabytes into a row every member of the org
 * then downloads on opening the plan. Generous on purpose: a review comment is a paragraph,
 * and 16k is far past anything a person types into a card three rows tall.
 */
const MAX_COMMENT_BODY = 16_000

/**
 * The longest quote a comment may carry across the bridge — `MAX_COMMENT_BODY`'s reason,
 * for the other free-text column.
 *
 * A CEILING AND NOT THE CLAMP. The renderer cuts a selection to `MAX_QUOTE_CHARS` — 2000 —
 * plus an ellipsis, in `utils/commentAnchors.ts`, so nothing the app sends comes anywhere
 * near this. This is what stands between `plan_comments.quote` and a renderer that is not
 * doing that: a bug, a future view, anything reaching the channel with a megabyte of
 * selected document. Deliberately generous, and deliberately not a second spelling of the
 * clamp — the two do not have to be kept in step, as long as this one stays the larger.
 */
const MAX_COMMENT_QUOTE = 4_000

export function setupPlansHandlers(): void {
  ipcMain.handle('plans:list', async (): Promise<PlanOverview> => listPlanSessions())
  ipcMain.handle('plans:detail', async (_e, id: unknown): Promise<PlanDetail> => {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return { session: null, tickets: [], failed: false }
    return listPlanDetail(id)
  })
  /**
   * The plan a ticket came out of, asked by the TICKET page — the one read here that
   * goes the other way round.
   *
   * The repositories are uuids from the same cloud as the session ids above, so they get
   * the same shape check and for the same reason: RLS would answer nothing for anything
   * else, and a channel that trusts its input is the one that stops being true the day
   * something else calls it. Several of them, because a ticket's card can stand for
   * several — one Jira project planned for two services. The KEYS are not
   * pattern-checked: they are tracker identifiers in two spellings and they reach
   * PostgREST as bound values, never as SQL. Both arrays are, since a handler that
   * iterates whatever arrived is the one that throws where this promises an answer.
   *
   * Every rejection is `null`, which is also what "no plan filed this" is. The two are
   * one state on the page: the block is simply not drawn, and the overwhelming majority
   * of tickets were filed by hand and have no plan behind them anyway.
   */
  ipcMain.handle('plans:forTicket', async (_e, args: unknown): Promise<PlanTicketOrigin | null> => {
    if (typeof args !== 'object' || args === null) return null
    const { repoIds, keys } = args as { repoIds?: unknown; keys?: unknown }
    if (!Array.isArray(repoIds) || !repoIds.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
      return null
    }
    if (!Array.isArray(keys) || !keys.every((key) => typeof key === 'string')) return null
    return findPlanForTicket(repoIds, keys)
  })

  /**
   * THE FOUR COMMENT CHANNELS — the first WRITES this file has ever carried.
   *
   * Nothing below authorizes anything, and that is not an omission: `plan_comments`'
   * policies decide who may write on whose plan, and they are the only thing that can.
   * A renderer asking to delete a comment is not evidence that the comment is theirs,
   * and a check here would be a second, weaker copy of a rule the database already
   * holds — one that would drift the first time an admin's moderation path changed.
   *
   * So these guards are SHAPE ONLY, like `plans:detail`'s above, and they exist for the
   * same reason: the arguments are uuids and strings that reach PostgREST as bound
   * values, and a channel that iterates whatever arrived is the one that throws where
   * this promises an answer. A malformed argument gets the same answer a well-formed
   * unauthorized one does — the write reports `false` and the read reports nothing —
   * rather than a distinguishable rejection the renderer could probe with.
   *
   * The three writes answer `boolean` rather than the row they wrote, because the
   * renderer's next move is a refetch either way. See `cloud/planComments.ts`.
   */
  ipcMain.handle('plans:comments:list', async (_e, id: unknown): Promise<PlanCommentsRead> => {
    // An unfailed nothing, exactly as `plans:detail` answers a malformed id with an
    // unfailed absence: the page draws "no comment yet", which is what an unknown plan
    // genuinely has.
    if (typeof id !== 'string' || !UUID_RE.test(id)) {
      return { comments: [], emailByAuthor: {}, avatarByAuthor: {}, truncated: false, failed: false }
    }
    return listPlanComments(id)
  })

  ipcMain.handle('plans:comments:create', async (_e, args: unknown): Promise<boolean> => {
    if (typeof args !== 'object' || args === null) return false
    const { sessionId, parentId, anchor, quote, body } = args as Record<string, unknown>
    if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) return false
    // Absent is a thread head; present has to be a uuid. `null` is accepted alongside
    // `undefined` because that is what a JSON round trip makes of an optional field.
    if (parentId !== undefined && parentId !== null
      && (typeof parentId !== 'string' || !UUID_RE.test(parentId))) return false
    // Null is the ordinary answer — every comment the app writes today is anchored to a
    // quote — and anything that is not exactly a `PlanCommentAnchor` is refused rather than
    // coerced, because jsonb will happily store whatever arrives and the next reader of the
    // column would have to defend against it forever. The test is shared with the read that
    // narrows the column, so what this refuses and what that accepts cannot come apart.
    if (anchor !== null && anchor !== undefined && !isPlanCommentAnchor(anchor)) return false
    if (typeof quote !== 'string' || quote.length > MAX_COMMENT_QUOTE) return false
    // An empty body is not a comment — it is a marker on a passage that says nothing, and
    // the only way back out of one is to delete it. The card disables Save on it; this is
    // what makes that true of the channel as well.
    if (typeof body !== 'string' || body.trim() === '' || body.length > MAX_COMMENT_BODY) return false

    // No second guard on the way in: the checks above have already narrowed both, and
    // re-testing here would read as though they might not have held.
    const input: NewPlanComment = {
      sessionId,
      parentId: parentId ?? undefined,
      anchor: anchor ?? null,
      quote,
      body,
    }
    return createPlanComment(input)
  })

  ipcMain.handle('plans:comments:update', async (_e, args: unknown): Promise<boolean> => {
    if (typeof args !== 'object' || args === null) return false
    const { id, body } = args as Record<string, unknown>
    if (typeof id !== 'string' || !UUID_RE.test(id)) return false
    if (typeof body !== 'string' || body.trim() === '' || body.length > MAX_COMMENT_BODY) return false
    return updatePlanComment(id, body)
  })

  ipcMain.handle('plans:comments:delete', async (_e, id: unknown): Promise<boolean> => {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return false
    return deletePlanComment(id)
  })

  /**
   * The external links pinned to a plan. SHAPE ONLY, like the comment channels: who may add
   * or remove one is `plan_links`' policies' question. The address is checked here as well as
   * by the table's CHECK — http(s), no whitespace, a length cap — because it is drawn as an
   * anchor, and a `javascript:` URL is the one value this channel must never carry.
   */
  ipcMain.handle('plans:links:list', async (_e, id: unknown): Promise<PlanLinksRead> => {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return { links: [], emailByAuthor: {}, failed: false }
    return listPlanLinks(id)
  })

  ipcMain.handle('plans:links:create', async (_e, args: unknown): Promise<boolean> => {
    if (typeof args !== 'object' || args === null) return false
    const { sessionId, url, kind, title } = args as Record<string, unknown>
    if (typeof sessionId !== 'string' || !UUID_RE.test(sessionId)) return false
    if (typeof url !== 'string' || !isHttpUrl(url)) return false
    if (typeof kind !== 'string' || !/^[a-z0-9_]{1,32}$/.test(kind)) return false
    if (title !== undefined && title !== null && (typeof title !== 'string' || title.length > MAX_LINK_TITLE)) return false
    const label = typeof title === 'string' && title.trim() !== '' ? title.trim() : undefined
    return createPlanLink({ sessionId, url, kind, title: label })
  })

  ipcMain.handle('plans:links:delete', async (_e, id: unknown): Promise<boolean> => {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return false
    return deletePlanLink(id)
  })

  /**
   * The plan's history: its spec revisions and its link events. READ ONLY — there is no
   * channel that writes either table, because nothing in the app does: both are written by
   * triggers, revisions by the save to `plan_sessions` itself, link events by the change to
   * `plan_links`. A malformed id is an unfailed nothing, as for the comments.
   */
  ipcMain.handle('plans:history:list', async (_e, id: unknown): Promise<PlanHistoryRead> => {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return EMPTY_PLAN_HISTORY
    return listPlanHistory(id)
  })

  /**
   * What changed between two revisions, drawn the way a changed file is: the newer text,
   * highlighted, with the older one's missing lines injected as removed rows. `fromRevisionId`
   * null is the plan's first revision, compared against nothing.
   *
   * The texts are read HERE, under the reader's own RLS, from the two ids — the renderer
   * never sends a spec to be diffed, so it cannot be made to draw a diff of a text the plan
   * never held. Two ids of two different plans are refused by `readRevisionTexts`.
   *
   * Highlighted in main, like every other preview, with the theme the file preview uses —
   * `CodeView` draws its rails in that same palette.
   */
  ipcMain.handle('plans:history:diff', async (_e, args: unknown): Promise<PlanRevisionDiff> => {
    if (typeof args !== 'object' || args === null) return { failed: true }
    const { fromRevisionId, toRevisionId } = args as Record<string, unknown>
    if (typeof toRevisionId !== 'string' || !UUID_RE.test(toRevisionId)) return { failed: true }
    if (fromRevisionId !== undefined && fromRevisionId !== null
      && (typeof fromRevisionId !== 'string' || !UUID_RE.test(fromRevisionId) || fromRevisionId === toRevisionId)) {
      return { failed: true }
    }
    const texts = await readRevisionTexts(typeof fromRevisionId === 'string' ? fromRevisionId : null, toRevisionId)
    if (!texts) return { failed: true }

    const { diff, additions, deletions } = unifiedSpecDiff(texts.older, texts.newer)
    const numbered = await highlightNumbered(texts.newer, 'md', previewShikiTheme())
    const view = numbered ? annotateAgainstDiff(numbered, diff) : null
    return {
      failed: false,
      content: texts.newer,
      highlightedHtml: view?.highlightedHtml ?? null,
      changesOnlyHtml: view?.changesOnlyHtml,
      additions,
      deletions,
    }
  })

  /**
   * Save a spec edited in the app — the one channel that writes `plan_sessions`.
   *
   * SHAPE ONLY, like the comment channels, and for their reason: who may edit whose plan
   * is `plan_sessions_update`'s question and its guard trigger's (20260923100000), and a
   * copy of that rule here would drift from it. What the handler does NOT take is as
   * much of the contract as what it does: no owner, no spec key, no path. Whether this
   * machine's spec file follows the save is decided off the row, in `store/plan-edit.ts`.
   *
   * `expectedUpdatedAt` is checked for being a non-empty string and NOTHING ELSE — not
   * parsed, not normalised. It goes back to PostgREST byte for byte as the conflict
   * guard, and any reformatting would drop its microseconds and turn every save into a
   * conflict. See `updatePlanSpec`.
   *
   * The spec's size is not checked here: the ceiling is `MAX_SPEC_BYTES`, in bytes, and
   * `saveEditedPlanSpec` applies it where the uploader's own copy of that rule lives. A
   * blank spec is REFUSED: it would wipe the cloud copy and the author's file, and a plan
   * with no spec offers no editor to put it back. The renderer disables Save on it too.
   *
   * A malformed argument is `failed`, the same answer a dropped connection gets: the
   * editor keeps the draft either way, and there is nothing else for it to do.
   */
  ipcMain.handle('plans:updateSpec', async (_e, args: unknown): Promise<PlanSpecUpdateResult> => {
    if (typeof args !== 'object' || args === null) return { status: 'failed' }
    const { id, spec, expectedUpdatedAt } = args as Record<string, unknown>
    if (typeof id !== 'string' || !UUID_RE.test(id)) return { status: 'failed' }
    if (typeof spec !== 'string' || spec.trim() === '') return { status: 'failed' }
    if (typeof expectedUpdatedAt !== 'string' || expectedUpdatedAt === '') return { status: 'failed' }
    return saveEditedPlanSpec({ id, spec, expectedUpdatedAt })
  })

  /**
   * Set a plan's status by hand. Only the four the app draws are accepted here, and the
   * database holds a hand to the same list; anything else is `failed` without a write.
   */
  ipcMain.handle('plans:updateStatus', async (_e, args: unknown): Promise<PlanStatusUpdateResult> => {
    if (typeof args !== 'object' || args === null) return { status: 'failed' }
    const { id, status } = args as Record<string, unknown>
    if (typeof id !== 'string' || !UUID_RE.test(id)) return { status: 'failed' }
    if (typeof status !== 'string' || !(PLAN_STATUSES as readonly string[]).includes(status)) return { status: 'failed' }
    return updatePlanStatus(id, status as PlanStatus)
  })

  /**
   * Where this plan's spec file is on this machine, for the page's "Rework the plan"
   * button. A READ, and the only one here that answers with a path: the renderer never
   * gets to name one, it sends the id and main finds the file (`resolveLocalSpecPath`).
   * A malformed id is `no_file`, the answer a plan with nothing on this disk gets.
   */
  ipcMain.handle('plans:localSpec', async (_e, id: unknown): Promise<PlanLocalSpec> => {
    if (typeof id !== 'string' || !UUID_RE.test(id)) return { ok: false, reason: 'no_file' }
    return resolveLocalSpecPath(id)
  })
}
