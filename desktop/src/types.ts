export type TerminalState = 'idle' | 'working' | 'waiting' | 'completed' | 'error'

export interface RepositoryMetadata {
  prUrl?: string
  prReviewStatus?: 'approved' | 'changes-requested' | 'commented' | 'pending'
  prReviewCommentCount?: number
  prReviewers?: string[]
  prReviewUpdatedAt?: number
  prMerged?: boolean
  prClosed?: boolean
}

export interface TerminalUsage {
  costUsd?: number           // cost.total_cost_usd
  contextPercent?: number    // context_window.used_percentage (0-100)
  contextTokens?: number     // tokens currently occupying the context window
  contextWindowSize?: number // context_window.context_window_size
  model?: string             // model.display_name
  durationMs?: number        // cost.total_duration_ms
  linesAdded?: number        // cost.total_lines_added
  linesRemoved?: number      // cost.total_lines_removed
  // Plan rate limits — only present for Claude.ai Pro/Max subscribers, after the
  // first API response in the session. Absent for API/Console users.
  fiveHourPercent?: number   // rate_limits.five_hour.used_percentage (0-100)
  fiveHourResetsAt?: number  // rate_limits.five_hour.resets_at (unix epoch seconds)
  sevenDayPercent?: number   // rate_limits.seven_day.used_percentage (0-100)
  sevenDayResetsAt?: number  // rate_limits.seven_day.resets_at (unix epoch seconds)
  updatedAt?: number         // timestamp of last statusline report
}

// Signed-in Claude account (from ~/.claude.json oauthAccount).
export interface ClaudeAccount {
  displayName?: string
  emailAddress?: string
  organizationName?: string
  seatTier?: string       // e.g. 'team_standard'
  billingType?: string    // e.g. 'stripe_subscription'
}

// One spend/usage bucket. costUsd is an API-equivalent ESTIMATE, not billed spend.
export interface SpendBucket {
  tokens: number
  costUsd: number
}

export interface SpendSummary {
  today: SpendBucket
  week: SpendBucket
  allTime: SpendBucket
  hasData: boolean
}

export interface TerminalMetadata {
  title?: string
  branchName?: string
  ticketId?: string
  description?: string
  status?: '' | 'in progress' | 'committed' | 'ready for PR' | 'PR created' | 'in review' | 'changes requested' | 'Review addressed' | 'PR merged'
  baseBranch?: string
  fullStackTaskId?: string
  relatedWorktrees?: string[]
  repositoryMetadata?: Record<string, RepositoryMetadata>
  usage?: TerminalUsage
}

export interface TerminalInfo {
  id: string
  name: string
  state: TerminalState
  repositories: string[]  // List of attached repository paths
  branchName?: string
  createdAt?: Date
  tsCreate?: number
  metadata?: TerminalMetadata
}

export interface RepositoryConfig {
  // Cloud identity. `id` is the repositories table PK (client-generated on add).
  // `orgId` null/absent = personal repo; set = shared to that org (team repo).
  // `needsLocalPath` = true when this user has no local path bound on this
  // machine yet (the repo shows in a warning state and can't launch agents).
  id?: string
  orgId?: string | null
  ownerId?: string | null
  needsLocalPath?: boolean
  path: string
  keywords: string[]
  color?: string  // hex color, e.g. '#3B82F6'
  languages?: {
    commit?: string
    pullRequest?: string
    jiraComment?: string
    discussion?: string
  }
  commit?: {
    style?: string
    format?: string
    coAuthor?: boolean
    includeTicketId?: boolean
  }
  resolve?: {
    commitMode?: string        // 'new' | 'amend' | 'ask'
    format?: string            // 'conventional' | 'angular' | 'gitmoji' | 'none'
    style?: string             // 'single-line' | 'multi-line'
    useCommitConfig?: boolean  // true = inherit from commit settings
    replyToComments?: boolean  // true = reply in-thread on GitHub
    replyLanguage?: string     // 'en' | 'fr'
  }
  pullRequest?: {
    autoLinkTickets?: boolean
    watchCI?: boolean          // true = watch checks + review feedback after creating the PR
  }
  issues?: {
    commentOnPR?: boolean
    jiraUrl?: string
    githubIssuesUrl?: string
  }
  branches?: {
    development?: string  // e.g., "develop", "dev" - defaults to "develop"
  }
  worktreeFiles?: string[]  // Files to copy from main repo to worktree (e.g., ".env", ".env.local")
}

/**
 * A repository as it lives in the cloud `repositories` table (shared identity,
 * no path) plus the current user's own local path binding (`path`, null when the
 * user hasn't cloned/bound it on this machine). The Store speaks this shape;
 * config.ts maps it to/from the name-keyed Config.repositories record.
 */
export interface StoredRepository {
  id: string
  ownerId: string | null
  orgId: string | null
  name: string
  keywords: string[]
  color?: string
  languages?: RepositoryConfig['languages']
  commit?: RepositoryConfig['commit']
  pullRequest?: RepositoryConfig['pullRequest']
  resolve?: RepositoryConfig['resolve']
  issues?: RepositoryConfig['issues']
  branches?: RepositoryConfig['branches']
  worktreeFiles?: string[]
  /** The caller's own local path binding, or null when unbound on this machine. */
  path: string | null
}

/** Identity fields of a repository (everything except id/owner/path). */
export type RepositoryIdentity = Omit<StoredRepository, 'id' | 'ownerId' | 'path'>

export interface Agent {
  id: string
  name: string
  repositories: string[]  // List of attached repository paths
  tsCreate?: number
  metadata?: TerminalMetadata
  splitPane?: 'left' | 'right'
}

export type SpotlightShortcut =
  | 'Control+Space'
  | 'Control+Shift+Space'
  | 'Alt+Space'
  | 'Alt+Shift+Space'
  | 'Control+M'
  | 'Control+Shift+M'
  | 'Alt+M'
  | 'Alt+Shift+M'

export interface SpotlightConfig {
  enabled: boolean
  shortcut: SpotlightShortcut
}

export type LaunchMode = 'plan' | 'default' | 'acceptEdits' | 'auto' | 'bypassPermissions'

/**
 * Available appearances, in the order the picker shows them. Adding one is a
 * single entry here plus its colours in the renderer's theme registry — the
 * registry is typed against this list, so TypeScript refuses a theme whose
 * palette is missing. Nothing else knows the list: components name roles
 * (`bg-surface`, `text-ink`), never colours.
 */
// Ordered darkest family first, then the light one — the picker lays them out
// four to a row, so the grouping falls out of the order.
export const THEME_IDS = [
  'dark',
  'midnight',
  'espresso',
  'high-contrast',
  'light',
  'mist',
  'sepia',
  'daylight',
] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME: ThemeId = 'dark'

/**
 * Which macOS appearance each theme belongs to. It lives here, not in the
 * renderer's registry, because the main process needs it before any window —
 * and any renderer bundle — exists: it drives `nativeTheme.themeSource`, which
 * colours the traffic lights and picks the vibrancy material. Typed as a total
 * record, so a new theme cannot be added without classifying it.
 */
export const THEME_APPEARANCE: Record<ThemeId, 'light' | 'dark'> = {
  dark: 'dark',
  midnight: 'dark',
  espresso: 'dark',
  'high-contrast': 'dark',
  light: 'light',
  mist: 'light',
  sepia: 'light',
  daylight: 'light',
}

export function isValidTheme(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

/**
 * Languages the interface is available in, in the order the picker shows them.
 * Adding one is an entry here plus its catalogue in src/i18n — the catalogue is
 * typed against the English one, so TypeScript refuses a language whose
 * translation is incomplete.
 *
 * This is the APPLICATION locale only. It has nothing to do with the per-repo
 * `languages.{commit,pullRequest,…}` settings (which language Claude writes a
 * commit message in) nor with profile.md's `languages`.
 */
export const LANGUAGE_IDS = ['en', 'fr'] as const

export type LanguageId = (typeof LANGUAGE_IDS)[number]

export const DEFAULT_LANGUAGE: LanguageId = 'en'

/**
 * The BCP-47 tag each language formats dates and numbers with. It lives here,
 * next to the ids, because the main process needs it too — notifications are
 * composed before any renderer exists. Typed as a total record, so a new
 * language cannot be added without giving it a locale.
 */
export const LANGUAGE_LOCALE: Record<LanguageId, string> = {
  en: 'en-US',
  fr: 'fr-FR',
}

export function isValidLanguage(value: unknown): value is LanguageId {
  return typeof value === 'string' && (LANGUAGE_IDS as readonly string[]).includes(value)
}

/**
 * Interface scale, as an Electron zoom factor. The steps are what the +/−
 * buttons and ⌘+ / ⌘− walk through; any value in range is accepted, since the
 * OS and the menu can land on one of their own.
 */
export const ZOOM_STEPS = [0.8, 0.9, 1, 1.1, 1.25, 1.5] as const

export const DEFAULT_ZOOM = 1
export const MIN_ZOOM = ZOOM_STEPS[0]
export const MAX_ZOOM = ZOOM_STEPS[ZOOM_STEPS.length - 1]

export function clampZoom(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_ZOOM
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

/** The step above or below `value`, or `value` itself at either end. */
export function nextZoom(value: number, direction: 1 | -1): number {
  const steps = direction === 1 ? ZOOM_STEPS : [...ZOOM_STEPS].reverse()
  // A small epsilon: zoom factors arrive as floats and 1.1 is never exactly 1.1.
  return steps.find((step) => direction * (step - value) > 0.001) ?? clampZoom(value)
}

export interface Config {
  version: string
  repositories: Record<string, RepositoryConfig>
  /**
   * Absent = never chosen; the app applies DEFAULT_THEME. The interface scale
   * is deliberately NOT here: it compensates for a particular display, so it
   * stays on the machine (see main/appearance.ts) rather than following the
   * account onto a laptop with a different screen.
   */
  theme?: ThemeId
  /** Absent = never chosen; the app applies DEFAULT_LANGUAGE. Like the theme, it
   *  follows the account rather than the machine — reading the app in French is
   *  a property of the person, not of the screen. */
  language?: LanguageId
  splitEnabled?: boolean
  splitActive?: boolean
  autoStartAtLogin?: boolean
  integrations?: {
    github: true
    atlassian?: boolean
  }
  spotlight?: SpotlightConfig
  launchMode?: LaunchMode
  historyEnabled?: boolean
  usageCardEnabled?: boolean    // show the Claude usage card in the sidebar
  usageCardMinimized?: boolean  // sidebar usage card collapsed to gauges only
  // GDPR opt-in (default OFF): when true, an aggregated usage snapshot is written
  // to the org's usage_events table at session end. Gates WRITING your own data
  // only — reading the org aggregate is open to any member regardless of this flag.
  usageLogsEnabled?: boolean
  prReviews?: {
    enabled?: boolean
    pollIntervalMs?: number
    autoLaunchSkills?: boolean
  }
  // Optional daily team digest (opt-in, default OFF): a single OS notification at
  // 9:00 local summarizing yesterday's team activity (merged PRs / tickets done).
  dailyDigest?: {
    enabled: boolean
  }
  // Cloud: the org the local install is currently associated with (set after
  // signing up / accepting an invitation). Purely a local hint — never required.
  currentOrgId?: string
}

/**
 * Identity of one machine running the app, recorded in `app_installations` on
 * every launch so the DB always holds the version each user actually runs.
 * `deviceId` is DERIVED (hashed hostname|platform|arch) rather than stored
 * locally — the database is the single source of truth and the app persists
 * nothing on disk to key this row by.
 */
export interface AppInstallationInfo {
  deviceId: string
  deviceName?: string
  appVersion: string
  platform?: string
  arch?: string
}

// ---------------------------------------------------------------------------
// Cloud: auth & organization (optional — the app works fully without any of it)
// ---------------------------------------------------------------------------

export type MembershipRole = 'user' | 'admin'

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

/** Tabs of the Settings/Config page, in rail order. Shared so other views (e.g.
 *  the sidebar account menu) can deep-link a specific tab in a type-safe way.
 *  'claude-code' gathers everything about the Claude Code CLI itself — the
 *  account it runs as, its launch mode, and its rate/spend usage. */
export type SettingsTab =
  | 'account'
  | 'organization'
  | 'repositories'
  | 'claude-code'
  | 'appearance'
  | 'language'
  | 'features'
  | 'shortcuts'
  | 'about'

/** Signed-in cloud user identity (subset of the Supabase session). */
export interface CloudUser {
  id: string
  email?: string
}

/** Result of any auth query. `enabled` is false when Supabase env is missing. */
export interface AuthStatus {
  enabled: boolean
  loggedIn: boolean
  user?: CloudUser
}

export interface Org {
  id: string
  name: string
  createdBy?: string
  role: MembershipRole
}

export interface Member {
  userId: string
  email?: string
  role: MembershipRole
  createdAt?: string
}

// ---------------------------------------------------------------------------
// Cloud: org-wide agents roster + realtime (team dashboard "who is working on
// what"). Distinct from the LOCAL `Agent` shape above: an OrgAgent describes a
// teammate's agent as seen over the org roster / realtime feed, keyed by the DB
// row uuid (NOT the app-level metadata.__app.id). It is READ-ONLY — it never
// feeds the local terminal-restoration cache.
// ---------------------------------------------------------------------------
/**
 * Compact per-repository PR review summary for a teammate's agent, sourced from
 * the agent row's metadata.repositoryMetadata (already synced org-wide by the
 * PRReviewWatcher). Read-only; surfaced on the team dashboard so "awaiting
 * review" / "blocked" work is visible without opening each agent.
 */
export interface OrgAgentPRReview {
  /** Repository path key from repositoryMetadata (owner's local path). */
  repo: string
  prUrl?: string
  status?: RepositoryMetadata['prReviewStatus']
  reviewers?: string[]
  merged?: boolean
  closed?: boolean
}

export interface OrgAgent {
  /** The `agents` table row id (uuid). Reconcile realtime events by this. */
  id: string
  /** owner membership user id (auth.users id), or null when ownership was cleared. */
  ownerId: string | null
  /** Resolved in the renderer from the org member list (owner_id → email). */
  ownerEmail?: string
  name: string
  ticketId?: string
  status?: string
  repositories: string[]
  /** PR review state per repo, distilled from metadata.repositoryMetadata. */
  prReviews?: OrgAgentPRReview[]
  /** ISO timestamp of the last write (agents.updated_at). */
  updatedAt?: string
}

/** Realtime channel health for the org-agents subscription. */
export type RealtimeStatus = 'live' | 'reconnecting'

/**
 * A single org-agents realtime change forwarded to the renderer. `id` is always
 * the DB row uuid (present for every event, including DELETE) so the renderer
 * can reconcile by uuid; `agent` carries the mapped row for INSERT/UPDATE only.
 */
export interface OrgAgentChange {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  id: string
  agent?: OrgAgent
}

// ---------------------------------------------------------------------------
// Cloud: usage logs & org stats (opt-in). One aggregated snapshot is written per
// session at session end (never per statusLine event). Writing is GDPR opt-in
// (Config.usageLogsEnabled, default OFF); reading the org aggregate is open to
// any org member (RLS scopes it to the org).
// ---------------------------------------------------------------------------

/** Aggregated end-of-session snapshot to append to the usage_events table. */
export interface UsageEventInput {
  /** app agent id ("claude-…"), mapped to the agents.id uuid by the store. */
  agentId: string
  model?: string
  costUsd?: number
  linesAdded?: number
  linesRemoved?: number
  durationMs?: number
  /** epoch ms; defaults to now when omitted. */
  occurredAt?: number
}

/**
 * One skill invocation, appended to the skill_invocations table.
 *
 * Unlike the activity feed (which records status transitions, so re-running the
 * same skill logs nothing the second time), this counts every single run.
 * The skill's `args` are deliberately NOT collected: they are free text that can
 * carry product context, and RLS makes these rows readable org-wide.
 */
export interface SkillInvocationInput {
  /**
   * app agent id ("claude-…"), mapped to the agents.id uuid by the store.
   * Undefined when the skill ran in a Claude Code the app did not spawn — the
   * run still counts, it just has no agent to attribute it to.
   */
  agentId?: string
  /** Skill name as Claude Code reports it, e.g. "magic-commit" or "plugin:skill". */
  skill: string
  /** epoch ms; defaults to now when omitted. */
  occurredAt?: number
}

/** A single usage_events row, normalized for client-side aggregation. */
export interface UsageStatRow {
  userId: string | null
  agentId: string | null
  model: string | null
  costUsd: number
  tokens: number | null
  linesAdded: number
  linesRemoved: number
  durationMs: number
  /** ISO timestamp of when the session ended. */
  occurredAt: string
}

/** Org-wide usage rows for the dashboard, aggregated client-side by the renderer. */
export interface UsageStats {
  rows: UsageStatRow[]
  /** True when the query hit its row cap, so the aggregated totals are partial (under-counted). */
  capped: boolean
}

export interface Invitation {
  id: string
  email: string
  role: MembershipRole
  status: InvitationStatus
  token: string
  expiresAt?: string | null
  createdAt?: string
}

/** Shared org config the invitee inherits (never includes local repo paths). */
export interface OrgSharedConfig {
  languages?: Record<string, string>
  commit?: {
    style?: string
    format?: string
    coAuthor?: boolean
    includeTicketId?: boolean
  }
  pullRequest?: {
    autoLinkTickets?: boolean
    watchCI?: boolean
  }
  repoKeywords?: Record<string, string[]>
}

/** GitHub CLI auth status — DISPLAY ONLY. No token is ever stored. */
export interface GitHubAuthStatus {
  loggedIn: boolean
  account?: string
}

export interface PRTemplate {
  exists: boolean
  path?: string
  fullPath?: string
  content?: string
}

export interface GitCheckResult {
  isGit: boolean
  exists: boolean
  expandedPath?: string
}

export interface CommandHistoryEntry {
  command: string
  timestamp: number
  count: number  // Usage frequency
}

export type HistoryAction =
  | 'started'
  | 'committed'
  | 'pr_created'
  | 'review'
  | 'merged'
  | 'done'
  | 'review_approved'
  | 'review_changes_requested'
  | 'waiting'
  | 'completed'
  | 'agent_created'
  | 'agent_closed'

export interface HistoryEntry {
  id: string
  agentId: string
  agentName: string
  action: HistoryAction
  ticketId?: string
  description?: string
  repositories: string[]
  timestamp: number
}

export interface TicketEventGroup {
  key: string
  ticketId?: string
  agentName: string
  lastAction: HistoryAction
  entries: HistoryEntry[]
}

export type ScriptCategory = 'dev' | 'build' | 'test' | 'lint' | 'other'
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

export interface PackageScript {
  name: string
  command: string
  category: ScriptCategory
}

export interface ProjectScripts {
  packageManager: PackageManager
  scripts: PackageScript[]
}

export interface ScriptTerminalInfo {
  id: string
  scriptName: string
  fullCommand: string
  agentId: string
  agentName: string
  projectPath: string
  state: 'running' | 'error'
}

export interface BranchCommit {
  hash: string
  shortHash: string
  subject: string
  author: string
  date: string
  relativeDate: string
  isPushed: boolean
}

export interface UserProfile {
  name: string
  role: 'product' | 'dev' | 'design' | 'qa' | 'ops' | 'manager' | 'other'
  technical_level: 'beginner' | 'intermediate' | 'expert'
  communication_style?: 'simple' | 'technical' | 'detailed'
  languages?: string[]
  freeText?: string
}

// The display labels for these fields used to live here as English literals.
// They are now catalogue keys in i18n/profileLabels.ts — this module cannot hold
// them, because it is what i18n/ imports (LanguageId, LANGUAGE_LOCALE), and
// reaching back for MessageKey would close the cycle.
