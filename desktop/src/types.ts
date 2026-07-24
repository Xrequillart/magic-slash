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

export interface Config {
  version: string
  repositories: Record<string, RepositoryConfig>
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
  // Cloud: the org the local install is currently associated with (set after
  // signing up / accepting an invitation). Purely a local hint — never required.
  currentOrgId?: string
}

// ---------------------------------------------------------------------------
// Cloud: auth & organization (optional — the app works fully without any of it)
// ---------------------------------------------------------------------------

export type MembershipRole = 'user' | 'admin'

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired'

/** Tabs of the Settings/Config page. Shared so other views (e.g. the sidebar
 *  account menu) can deep-link a specific tab in a type-safe way. */
export type SettingsTab =
  | 'profile'
  | 'repositories'
  | 'organization'
  | 'launch-mode'
  | 'features'
  | 'shortcuts'
  | 'usage'
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

// Shared display labels for profile fields (used by wizard + profile section)
export const ROLE_LABELS: Record<UserProfile['role'], string> = {
  product: 'Product',
  dev: 'Dev',
  design: 'Design',
  qa: 'QA',
  ops: 'Ops',
  manager: 'Manager',
  other: 'Other',
}

export const LEVEL_LABELS: Record<UserProfile['technical_level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  expert: 'Expert',
}

export const STYLE_LABELS: Record<NonNullable<UserProfile['communication_style']>, string> = {
  simple: 'Simple',
  technical: 'Technical',
  detailed: 'Detailed',
}
