import type { SupabaseClient } from '@supabase/supabase-js'
import type { Config, Invitation, InvitationStatus, Member, MembershipRole, Org, OrgSharedConfig } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'
import { readConfig, mergeOrgSharedConfig, setCurrentOrgId } from '../config/config'

interface OrgRow {
  id: string
  name: string
  created_by: string | null
}

interface MembershipRow {
  org_id: string
  role: MembershipRole
  organizations: OrgRow | OrgRow[] | null
}

function firstOrg(rel: OrgRow | OrgRow[] | null): OrgRow | null {
  if (!rel) return null
  return Array.isArray(rel) ? (rel[0] ?? null) : rel
}

/**
 * The org this install is currently associated with. Prefers the locally
 * remembered currentOrgId, otherwise the first membership. Returns null when
 * cloud is disabled, the user is logged out, or has no membership.
 */
export async function getCurrentOrg(): Promise<Org | null> {
  const client = await getAuthedClient()
  if (!client) return null

  const stored = loadSession()
  const uid = stored?.user?.id
  if (!uid) return null

  const { data, error } = await client
    .from('memberships')
    .select('org_id, role, organizations(id, name, created_by)')
    .eq('user_id', uid)

  if (error || !data || data.length === 0) return null

  const rows = data as unknown as MembershipRow[]
  const preferredId = readConfig().currentOrgId
  const chosen = rows.find(r => r.org_id === preferredId) ?? rows[0]
  const org = firstOrg(chosen.organizations)
  if (!org) return null

  return {
    id: org.id,
    name: org.name,
    createdBy: org.created_by ?? undefined,
    role: chosen.role,
  }
}

/**
 * Members of the given org (defaults to the current org). Emails are not
 * exposed by RLS on auth.users, so only the caller's own email is filled in;
 * others come back without an email (userId + role only).
 */
export async function listMembers(orgId?: string): Promise<Member[]> {
  const client = await getAuthedClient()
  if (!client) return []

  const targetOrgId = orgId ?? (await getCurrentOrg())?.id
  if (!targetOrgId) return []

  const { data, error } = await client
    .from('memberships')
    .select('user_id, role, created_at')
    .eq('org_id', targetOrgId)

  if (error || !data) return []

  const stored = loadSession()
  const selfId = stored?.user?.id
  const selfEmail = stored?.user?.email

  return data.map((row) => ({
    userId: row.user_id as string,
    role: row.role as MembershipRole,
    createdAt: row.created_at as string | undefined,
    email: row.user_id === selfId ? selfEmail : undefined,
  }))
}

/** Create an invitation (admin only — RLS enforces the admin gate). */
export async function createInvitation(email: string, role: MembershipRole = 'user', orgId?: string): Promise<Invitation> {
  const client = await getAuthedClient()
  if (!client) throw new Error('Cloud features are not available')

  const targetOrgId = orgId ?? (await getCurrentOrg())?.id
  if (!targetOrgId) throw new Error('No organization to invite into')

  const stored = loadSession()
  const { data, error } = await client
    .from('invitations')
    .insert({ org_id: targetOrgId, email: email.trim(), role, invited_by: stored?.user?.id })
    .select('id, email, role, status, token, expires_at, created_at')
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    email: data.email,
    role: data.role,
    status: data.status,
    token: data.token,
    expiresAt: data.expires_at,
    createdAt: data.created_at,
  }
}

/**
 * Effective status for display: a still-`pending` invitation whose `expires_at`
 * has passed is reported as `expired`. accept_invitation deliberately does not
 * flip the stored status (that write would roll back with its RAISE), so expiry
 * is derived here at read time. Other statuses pass through unchanged.
 */
function effectiveStatus(status: InvitationStatus, expiresAt?: string | null): InvitationStatus {
  if (status === 'pending' && expiresAt && Date.parse(expiresAt) < Date.now()) {
    return 'expired'
  }
  return status
}

/** List invitations for the org (admin only — RLS gates SELECT to admins). */
export async function listInvitations(orgId?: string): Promise<Invitation[]> {
  const client = await getAuthedClient()
  if (!client) return []

  const targetOrgId = orgId ?? (await getCurrentOrg())?.id
  if (!targetOrgId) return []

  const { data, error } = await client
    .from('invitations')
    .select('id, email, role, status, token, expires_at, created_at')
    .eq('org_id', targetOrgId)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    status: effectiveStatus(row.status as InvitationStatus, row.expires_at as string | null),
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }))
}

export interface AcceptInvitationResult {
  orgId: string
  config: Config
}

/** Read the org's shared config and merge it into the local config (best-effort). */
async function mergeSharedConfigWith(client: SupabaseClient, orgId: string): Promise<Config> {
  try {
    const { data: shared, error } = await client.rpc('get_org_shared_config', { p_org_id: orgId })
    if (!error && shared) {
      return mergeOrgSharedConfig(shared as OrgSharedConfig, orgId)
    }
  } catch (mergeError) {
    // Inheriting shared config is best-effort — never fail over it.
    console.error('[cloud] Failed to merge org shared config:', mergeError)
  }
  return readConfig()
}

/**
 * Re-apply the org's shared config to the local config. mergeOrgSharedConfig only
 * reaches repositories that already exist, so onboarding calls this AFTER adding
 * the invitee's repos, ensuring newly-created repos also inherit the org's
 * languages, commit/PR format, and keywords. Degrades gracefully to the current
 * config when cloud is unavailable or there is no org.
 */
export async function applySharedConfig(orgId?: string): Promise<Config> {
  const client = await getAuthedClient()
  if (!client) return readConfig()

  const targetOrgId = orgId ?? (await getCurrentOrg())?.id
  if (!targetOrgId) return readConfig()

  return mergeSharedConfigWith(client, targetOrgId)
}

/**
 * Accept an invitation: the RPC atomically creates the membership and marks the
 * invite accepted (returns the org_id). ONLY THEN do we read the org's shared
 * config — the membership must exist first or RLS/get_org_shared_config would
 * reject the read. The shared fields are merged into the local config, preserving
 * local repo paths and integration toggles. Note this initial merge only reaches
 * repositories that already exist; repos added later during onboarding re-apply
 * it via applySharedConfig (see the invitation wizard).
 */
export async function acceptInvitation(token: string): Promise<AcceptInvitationResult> {
  const client = await getAuthedClient()
  if (!client) throw new Error('Cloud features are not available')

  const { data: orgId, error } = await client.rpc('accept_invitation', { invitation_token: token })
  if (error) throw new Error(error.message)
  if (!orgId) throw new Error('accept_invitation returned no org')

  setCurrentOrgId(orgId as string)

  // Membership now exists → safe to read the org's shared config.
  const config = await mergeSharedConfigWith(client, orgId as string)

  return { orgId: orgId as string, config }
}
