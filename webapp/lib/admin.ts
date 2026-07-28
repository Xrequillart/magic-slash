import { compareVersions, highestVersion } from './installations'
import type { Role } from './orgs'
import type { UserSettings } from './settings'
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
 * There is deliberately no write helper in this file. The back-office looks; it
 * does not touch. Granting platform admin is a manual INSERT from the Supabase
 * dashboard, because `platform_admins` grants `authenticated` nothing at all.
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

/** Reading order and labels for the settings list. Also the field allowlist. */
export const SETTING_LABELS: { field: keyof AdminUserSettings; label: string }[] = [
  { field: 'theme', label: 'Theme' },
  { field: 'language', label: 'Interface language' },
  { field: 'syncClaudeTheme', label: 'Sync Claude Code theme' },
  { field: 'launchMode', label: 'Claude Code launch mode' },
  { field: 'usageCardEnabled', label: 'Usage card' },
  { field: 'usageCardMinimized', label: 'Usage card minimized' },
  { field: 'usageLogsEnabled', label: 'Usage logs (GDPR opt-in)' },
  { field: 'dailyDigestEnabled', label: 'Daily digest' },
  { field: 'splitEnabled', label: 'Split view' },
  { field: 'splitActive', label: 'Split view active' },
  { field: 'prReviewsEnabled', label: 'PR review watcher' },
  { field: 'prReviewsPollIntervalMs', label: 'PR review poll interval' },
  { field: 'prReviewsAutoLaunchSkills', label: 'PR review auto-launch skills' },
  { field: 'spotlightEnabled', label: 'Spotlight' },
  { field: 'spotlightShortcut', label: 'Spotlight shortcut' },
  { field: 'autoStartAtLogin', label: 'Start at login' },
  { field: 'atlassianIntegrationEnabled', label: 'Atlassian integration' },
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

// ── Rollups (pure) ───────────────────────────────────────────────────────────

/**
 * These four are deliberately pure and dependency-free — no Supabase, no React, no
 * Date.now() (the one that needs the clock takes it as an argument). They are the
 * only logic on the back-office that can be wrong in a way a screenshot would not
 * reveal, so they are unit-tested (`admin.test.ts`) rather than inlined into the
 * component that renders them.
 */

export interface VersionBucket {
  version: string
  count: number
}

export interface CountBucket {
  value: string
  count: number
}

/** Which device-shape fields the breakdown can group on. */
export type BreakdownKey = 'platform' | 'arch'

/** Label used for a device that never reported a platform or an arch. */
export const UNKNOWN_VALUE = 'unknown'

/**
 * Devices per version, newest version first — the fleet histogram.
 *
 * Counts DEVICES, not users: "62% of the fleet is on 0.54.1" is a statement about
 * machines, and a user with two of them contributes twice because both need the
 * update. Ordering is by version rather than by count so the bars read as a
 * timeline and the tail of old builds stays on the same side of the chart between
 * releases.
 */
export function bucketByVersion(installations: AdminInstallation[]): VersionBucket[] {
  const counts = new Map<string, number>()
  for (const i of installations) {
    counts.set(i.appVersion, (counts.get(i.appVersion) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([version, count]) => ({ version, count }))
    // compareVersions is coarse (numeric components only), so two spellings of
    // the same version can tie; the string comparison keeps the order stable
    // instead of leaving it to the sort implementation.
    .sort((a, b) => compareVersions(b.version, a.version) || b.version.localeCompare(a.version))
}

/**
 * The devices not on the highest version any device reports.
 *
 * "Highest observed", not "latest released": nothing here knows what has shipped,
 * and a fleet where every machine is one release behind would report itself fully
 * up to date. That is the honest limit of this signal, and it is still the useful
 * one — it answers "who is behind the others", which is what a support question
 * asks. Empty in, empty out; a single-version fleet has no outdated devices.
 */
export function outdatedInstallations(installations: AdminInstallation[]): AdminInstallation[] {
  const highest = highestVersion(installations)
  if (highest === null) return []
  return installations.filter((i) => compareVersions(i.appVersion, highest) < 0)
}

/**
 * Devices grouped by `platform` or `arch`, most common first. A missing value
 * becomes `unknown` rather than being dropped, so the buckets always sum to the
 * fleet size — a breakdown that quietly omits rows invites the wrong conclusion.
 *
 * Ties break alphabetically, so two equal buckets do not swap places between
 * renders.
 */
export function countBy(installations: AdminInstallation[], key: BreakdownKey): CountBucket[] {
  const counts = new Map<string, number>()
  for (const i of installations) {
    const value = i[key]?.trim() || UNKNOWN_VALUE
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

/** A device unseen for this long is worth surfacing on its own. */
export const QUIET_DAYS = 14

/**
 * The devices that have not launched the app in `days`.
 *
 * `now` is a parameter rather than a `Date.now()` read so this stays pure like its
 * three siblings above — and so it is testable, which matters more here than for
 * any of them: a flipped comparison or a wrong unit renders as a plausible-looking
 * list of names, with nothing on screen to say it is wrong.
 */
export function quietInstallations(
  installations: AdminInstallation[],
  now: number,
  days = QUIET_DAYS,
): AdminInstallation[] {
  const cutoff = days * 24 * 60 * 60 * 1000
  return installations.filter((i) => now - new Date(i.lastSeenAt).getTime() > cutoff)
}
