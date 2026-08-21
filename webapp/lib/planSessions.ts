import { fetchMembers, fetchOrgs } from './orgs'
import { getSupabase } from './supabase'
import { t } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'
import {
  planAuthor,
  toPlanSession,
  toPlanTicket,
  toStatus,
  type PlanRepo,
  type PlanSession,
  type PlanSessionRow,
  type PlanStatus,
  type PlanTicket,
  type PlanTicketRef,
  type PlanTicketRow,
} from './planSessionRows'

/**
 * Reading `/magic:plan` sessions out of the cloud, and setting the status of one.
 *
 * The desktop app uploads a session's spec and its created tickets as the skill
 * runs; this is the read side of that — plus exactly one write, `status`, which is
 * the only field of a session a person is allowed an opinion on (see the end of the
 * file for why it is only that one). The shaping (hierarchy, sort, filter, labels)
 * lives in `lib/planSessionRows.ts`, which is pure and therefore testable. Same
 * division as `lib/team.ts` / `lib/teamRows.ts`.
 *
 * NO ORG FILTER, anywhere below. RLS on `plan_sessions` already returns exactly
 * what the reader may see — their own sessions, plus every session on a repository
 * shared with one of their organizations — so a filter on this side could only hide
 * rows the database chose to show, and would do it differently per page.
 */

/** The columns the pages read. `spec` is deliberately NOT among them — see below. */
const LIST_COLUMNS =
  'id, owner_id, repo_id, org_id, agent_id, slug, spec_key, title, idea, status, spec_synced_at, created_at, updated_at'

/** The list's columns plus the markdown itself, for the detail view. */
const DETAIL_COLUMNS = `${LIST_COLUMNS}, spec`

/**
 * Everything the /plans list needs, unaggregated. Assembling the cards is the
 * page's job (via `buildPlanCards`), so the tabs, filter and empty state stay view
 * concerns rather than fetch ones.
 */
export interface PlanOverview {
  sessions: PlanSession[]
  /**
   * One entry per ticket of every visible session, carrying its session id and
   * nothing else — the cards print a COUNT, so that is all that is fetched. A
   * list of thirty plans would otherwise pull a couple of hundred fully hydrated
   * ticket rows (key, url, title, kind, parent) to render thirty numbers.
   */
  tickets: PlanTicketRef[]
  repos: PlanRepo[]
  /** owner id → email, so a session shows a readable author. */
  emailByOwner: Record<string, string>
}

export interface PlanDetail {
  session: PlanSession
  tickets: PlanTicket[]
  /** Null when the repository row is not visible to the reader, or was deleted. */
  repo: PlanRepo | null
  /**
   * The owner, printable — resolved through `planAuthor`, exactly like a card's,
   * so the two pages fall back the same way when no roster supplies an email.
   */
  author: string
}

/**
 * The sessions, without their specs.
 *
 * `spec` is excluded on purpose: it is the whole markdown document, tens of
 * kilobytes each, and the list shows none of it. Selecting it here would make
 * opening /plans download every spec in the organization to render a page of
 * one-line cards.
 */
async function fetchPlanSessions(): Promise<PlanSession[]> {
  const { data, error } = await getSupabase().from('plan_sessions').select(LIST_COLUMNS)
  if (error || !data) return []
  return (data as unknown as PlanSessionRow[]).map(toPlanSession)
}

/**
 * The tickets of the given sessions. Scoped by `in(...)` rather than left to RLS
 * alone — the policy would return the same rows, but the explicit list keeps the
 * two queries consistent when the second races a session created between them.
 *
 * Unordered: `groupPlanTickets` sorts these itself, on `createdAt` with a `key`
 * tiebreak the database cannot express, so an ORDER BY here would only be a sort
 * the client immediately redoes.
 */
async function fetchPlanTickets(sessionIds: string[]): Promise<PlanTicket[]> {
  if (sessionIds.length === 0) return []
  const { data, error } = await getSupabase()
    .from('plan_tickets')
    .select('session_id, key, url, title, kind, parent_key, created_at')
    .in('session_id', sessionIds)
  if (error || !data) return []
  return (data as PlanTicketRow[]).map(toPlanTicket)
}

/**
 * Just the session id of every ticket of the given sessions — the list's counts.
 *
 * Same `in(...)` scoping and the same reasoning as above; what differs is the
 * projection. Unordered on purpose: counting is order-free, so there is no reason
 * to make the database sort rows the list never displays.
 */
async function fetchPlanTicketRefs(sessionIds: string[]): Promise<PlanTicketRef[]> {
  if (sessionIds.length === 0) return []
  const { data, error } = await getSupabase()
    .from('plan_tickets')
    .select('session_id')
    .in('session_id', sessionIds)
  if (error || !data) return []
  return (data as { session_id: string }[]).map((row) => ({ sessionId: row.session_id }))
}

/**
 * The repositories, for the names on the cards and the filter. Unfiltered like the
 * Team page's: RLS scopes it to the caller's own plus their organizations'. Only
 * `id` and `name` — a card prints the name and the filter matches on the id.
 */
async function fetchPlanRepos(): Promise<PlanRepo[]> {
  const { data, error } = await getSupabase().from('repositories').select('id, name')
  if (error || !data) return []
  return data as PlanRepo[]
}

/**
 * ONE repository, for the detail page's single name. `maybeSingle` so a repo the
 * reader cannot see — or one that was deleted — comes back as null rather than an
 * error, which is the `repo: null` state documented on PlanDetail.
 */
async function fetchPlanRepo(id: string): Promise<PlanRepo | null> {
  const { data, error } = await getSupabase()
    .from('repositories')
    .select('id, name')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as PlanRepo
}

/**
 * owner id → email, from the rosters of the organizations the reader belongs to.
 *
 * This is the ONLY attribution available, and the reason is worth stating where
 * someone will look for it: `plan_sessions.owner_id` is a uuid, and the table that
 * holds a chosen display name — `public.profiles` — is own-rows-only on select
 * (`supabase/migrations/20260724130000_profiles.sql`). No policy lets an org member
 * read a teammate's profile, so a joined NAME does not exist to be fetched. The
 * `list_org_members` RPC (SECURITY DEFINER, and the one door onto `auth.users`)
 * returns emails for the members of an org the caller belongs to, which is what
 * `lib/team.ts` already labels teammates' agents with. Reusing it keeps the two
 * pages calling the same person the same thing.
 */
async function fetchAuthorEmails(): Promise<Record<string, string>> {
  const orgs = await fetchOrgs()
  const rosters = await Promise.all(orgs.map((o) => fetchMembers(o.id)))
  const out: Record<string, string> = {}
  for (const roster of rosters) {
    for (const member of roster) {
      if (member.email) out[member.userId] = member.email
    }
  }
  return out
}

/**
 * The same map as above, for ONE owner — zero or one entry, so it can be handed
 * straight to `planAuthor` like the list's.
 *
 * The detail page needs a single name, so it asks a single roster instead of
 * walking every organization the reader belongs to. Narrowing to the session's own
 * `orgId` is sound rather than lucky: `plan_sessions_select` returns a row only to
 * its owner or to a member of its org, so a VISIBLE session with a null `orgId` is
 * necessarily the reader's own — and the page prints "You" for those without ever
 * consulting a roster.
 */
async function fetchOwnerEmail(orgId: string | null, ownerId: string | null): Promise<Record<string, string>> {
  if (!orgId || !ownerId) return {}
  const roster = await fetchMembers(orgId)
  const email = roster.find((member) => member.userId === ownerId)?.email
  return email ? { [ownerId]: email } : {}
}

/**
 * Everything /plans renders, in as few round trips as the parts allow.
 *
 * The viewer is deliberately NOT among it: the page already holds the session it
 * renders behind, so asking `auth.getUser()` for the same id here would be a
 * network round trip whose answer could disagree with the one the page is using.
 */
export async function fetchPlanOverview(): Promise<PlanOverview> {
  // The tickets depend on the session ids, so they cannot join the Promise.all —
  // everything that does not is issued together.
  const [sessions, repos, emailByOwner] = await Promise.all([
    fetchPlanSessions(),
    fetchPlanRepos(),
    fetchAuthorEmails(),
  ])
  const tickets = await fetchPlanTicketRefs(sessions.map((s) => s.id))

  return { sessions, tickets, repos, emailByOwner }
}

/**
 * One session, with its spec and its tickets.
 *
 * Returns null for "no such plan" AND for "not yours to read" — RLS makes those
 * the same answer, an empty result rather than an error, and the page must not
 * pretend to know which it was: telling a stranger that an id exists is the leak
 * the policy is there to prevent.
 */
export async function fetchPlanSession(id: string): Promise<PlanDetail | null> {
  const { data, error } = await getSupabase()
    .from('plan_sessions')
    .select(DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null

  const session = toPlanSession(data as unknown as PlanSessionRow)
  const [tickets, repo, emailByOwner] = await Promise.all([
    fetchPlanTickets([session.id]),
    session.repoId ? fetchPlanRepo(session.repoId) : null,
    fetchOwnerEmail(session.orgId, session.ownerId),
  ])

  return { session, tickets, repo, author: planAuthor(session.ownerId, emailByOwner) }
}

/**
 * Set one session's status — the page's only write.
 *
 * ONLY `status`, and only these two values. Everything else on the row is a
 * projection of something on the author's machine (the spec file, the agent, the
 * repository it resolved), so an edit here would be overwritten by the next upload
 * and would meanwhile disagree with the document it claims to describe. The status
 * is the one field whose truth a reader of this page can hold and the machine
 * cannot: whether the planning is over.
 *
 * `planning` and `planned` rather than a third word meaning "closed by hand". The
 * column is a MIRROR of the desktop's agent status (`planSessionRow`, in
 * desktop/src/main/store/CloudStore.ts), and a value the desktop cannot produce
 * would be a state only one of the two writers understands — the list would then
 * have two done-ish labels and no way to explain the difference.
 *
 * WHICH MEANS THIS WRITE IS NOT FINAL, and the UI has to be built for that: the
 * desktop re-sends `status` with every spec upload while the agent is still open,
 * so a session marked done can flip back on its own. The page therefore offers both
 * directions — the correction is one click. Gating the control on "is that agent
 * still planning" was the alternative and it is not available here: the answer lives
 * in the app's local agent list, not in a column this page can read.
 *
 * Throws when the write touched no row, exactly as `updateRepository` does: RLS
 * turns a forbidden UPDATE into a success with zero rows affected, so selecting the
 * affected rows back is the only thing that tells the two apart. `plan_sessions` is
 * owner-writable only, so that is the case of a reader who sees a teammate's plan
 * through their organization.
 *
 * Returns the stored status, read back through `toStatus`, so the caller displays
 * what the row holds rather than what it asked for.
 */
export async function setPlanSessionStatus(
  id: string,
  status: PlanStatus,
  lang: LanguageId = DEFAULT_LANGUAGE,
): Promise<PlanStatus> {
  const { data, error } = await getSupabase()
    .from('plan_sessions')
    .update({ status })
    .eq('id', id)
    .select('status')
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error(t('plans.detail.statusForbidden', lang))
  return toStatus((data[0] as { status: string | null }).status)
}
