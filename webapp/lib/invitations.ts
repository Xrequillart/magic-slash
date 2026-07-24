import { getSupabase } from './supabase'
import type { Role } from './orgs'

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

export interface Invitation {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  token: string
  expiresAt: string | null
  createdAt: string | null
}

interface InvitationRow {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  token: string
  expires_at: string | null
  created_at: string | null
}

/** A still-pending invite past its expiry reads as expired (derived at read time). */
function effectiveStatus(status: InvitationStatus, expiresAt: string | null): InvitationStatus {
  if (status === 'pending' && expiresAt && Date.parse(expiresAt) < Date.now()) return 'expired'
  return status
}

/** The shareable web invite link for a token. */
export function inviteLink(token: string): string {
  return `${window.location.origin}/invite/${token}`
}

/** Invitations for an org. RLS gates SELECT to admins, so members receive []. */
export async function fetchInvitations(orgId: string): Promise<Invitation[]> {
  const { data, error } = await getSupabase()
    .from('invitations')
    .select('id, email, role, status, token, expires_at, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return (data as InvitationRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    role: r.role,
    status: effectiveStatus(r.status, r.expires_at),
    token: r.token,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }))
}

/** Create an invitation (admin only — RLS enforces the gate). */
export async function createInvitation(orgId: string, email: string, role: Role): Promise<void> {
  const supabase = getSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('invitations')
    .insert({ org_id: orgId, email: email.trim(), role, invited_by: userData.user?.id })
  if (error) throw new Error(error.message)
}

/** Delete an invitation (admin only — RLS enforces the gate). */
export async function deleteInvitation(id: string): Promise<void> {
  const { error } = await getSupabase().from('invitations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
