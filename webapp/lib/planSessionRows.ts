/**
 * The /plans page's data, shaped: `plan_sessions` and `plan_tickets` rows turned
 * into the cards the list renders and the epic → story tree the detail view shows.
 *
 * Deliberately free of any Supabase import so it stays a pure, testable module —
 * `lib/planSessions.ts` does the fetching and hands the rows in. That split is a
 * hard constraint rather than tidiness: the root vitest suite (which is what runs
 * `planSessionRows.test.ts`) resolves against the ROOT node_modules, and the
 * webapp's own dependencies are never installed in CI. A test that reached
 * `@supabase/supabase-js` at any depth would fail to RESOLVE. Same reasoning as
 * `lib/teamRows.ts` and `lib/settingsCatalog.ts`; see the note on `vitest.config.ts`.
 */

/** `planning` while the spec is being written, `planned` once tickets exist. */
export type PlanStatus = 'planning' | 'planned'

/** An epic, or one of the stories under it. */
export type PlanTicketKind = 'epic' | 'story'

// ── Rows, as the database returns them ───────────────────────────────────────

export interface PlanSessionRow {
  id: string
  owner_id: string | null
  repo_id: string | null
  org_id: string | null
  agent_id: string | null
  slug: string | null
  spec_key: string
  title: string | null
  idea: string | null
  /** Null until the desktop app has uploaded the file at least once. */
  spec: string | null
  status: string | null
  spec_synced_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface PlanTicketRow {
  session_id: string
  key: string
  url: string | null
  title: string | null
  kind: string | null
  parent_key: string | null
  created_at: string | null
}

/** The repository a session was planned against — id and name is all a card needs. */
export interface PlanRepo {
  id: string
  name: string
}

// ── View models ──────────────────────────────────────────────────────────────

export interface PlanSession {
  id: string
  ownerId: string | null
  repoId: string | null
  orgId: string | null
  agentId: string | null
  slug: string | null
  specKey: string
  title: string | null
  idea: string | null
  spec: string | null
  status: PlanStatus
  specSyncedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface PlanTicket {
  sessionId: string
  key: string
  url: string | null
  title: string | null
  kind: PlanTicketKind
  parentKey: string | null
  createdAt: string | null
}

/**
 * A ticket reduced to the session it belongs to — all `buildPlanCards` reads of
 * one, since the list prints a count. Named so the fetch layer can select that
 * single column instead of hydrating whole tickets to be tallied and dropped.
 */
export type PlanTicketRef = Pick<PlanTicket, 'sessionId'>

/**
 * One epic and the stories filed under it. `epic` is null for the trailing group
 * of stories that belong to no epic — see `groupPlanTickets`.
 */
export interface PlanTicketGroup {
  epic: PlanTicket | null
  stories: PlanTicket[]
}

/** A session with everything the list card prints, resolved. */
export interface PlanCard extends PlanSession {
  /** Null when the repository is not visible to the reader, or was deleted. */
  repoName: string | null
  /** The owner's email when it can be resolved, else a short form of their uuid. */
  author: string
  /** True when the reader owns this session — the page labels those differently. */
  own: boolean
  ticketCount: number
}

// ── Mapping ──────────────────────────────────────────────────────────────────

/**
 * `status` is free text by design — the migration declines a CHECK precisely so
 * the app can add a value without a migration, which means a row written by a
 * newer desktop build can carry a word this bundle has never heard of. Anything
 * unrecognised reads as `planning`: a session whose tickets are not confirmed is
 * the honest default, and it is also what an unfinished row actually is.
 *
 * Exported because the WRITE side reads its own result back through it: the two
 * values `setPlanSessionStatus` accepts are exactly the two this recognises, and
 * that is the one place it is enforced — the column would take any word.
 */
export function toStatus(value: string | null): PlanStatus {
  return value === 'planned' ? 'planned' : 'planning'
}

export function toPlanSession(row: PlanSessionRow): PlanSession {
  return {
    id: row.id,
    ownerId: row.owner_id,
    repoId: row.repo_id,
    orgId: row.org_id,
    agentId: row.agent_id,
    slug: row.slug,
    specKey: row.spec_key,
    title: row.title,
    idea: row.idea,
    spec: row.spec,
    status: toStatus(row.status),
    specSyncedAt: row.spec_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * The ticket's URL when it is safe to put behind a link, otherwise null.
 *
 * Only `http:` and `https:`. The desktop rejects anything else before storing it, but
 * this page renders rows written by another process, on another version, to a table
 * every member of the organization can read — so the scheme is checked again on the way
 * out. A `javascript:` href here would be a clickable script in a colleague's browser.
 *
 * `null` is already a rendered state (a tracker that returned a key but no browse
 * link), so a rejected URL degrades into it: the ticket still shows, it is just not a
 * link.
 */
export function safeTicketUrl(url: string | null): string | null {
  if (!url) return null
  try {
    const scheme = new URL(url).protocol
    return scheme === 'http:' || scheme === 'https:' ? url : null
  } catch {
    return null
  }
}

export function toPlanTicket(row: PlanTicketRow): PlanTicket {
  return {
    sessionId: row.session_id,
    key: row.key,
    url: safeTicketUrl(row.url),
    title: row.title,
    // Same reasoning as `toStatus`: an unknown kind is treated as a story, which
    // is the leaf. Calling it an epic would invent a parent for other rows.
    kind: row.kind === 'epic' ? 'epic' : 'story',
    parentKey: row.parent_key,
    createdAt: row.created_at,
  }
}

// ── Derivation ───────────────────────────────────────────────────────────────

/**
 * The timestamp a session is sorted and dated by: when it last changed, falling
 * back to when it was created. Both are nullable in principle, and a row with
 * neither sorts last rather than throwing the comparator off.
 */
export function planRecency(session: PlanSession): number {
  for (const iso of [session.updatedAt, session.createdAt]) {
    if (!iso) continue
    const at = new Date(iso).getTime()
    if (!Number.isNaN(at)) return at
  }
  return 0
}

/**
 * Most recent first. Ties break on id so the order is stable across renders —
 * two sessions created in the same second would otherwise swap places on every
 * refetch. Returns a new array; the input is left alone.
 */
export function sortPlanSessions<T extends PlanSession>(sessions: T[]): T[] {
  return [...sessions].sort(
    (a, b) => planRecency(b) - planRecency(a) || a.id.localeCompare(b.id),
  )
}

/**
 * The list's repository filter. `null` means "every repository", which is the
 * default view — team and personal sessions in one list.
 */
export function filterPlanCards<T extends PlanSession>(cards: T[], repoId: string | null): T[] {
  if (repoId === null) return cards
  return cards.filter((card) => card.repoId === repoId)
}

/**
 * The repositories worth offering in the filter: the ones that actually have a
 * session, named, in alphabetical order. Offering every visible repository would
 * bury the two or three that have plans in a list of twenty that do not.
 */
export function planRepoOptions(cards: PlanCard[], repos: PlanRepo[]): PlanRepo[] {
  const used = new Set(cards.map((c) => c.repoId).filter((id): id is string => id !== null))
  return repos.filter((r) => used.has(r.id)).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The owner, as a string a reader can act on. An email when the roster of a
 * shared organization gives us one; otherwise the first segment of the uuid,
 * which is not a name but is at least a handle two rows can be told apart by.
 *
 * There is no better answer available: `profiles` is own-rows-only by RLS
 * (`20260724130000_profiles.sql`), so a teammate's chosen NAME cannot be read at
 * all — the `list_org_members` RPC's email is the whole of what an org member may
 * learn about another, and it is what `lib/team.ts` already labels agents with.
 */
export function planAuthor(ownerId: string | null, emailByOwner: Record<string, string>): string {
  if (!ownerId) return '—'
  return emailByOwner[ownerId] ?? ownerId.slice(0, 8)
}

/**
 * Group tickets into the hierarchy the tracker actually created: each epic
 * followed by its stories, then — last — the stories that point at no epic.
 *
 * THAT LAST GROUP IS THE POINT. `parent_key` is whatever the skill sent, and it
 * can miss for real reasons: a single-story plan has no epic at all, and a
 * partial creation (epic call failed, stories succeeded) leaves children whose
 * parent was never filed. Dropping those rows would show a plan as having fewer
 * tickets than it has, which is exactly the failure a reader opens this page to
 * investigate. So an unmatched story renders, just without a parent above it.
 */
export function groupPlanTickets(tickets: PlanTicket[]): PlanTicketGroup[] {
  const byCreation = [...tickets].sort(
    (a, b) =>
      (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.key.localeCompare(b.key),
  )

  const epics = byCreation.filter((ticket) => ticket.kind === 'epic')
  const epicKeys = new Set(epics.map((epic) => epic.key))

  const groups: PlanTicketGroup[] = epics.map((epic) => ({
    epic,
    // A story whose parent is its own epic, and nothing else: `parentKey` is
    // compared to the epic's key, so a story pointing at a DIFFERENT epic in the
    // same session lands under that one instead of being duplicated here.
    stories: byCreation.filter(
      (ticket) => ticket.kind !== 'epic' && ticket.parentKey === epic.key,
    ),
  }))

  const orphans = byCreation.filter(
    (ticket) =>
      ticket.kind !== 'epic' && (ticket.parentKey === null || !epicKeys.has(ticket.parentKey)),
  )
  if (orphans.length > 0) groups.push({ epic: null, stories: orphans })

  return groups
}

/**
 * The list, ready to render: one card per session, newest first, with its
 * repository name, its author and its ticket count resolved.
 *
 * Sessions are NOT filtered by organization here, and must not be: RLS returns
 * exactly the rows the reader may see — their own plus every plan on a repository
 * shared with one of their organizations — so a filter added on this side could
 * only ever hide something the database already decided to show.
 */
export function buildPlanCards(
  sessions: PlanSession[],
  tickets: PlanTicketRef[],
  repos: PlanRepo[],
  emailByOwner: Record<string, string>,
  viewerId: string | null,
): PlanCard[] {
  const repoNameById = new Map(repos.map((r) => [r.id, r.name]))

  const counts = new Map<string, number>()
  for (const ticket of tickets) {
    counts.set(ticket.sessionId, (counts.get(ticket.sessionId) ?? 0) + 1)
  }

  return sortPlanSessions(sessions).map((session) => ({
    ...session,
    repoName: session.repoId ? repoNameById.get(session.repoId) ?? null : null,
    author: planAuthor(session.ownerId, emailByOwner),
    own: viewerId !== null && session.ownerId === viewerId,
    ticketCount: counts.get(session.id) ?? 0,
  }))
}

/**
 * What the card headline says. `title` is the agreed epic/story wording the skill
 * pushes at Step 6.1, and it is what a reader recognises — but it is null until
 * that write lands, so the slug (which exists from the first metadata write) is
 * the fallback, and the spec key is the last resort so a row is never nameless.
 */
export function planLabel(session: PlanSession): string {
  return session.title?.trim() || session.slug?.trim() || session.specKey.slice(0, 12)
}
