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

export type ScheduleFrequency = 'once' | 'daily' | 'weekdays' | 'weekly' | 'monthly'

export interface Schedule {
  enabled: boolean
  command: string
  frequency: ScheduleFrequency
  time: string // HH:mm 24h format
  date: string | null // YYYY-MM-DD, only for 'once'
  dayOfWeek: number | null // 0-6, only for 'weekly'
  dayOfMonth: number | null // 1-31, only for 'monthly'
  lastRunAt: number | null // timestamp
  lastRunStatus: 'success' | 'error' | null
}

export interface Agent {
  id: string
  name: string
  repositories: string[]  // List of attached repository paths
  tsCreate?: number
  metadata?: TerminalMetadata
  splitPane?: 'left' | 'right'
  schedule?: Schedule
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
  schedulerEnabled?: boolean
  schedulerDefaultTime?: string
  prReviews?: {
    enabled?: boolean
    pollIntervalMs?: number
    autoLaunchSkills?: boolean
  }
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
