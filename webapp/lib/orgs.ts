import { getSupabase } from './supabase'

export type Role = 'user' | 'admin'

export interface Org {
  id: string
  name: string
  role: Role
  createdBy: string | null
}

export interface Member {
  userId: string
  email: string | null
  role: Role
  createdAt: string | null
}

interface OrgRow {
  id: string
  name: string
  created_by: string | null
  archived_at: string | null
}

interface MembershipRow {
  role: Role
  organizations: OrgRow | OrgRow[] | null
}

interface MemberRpcRow {
  user_id: string
  email: string | null
  role: Role
  created_at: string | null
}

/** The current user's (non-archived) organizations, with their role in each. */
export async function fetchOrgs(): Promise<Org[]> {
  const supabase = getSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) return []

  const { data, error } = await supabase
    .from('memberships')
    .select('role, organizations(id, name, created_by, archived_at)')
    .eq('user_id', uid)
  if (error || !data) return []

  const orgs: Org[] = []
  for (const row of data as unknown as MembershipRow[]) {
    const o = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations
    if (!o || o.archived_at) continue
    orgs.push({ id: o.id, name: o.name, role: row.role, createdBy: o.created_by })
  }
  return orgs
}

/**
 * Creates an org and makes the caller its admin, returning the new id. The
 * `create_organization` RPC is the only path — `organizations` has no INSERT
 * policy, because the org row and the creator's membership must land together.
 */
export async function createOrg(name: string): Promise<string> {
  const orgName = name.trim()
  if (!orgName) throw new Error('An organization needs a name')

  const { data, error } = await getSupabase().rpc('create_organization', { org_name: orgName })
  if (error) throw new Error(error.message)
  return data as string
}

/** Members of an org (with emails) via the list_org_members RPC. */
export async function fetchMembers(orgId: string): Promise<Member[]> {
  const { data, error } = await getSupabase().rpc('list_org_members', { p_org_id: orgId })
  if (error || !data) return []
  return (data as MemberRpcRow[]).map((r) => ({
    userId: r.user_id,
    email: r.email,
    role: r.role,
    createdAt: r.created_at,
  }))
}

/**
 * Member and org lifecycle. Each of these is a SECURITY DEFINER RPC that checks
 * admin rights itself and refuses to strand an org without an admin, so the UI
 * gates are a courtesy — the database is the authority.
 */

export async function updateMemberRole(orgId: string, userId: string, role: Role): Promise<void> {
  const { error } = await getSupabase().rpc('update_member_role', {
    p_org_id: orgId,
    p_user_id: userId,
    p_role: role,
  })
  if (error) throw new Error(error.message)
}

export async function removeMember(orgId: string, userId: string): Promise<void> {
  const { error } = await getSupabase().rpc('remove_member', { p_org_id: orgId, p_user_id: userId })
  if (error) throw new Error(error.message)
}

export async function leaveOrg(orgId: string): Promise<void> {
  const { error } = await getSupabase().rpc('leave_organization', { p_org_id: orgId })
  if (error) throw new Error(error.message)
}

export async function archiveOrg(orgId: string): Promise<void> {
  const { error } = await getSupabase().rpc('archive_organization', { p_org_id: orgId })
  if (error) throw new Error(error.message)
}

/** Join an org with an invitation token. Accepts a pasted link or a bare token. */
export async function acceptInvitation(tokenOrLink: string): Promise<void> {
  const trimmed = tokenOrLink.trim()
  const match = trimmed.match(/\/invite\/([^/?#\s]+)/)
  const { error } = await getSupabase().rpc('accept_invitation', {
    invitation_token: match ? match[1] : trimmed,
  })
  if (error) throw new Error(error.message)
}
