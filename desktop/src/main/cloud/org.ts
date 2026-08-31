import * as path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Config, Invitation, InvitationStatus, Member, MembershipRole, Org, OrgActivity, OrgAgent, OrgSharedConfig, SkillCounts, UsageStats } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'
import { readConfig, mergeOrgSharedConfig } from '../config/config'
import { expandPath } from '../config/validation'
import { getStore } from '../store/Store'

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
 * A default organization for the handful of calls that still need to name one
 * without the caller supplying it (listing members, creating an invitation).
 * The user's first membership — there is no "active org" any more: agents take
 * their org from their repositories, and every org's repos are visible at once.
 * Null when cloud is disabled, the user is logged out, or has no membership.
 */
export async function getCurrentOrg(): Promise<Org | null> {
  const orgs = await listOrgs()
  return orgs[0] ?? null
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

/**
 * Org-wide usage stats for the team dashboard. Delegates to the store (org-scoped
 * by RLS — any member may read, regardless of their own usage-logs opt-in).
 * Degrades to empty rows when cloud is off or the user is logged out.
 */
export async function listOrgUsageStats(): Promise<UsageStats> {
  return getStore().loadOrgUsageStats()
}

/**
 * Run count per skill for one org, for the Team page's stats row. Delegates to the
 * store, which reaches the `org_skill_counts` RPC — SECURITY INVOKER, so RLS scopes
 * it and asking about an org the user has left simply yields no counts.
 *
 * The org id is required rather than defaulted to the current one: the Team page has
 * a tab per organization and asks for whichever is open, so silently answering about
 * a different org than the one on screen is the one failure to avoid here.
 */
export async function listOrgSkillCounts(orgId: string): Promise<SkillCounts> {
  if (typeof orgId !== 'string' || orgId.trim().length === 0) return {}
  return getStore().loadOrgSkillCounts(orgId)
}

/**
 * Run count per skill for the caller's own out-of-org work — the Team page's Personal
 * tab. No argument, and no org to get wrong: these are the rows with a null org_id,
 * which RLS makes readable by their author alone.
 */
export async function listPersonalSkillCounts(): Promise<SkillCounts> {
  return getStore().loadPersonalSkillCounts()
}

/** How far back the Team page may look, and how many rows it may pull. */
const ACTIVITY_MAX_WINDOW_MS = 90 * 24 * 60 * 60 * 1000
const ACTIVITY_ROW_LIMIT = 5000

/**
 * Org-wide activity events for the Team page's flow metrics. Delegates to the
 * store (org-scoped by RLS — any member may read). Degrades to no events when
 * cloud is off or the user is logged out.
 *
 * `sinceMs` is clamped to the 90-day window: the renderer asks once for the full
 * window and narrows to 7/30/90 days client-side, so a wider request would only
 * ever be a bug or a hostile renderer.
 */
export async function listOrgActivity(sinceMs?: number): Promise<OrgActivity> {
  const floor = Date.now() - ACTIVITY_MAX_WINDOW_MS
  const requested = typeof sinceMs === 'number' && Number.isFinite(sinceMs) ? sinceMs : floor
  return getStore().loadOrgActivity(Math.max(requested, floor), ACTIVITY_ROW_LIMIT)
}

export interface PickUpTaskResult {
  /** Local working directory (an expanded, configured repo path) to launch in. */
  cwd: string
  /** Prompt to hand the fresh agent, carrying ticket/branch/state resumption. */
  initialPrompt: string
}

/**
 * Resolve a colleague's task to something the current user can actually launch
 * locally. A teammate's OrgAgent.repositories are absolute paths on THEIR machine,
 * so they never match ours directly — we match by repository name (the last path
 * segment) against the current user's configured repositories, falling back to an
 * exact expanded-path match. Throws a user-facing error when no local repo maps,
 * so the renderer can surface it as a toast (the dashboard also hides the action
 * when nothing maps). On success returns the local cwd + the `/magic:continue`
 * prompt that resumes the ticket's branch/state.
 */
export function pickUpTask(ticketId: string, repositories: string[]): PickUpTaskResult {
  if (typeof ticketId !== 'string' || ticketId.trim().length === 0) {
    throw new Error('pickUpTask requires a ticketId')
  }
  // ticketId comes from agents.ticket_id, which any org member can write, and it is
  // embedded in the prompt below.
  //
  // This check is NOT what makes that safe, and it used to be described as though it
  // were. Shell safety lives at the sink: the prompt is interpolated into a command
  // line by `pty/terminal-manager.ts`, which quotes it with `shQuote` — a filter here
  // would have to enumerate shell metacharacters correctly forever, and the version
  // that only rejected newlines let `$(…)` and backticks straight through.
  //
  // What it still buys, and why it stays: a newline or a NUL in a ticket id is
  // meaningless as an identifier and would corrupt the prompt as a prompt — Claude
  // Code reads a bare newline as "send", so a two-line prompt submits its first line
  // and abandons the second. Refusing early names the bad data instead of acting on it.
  if (/[\r\n\0]/.test(ticketId)) {
    throw new Error('pickUpTask received a ticketId with illegal control characters')
  }
  const localRepos = Object.values(readConfig().repositories ?? {})
  const baseName = (p: string) => path.basename(p.replace(/[/\\]+$/, ''))

  for (const repo of repositories) {
    if (typeof repo !== 'string' || repo.length === 0) continue
    const target = baseName(repo)
    const expandedRepo = expandPath(repo)
    const match = localRepos.find((r) => {
      const local = expandPath(r.path)
      return baseName(local) === target || local === expandedRepo
    })
    if (match) {
      return { cwd: expandPath(match.path), initialPrompt: `/magic:continue ${ticketId}` }
    }
  }

  throw new Error(
    'No matching local repository is configured for this task. Add the repository in Settings to pick it up.',
  )
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
 * of an org that still has members cannot leave. Its repositories simply stop
 * being visible on the next config load, and the agents that worked on them lose
 * their derived organization.
 */
export async function leaveOrg(orgId: string): Promise<void> {
  await callVoidRpc('leave_organization', { p_org_id: orgId })
}

/** Change a member's role (admin only). The RPC enforces the last-admin guard on demotion. */
export async function updateMemberRole(orgId: string, userId: string, role: MembershipRole): Promise<void> {
  await callVoidRpc('update_member_role', { p_org_id: orgId, p_user_id: userId, p_role: role })
}

/**
 * Archive (soft-delete) an org (admin only). The RPC sets archived_at; the org
 * then drops out of every read path server-side, taking its repositories with it.
 */
export async function archiveOrg(orgId: string): Promise<void> {
  await callVoidRpc('archive_organization', { p_org_id: orgId })
}

/**
 * Create an organization; the caller becomes its admin. There is deliberately no
 * INSERT policy on `organizations` — the org row and the creator's admin
 * membership must land atomically, so this goes through the SECURITY DEFINER
 * `create_organization` RPC (the same one sign-up uses for the personal org).
 * Returns the new org id. Does NOT switch to it — that stays an explicit choice.
 */
export async function createOrganization(name: string): Promise<string> {
  const client = await getAuthedClient()
  if (!client) throw new Error('Cloud features are not available')

  const orgName = name.trim()
  if (!orgName) throw new Error('createOrganization requires a name')

  const { data, error } = await client.rpc('create_organization', { org_name: orgName })
  if (error) throw new Error(error.message)
  return data as string
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

/** Delete an invitation by id (admin only — RLS enforces the admin gate on DELETE). */
export async function deleteInvitation(id: string): Promise<void> {
  const client = await getAuthedClient()
  if (!client) throw new Error('Cloud features are not available')

  const { error } = await client.from('invitations').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface AcceptInvitationResult {
  orgId: string
  config: Config
}

/**
 * Read the org's shared config and merge it into that org's repositories
 * (best-effort). Existing local values always win.
 */
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

  // Membership now exists → safe to read the org's shared config.
  const config = await mergeSharedConfigWith(client, orgId as string)

  return { orgId: orgId as string, config }
}
