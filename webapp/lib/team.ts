import { fetchMembers, fetchOrgs, type Org } from './orgs'
import { getSupabase } from './supabase'
import type { TeamAgent, TeamRepo } from './teamRows'

/**
 * The Team view: for every repository shared with one of your organizations, who
 * is working on it and how many of those agents are on a pull request.
 *
 * Counted from `agents.status` — the value the /magic:* skills write on every
 * transition — and not from the GitHub review state, which only exists for
 * agents whose terminal happens to be open on their owner's machine.
 */

/**
 * Everything the page needs, unaggregated: the tabs are a view concern, so the
 * component picks a scope and calls buildTeamRows itself rather than the fetch
 * deciding for it.
 */
export interface TeamOverview {
  repos: TeamRepo[]
  agents: TeamAgent[]
  /** repo id → the caller's own clone folder name, for path fallback matching. */
  localFolders: Record<string, string>
  /** owner id → email, so an agent shows a readable member label. */
  emailByOwner: Record<string, string>
  /** The user's organizations, in the order the tabs should appear. */
  orgs: { id: string; name: string }[]
}

interface RepoMetadata {
  prUrl?: string
  prMerged?: boolean
  prClosed?: boolean
}

interface AgentRow {
  id: string
  org_id: string | null
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

function toTeamAgent(row: AgentRow, repositoryIds: string[]): TeamAgent {
  const meta = row.metadata ?? {}
  return {
    repositoryIds,
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

async function fetchTeamAgents(): Promise<TeamAgent[]> {
  // No org filter: RLS returns exactly what the caller may see — their own
  // agents (including those with no organization) plus every agent of the orgs
  // they belong to. Archived agents are closed work, kept only for history.
  const { data, error } = await getSupabase()
    .from('agents')
    .select('id, org_id, owner_id, name, ticket_id, status, repositories, metadata')
    .is('archived_at', null)
  if (error || !data) return []

  const rows = data as AgentRow[]
  const links = await fetchRepoLinks(rows.map((r) => r.id))
  return rows.map((row) => toTeamAgent(row, links[row.id] ?? []))
}

/**
 * agent id → the repositories it is attached to, in attachment order. RLS
 * returns exactly the links of the agents the caller can already see.
 */
async function fetchRepoLinks(agentIds: string[]): Promise<Record<string, string[]>> {
  if (agentIds.length === 0) return {}
  const { data, error } = await getSupabase()
    .from('agent_repositories')
    .select('agent_id, repo_id')
    .in('agent_id', agentIds)
    .order('created_at', { ascending: true })
  if (error || !data) return {}

  const out: Record<string, string[]> = {}
  for (const row of data as { agent_id: string; repo_id: string }[]) {
    ;(out[row.agent_id] ??= []).push(row.repo_id)
  }
  return out
}

async function fetchRepos(): Promise<TeamRepo[]> {
  // Same reasoning as fetchTeamAgents: RLS already scopes this to the caller's
  // own repos plus their orgs'. Personal ones (org_id null) belong here too —
  // they are the "Personal" tab.
  const { data, error } = await getSupabase()
    .from('repositories')
    .select('id, org_id, name, color')
    .order('name', { ascending: true })
  if (error || !data) return []
  return (data as { id: string; org_id: string | null; name: string; color: string | null }[]).map((r) => ({
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
  // No early return on "no organization": a user with only personal repos still
  // has a Team page — it just has a single Personal tab.
  const orgs = await fetchOrgs()
  const [repos, agents, localFolders, emailByOwner] = await Promise.all([
    fetchRepos(),
    fetchTeamAgents(),
    fetchLocalFolders(),
    fetchEmails(orgs),
  ])

  return {
    repos,
    agents,
    localFolders,
    emailByOwner,
    orgs: orgs.map((o) => ({ id: o.id, name: o.name })),
  }
}
