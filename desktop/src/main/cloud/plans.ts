import type { Org, PlanOverview, PlanRepoRef, PlanSession } from '../../types'
import { getAuthedClient } from './auth'
import { listMembers, listOrgs } from './org'
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
 */

/**
 * The columns the list reads. `spec` is deliberately NOT among them: it is the whole
 * markdown document, tens of kilobytes each, and the list shows none of it. Selecting it
 * would make opening the page download every spec in the organization to render a column
 * of one-line rows.
 */
const LIST_COLUMNS =
  'id, owner_id, repo_id, org_id, agent_id, slug, spec_key, title, idea, status, spec_synced_at, created_at, updated_at'

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
 * The sessions themselves, newest-first-ness left to the renderer: `sortPlanSessions`
 * breaks ties on id, which no ORDER BY can express, so a sort here would only be one the
 * list immediately redoes.
 */
async function fetchPlanSessions(): Promise<PlanSession[]> {
  const client = await getAuthedClient()
  if (!client) return []

  const { data, error } = await client.from('plan_sessions').select(LIST_COLUMNS)
  if (error || !data) return []
  return (data as unknown as PlanSessionRow[]).map(toPlanSession)
}

/**
 * Just the session id of every ticket of the given sessions — the counts on the rows.
 *
 * Scoped by `in(...)` rather than left to RLS alone: the policy would return the same
 * rows, but the explicit list keeps the two queries consistent when the second races a
 * session created between them. Unordered, since counting is order-free.
 *
 * A bare id per ticket and nothing wrapped around it: the list prints a COUNT, so a
 * string is the whole of what has to cross the bridge.
 */
async function fetchTicketSessionIds(sessionIds: string[]): Promise<string[]> {
  if (sessionIds.length === 0) return []

  const client = await getAuthedClient()
  if (!client) return []

  const { data, error } = await client
    .from('plan_tickets')
    .select('session_id')
    .in('session_id', sessionIds)
  if (error || !data) return []
  return (data as PlanTicketSessionRow[]).map((row) => row.session_id)
}

/**
 * The repositories, for the names on the rows and for the filter. Unfiltered, like every
 * other repository read in this file's neighbourhood: RLS scopes it to the caller's own
 * plus their organizations'. Only `id` and `name` — a row prints the name and the filter
 * matches on the id.
 */
async function fetchPlanRepos(): Promise<PlanRepoRef[]> {
  const client = await getAuthedClient()
  if (!client) return []

  const { data, error } = await client.from('repositories').select('id, name')
  if (error || !data) return []
  return data as PlanRepoRow[]
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
 * Degrades to an empty overview when cloud is off or the user is logged out, like every
 * other read in `cloud/`: the page then draws its "no organization" state rather than an
 * error, which is the honest reading of a signed-out app.
 */
export async function listPlanSessions(): Promise<PlanOverview> {
  const [sessions, repos, orgs] = await Promise.all([
    fetchPlanSessions(),
    fetchPlanRepos(),
    listOrgs(),
  ])
  // The owners the list will actually name, which is what keeps the photo download to
  // the faces that get drawn. It can only be built once the sessions are in, which is
  // why the rosters sit in the second wave with the tickets rather than beside the orgs.
  const ownerIds = new Set(sessions.map((session) => session.ownerId))
  const [ticketSessionIds, authors] = await Promise.all([
    fetchTicketSessionIds(sessions.map((session) => session.id)),
    fetchAuthors(orgs, ownerIds),
  ])

  return { sessions, ticketSessionIds, repos, ...authors, hasOrg: orgs.length > 0 }
}
