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
