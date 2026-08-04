import { getSupabase } from './supabase'
import { inviteLink as buildInviteLink } from './inviteLink'
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

/**
 * A still-pending invite past its expiry reads as expired (derived at read time).
 *
 * Exported because the rule has three call sites and no home in the database:
 * `accept_invitation` cannot persist the flip (its RAISE would roll the write
 * back), so the stored status stays 'pending' and every reader derives the same
 * answer. This module, the back-office (`./admin`) and the desktop app each need
 * it; two of them can at least share one implementation.
 */
export function effectiveStatus(status: InvitationStatus, expiresAt: string | null): InvitationStatus {
  if (status === 'pending' && expiresAt && Date.parse(expiresAt) < Date.now()) return 'expired'
  return status
}

/**
 * The shareable invite link for a token.
 *
 * Delegates to `inviteLink.ts`, which is import-free so it can be tested (this module
 * reaches the Supabase client). Kept exported here so callers keep one import.
 */
export function inviteLink(token: string): string {
  return buildInviteLink(token, window.location.origin)
}

export { extractInviteToken } from './inviteLink'

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
