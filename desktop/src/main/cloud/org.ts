import type { SupabaseClient } from '@supabase/supabase-js'
import type { Config, Invitation, InvitationStatus, Member, MembershipRole, Org, OrgAgent, OrgSharedConfig } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'
import { readConfig, writeConfig, hydrateConfig, mergeOrgSharedConfig, setCurrentOrgId } from '../config/config'
import { getStore } from '../store/Store'
import { startOrgAgentsRealtime } from './realtime'

interface OrgRow {
  id: string
  name: string
  created_by: string | null
  archived_at?: string | null
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
  const orgs = await listOrgs()
  if (orgs.length === 0) return null

  const preferredId = readConfig().currentOrgId
  return orgs.find((o) => o.id === preferredId) ?? orgs[0]
}

/**
 * Members of the given org (defaults to the current org), including every
 * member's email. Raw RLS on auth.users would only expose the caller's own
 * email, so this goes through the list_org_members RPC (SECURITY DEFINER, gated
 * to members of the org) which joins auth.users and returns emails for all
 * members — safely, since a non-member gets rejected.
 */
export async function listMembers(orgId?: string): Promise<Member[]> {
  const client = await getAuthedClient()
  if (!client) return []

  const targetOrgId = orgId ?? (await getCurrentOrg())?.id
  if (!targetOrgId) return []

  const { data, error } = await client.rpc('list_org_members', { p_org_id: targetOrgId })
  if (error || !data) return []

  return (data as Array<{ user_id: string; email: string | null; role: MembershipRole; created_at: string }>).map((row) => ({
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at ?? undefined,
    email: row.email ?? undefined,
  }))
}

/**
 * Every non-archived org the current user belongs to (for the multi-org
 * switcher). Archived orgs are already filtered server-side by the
 * is_org_member-gated RLS, so a membership row for an archived org never comes
 * back. Degrades to [] when cloud is off or the user is logged out.
 */
export async function listOrgs(): Promise<Org[]> {
  const client = await getAuthedClient()
  if (!client) return []

  const stored = loadSession()
  const uid = stored?.user?.id
  if (!uid) return []

  const { data, error } = await client
    .from('memberships')
    .select('org_id, role, organizations(id, name, created_by, archived_at)')
    .eq('user_id', uid)

  if (error || !data) return []

  const rows = data as unknown as MembershipRow[]
  const orgs: Org[] = []
  for (const row of rows) {
    const org = firstOrg(row.organizations)
    // Defense-in-depth: skip archived orgs even though RLS already filters them.
    if (!org || org.archived_at) continue
    orgs.push({
      id: org.id,
      name: org.name,
      createdBy: org.created_by ?? undefined,
      role: row.role,
    })
  }
  return orgs
}

/**
 * Org-wide agents roster (all members) for the team dashboard "who is working
 * on what". Delegates to the store (org-scoped by RLS). Degrades to [] when
 * cloud is off or the user is logged out.
 */
export async function listOrgAgents(): Promise<OrgAgent[]> {
  return getStore().loadOrgAgents()
}

/** Run a void-returning RPC through the authed client, surfacing failures as thrown errors. */
async function callVoidRpc(fn: string, args: Record<string, unknown>): Promise<void> {
  const client = await getAuthedClient()
  if (!client) throw new Error('Cloud features are not available')

  const { error } = await client.rpc(fn, args)
  if (error) throw new Error(error.message)
}

/**
 * Remove a member from an org (admin only). The remove_member RPC enforces the
 * admin gate and the last-admin lockout guard server-side.
 */
export async function removeMember(orgId: string, userId: string): Promise<void> {
  await callVoidRpc('remove_member', { p_org_id: orgId, p_user_id: userId })
}

/**
 * Leave an org (removes the current user's own membership). The
 * leave_organization RPC enforces the last-admin lockout guard, so a sole admin
 * of an org that still has members cannot leave. When the user leaves the active
 * org we clear the remembered currentOrgId so getCurrentOrg repoints cleanly.
 */
export async function leaveOrg(orgId: string): Promise<void> {
  await callVoidRpc('leave_organization', { p_org_id: orgId })
  if (readConfig().currentOrgId === orgId) setCurrentOrgId(undefined)
}

/** Change a member's role (admin only). The RPC enforces the last-admin guard on demotion. */
export async function updateMemberRole(orgId: string, userId: string, role: MembershipRole): Promise<void> {
  await callVoidRpc('update_member_role', { p_org_id: orgId, p_user_id: userId, p_role: role })
}

/**
 * Archive (soft-delete) an org (admin only). The RPC sets archived_at; the org
 * then drops out of every read path server-side. When it was the active org we
 * clear the remembered currentOrgId so getCurrentOrg repoints cleanly.
 */
export async function archiveOrg(orgId: string): Promise<void> {
  await callVoidRpc('archive_organization', { p_org_id: orgId })
  if (readConfig().currentOrgId === orgId) setCurrentOrgId(undefined)
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

/**
 * Read the org's shared config and merge it into the local config (best-effort).
 * 'fill' keeps existing local values (onboarding); 'replace' swaps the shared
 * keys to the org's values (used when switching the active org).
 */
async function mergeSharedConfigWith(
  client: SupabaseClient,
  orgId: string,
  mode: 'fill' | 'replace' = 'fill',
): Promise<Config> {
  try {
    const { data: shared, error } = await client.rpc('get_org_shared_config', { p_org_id: orgId })
    if (!error && shared) {
      return mergeOrgSharedConfig(shared as OrgSharedConfig, orgId, mode)
    }
  } catch (mergeError) {
    // Inheriting shared config is best-effort — never fail over it.
    console.error('[cloud] Failed to merge org shared config:', mergeError)
  }
  return readConfig()
}

/**
 * Switch the active org: remember it locally, then RE-APPLY the org's shared
 * config with REPLACE semantics so the shared skills/agents config (languages,
 * commit/PR format, repo keywords) actually swaps to the newly-active org rather
 * than retaining the previous org's values. Returns the updated local config.
 * Degrades local-first: throws the standard error when cloud is unavailable, and
 * the shared-config re-apply is best-effort (never fails the switch).
 */
export async function switchOrg(orgId: string): Promise<Config> {
  const client = await getAuthedClient()
  if (!client) throw new Error('Cloud features are not available')

  // Configs are per (org, user): point the store at the newly-active org and
  // re-hydrate that org's config row (rather than mutating the current one).
  getStore().setActiveOrgId(orgId)
  const config = await hydrateConfig()
  config.currentOrgId = orgId
  writeConfig(config)

  // Re-point the realtime subscription at the newly-active org so the team
  // dashboard streams the right org's agents (best-effort — never fail the
  // switch over it).
  void startOrgAgentsRealtime(orgId).catch((error) =>
    console.error('[cloud] failed to resubscribe realtime after org switch:', error),
  )
  return config
}

/**
 * Admin-only: push the org's shared config (languages, commit/PR format, repo
 * keywords) to the backend via the set_org_shared_config RPC, so every member
 * inherits it through get_org_shared_config / applySharedConfig.
 */
export async function setOrgSharedConfig(shared: OrgSharedConfig, orgId?: string): Promise<void> {
  const targetOrgId = orgId ?? (await getCurrentOrg())?.id
  if (!targetOrgId) throw new Error('No organization to update')
  await getStore().setOrgSharedConfig(targetOrgId, shared)
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
