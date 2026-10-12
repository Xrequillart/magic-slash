import { EMPTY_PLAN_HISTORY, type PlanHistoryRead, type PlanLinkEvent, type PlanRevision, type PlanStatusEvent } from '../../types'
import { getAuthedClient } from './auth'
import { listOrgsRead } from './org'
import { fetchAuthors } from './plans'

/**
 * A plan's history: the revisions of its spec (`plan_revisions`, 20260923120000), the
 * links pinned to it or taken off it (`plan_link_events`, 20260923130000), and the changes
 * of its status (`plan_status_events`, 20260923150000).
 *
 * NONE OF THE TABLES IS WRITTEN FROM HERE, nor from anywhere in the app: all are triggers'.
 * Link events are written by a trigger on `plan_links`, revisions by one on
 * `plan_sessions`, in the same statement as the save they record, so the text, the author
 * and whether anything changed are all read off that write. The one thing the app says is
 * WHERE a save comes from: the agent's upload carries `x-magic-plan-source: agent`
 * (CloudStore.upsertPlanSession), and the database believes it from the plan's owner
 * alone. Everything else — an edit in the app, anybody else's write — is recorded by hand.
 */

export interface PlanRevisionRow {
  id: string
  author_id: string | null
  source: string
  agent_name: string | null
  created_at: string
  updated_at: string
}

export interface PlanLinkEventRow {
  id: string
  link_id: string
  action: string
  url: string
  kind: string | null
  title: string | null
  actor_id: string | null
  created_at: string
}

export interface PlanStatusEventRow {
  id: string
  from_status: string | null
  to_status: string
  source: string
  actor_id: string | null
  created_at: string
}

/**
 * Every column the timeline draws — and not `content`, which is a full copy of a spec per
 * row. The text is read only for the two revisions being compared (`readRevisionTexts`).
 */
const REVISION_COLUMNS = 'id, author_id, source, agent_name, created_at, updated_at'
const EVENT_COLUMNS = 'id, link_id, action, url, kind, title, actor_id, created_at'
const STATUS_COLUMNS = 'id, from_status, to_status, source, actor_id, created_at'

/**
 * How many of each one opening brings back, NEWEST first — the end a reader looks at — and
 * asked for one more, the probe `planComments.ts` uses: if it arrives, `truncated` is set
 * and the row is dropped. The revisions are bounded by size in the table anyway (8 MiB per
 * plan), the events by count (500); these caps are the page's.
 */
const REVISION_LIMIT = 200
const EVENT_LIMIT = 200
const STATUS_LIMIT = 200

/**
 * The lists cut to ONE period, the one all of them cover completely. Each is read newest
 * first with its own cap, so when one list stops short its oldest row is where its
 * knowledge ends: rows of the others older than that would sit in the merged timeline with
 * entries missing between them. They are dropped, and the timeline ends where all are whole.
 */
export function alignHistory(
  revisionRows: PlanRevisionRow[],
  eventRows: PlanLinkEventRow[],
  statusRows: PlanStatusEventRow[] = [],
): { revisionRows: PlanRevisionRow[]; eventRows: PlanLinkEventRow[]; statusRows: PlanStatusEventRow[]; truncated: boolean } {
  const revisionsCut = revisionRows.length > REVISION_LIMIT
  const eventsCut = eventRows.length > EVENT_LIMIT
  const statusCut = statusRows.length > STATUS_LIMIT
  let revisions = revisionRows.slice(0, REVISION_LIMIT)
  let events = eventRows.slice(0, EVENT_LIMIT)
  let statuses = statusRows.slice(0, STATUS_LIMIT)
  // The oldest instant each cut list still vouches for. The latest of them is the horizon.
  const horizons = [
    revisionsCut && revisions.length ? Date.parse(revisions[revisions.length - 1].updated_at) : -Infinity,
    eventsCut && events.length ? Date.parse(events[events.length - 1].created_at) : -Infinity,
    statusCut && statuses.length ? Date.parse(statuses[statuses.length - 1].created_at) : -Infinity,
  ]
  const horizon = Math.max(...horizons)
  if (Number.isFinite(horizon)) {
    revisions = revisions.filter((row) => Date.parse(row.updated_at) >= horizon)
    events = events.filter((row) => Date.parse(row.created_at) >= horizon)
    statuses = statuses.filter((row) => Date.parse(row.created_at) >= horizon)
  }
  return { revisionRows: revisions, eventRows: events, statusRows: statuses, truncated: revisionsCut || eventsCut || statusCut }
}

function toRevision(row: PlanRevisionRow): PlanRevision {
  return {
    id: row.id,
    authorId: row.author_id ?? undefined,
    // The table's CHECK allows these two alone; anything else is read as the safer claim.
    source: row.source === 'agent' ? 'agent' : 'human',
    agentName: row.agent_name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toLinkEvent(row: PlanLinkEventRow): PlanLinkEvent {
  return {
    id: row.id,
    linkId: row.link_id,
    action: row.action === 'removed' ? 'removed' : 'added',
    url: row.url,
    kind: row.kind ?? 'other',
    title: row.title ?? undefined,
    actorId: row.actor_id ?? undefined,
    createdAt: row.created_at,
  }
}

function toStatusEvent(row: PlanStatusEventRow): PlanStatusEvent {
  return {
    id: row.id,
    from: row.from_status ?? undefined,
    to: row.to_status,
    source: row.source === 'agent' ? 'agent' : 'human',
    actorId: row.actor_id ?? undefined,
    createdAt: row.created_at,
  }
}

/**
 * One plan's history, with the people in it resolved the way the comments' are.
 *
 * FOUR READS IN THE FIRST WAVE — revisions, link events, status events, organizations — and the rosters in the
 * second, narrowed to the people actually in the history (`fetchAuthors`' discipline). Not
 * scoped by anything but the session: the policies return exactly what this reader may see.
 *
 * A FAILED PART FAILS THE WHOLE. A timeline with its revisions and without its link events
 * would read as a plan whose links never changed; the page says the history could not be
 * loaded instead.
 */
export async function listPlanHistory(sessionId: string): Promise<PlanHistoryRead> {
  const client = await getAuthedClient()
  if (!client) return EMPTY_PLAN_HISTORY

  const [revisionsRead, eventsRead, statusRead, orgs] = await Promise.all([
    client
      .from('plan_revisions')
      .select(REVISION_COLUMNS)
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false })
      .limit(REVISION_LIMIT + 1),
    client
      .from('plan_link_events')
      .select(EVENT_COLUMNS)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(EVENT_LIMIT + 1),
    client
      .from('plan_status_events')
      .select(STATUS_COLUMNS)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(STATUS_LIMIT + 1),
    listOrgsRead(),
  ])
  if (revisionsRead.error || !revisionsRead.data || eventsRead.error || !eventsRead.data || statusRead.error || !statusRead.data) {
    console.error('[cloud] plan history read refused:', revisionsRead.error ?? eventsRead.error ?? statusRead.error)
    return { ...EMPTY_PLAN_HISTORY, failed: true }
  }

  const revisionRows = revisionsRead.data as unknown as PlanRevisionRow[]
  const eventRows = eventsRead.data as unknown as PlanLinkEventRow[]
  const statusRows = statusRead.data as unknown as PlanStatusEventRow[]
  const { revisionRows: keptRevisions, eventRows: keptEvents, statusRows: keptStatuses, truncated } =
    alignHistory(revisionRows, eventRows, statusRows)
  const olderRevisions = keptRevisions.length < revisionRows.length
  const revisions = keptRevisions.map(toRevision)
  const linkEvents = keptEvents.map(toLinkEvent)
  const statusEvents = keptStatuses.map(toStatusEvent)
  if (revisions.length === 0 && linkEvents.length === 0 && statusEvents.length === 0) return EMPTY_PLAN_HISTORY

  const people = new Set<string>()
  for (const revision of revisions) if (revision.authorId) people.add(revision.authorId)
  for (const event of linkEvents) if (event.actorId) people.add(event.actorId)
  for (const event of statusEvents) if (event.actorId) people.add(event.actorId)
  const authors = await fetchAuthors(orgs.orgs, people).catch((error) => {
    console.error('[cloud] plan history authors unresolved:', error)
    return { emailByOwner: {}, avatarByOwner: {} }
  })
  return {
    revisions,
    linkEvents,
    statusEvents,
    emailByAuthor: authors.emailByOwner,
    avatarByAuthor: authors.avatarByOwner,
    truncated,
    olderRevisions,
    failed: false,
  }
}

/**
 * The texts of two revisions of ONE plan, older first — or null when either is not visible,
 * they belong to two plans, or the read failed. `fromId` null compares against what the
 * revision replaced (`base_content`, 20260923140000): the text a plan held before its
 * history began, or an empty document for a plan whose first revision created it.
 *
 * The order is the table's (`updated_at`), not the caller's: a diff read backwards would
 * draw every addition as a removal.
 */
export async function readRevisionTexts(
  fromId: string | null,
  toId: string,
): Promise<{ older: string; newer: string } | null> {
  const client = await getAuthedClient()
  if (!client) return null

  const ids = fromId ? [fromId, toId] : [toId]
  const { data, error } = await client
    .from('plan_revisions')
    .select(fromId ? 'id, session_id, content, updated_at' : 'id, session_id, content, base_content, updated_at')
    .in('id', ids)
  if (error || !data) {
    console.error('[cloud] plan revision read refused:', error)
    return null
  }
  const rows = data as unknown as {
    id: string
    session_id: string
    content: string | null
    base_content?: string | null
    updated_at: string
  }[]
  if (rows.length !== ids.length) return null
  if (!fromId) return { older: rows[0].base_content ?? '', newer: rows[0].content ?? '' }
  if (rows[0].session_id !== rows[1].session_id) return null
  const [older, newer] = [...rows].sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at))
  return { older: older.content ?? '', newer: newer.content ?? '' }
}
