import { effectiveStatus, type InvitationStatus } from './invitations'
import type { Role } from './orgs'
import { DEFAULTS, type UserSettings } from './settings'
import { getSupabase } from './supabase'

/**
 * The platform back-office data layer — read-only, and narrow on purpose.
 *
 * Every read here goes through a `SECURITY DEFINER` RPC whose `returns table` is
 * an explicit column allowlist (see
 * `supabase/migrations/20260728090000_platform_admins.sql`). None of the
 * underlying tables is readable from this role: `profiles`, `user_settings` and
 * `app_installations` are own-rows-only on every verb and no policy was widened
 * to add this feature, so `getSupabase().from('profiles')` would return the
 * caller's own row and nothing else no matter who is asking. The RPC is not a
 * convenience wrapper over a table read — it is the only path that exists.
 *
 * The write helpers at the bottom are narrow ON PURPOSE — three actions, all
 * scoped to organizations and their members (see
 * `supabase/migrations/20260729120000_admin_org_management.sql`). They exist for
 * the cases an org cannot fix from the inside: a tenant left with no admin, an
 * invite sent to a typo'd address, an archive to undo. Agents, repositories and
 * the device fleet stay read-only, because nothing in operating the platform
 * requires mutating them and a write path that exists "just in case" is a way to
 * lose data by accident.
 *
 * Reads and writes fail in OPPOSITE directions, deliberately. A failed read
 * returns an empty list: the back-office renders "nothing here", which is wrong
 * but harmless and self-correcting on the next fetch. A failed write throws, and
 * the caller shows the database's own message — including the one the last-admin
 * trigger raises, which is the only place that rule is worded.
 *
 * Granting platform admin is still a manual INSERT from the Supabase dashboard:
 * `platform_admins` grants `authenticated` nothing at all, and no RPC here
 * touches it. Self-service on that table would let an operator lock themselves
 * out, or promote, without any second pair of eyes.
 */

// ── Shapes ───────────────────────────────────────────────────────────────────

/** One row of the fleet list: a user plus the rollups shown next to them. */
export interface AdminUser {
  userId: string
  email: string | null
  createdAt: string | null
  lastSignInAt: string | null
  name: string | null
  role: string | null
  deviceCount: number
  latestAppVersion: string | null
  latestLastSeenAt: string | null
  orgCount: number
  /**
   * Every org they are a member of, archived included, the one they joined first
   * at index 0. An ARRAY and not a name because the table prints "Acme +2" from
   * it — and empty rather than null when they belong to none, so a caller never
   * has to distinguish "no orgs" from "not loaded".
   */
  orgNames: string[]
  /**
   * Repositories REACHED: personal ones they own plus the team repos of their
   * orgs, whether or not they created them. Same predicate as
   * `listUserRepositories`, so this count equals the number of rows the
   * drill-down shows.
   */
  repoCount: number
  agentCount: number
  activeAgentCount: number
}

/**
 * One DEVICE. The whole version story is per device, not per user: a person with
 * a laptop on the current build and a desktop three versions behind is two rows
 * here and one row (the most recent device) in `AdminUser`.
 */
export interface AdminInstallation {
  userId: string
  email: string | null
  deviceId: string
  deviceName: string | null
  appVersion: string
  platform: string | null
  arch: string | null
  lastSeenAt: string
  appVersionUpdatedAt: string | null
}

/**
 * All 17 `user_settings` columns, as the desktop app stores them. Every one is
 * nullable and NULL is a third state distinct from false — it means the user
 * never chose, and the app applies its own default. Nothing here normalises a
 * null away: "never chose" is exactly what a support question needs to see.
 *
 * Extends the 10 fields `lib/settings.ts` already names (the ones the webapp lets
 * a user edit) rather than restating them, so a column rename is one edit and not
 * two camelCase lists that must silently agree. The 7 added below are the ones
 * `UserSettings` deliberately omits: per-machine properties and transient view
 * state, which the back-office reports precisely because it cannot edit them.
 */
export interface AdminUserSettings extends UserSettings {
  usageCardMinimized: boolean | null
  splitActive: boolean | null
  spotlightEnabled: boolean | null
  spotlightShortcut: string | null
  autoStartAtLogin: boolean | null
  atlassianIntegrationEnabled: boolean | null
  syncClaudeTheme: boolean | null
}

/**
 * What the desktop app does with each setting the user never chose — so the console
 * can say "par défaut (on)" instead of just "jamais choisi", which tells an operator
 * that a column is null without telling them what the app is therefore doing.
 *
 * Extends `DEFAULTS` (lib/settings.ts) rather than restating it: those ten are the
 * ones the webapp itself can edit, and their defaults are already documented there.
 * The seven below are the admin-only columns, each verified against the line in the
 * desktop app that resolves the unset value — cited, because a default invented here
 * would be a confident lie in the one tool used to answer "why is it behaving like
 * that":
 *
 *  * usageCardMinimized — `=== true`, so anything else is expanded.
 *    desktop/src/renderer/components/SidebarUsageCard.tsx
 *  * splitActive — the store's initial state.
 *    desktop/src/renderer/store/index.ts
 *  * spotlightEnabled / spotlightShortcut — the `?? true` and `?? 'Control+Space'`
 *    the Features tab reads with. desktop/src/renderer/pages/Config/index.tsx
 *  * autoStartAtLogin — applied only when set, and the OS default for a freshly
 *    installed app is not to open at login. desktop/src/main/index.ts
 *  * syncClaudeTheme — `?? true`.
 *    desktop/src/renderer/pages/Config/AppearancePage.tsx
 *  * atlassianIntegrationEnabled — INFERRED, not read: nothing in the desktop app
 *    defaults it, so an absent flag simply means the integration was never set up.
 *    Stated as false on that basis and not on a `??` somewhere.
 */
export const SETTING_DEFAULTS: Record<keyof AdminUserSettings, string | number | boolean> = {
  ...DEFAULTS,
  usageCardMinimized: false,
  splitActive: false,
  spotlightEnabled: true,
  spotlightShortcut: 'Control+Space',
  autoStartAtLogin: false,
  atlassianIntegrationEnabled: false,
  syncClaudeTheme: true,
}

export interface SettingGroup {
  /** The feature, named as the desktop app names it. */
  title: string
  fields: { field: keyof AdminUserSettings; label: string }[]
}

/**
 * The seventeen settings, grouped by FEATURE, in reading order. Also the field
 * allowlist — a column absent from here is a column the console does not show.
 *
 * The groups and their titles are the desktop app's own sections, verbatim: "Usage
 * card", "Activity recording", "Split View", "PR Review Watcher", "Spotlight",
 * "Background App" are the SectionHeaders of its Features tab, and Appearance and
 * Launch mode are where the rest live (desktop/src/renderer/pages/Config/index.tsx,
 * titles from desktop/src/i18n/en.ts). That is the point of grouping them this way
 * rather than by a tidier taxonomy invented here: an operator reads this card while
 * someone describes the screen in front of them, and the two now use the same words
 * for the same box.
 *
 * "Integrations" is the one group with no counterpart in the app — the Atlassian flag
 * is written by the installer and toggled over IPC, and no settings section owns it.
 *
 * Labels drop the feature name the group already carries: "Usage card / Enabled"
 * rather than "Usage card / Usage card". Inside a titled box the row names the
 * option, not the feature.
 */
export const SETTING_GROUPS: SettingGroup[] = [
  {
    title: 'Appearance',
    fields: [
      { field: 'theme', label: 'Theme' },
      { field: 'language', label: 'Interface language' },
      { field: 'syncClaudeTheme', label: 'Sync Claude Code theme' },
    ],
  },
  {
    title: 'Launch mode',
    fields: [{ field: 'launchMode', label: 'Claude Code launch' }],
  },
  {
    title: 'Usage card',
    fields: [
      { field: 'usageCardEnabled', label: 'Enabled' },
      { field: 'usageCardMinimized', label: 'Minimized' },
    ],
  },
  {
    // The "(on by default)" this label used to carry is gone: the value column now
    // prints the default itself, for every row rather than for the one that was
    // surprising enough to annotate by hand.
    title: 'Activity recording',
    fields: [{ field: 'usageLogsEnabled', label: 'Enabled' }],
  },
  {
    title: 'Daily digest',
    fields: [{ field: 'dailyDigestEnabled', label: 'Enabled' }],
  },
  {
    title: 'Split View',
    fields: [
      { field: 'splitEnabled', label: 'Enabled' },
      { field: 'splitActive', label: 'Currently active' },
    ],
  },
  {
    title: 'PR Review Watcher',
    fields: [
      { field: 'prReviewsEnabled', label: 'Enabled' },
      { field: 'prReviewsPollIntervalMs', label: 'Poll interval' },
      { field: 'prReviewsAutoLaunchSkills', label: 'Auto-launch skills' },
    ],
  },
  {
    title: 'Spotlight',
    fields: [
      { field: 'spotlightEnabled', label: 'Enabled' },
      { field: 'spotlightShortcut', label: 'Shortcut' },
    ],
  },
  {
    title: 'Background App',
    fields: [{ field: 'autoStartAtLogin', label: 'Start at login' }],
  },
  {
    title: 'Integrations',
    fields: [{ field: 'atlassianIntegrationEnabled', label: 'Atlassian' }],
  },
]

/** The drill-down header: who they are, plus their whole settings row. */
export interface AdminUserDetail {
  userId: string
  email: string | null
  createdAt: string | null
  lastSignInAt: string | null
  name: string | null
  role: string | null
  settings: AdminUserSettings
}

export interface AdminOrg {
  orgId: string
  name: string
  role: Role
  archivedAt: string | null
  createdAt: string | null
}

/**
 * One row of the platform-wide org list. Distinct from `AdminOrg`, which is one
 * org as seen FROM a user (hence its `role`): this is one org seen from the
 * platform, where no single role applies and the counts are the point.
 */
export interface AdminOrgSummary {
  orgId: string
  name: string
  createdBy: string | null
  createdByEmail: string | null
  archivedAt: string | null
  createdAt: string | null
  memberCount: number
  adminCount: number
  repoCount: number
  agentCount: number
  pendingInvitationCount: number
}

/**
 * One member of one org, as the back-office sees them. Carries the email AND the
 * profile name because neither identifies a person on its own: two accounts at
 * the same company share a domain, and a uuid identifies nobody in a support
 * conversation. `name` is null for a member who never opened the desktop app.
 */
export interface AdminOrgMember {
  userId: string
  email: string | null
  name: string | null
  role: Role
  createdAt: string | null
}

/**
 * One invitation of one org. No `token` field, and there must never be one: the
 * RPC does not return it because a token is a bearer credential that grants org
 * membership to whoever holds it. `status` is the EFFECTIVE status — a pending
 * invite past its expiry reads as expired, derived on arrival through
 * `effectiveStatus` rather than re-implemented here.
 */
export interface AdminOrgInvitation {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  invitedByEmail: string | null
  expiresAt: string | null
  acceptedAt: string | null
  createdAt: string | null
}

export interface AdminAgent {
  id: string
  name: string
  ticketId: string | null
  status: string | null
  branchName: string | null
  baseBranch: string | null
  orgId: string | null
  shared: boolean
  archivedAt: string | null
  createdAt: string | null
  repoNames: string[]
}

export interface AdminRepository {
  id: string
  name: string
  orgId: string | null
  orgName: string | null
  keywords: string[]
  /**
   * Whether THIS user bound the repo to a folder on a machine — the thing that makes
   * a configured repo actually usable. Presence only: the path itself is not
   * returned, see the migration for why.
   */
  hasPath: boolean
  createdAt: string | null
}

// ── RPC row shapes (snake_case, mirroring each returns table) ─────────────────

interface AdminUserRpcRow {
  user_id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  name: string | null
  role: string | null
  device_count: number
  latest_app_version: string | null
  latest_last_seen_at: string | null
  org_count: number
  // Nullable in the type though the RPC coalesces it to '{}': PostgREST is one
  // deploy away from the migration, and a null here would otherwise reach the
  // table as `undefined.length`.
  org_names: string[] | null
  repo_count: number
  agent_count: number
  active_agent_count: number
}

interface AdminInstallationRpcRow {
  user_id: string
  email: string | null
  device_id: string
  device_name: string | null
  app_version: string
  platform: string | null
  arch: string | null
  last_seen_at: string
  app_version_updated_at: string | null
}

interface AdminUserDetailRpcRow {
  user_id: string
  email: string | null
  created_at: string | null
  last_sign_in_at: string | null
  name: string | null
  role: string | null
  usage_card_enabled: boolean | null
  usage_card_minimized: boolean | null
  usage_logs_enabled: boolean | null
  daily_digest_enabled: boolean | null
  split_enabled: boolean | null
  split_active: boolean | null
  pr_reviews_enabled: boolean | null
  pr_reviews_poll_interval_ms: number | null
  pr_reviews_auto_launch_skills: boolean | null
  spotlight_enabled: boolean | null
  spotlight_shortcut: string | null
  auto_start_at_login: boolean | null
  launch_mode: string | null
  atlassian_integration_enabled: boolean | null
  theme: string | null
  language: string | null
  sync_claude_theme: boolean | null
}

interface AdminOrgRpcRow {
  org_id: string
  name: string
  role: Role
  archived_at: string | null
  created_at: string | null
}

interface AdminOrgSummaryRpcRow {
  org_id: string
  name: string
  created_by: string | null
  created_by_email: string | null
  archived_at: string | null
  created_at: string | null
  // Postgres `count(*)` is bigint, which supabase-js hands back as a JS number
  // for any value this product will ever see. Typed as number rather than
  // number | string so callers are not forced through a cast that is never hit.
  member_count: number
  admin_count: number
  repo_count: number
  agent_count: number
  pending_invitation_count: number
}

interface AdminOrgMemberRpcRow {
  user_id: string
  email: string | null
  name: string | null
  role: Role
  created_at: string | null
}

interface AdminOrgInvitationRpcRow {
  id: string
  email: string
  role: Role
  status: InvitationStatus
  invited_by_email: string | null
  expires_at: string | null
  accepted_at: string | null
  created_at: string | null
}

interface AdminAgentRpcRow {
  id: string
  name: string
  ticket_id: string | null
  status: string | null
  branch_name: string | null
  base_branch: string | null
  org_id: string | null
  shared: boolean
  archived_at: string | null
  created_at: string | null
  repo_names: string[] | null
}

interface AdminRepositoryRpcRow {
  id: string
  name: string
  org_id: string | null
  org_name: string | null
  keywords: string[] | null
  // Nullable in the type though the RPC returns a plain `exists`: PostgREST can be
  // one deploy behind the migration, and `undefined` must not read as "bound".
  has_path: boolean | null
  created_at: string | null
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function toUser(r: AdminUserRpcRow): AdminUser {
  return {
    userId: r.user_id,
    email: r.email,
    createdAt: r.created_at,
    lastSignInAt: r.last_sign_in_at,
    name: r.name,
    role: r.role,
    deviceCount: r.device_count,
    latestAppVersion: r.latest_app_version,
    latestLastSeenAt: r.latest_last_seen_at,
    orgCount: r.org_count,
    orgNames: r.org_names ?? [],
    repoCount: r.repo_count,
    agentCount: r.agent_count,
    activeAgentCount: r.active_agent_count,
  }
}

function toInstallation(r: AdminInstallationRpcRow): AdminInstallation {
  return {
    userId: r.user_id,
    email: r.email,
    deviceId: r.device_id,
    deviceName: r.device_name,
    appVersion: r.app_version,
    platform: r.platform,
    arch: r.arch,
    lastSeenAt: r.last_seen_at,
    appVersionUpdatedAt: r.app_version_updated_at,
  }
}

function toUserDetail(r: AdminUserDetailRpcRow): AdminUserDetail {
  return {
    userId: r.user_id,
    email: r.email,
    createdAt: r.created_at,
    lastSignInAt: r.last_sign_in_at,
    name: r.name,
    role: r.role,
    settings: {
      usageCardEnabled: r.usage_card_enabled,
      usageCardMinimized: r.usage_card_minimized,
      usageLogsEnabled: r.usage_logs_enabled,
      dailyDigestEnabled: r.daily_digest_enabled,
      splitEnabled: r.split_enabled,
      splitActive: r.split_active,
      prReviewsEnabled: r.pr_reviews_enabled,
      prReviewsPollIntervalMs: r.pr_reviews_poll_interval_ms,
      prReviewsAutoLaunchSkills: r.pr_reviews_auto_launch_skills,
      spotlightEnabled: r.spotlight_enabled,
      spotlightShortcut: r.spotlight_shortcut,
      autoStartAtLogin: r.auto_start_at_login,
      launchMode: r.launch_mode,
      atlassianIntegrationEnabled: r.atlassian_integration_enabled,
      theme: r.theme,
      language: r.language,
      syncClaudeTheme: r.sync_claude_theme,
    },
  }
}

function toOrg(r: AdminOrgRpcRow): AdminOrg {
  return {
    orgId: r.org_id,
    name: r.name,
    role: r.role,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
  }
}

function toOrgSummary(r: AdminOrgSummaryRpcRow): AdminOrgSummary {
  return {
    orgId: r.org_id,
    name: r.name,
    createdBy: r.created_by,
    createdByEmail: r.created_by_email,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    memberCount: r.member_count,
    adminCount: r.admin_count,
    repoCount: r.repo_count,
    agentCount: r.agent_count,
    pendingInvitationCount: r.pending_invitation_count,
  }
}

function toOrgMember(r: AdminOrgMemberRpcRow): AdminOrgMember {
  return {
    userId: r.user_id,
    email: r.email,
    name: r.name,
    role: r.role,
    createdAt: r.created_at,
  }
}

function toOrgInvitation(r: AdminOrgInvitationRpcRow): AdminOrgInvitation {
  return {
    id: r.id,
    email: r.email,
    role: r.role,
    // Derived here rather than in SQL, for the reason stated on effectiveStatus:
    // the database cannot persist the flip, so every reader computes it.
    status: effectiveStatus(r.status, r.expires_at),
    invitedByEmail: r.invited_by_email,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at,
    createdAt: r.created_at,
  }
}

function toAgent(r: AdminAgentRpcRow): AdminAgent {
  return {
    id: r.id,
    name: r.name,
    ticketId: r.ticket_id,
    status: r.status,
    branchName: r.branch_name,
    baseBranch: r.base_branch,
    orgId: r.org_id,
    shared: r.shared,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    repoNames: r.repo_names ?? [],
  }
}

function toRepository(r: AdminRepositoryRpcRow): AdminRepository {
  return {
    id: r.id,
    name: r.name,
    orgId: r.org_id,
    orgName: r.org_name,
    keywords: r.keywords ?? [],
    hasPath: r.has_path ?? false,
    createdAt: r.created_at,
  }
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * Whether the signed-in user operates the platform.
 *
 * The database is the authority: every `admin_*` RPC re-checks this itself and
 * raises, so a caller who forced this to true client-side would still get nothing
 * back. That is what makes it safe to use for hiding the nav entry — the answer
 * gates DISCOVERY, not access.
 *
 * Falls back to false on any error, which is the safe direction: a network blip
 * hides an admin's own back-office rather than showing a stranger's.
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('is_platform_admin')
  if (error) return false
  return data === true
}

/** Every user, with their app version resolved from their most recent device. */
export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await getSupabase().rpc('admin_list_users')
  if (error || !data) return []
  return (data as AdminUserRpcRow[]).map(toUser)
}

/**
 * Devices. Omit `userId` for the whole fleet — which is one round trip for the
 * version histogram, the outdated list, the platform breakdown and the
 * inactivity signal, since all four are rollups of the same rows.
 */
export async function listInstallations(userId?: string): Promise<AdminInstallation[]> {
  const { data, error } = await getSupabase().rpc('admin_list_installations', {
    p_user_id: userId ?? null,
  })
  if (error || !data) return []
  return (data as AdminInstallationRpcRow[]).map(toInstallation)
}

/**
 * One user's identity and settings, or null when the id is unknown. The RPC is
 * driven off `auth.users`, so a user who never wrote a profile or a settings row
 * still comes back — with nulls, which is the honest answer.
 */
export async function getUser(userId: string): Promise<AdminUserDetail | null> {
  const { data, error } = await getSupabase().rpc('admin_get_user', { p_user_id: userId })
  if (error || !data) return null
  const rows = data as AdminUserDetailRpcRow[]
  return rows.length > 0 ? toUserDetail(rows[0]) : null
}

/**
 * Every organization on the platform, oldest first, archived ones included
 * (`archivedAt` says which).
 *
 * One round trip, not one per user: the RPC drives off `organizations`, so an org
 * with no members — a tenant created moments ago, or one whose last member left —
 * still appears. Composing this from `listUsers()` + `listUserOrgs()` would omit
 * exactly those.
 */
export async function listOrgs(): Promise<AdminOrgSummary[]> {
  const { data, error } = await getSupabase().rpc('admin_list_orgs')
  if (error || !data) return []
  return (data as AdminOrgSummaryRpcRow[]).map(toOrgSummary)
}

/** The orgs a user belongs to, archived ones included (`archivedAt` says which). */
export async function listUserOrgs(userId: string): Promise<AdminOrg[]> {
  const { data, error } = await getSupabase().rpc('admin_list_user_orgs', { p_user_id: userId })
  if (error || !data) return []
  return (data as AdminOrgRpcRow[]).map(toOrg)
}

/** The agents a user owns, archived ones included, newest first. */
export async function listUserAgents(userId: string): Promise<AdminAgent[]> {
  const { data, error } = await getSupabase().rpc('admin_list_user_agents', { p_user_id: userId })
  if (error || !data) return []
  return (data as AdminAgentRpcRow[]).map(toAgent)
}

/** The repositories a user can reach: their own, plus their orgs' team repos. */
export async function listUserRepositories(userId: string): Promise<AdminRepository[]> {
  const { data, error } = await getSupabase().rpc('admin_list_user_repositories', {
    p_user_id: userId,
  })
  if (error || !data) return []
  return (data as AdminRepositoryRpcRow[]).map(toRepository)
}

/**
 * The members of one org, admins first then oldest membership.
 *
 * `list_org_members` answers the same shape but only for a caller who is a MEMBER
 * of the org, which a platform operator is not and must not have to become.
 */
export async function listOrgMembers(orgId: string): Promise<AdminOrgMember[]> {
  const { data, error } = await getSupabase().rpc('admin_list_org_members', { p_org_id: orgId })
  if (error || !data) return []
  return (data as AdminOrgMemberRpcRow[]).map(toOrgMember)
}

/**
 * Every invitation of one org, newest first, whatever its status — a revoked or
 * expired invite is part of the story an operator is reading. Tokens excluded.
 */
export async function listOrgInvitations(orgId: string): Promise<AdminOrgInvitation[]> {
  const { data, error } = await getSupabase().rpc('admin_list_org_invitations', { p_org_id: orgId })
  if (error || !data) return []
  return (data as AdminOrgInvitationRpcRow[]).map(toOrgInvitation)
}

// ── Writes ───────────────────────────────────────────────────────────────────
//
// All three throw on failure with the database's own message, which is what lets
// the UI report WHY rather than "something went wrong". The messages worth
// surfacing verbatim: 'cannot remove or demote the last admin while other members
// remain' (the trigger), 'no such membership in this organization',
// 'only a pending invitation can be revoked (this one is accepted)'.

/**
 * Set a member's role in any org — including one left with no admin at all,
 * which nobody inside that org can repair.
 *
 * The last-admin invariant is NOT checked here or in the RPC: a BEFORE UPDATE
 * trigger on `memberships` enforces it for every caller, and duplicating it
 * client-side would put the rule in a third place that could disagree.
 */
export async function setMembershipRole(orgId: string, userId: string, role: Role): Promise<void> {
  const { error } = await getSupabase().rpc('admin_set_membership_role', {
    p_org_id: orgId,
    p_user_id: userId,
    p_role: role,
  })
  if (error) throw new Error(error.message)
}

/**
 * Archive or restore a tenant. Archiving is a soft delete — the org drops out of
 * every read path for its members while its data stays untouched — so restoring
 * puts it back exactly as they left it.
 *
 * The restore direction exists ONLY for platform admins: an org admin can archive
 * their own tenant and cannot undo it, because undoing is a support action on
 * data the operator does not own.
 */
export async function setOrgArchived(orgId: string, archived: boolean): Promise<void> {
  const { error } = await getSupabase().rpc('admin_set_org_archived', {
    p_org_id: orgId,
    p_archived: archived,
  })
  if (error) throw new Error(error.message)
}

/**
 * Revoke a pending invitation, which invalidates its token immediately —
 * `accept_invitation` requires status 'pending', so the link in the invitee's
 * mailbox stops working the moment this returns.
 *
 * Sets the status rather than deleting the row (which is what the desktop app
 * does): an operator acting on someone else's tenant should leave a trace of what
 * they did. Throws on an already-accepted invitation instead of passing quietly —
 * the person is a member by then, and removing a member is a different action.
 */
export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await getSupabase().rpc('admin_revoke_invitation', {
    p_invitation_id: invitationId,
  })
  if (error) throw new Error(error.message)
}

// ── Rollups (pure) ─────────────────────────────────────────────

/**
 * The four fleet rollups live in `./adminRollups`, which imports nothing but
 * `./versions`. They are kept out of this module because the root vitest run
 * covers `webapp/lib/**` while CI installs only the root's dependencies: a test
 * importing from here would fail to resolve `@supabase/supabase-js` before
 * running a single assertion. Re-exported so callers keep one import site.
 */
export {
  bucketByVersion,
  countBy,
  outdatedInstallations,
  quietInstallations,
  QUIET_DAYS,
  UNKNOWN_VALUE,
} from './adminRollups'
export type { BreakdownKey, CountBucket, FleetDevice, VersionBucket } from './adminRollups'
