import { fetchMembers, fetchOrgs, type Org } from './orgs'
import { getSupabase } from './supabase'
import { buildTeamRows, type TeamAgent, type TeamRepo, type TeamRepoRow } from './teamRows'

/**
 * The Team view: for every repository shared with one of your organizations, who
 * is working on it and how many of those agents are on a pull request.
 *
 * Counted from `agents.status` — the value the /magic:* skills write on every
 * transition — and not from the GitHub review state, which only exists for
 * agents whose terminal happens to be open on their owner's machine.
 */

export interface TeamOverview {
  rows: TeamRepoRow[]
  /** Agents on a personal repo, or on one no org repo matches. */
  unmatched: number
  /** owner id → email, so an agent shows a readable member label. */
  emailByOwner: Record<string, string>
  /** Org name per row, only worth showing when the user belongs to several. */
  orgNameById: Record<string, string>
  multiOrg: boolean
}

export const EMPTY_OVERVIEW: TeamOverview = {
  rows: [],
  unmatched: 0,
  emailByOwner: {},
  orgNameById: {},
  multiOrg: false,
}

interface RepoMetadata {
  prUrl?: string
  prMerged?: boolean
  prClosed?: boolean
}

interface AgentRow {
  id: string
  org_id: string
  owner_id: string | null
  name: string
  ticket_id: string | null
  status: string | null
  repositories: unknown
  metadata: {
    title?: string
    status?: string
    repositoryMetadata?: Record<string, RepoMetadata | null>
  } | null
}

/** The agent's live PR, if it has one that is neither merged nor closed. */
function livePrUrl(row: AgentRow): string | undefined {
  const byRepo = row.metadata?.repositoryMetadata
  if (!byRepo) return undefined
  for (const meta of Object.values(byRepo)) {
    if (!meta || meta.prMerged || meta.prClosed) continue
    if (meta.prUrl) return meta.prUrl
  }
  return undefined
}

function toTeamAgent(row: AgentRow): TeamAgent {
  const meta = row.metadata ?? {}
  return {
    id: row.id,
    orgId: row.org_id,
    ownerId: row.owner_id,
    // The title says what the work is; the generated terminal name doesn't.
    // Empty string is the unset default the app writes, so `||` not `??`.
    label: meta.title || row.name,
    ticketId: row.ticket_id ?? undefined,
    status: row.status ?? meta.status ?? undefined,
    repositories: Array.isArray(row.repositories) ? (row.repositories as string[]) : [],
    prUrl: livePrUrl(row),
  }
}

async function fetchTeamAgents(orgIds: string[]): Promise<TeamAgent[]> {
  // Archived agents are closed work kept only for the history attached to them.
  const { data, error } = await getSupabase()
    .from('agents')
    .select('id, org_id, owner_id, name, ticket_id, status, repositories, metadata')
    .in('org_id', orgIds)
    .is('archived_at', null)
  if (error || !data) return []
  return (data as AgentRow[]).map(toTeamAgent)
}

async function fetchRepos(orgIds: string[]): Promise<TeamRepo[]> {
  const { data, error } = await getSupabase()
    .from('repositories')
    .select('id, org_id, name, color')
    .in('org_id', orgIds)
    .order('name', { ascending: true })
  if (error || !data) return []
  return (data as { id: string; org_id: string; name: string; color: string | null }[]).map((r) => ({
    id: r.id,
    orgId: r.org_id,
    name: r.name,
    color: r.color,
  }))
}

/**
 * The caller's own local clone folders, keyed by repo id. `repository_paths` is
 * own-rows-only by RLS, so this can never reveal where a teammate cloned
 * anything — it just gives the matcher a second name to try when a repo is
 * registered under a name that differs from its directory.
 */
async function fetchLocalFolders(): Promise<Record<string, string>> {
  const { data, error } = await getSupabase().from('repository_paths').select('repo_id, path')
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const row of data as { repo_id: string; path: string }[]) {
    const folder = row.path.replace(/[/\\]+$/, '').split(/[/\\]/).pop()
    if (folder) out[row.repo_id] = folder
  }
  return out
}

async function fetchEmails(orgs: Org[]): Promise<Record<string, string>> {
  const rosters = await Promise.all(orgs.map((o) => fetchMembers(o.id)))
  const out: Record<string, string> = {}
  for (const roster of rosters) {
    for (const member of roster) {
      if (member.email) out[member.userId] = member.email
    }
  }
  return out
}

export async function fetchTeamOverview(): Promise<TeamOverview> {
  const orgs = await fetchOrgs()
  if (orgs.length === 0) return EMPTY_OVERVIEW

  const orgIds = orgs.map((o) => o.id)
  const [repos, agents, localFolders, emailByOwner] = await Promise.all([
    fetchRepos(orgIds),
    fetchTeamAgents(orgIds),
    fetchLocalFolders(),
    fetchEmails(orgs),
  ])

  const { rows, unmatched } = buildTeamRows(agents, repos, localFolders)

  return {
    rows,
    unmatched,
    emailByOwner,
    orgNameById: Object.fromEntries(orgs.map((o) => [o.id, o.name])),
    multiOrg: orgs.length > 1,
  }
}
