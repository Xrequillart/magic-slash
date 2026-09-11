import type { Org, PlanOverview, PlanRepoRef, PlanSession } from '../../types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getAuthedClient } from './auth'
import { listMembers, listOrgsRead } from './org'
import { getStore } from '../store/Store'

/**
 * Reading `/magic:plan` sessions back out of the cloud — the first READ path onto
 * `plan_sessions`, which until now the app only ever wrote to (`store/plan-sync.ts`).
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
 */
const LIST_COLUMNS =
  'id, owner_id, repo_id, org_id, agent_id, slug, spec_key, title, idea, status, spec_synced_at, created_at, updated_at'

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
  owner_id: string
  repo_id: string | null
  org_id: string | null
  agent_id: string | null
  slug: string | null
  spec_key: string
  title: string | null
  idea: string | null
  status: string | null
  spec_synced_at: string | null
  created_at: string | null
  updated_at: string | null
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
    specSyncedAt: row.spec_synced_at ?? undefined,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
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
