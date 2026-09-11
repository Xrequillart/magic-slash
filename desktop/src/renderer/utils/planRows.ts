import type { PlanRepoRef, PlanSession, PlanTicketRead } from '../../types'

/**
 * The Plans page's data, shaped: the `plan_sessions` rows the main process read turned
 * into the rows the list renders.
 *
 * PORTED from `webapp/lib/planSessionRows.ts`, where the same list lives on the web, and
 * MUST BE KEPT IN SYNC WITH IT: someone who sees a plan at the top of the list in the
 * app and halfway down it on the web would be right to distrust both. Two copies rather
 * than a shared module for the reason `utils/skillHours.ts` gives — the desktop and the
 * webapp are separate builds with no code path and no module resolution between them.
 * What holds them together is the tables they both read.
 *
 * That obligation now covers the DETAIL view as well as the list. `groupPlanTickets` and
 * `safeTicketUrl` are ported from the same original and carry the same duty: the epic →
 * story tree a plan draws, and which of its tickets are links, must be the same tree and
 * the same links on both surfaces — a story that hangs under an epic in the app and
 * floats loose on the web is the app disagreeing with itself about what got filed.
 *
 * Four deliberate divergences from the webapp original:
 *
 *  * there is no row → camelCase mapping here. `main/cloud/plans.ts` does that, the way
 *    every other cloud read in this app does, and hands over `PlanSession` (types.ts),
 *    which already existed for the UPLOAD path and is reused rather than redeclared.
 *  * absent fields are `undefined`, not `null`: that is how `PlanSession` spells them.
 *  * `planAuthor` takes a non-optional owner and has no owner-less fallback, because
 *    `plan_sessions.owner_id` is `not null` and the desktop type says so. The webapp's
 *    placeholder for that unreachable case has no counterpart here.
 *  * there is no notion of the reader's OWN sessions. The webapp labels those "you"; the
 *    desktop list names every author the same way, in one column, so that a row reads
 *    the same whoever is looking at it. That also means no `viewerId` reaches this
 *    module — see `planAuthor`.
 *
 * Pure: no IPC, no React, no Supabase. The reads are `window.electronAPI.plans.list()`
 * and `.detail(id)`.
 */

/** `planning` while the spec is being written, `planned` once tickets exist. */
export type PlanStatus = 'planning' | 'planned'

/**
 * A session with everything one row of the list prints, resolved.
 *
 * `status` is NARROWED from the free text `PlanSession` carries off the wire: the list
 * draws one of two pills, and a third word would draw neither.
 */
export interface PlanCard extends Omit<PlanSession, 'status'> {
  status: PlanStatus
  /** Undefined when the repository is not visible to the reader, or was deleted. */
  repoName?: string
  /** The owner's email when it can be resolved, else a short form of their uuid. */
  author: string
  /** The owner's photo as a `data:` URL, absent when they have none or are unknown. */
  avatarUrl?: string
  ticketCount: number
}

/**
 * `status` is free text by design — the migration declines a CHECK precisely so the app
 * can add a value without a migration, which means a row written by a newer desktop
 * build can carry a word this bundle has never heard of. Anything unrecognised reads as
 * `planning`: a session whose tickets are not confirmed is the honest default, and it is
 * also what an unfinished row actually is.
 */
export function toStatus(value: string | undefined): PlanStatus {
  return value === 'planned' ? 'planned' : 'planning'
}

/**
 * The timestamp a session is sorted and dated by: when it last changed, falling back to
 * when it was created. Both are optional in principle, and a row with neither sorts last
 * rather than throwing the comparator off.
 */
export function planRecency(session: Pick<PlanSession, 'updatedAt' | 'createdAt'>): number {
  for (const iso of [session.updatedAt, session.createdAt]) {
    if (!iso) continue
    const at = new Date(iso).getTime()
    if (!Number.isNaN(at)) return at
  }
  return 0
}

/**
 * Most recent first. Ties break on id so the order is stable across renders — two
 * sessions created in the same second would otherwise swap places on every refetch.
 * Returns a new array; the input is left alone.
 */
export function sortPlanSessions<T extends PlanSession>(sessions: T[]): T[] {
  return [...sessions].sort(
    (a, b) => planRecency(b) - planRecency(a) || a.id.localeCompare(b.id),
  )
}

/**
 * The list's repository filter. `null` means "every repository", which is the default
 * view — team and personal sessions in one list.
 *
 * There is no "all repositories" SENTINEL in here on purpose, and there is none in the
 * webapp either: the sentinel is a page-local constant of whichever picker needs one to
 * put in an `<option>`, and this module only ever sees the resolved answer.
 */
export function filterPlanCards<T extends Pick<PlanSession, 'repoId'>>(
  cards: T[],
  repoId: string | null,
): T[] {
  if (repoId === null) return cards
  return cards.filter((card) => card.repoId === repoId)
}

/**
 * The repositories worth offering in the filter: the ones that actually have a session,
 * named, in alphabetical order. Offering every visible repository would bury the two or
 * three that have plans in a list of twenty that do not.
 */
export function planRepoOptions(cards: PlanCard[], repos: PlanRepoRef[]): PlanRepoRef[] {
  const used = new Set(cards.map((c) => c.repoId).filter((id): id is string => id !== undefined))
  return repos.filter((r) => used.has(r.id)).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The owner, as a string a reader can act on. An email when the roster of a shared
 * organization gives us one; otherwise the first segment of the uuid, which is not a
 * name but is at least a handle two rows can be told apart by.
 *
 * There is no better answer available: `profiles` is own-rows-only by RLS
 * (`20260724130000_profiles.sql`), so a teammate's chosen NAME cannot be read at all —
 * the `list_org_members` RPC's email is the whole of what an org member may learn about
 * another, and it is what the app already labels teammates' agents with.
 *
 * THE READER'S OWN SESSIONS GET THE SAME ANSWER as everyone else's. The list used to
 * print "you" over a row you wrote yourself; it now names whoever wrote the plan, full
 * stop. One column, one kind of value — a row reads the same over a colleague's
 * shoulder as it does on your own screen, which is what makes the column scannable, and
 * it is why no `viewerId` is passed in here any more.
 */
export function planAuthor(ownerId: string, emailByOwner: Record<string, string>): string {
  return emailByOwner[ownerId] ?? ownerId.slice(0, 8)
}

/**
 * What the row's headline says. `title` is the agreed epic/story wording the skill
 * pushes at Step 6.1, and it is what a reader recognises — but it is absent until that
 * write lands, so the slug (which exists from the first metadata write) is the fallback,
 * and the spec key is the last resort so a row is never nameless.
 */
export function planLabel(session: Pick<PlanSession, 'title' | 'slug' | 'specKey'>): string {
  return session.title?.trim() || session.slug?.trim() || session.specKey.slice(0, 12)
}

/**
 * The list, ready to render: one row per session, newest first, with its repository
 * name, its author and their photo, and its ticket count resolved.
 *
 * Sessions are NOT filtered by organization here, and must not be: RLS returned exactly
 * the rows the reader may see — their own plus every plan on a repository shared with
 * one of their organizations — so a filter added on this side could only ever hide
 * something the database already decided to show.
 */
export function buildPlanCards(
  sessions: PlanSession[],
  ticketSessionIds: string[],
  repos: PlanRepoRef[],
  emailByOwner: Record<string, string>,
  avatarByOwner: Record<string, string>,
): PlanCard[] {
  const repoNameById = new Map(repos.map((r) => [r.id, r.name]))

  const counts = new Map<string, number>()
  for (const sessionId of ticketSessionIds) {
    counts.set(sessionId, (counts.get(sessionId) ?? 0) + 1)
  }

  return sortPlanSessions(sessions).map((session) => ({
    ...session,
    status: toStatus(session.status),
    repoName: session.repoId ? repoNameById.get(session.repoId) : undefined,
    author: planAuthor(session.ownerId, emailByOwner),
    // Absent for an owner with no photo, and for one the rosters do not cover: both are
    // the same thing to a row, which draws the generic icon either way.
    avatarUrl: avatarByOwner[session.ownerId],
    ticketCount: counts.get(session.id) ?? 0,
  }))
}

/**
 * One epic and the stories filed under it. `epic` is undefined for the trailing group of
 * stories that belong to no epic — see `groupPlanTickets`.
 *
 * `undefined` where the webapp says `null`, which is this module's standing divergence:
 * that is how the desktop's types spell an absent field, all the way from
 * `PlanTicketRead` back to the row mapper in `main/cloud/plans.ts`.
 */
export interface PlanTicketGroup {
  epic?: PlanTicketRead
  stories: PlanTicketRead[]
}

/**
 * The ticket's URL when it is safe to put behind a link, otherwise undefined.
 *
 * NO DESKTOP CALLER TODAY: the plan page's ticket rows open the ticket inside the app
 * rather than in a browser, so there is no href for them to check. It is kept, and kept
 * exported, because of the duty in this module's header — the webapp's `/plans/[id]`
 * links the same rows and goes through the same function, and deleting this side's copy
 * would leave that rule with one implementation and no counterpart to be kept in sync
 * with. The i18n keys the glyph used are gone; this is not dead weight of the same kind.
 *
 * Only `http:` and `https:`. The desktop rejects anything else before STORING it, but
 * what is rendered here was written by another process, on another version, into a table
 * every member of the organization can read — so the scheme is checked again on the way
 * out. A `javascript:` href here would be a script a colleague's click runs, and in this
 * app it would run inside the renderer rather than in a browser tab.
 *
 * Undefined is already a rendered state — a tracker that returned a key but no browse
 * link — so a rejected URL degrades into it: the ticket still shows, it is just not a
 * link. Nothing is hidden by refusing it.
 */
export function safeTicketUrl(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const scheme = new URL(url).protocol
    return scheme === 'http:' || scheme === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

/**
 * Group tickets into the hierarchy the tracker actually created: each epic followed by
 * its stories, then — last — the stories that point at no epic.
 *
 * THAT LAST GROUP IS THE POINT. `parentKey` is whatever the skill sent, and it can miss
 * for real reasons: a single-story plan has no epic at all, and a partial creation (the
 * epic call failed, the stories succeeded) leaves children whose parent was never filed.
 * Dropping those rows would show a plan as having fewer tickets than it has, which is
 * exactly the failure a reader opens this page to investigate. So an unmatched story
 * renders, just without a parent above it.
 *
 * Sorted by creation time with the KEY as the tiebreak, because a tracker stamps a whole
 * batch of stories to the same second and a sort that cannot separate them would deal
 * them differently on every render.
 */
export function groupPlanTickets(tickets: PlanTicketRead[]): PlanTicketGroup[] {
  const byCreation = [...tickets].sort(
    (a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.key.localeCompare(b.key),
  )

  const epics = byCreation.filter((ticket) => ticket.kind === 'epic')
  const epicKeys = new Set(epics.map((epic) => epic.key))

  const groups: PlanTicketGroup[] = epics.map((epic) => ({
    epic,
    // A story whose parent is its own epic, and nothing else: `parentKey` is compared to
    // the epic's key, so a story pointing at a DIFFERENT epic in the same session lands
    // under that one instead of being duplicated here.
    stories: byCreation.filter((ticket) => ticket.kind !== 'epic' && ticket.parentKey === epic.key),
  }))

  const orphans = byCreation.filter(
    (ticket) =>
      ticket.kind !== 'epic' && (ticket.parentKey === undefined || !epicKeys.has(ticket.parentKey)),
  )
  if (orphans.length > 0) groups.push({ epic: undefined, stories: orphans })

  return groups
}
