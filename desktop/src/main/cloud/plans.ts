import type { Org, PlanDetail, PlanOverview, PlanRepoRef, PlanSession, PlanTicketOrigin, PlanTicketRead } from '../../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthedClient } from './auth'
import { listMembers, listOrgsRead } from './org'
import { getStore } from '../store/Store'

/**
 * Reading `/magic:plan` sessions back out of the cloud — the READ path onto
 * `plan_sessions`, which the app otherwise only writes to (`store/plan-sync.ts`).
 *
 * TWO READS, and the split between them is about volume rather than about permission:
 * `listPlanSessions` answers the list, deliberately without the spec markdown, and
 * `listPlanDetail` answers ONE plan with its spec and its tickets. Which is also the
 * whole of how a colleague's plan opens at all — the spec comes out of the row, and
 * their `.magic/spec-*.md` exists only on their machine.
 *
 * NO ORG FILTER anywhere below, and that is a decision rather than an omission: RLS on
 * `plan_sessions` (20260821090000) already returns exactly what the reader may see —
 * their own sessions, plus every session on a repository shared with one of their
 * organizations. A filter on this side could only ever hide a row the database chose to
 * show, and would do it differently from the webapp's identical read.
 *
 * Nothing here writes. The status of a session is settable from the webapp; the desktop
 * is a reader of what it itself uploaded.
 *
 * EVERY READ SAYS WHETHER IT WORKED. `Read<T>` below is the shape each fetch answers in,
 * and it exists because the three interesting states are not two: rows, no rows, and NO
 * ANSWER. Collapsing the last two into `[]` is what made a dropped connection render as
 * "nobody has planned anything" — a sentence the page had no business saying, with no way
 * back from it. See `listPlanSessions`.
 */

/**
 * The columns the list reads. `spec` is deliberately NOT among them: it is the whole
 * markdown document, tens of kilobytes each, and the list shows none of it. Selecting it
 * would make opening the page download every spec in the organization to render a column
 * of one-line rows.
 *
 * `spec_oversize` IS among them, even though the list draws nothing with it, and the
 * asymmetry with `spec` is the point: it is one boolean per row, where the spec is a
 * document. `toPlanSession` is the single mapper for both reads, so leaving it out here
 * would mean fabricating a `false` for every listed session — an invented answer, in the
 * one field that exists to stop the app inventing answers about a missing spec.
 */
const LIST_COLUMNS =
  'id, number, owner_id, repo_id, org_id, agent_id, slug, spec_key, title, idea, status, spec_oversize, spec_synced_at, created_at, updated_at'

/**
 * What ONE plan is read with. The list's columns plus the document itself.
 *
 * Built from `LIST_COLUMNS` rather than written out beside it: the two reads answer with
 * the same `PlanSession` through the same mapper, so a column added to one and forgotten
 * on the other is a field that is populated on a row and empty on the page opened from
 * it. The detail view is the ONE place the spec is worth downloading — it is the thing
 * the reader came for.
 */
const DETAIL_COLUMNS = `${LIST_COLUMNS}, spec`

/**
 * How many sessions one opening of the page brings back.
 *
 * A CAP THE APP CHOOSES, rather than the one PostgREST imposes anyway. Without a `limit`
 * the server still stops at its own `db-max-rows` (1000 by default) — but it does so
 * silently, and a read with no ORDER BY that hits that ceiling returns an ARBITRARY
 * thousand rows, not the newest thousand. Naming the cap here is what lets the result say
 * `truncated` at all; see `fetchPlanSessions`.
 */
const PLAN_LIST_LIMIT = 500

/**
 * How many session ids go into one `in(...)` of the ticket read.
 *
 * A uuid is 36 characters, so a thousand of them is a query string of forty kilobytes —
 * past what proxies and servers accept on a GET, and the failure mode is a 414 rather
 * than a slow answer. Batched and re-joined, the URL stays bounded whatever the list's
 * length.
 */
const TICKET_ID_BATCH = 200

/**
 * One page of rows, for the reads that drain themselves.
 *
 * Matches PostgREST's default `db-max-rows`. If the deployment's own ceiling is lower the
 * loop simply stops one page in, which is exactly the behaviour this file had before —
 * never worse, only better when the ceiling is what it is documented to be.
 */
const POSTGREST_PAGE = 1000

/**
 * What a read came back with, and whether it came back AT ALL.
 *
 * `ok: false` means a genuine query `error`. It does NOT mean "no rows", and it must not
 * be set for the signed-out / cloud-off case: `getAuthedClient()` answering `null` is an
 * app with nowhere to read from, which the page words as "no organization" and which is
 * the honest reading of it. Only the database refusing or failing is a failure.
 */
interface Read<T> {
  rows: T[]
  ok: boolean
}

interface PlanSessionRow {
  id: string
  /** Null only on a row written before the numbering migration (20260912100000). */
  number: number | null
  owner_id: string
  repo_id: string | null
  org_id: string | null
  agent_id: string | null
  slug: string | null
  spec_key: string
  title: string | null
  idea: string | null
  status: string | null
  /** `not null default false` in the table, but only the DETAIL read selects `spec`. */
  spec_oversize: boolean | null
  spec_synced_at: string | null
  created_at: string | null
  updated_at: string | null
  /** DETAIL_COLUMNS only — absent, not null, on a row that came back from the list. */
  spec?: string | null
}

interface PlanTicketRow {
  session_id: string
  key: string
  url: string | null
  title: string | null
  kind: string | null
  parent_key: string | null
  created_at: string | null
}

interface PlanRepoRow {
  id: string
  name: string
}

interface PlanTicketSessionRow {
  session_id: string
}

function toPlanSession(row: PlanSessionRow): PlanSession {
  return {
    id: row.id,
    number: row.number ?? undefined,
    ownerId: row.owner_id,
    repoId: row.repo_id ?? undefined,
    orgId: row.org_id ?? undefined,
    agentId: row.agent_id ?? undefined,
    slug: row.slug ?? '',
    specKey: row.spec_key,
    title: row.title ?? undefined,
    idea: row.idea ?? undefined,
    // Free text off the wire, narrowed to the two the list can draw by `toStatus` in
    // renderer/utils/planRows.ts — not here, where nothing renders it.
    status: row.status ?? 'planning',
    // `?? false` covers the column being null on a row written before the migration, not
    // the list leaving it out — it is selected by both reads, precisely so this never
    // has to invent an answer. See LIST_COLUMNS.
    specOversize: row.spec_oversize ?? false,
    // Absent on every listed row: `spec` is only in DETAIL_COLUMNS. The type says
    // `undefined` for "no spec" either way, so a session that was never written and one
    // that was merely not asked for read the same here — which is right, because the
    // difference between them is `specOversize`, not the absence itself.
    spec: row.spec ?? undefined,
    specSyncedAt: row.spec_synced_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
  }
}

/**
 * One ticket row, with its `kind` narrowed to the two the tree can draw.
 *
 * The narrowing lives HERE, where a database row becomes a typed object, and not in the
 * renderer module that groups these — the same division `status` follows above, and the
 * divergence `renderer/utils/planRows.ts` documents against its webapp original.
 *
 * An unrecognised kind reads as a story, which is the LEAF. Calling it an epic would
 * invent a parent for the other rows and change the shape of the tree; calling it a
 * story at worst files it under "no epic", where it is still visible.
 *
 * The URL is passed through untouched. It is checked for its SCHEME at the moment it is
 * turned into a link (`safeTicketUrl`, renderer side), which is the last place before a
 * click, rather than here where a rejection would look like a tracker that returned no
 * browse link.
 */
function toPlanTicket(row: PlanTicketRow): PlanTicketRead {
  return {
    sessionId: row.session_id,
    key: row.key,
    url: row.url ?? undefined,
    title: row.title ?? undefined,
    kind: row.kind === 'epic' ? 'epic' : 'story',
    parentKey: row.parent_key ?? undefined,
    createdAt: row.created_at ?? undefined,
  }
}

/**
 * The sessions themselves, newest first and capped at `PLAN_LIST_LIMIT`.
 *
 * ORDERED HERE AS WELL AS IN THE RENDERER, and the two are not the same job. An earlier
 * version of this comment claimed a server-side ORDER BY would only be one the list
 * immediately redoes, because `sortPlanSessions` breaks ties on id and no ORDER BY can
 * express that. That was the bug: the renderer's sort decides what order the rows you
 * HAVE are drawn in, while this one decides WHICH ROWS YOU GET AT ALL. Past the cap an
 * unordered read hands back an arbitrary subset — a thousand sessions of which the newest
 * may be none — and sorting that subset perfectly still shows the wrong plans. The
 * tie-break stays in the renderer; the recency lives here.
 *
 * `updated_at` is `not null default now()` (20260821090000), so there are no nulls for
 * the descending order to have to place.
 *
 * `truncated` is set when the read came back AT the cap. It is deliberately not "there
 * are definitely more": a list of exactly `PLAN_LIST_LIMIT` sessions reports itself
 * truncated with nothing missing. Over-reporting by one page is the harmless direction —
 * the page says some older sessions may not be listed, which is true either way, where
 * silently dropping them is what this is here to stop.
 */
async function fetchPlanSessions(): Promise<Read<PlanSession> & { truncated: boolean }> {
  const client = await getAuthedClient()
  if (!client) return { rows: [], ok: true, truncated: false }

  const { data, error } = await client
    .from('plan_sessions')
    .select(LIST_COLUMNS)
    .order('updated_at', { ascending: false })
    .limit(PLAN_LIST_LIMIT)
  if (error || !data) return { rows: [], ok: false, truncated: false }

  const rows = (data as unknown as PlanSessionRow[]).map(toPlanSession)
  return { rows, ok: true, truncated: rows.length >= PLAN_LIST_LIMIT }
}

/**
 * The tickets of ONE batch of sessions, drained page by page.
 *
 * The row ceiling bites here where it does not bite on the sessions: two hundred sessions
 * with a dozen tickets each is past a thousand rows, and a short read is a COUNT SILENTLY
 * TOO LOW on the rows that got cut — a plan that filed nine stories showing "no ticket".
 * So the page is asked for explicitly and the next one is asked for whenever the last came
 * back full. `(session_id, key)` is the table's primary key, which is what makes the order
 * total and the paging repeatable: no row can be seen twice or skipped between pages.
 */
async function fetchTicketBatch(
  client: SupabaseClient,
  sessionIds: string[],
): Promise<Read<string>> {
  const rows: string[] = []
  for (let from = 0; ; from += POSTGREST_PAGE) {
    const { data, error } = await client
      .from('plan_tickets')
      .select('session_id')
      .in('session_id', sessionIds)
      .order('session_id', { ascending: true })
      .order('key', { ascending: true })
      .range(from, from + POSTGREST_PAGE - 1)
    if (error || !data) return { rows, ok: false }

    for (const row of data as PlanTicketSessionRow[]) rows.push(row.session_id)
    if (data.length < POSTGREST_PAGE) return { rows, ok: true }
  }
}

/**
 * Just the session id of every ticket of the given sessions — the counts on the rows.
 *
 * Scoped by `in(...)` rather than left to RLS alone: the policy would return the same
 * rows, but the explicit list keeps the two queries consistent when the second races a
 * session created between them.
 *
 * BATCHED, because that `in(...)` is a query string: every id in one list would put tens
 * of kilobytes of uuids in a GET URL once the account has a few hundred sessions. The
 * batches are independent, so they go out together and their answers are concatenated —
 * counting is order-free, and a count is all any of this becomes.
 *
 * A bare id per ticket and nothing wrapped around it: the list prints a COUNT, so a
 * string is the whole of what has to cross the bridge.
 */
async function fetchTicketSessionIds(sessionIds: string[]): Promise<Read<string>> {
  if (sessionIds.length === 0) return { rows: [], ok: true }

  const client = await getAuthedClient()
  if (!client) return { rows: [], ok: true }

  const batches: string[][] = []
  for (let i = 0; i < sessionIds.length; i += TICKET_ID_BATCH) {
    batches.push(sessionIds.slice(i, i + TICKET_ID_BATCH))
  }

  const results = await Promise.all(batches.map((batch) => fetchTicketBatch(client, batch)))
  return {
    rows: results.flatMap((result) => result.rows),
    // One failed batch is a failed read: the counts it carried are missing from every row
    // it covered, and a page that showed them as zero would be lying about the others too.
    ok: results.every((result) => result.ok),
  }
}

/**
 * The repositories, for the names on the rows and for the filter. Unfiltered, like every
 * other repository read in this file's neighbourhood: RLS scopes it to the caller's own
 * plus their organizations'. Only `id` and `name` — a row prints the name and the filter
 * matches on the id.
 */
async function fetchPlanRepos(): Promise<Read<PlanRepoRef>> {
  const client = await getAuthedClient()
  if (!client) return { rows: [], ok: true }

  const { data, error } = await client.from('repositories').select('id, name')
  if (error || !data) return { rows: [], ok: false }
  return { rows: data as PlanRepoRow[], ok: true }
}

/**
 * Who wrote these plans: owner id → email, and owner id → photo.
 *
 * The EMAIL is the ONLY attribution available, and it is worth stating where someone
 * will look for it: `plan_sessions.owner_id` is a uuid, and the table holding a chosen
 * display name — `public.profiles` — is own-rows-only on select
 * (`20260724130000_profiles.sql`). No policy lets an org member read a teammate's
 * profile, so a joined NAME does not exist to be fetched. `list_org_members` (SECURITY
 * DEFINER, the one door onto `auth.users`) returns emails for the members of an org the
 * caller belongs to, which is what the app already labels teammates' agents with.
 *
 * The PHOTOS are fetched the way `listMemberAvatars` fetches them — the storage paths
 * the same RPC hands back, turned into `data:` URLs by one `loadAvatarDataUrls` call,
 * with a member who has no photo simply absent from the result. Two differences, both
 * deliberate:
 *
 *  * ONLY THE OWNERS ON SCREEN. A roster's photos are tens of kilobytes of base64 each
 *    and `listMemberAvatars`' own note is that they must not be shipped to views that
 *    draw no faces; the same discipline applies to a view that draws SOME. A ten-person
 *    organization whose plans were all written by two of them downloads two photos.
 *  * ONE CALL for every organization at once, rather than one per org, since the map is
 *    keyed by user and the reader's organizations routinely overlap.
 *
 * NO `ok` ON THIS ONE, unlike the reads above, and the difference is what each absence
 * costs. A roster that does not answer loses a row its author's ADDRESS, and the list
 * already has a defined answer for that — `planAuthor` prints the first segment of the
 * uuid, which is what it prints for anyone outside the reader's organizations anyway. A
 * whole page of rows replaced by an error because a photo did not load would be the
 * wrong trade; a missing face is not a missing plan.
 *
 * Takes the organizations rather than listing them itself, so the caller can issue that
 * list alongside the sessions instead of behind them. See `listPlanSessions`.
 */
async function fetchAuthors(
  orgs: Org[],
  ownerIds: Set<string>,
): Promise<Pick<PlanOverview, 'emailByOwner' | 'avatarByOwner'>> {
  const rosters = await Promise.all(orgs.map((org) => listMembers(org.id)))

  const emailByOwner: Record<string, string> = {}
  const paths: Record<string, string> = {}
  for (const roster of rosters) {
    for (const member of roster) {
      if (member.email) emailByOwner[member.userId] = member.email
      if (member.avatarPath && ownerIds.has(member.userId)) paths[member.userId] = member.avatarPath
    }
  }

  const avatarByOwner = Object.keys(paths).length > 0
    ? await getStore().loadAvatarDataUrls(paths)
    : {}
  return { emailByOwner, avatarByOwner }
}

/**
 * Everything the Plans page renders, in as few round trips as the parts allow.
 *
 * TWO WAVES, not three. Only two things here depend on an earlier answer: the tickets
 * need the session ids, and the rosters need the organizations. Neither depends on the
 * other, so the second wave issues them together — the organizations are listed in the
 * FIRST wave precisely so the rosters do not have to wait for the sessions to arrive
 * before they can even be asked for.
 *
 * The organization list doubles as the page's `hasOrg`: whether the reader belongs to one
 * is the difference between "nobody has planned anything" and "there is nowhere for a
 * plan to come from", and answering it here saves the page mounting the org hook — which
 * would re-run this very same list plus a roster and an invitations read per org.
 *
 * TWO KINDS OF EMPTY, and telling them apart is what `failed` is for.
 *
 *  * CLOUD OFF, OR SIGNED OUT. `getAuthedClient()` answers `null`, every read degrades to
 *    no rows, and `hasOrg` is false. This is not a failure and must never be reported as
 *    one: the page's "no organization" state is the honest reading of a signed-out app,
 *    and it is the state that tells the reader what to do about it.
 *  * A READ THAT ERRORED. A dropped connection, an expired token, a database that
 *    refused. The rows are missing, not absent, and every empty state the page could draw
 *    over them would be a claim about the world it has no evidence for: no plan, no
 *    organization, an unknown repository, a count of zero. `failed` is what lets it say
 *    "this did not load" and offer the read again instead.
 *
 * The rosters are outside that judgement on purpose — see `fetchAuthors`.
 */
export async function listPlanSessions(): Promise<PlanOverview> {
  const [sessions, repos, orgs] = await Promise.all([
    fetchPlanSessions(),
    fetchPlanRepos(),
    listOrgsRead(),
  ])
  // The owners the list will actually name, which is what keeps the photo download to
  // the faces that get drawn. It can only be built once the sessions are in, which is
  // why the rosters sit in the second wave with the tickets rather than beside the orgs.
  const ownerIds = new Set(sessions.rows.map((session) => session.ownerId))
  const [tickets, authors] = await Promise.all([
    fetchTicketSessionIds(sessions.rows.map((session) => session.id)),
    fetchAuthors(orgs.orgs, ownerIds),
  ])

  return {
    sessions: sessions.rows,
    ticketSessionIds: tickets.rows,
    repos: repos.rows,
    ...authors,
    hasOrg: orgs.orgs.length > 0,
    truncated: sessions.truncated,
    failed: !sessions.ok || !repos.ok || !orgs.ok || !tickets.ok,
  }
}

/**
 * ONE session, spec included, or nothing.
 *
 * `maybeSingle` rather than `single`: "no such plan" is a normal answer here and not an
 * error. RLS makes it the answer to "not yours" as well — a session on a repository none
 * of the reader's organizations share simply is not there — and the page says exactly
 * that much, because that is all this can tell it.
 *
 * NOT SCOPED BY OWNER, like every read in this file: the policy already returns the
 * reader's own sessions plus every session on a shared repository, and a filter here
 * could only hide a row the database chose to show. It is what makes a COLLEAGUE'S plan
 * open — the spec comes out of the row, never off this machine's disk, and their
 * `.magic/spec-*.md` does not exist here to be read.
 *
 * The client is INJECTED, like `fetchTicketBatch`'s: `listPlanDetail` runs this and the
 * ticket read together, and `getAuthedClient` is a synchronous decrypt of the session
 * file on the main process before it is anything else. Resolving it here would do that
 * work twice per open — and race two rotated-token writes over the same file.
 */
async function fetchPlanSession(client: SupabaseClient, id: string): Promise<Read<PlanSession>> {
  const { data, error } = await client
    .from('plan_sessions')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) return { rows: [], ok: false }
  if (!data) return { rows: [], ok: true }
  return { rows: [toPlanSession(data as unknown as PlanSessionRow)], ok: true }
}

/**
 * The tickets of ONE session, whole this time.
 *
 * The list's ticket read pulls a bare `session_id` per row because all it renders is a
 * count; this one renders the tickets themselves, so it takes the columns a row prints
 * and the two it is ordered and nested by.
 *
 * UNPAGED, unlike `fetchTicketBatch`. That read covers hundreds of sessions at once and
 * the row ceiling genuinely bites; one planning session files an epic and a handful of
 * stories, so a page of a thousand is not a ceiling this can reach. Ordered anyway, on
 * the table's own primary key, so the answer is deterministic — `groupPlanTickets` sorts
 * by creation time with a key tiebreak regardless, but a read that returns rows in a
 * different order on every open is worth not having.
 */
async function fetchPlanTickets(
  client: SupabaseClient,
  sessionId: string,
): Promise<Read<PlanTicketRead>> {
  const { data, error } = await client
    .from('plan_tickets')
    .select('session_id, key, url, title, kind, parent_key, created_at')
    .eq('session_id', sessionId)
    .order('key', { ascending: true })
  if (error || !data) return { rows: [], ok: false }
  return { rows: (data as PlanTicketRow[]).map(toPlanTicket), ok: true }
}

/**
 * Everything the plan detail sub-page renders, in one round trip's worth of waiting.
 *
 * THE TWO READS GO OUT TOGETHER. The tickets are keyed by the session's own id, which
 * the caller already has — it is what was clicked — so nothing here depends on the
 * session row arriving first. Sequencing them would be a second latency for no
 * information. The CLIENT is resolved once and handed to both, the way
 * `fetchTicketSessionIds` hands one to every batch: `getAuthedClient` decrypts the stored
 * session off the disk synchronously, on the process that also drives the window, and a
 * rotated token makes both callers write it back over each other.
 *
 * NO REPOSITORY AND NO AUTHOR, deliberately: the renderer opens this page from a
 * `PlanCard` it already holds, with the repository name, the address and the photo
 * resolved by the list read. See `PlanDetail`.
 *
 * The same three-state discipline as `listPlanSessions`, and for the same reason: a
 * missing session (`session: null`) is an ANSWER, while `failed` is the absence of one.
 * A page that drew "this plan is not available" over a dropped connection would be
 * telling the reader their colleague's plan does not exist.
 *
 * A ticket read that failed is a failure of the whole detail, not an empty ticket list:
 * "no ticket has been created from this plan yet" is a claim about the tracker, and a
 * refused query is no evidence for it.
 */
export async function listPlanDetail(id: string): Promise<PlanDetail> {
  // Nowhere to read from is an unfailed nothing, exactly as on the list: an app that is
  // signed out has no plan to show and no error to report about it.
  const client = await getAuthedClient()
  if (!client) return { session: null, tickets: [], failed: false }

  const [session, tickets] = await Promise.all([
    fetchPlanSession(client, id),
    fetchPlanTickets(client, id),
  ])

  return {
    session: session.rows[0] ?? null,
    tickets: tickets.rows,
    failed: !session.ok || !tickets.ok,
  }
}


/**
 * The columns a ticket's own page needs to NAME the plan it came from. See
 * `PlanTicketOrigin`: the label is resolved on the renderer's side, by the same
 * `planLabel` the list uses, so what travels is what that function reads.
 */
/* No `number`: what this answers is a LABEL for a plan, resolved by `planLabel`, and
   the ticket page it feeds names the plan in a sentence rather than badging it. */
const ORIGIN_COLUMNS = 'id, title, slug, spec_key'

/**
 * The plan that filed a given ticket, or null when none did.
 *
 * THE REVERSE OF EVERY OTHER READ HERE, and the only one that starts from a tracker key
 * rather than from a session. It answers one question on the Tasks page — "was this
 * ticket planned, and where is the reasoning?" — for a ticket the reader is already
 * looking at.
 *
 * TWO ROUND TRIPS RATHER THAN AN EMBEDDED JOIN, and the order is the point. `key` is
 * enormously selective — a handful of rows in `plan_tickets` across the whole table —
 * so asking it first turns the second query into a lookup by primary key. Starting from
 * the repository would have meant listing every session it has ever had in order to
 * filter tickets by them.
 *
 * SCOPED BY REPOSITORY, which is not optional: `#412` exists in every GitHub repository
 * there is, and `plan_tickets` stores the tracker's key with no repository beside it.
 * Without the second filter a ticket would link to a plan from a different codebase that
 * merely happened to file the same number — a wrong answer that looks exactly like a
 * right one. The filter lives on the SESSION, which is where `repo_id` is.
 *
 * SEVERAL REPOSITORIES, for the same reason the caller's card can stand for several: one
 * Jira project planned for two services gives a ticket that belongs to neither in
 * particular, and the plan was filed against whichever of them the planner was in. They
 * go into one `in(...)` rather than a call each.
 *
 * SEVERAL SPELLINGS OF ONE KEY are accepted, because two of them are in the wild: the
 * skill files `#412` (skills/magic-plan/SKILL.md §7.2) and the table's own comment gives
 * `456`. Both are the same ticket and the caller does not know which its rows use, so it
 * sends the candidates and this asks for all of them at once.
 *
 * NO `failed` STATE. RLS answers "no such plan" and "not yours" identically here as
 * everywhere else, and a read that errors is a ticket with no plan link — which is what
 * the overwhelming majority of tickets look like anyway. There is no sentence the page
 * could add that a reader would act on.
 */
export async function findPlanForTicket(
  repoIds: string[],
  keys: string[],
): Promise<PlanTicketOrigin | null> {
  const client = await getAuthedClient()
  if (!client || repoIds.length === 0 || keys.length === 0) return null

  const { data: ticketRows, error: ticketError } = await client
    .from('plan_tickets')
    .select('session_id')
    .in('key', keys)
  if (ticketError || !ticketRows || ticketRows.length === 0) return null

  const sessionIds = [...new Set((ticketRows as PlanTicketSessionRow[]).map((row) => row.session_id))]

  // `maybeSingle` would THROW on the multi-row case, and that case is reachable: two
  // plans of the same repository can file the same ticket key when one is a re-plan of
  // the other. Ordered so the answer is at least stable — the newest plan is the one
  // whose reasoning is current — rather than whichever row the database happened to
  // return first.
  const { data, error } = await client
    .from('plan_sessions')
    .select(ORIGIN_COLUMNS)
    .in('id', sessionIds)
    .in('repo_id', repoIds)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null

  const row = data[0] as unknown as PlanSessionRow
  return {
    id: row.id,
    title: row.title ?? undefined,
    slug: row.slug ?? '',
    specKey: row.spec_key,
  }
}
