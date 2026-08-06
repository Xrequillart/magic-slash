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
  /**
   * The workflow status the skills report as they go.
   *
   * Every member MUST have an entry in `statusToAction` (terminal-handlers.ts), and
   * every status a SKILL.md sends MUST be a member here. `CI green` was neither for
   * months: magic-pr sent it, it landed in agents.status as an off-enum value, and it
   * produced no activity event at all — so "the CI went green" was a thing the product
   * knew and never recorded. A test now locks both directions of that contract.
   */
  status?: '' | 'in progress' | 'committed' | 'ready for PR' | 'PR created' | 'CI green' | 'in review' | 'changes requested' | 'Review addressed' | 'PR merged'
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
  /**
   * The repository's real name in the cloud. Normally identical to its key in
   * Config.repositories — but names are only unique per scope, so when two of
   * the user's organizations both have an `api`, the second one's KEY carries an
   * org suffix (`api (Acme)`) while this stays `api`. Anything writing back to
   * the repositories table must use this, never the key.
   */
  name?: string
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
    /**
     * Whether committing straight onto a protected branch — main, master, develop,
     * and the repo's own `branches.development` — is permitted.
     *
     * Defaults to TRUE, i.e. permitted, because withdrawing a right people already
     * have is a surprising thing for an update to do. What changes at the default is
     * that /magic:commit now ASKS when it finds you on such a branch instead of
     * committing silently.
     *
     * False means there is nothing to ask: the skill moves the work onto a new
     * branch first. See skills/magic-commit/SKILL.md step 4.6.
     */
    allowOnProtectedBranch?: boolean
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
    watchCI?: boolean            // true = watch checks + review feedback after creating the PR
    testAccounts?: string        // 'off' | 'reference' | 'inline'
    testAccountsSource?: string  // explicit file path or project-skill name holding the accounts
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
  /**
   * The `repositories` table ids those paths resolve to, in attachment order.
   * Derived locally by resolveRepoIds() (src/repoMatch.ts) — a path is machine-
   * specific, this is the portable link, and it is what the backend derives the
   * agent's organization from. Empty when no path matches a configured repo.
   */
  repositoryIds?: string[]
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
  /**
   * Whether Claude Code in the terminal panes is repainted to match `theme`.
   * Absent = on: without it, a light theme leaves parts of the transcript white
   * on white, which reads as a bug rather than as a setting nobody enabled.
   * Follows the account like the theme it tracks — see main/claude-theme.ts.
   */
  syncClaudeTheme?: boolean
  splitEnabled?: boolean
  splitActive?: boolean
  autoStartAtLogin?: boolean
  integrations?: {
    github: true
    atlassian?: boolean
  }
  spotlight?: SpotlightConfig
  launchMode?: LaunchMode
  usageCardEnabled?: boolean    // show the Claude usage card in the sidebar
  usageCardMinimized?: boolean  // sidebar usage card collapsed to gauges only
  // Activity recording, ON by default: an aggregated usage snapshot is written to
  // usage_events at session end, alongside activity_events and skill_invocations.
  // Only an EXPLICIT false stops it (absent = never touched = on), so every gate
  // tests `=== false`. Gates WRITING your own data only — reading the org
  // aggregate is open to any member regardless of this flag, and the `agents`
  // table syncs regardless too (that is what powers the live Team view).
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
 *  account it runs as, its launch mode, and its rate/spend usage. 'application'
 *  is the app itself: how this machine is set up, plus every feature toggle. */
export type SettingsTab =
  | 'account'
  | 'organization'
  | 'repositories'
  | 'application'
  | 'claude-code'
  | 'appearance'
  | 'language'
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
 * PRReviewWatcher). Read-only; surfaced on the Team page so a teammate's open
 * pull request is one click away without opening their agent.
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
  /**
   * The organization this agent's work belongs to, DERIVED by the backend from
   * its repositories. Null when it only touches personal repos — such an agent
   * is visible to its owner alone.
   */
  orgId: string | null
  /** Resolved in the renderer from the org member list (owner_id → email). */
  ownerEmail?: string
  name: string
  /**
   * The human title the owner gave the agent (metadata.title), when they set
   * one. Preferred over `name` for display — `name` is the generated terminal
   * label ("Claude 3"), which says nothing about the work.
   */
  title?: string
  ticketId?: string
  status?: string
  repositories: string[]
  /**
   * The `repositories` table ids this agent is attached to (agent_repositories),
   * in attachment order. The portable link — a teammate's paths mean nothing on
   * our machine. Absent on rows delivered by realtime, which carry the agent row
   * alone; consumers keep the ids they already had rather than lose the link.
   */
  repositoryIds?: string[]
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
// Cloud: usage logs & org stats. One aggregated snapshot is written per session at
// session end (never per statusLine event). Writing is gated by
// Config.usageLogsEnabled, which is ON by default (an explicit false opts out);
// reading the org aggregate is open to any org member (RLS scopes it to the org).
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
  /** Idempotence key, minted at emission. See main/store/outbox.ts. */
  clientEventId?: string
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
  /** Idempotence key, minted at emission. See main/store/outbox.ts. */
  clientEventId?: string
}

/** How a skill run ended, as the skill itself reported it. */
export type SkillRunOutcome = 'success' | 'failed' | 'cancelled'

/**
 * The closing half of a skill run, reported by the skill's own final step.
 *
 * There is no "skill finished" hook to derive this from — PostToolUse on the Skill
 * tool fires when the instructions load, not when the workflow ends — so this is a
 * voluntary signal, and a run that never sends it reads as abandoned rather than
 * missing. See supabase/migrations/20260801090000_skill_runs.sql.
 */
export interface SkillRunEndInput {
  /** app agent id ("claude-…"); undefined for a Claude Code the app did not spawn. */
  agentId?: string
  /** Skill name; the plugin prefix is folded on both sides when matching. */
  skill: string
  outcome: SkillRunOutcome
  /**
   * epoch ms of when the skill FINISHED — not of when this was sent. A close queued
   * offline for an hour must not add an hour to the run's duration.
   */
  occurredAt: number
}

/**
 * How many times one organization has run each skill, all time — keyed by the skill
 * name with any plugin prefix already folded away by the RPC, so "magic-commit" and
 * never "magic-slash:magic-commit".
 *
 * A plain record rather than a Map because this crosses the contextBridge, whose
 * serialisation is narrower than the structured-clone algorithm the raw IPC channel
 * uses. A skill the org has never run is ABSENT rather than 0, which is the RPC's own
 * shape: it returns no row at all, and `?? 0` at the read site is where absence
 * becomes the number to print.
 *
 * These are the TEAM's totals. A run is attributed to an org through its agent, whose
 * org comes from the agent's repositories, so work on a personal repository belongs
 * to no organization and appears in nobody's counts.
 */
/**
 * What happened across every run of ONE skill, all time.
 *
 * `total` is runs STARTED, which is the only figure the guaranteed signal can give:
 * the counter fires before the skill body does. `completed` is those that reported
 * finishing, and their difference — once old enough to have stopped being in flight —
 * is `abandoned`. Reading the three together is the point: a skill people start and
 * do not finish used to be indistinguishable from a popular one.
 *
 * `total` is deliberately NOT completed + abandoned: a run started ten minutes ago is
 * neither, it is still going.
 */
export interface SkillRunCounts {
  total: number
  completed: number
  abandoned: number
  /** Median of the completed runs, in ms. Null until at least one has finished. */
  medianDurationMs: number | null
}

export type SkillCounts = Record<string, SkillRunCounts>

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

/**
 * One org-wide activity_events row, normalized for the Team page's flow metrics.
 *
 * Distinct from HistoryEntry (the personal History feed) on two counts: it spans
 * every member, and it carries `userId` so an in-flight item can be attributed.
 */
export interface OrgActivityEvent {
  id: string
  userId: string | null
  /**
   * agents.id uuid. The DB nulls this when the agent row is deleted (composite FK
   * with `on delete set null`), and closing an agent deletes its row — so EVERY
   * event of a finished ticket has agentId === null. Reliable only for agents that
   * are still alive; `ticketId` is the durable correlation key.
   */
  agentId: string | null
  action: HistoryAction
  ticketId: string | null
  repositories: string[]
  /** ISO timestamp of when the event occurred (client-written, so clocks can skew). */
  occurredAt: string
}

/** Org-wide activity rows for the Team page, aggregated client-side by the renderer. */
export interface OrgActivity {
  events: OrgActivityEvent[]
  /** True when the query hit its row cap: the window is partial, so trim the analysis to `since`. */
  capped: boolean
  /** ISO timestamp of the oldest event the analysis may trust. */
  since: string
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
    /** See RepositoryConfig['commit']. Inherited like every other commit setting:
     *  the DB function projects the whole `commit` object, so a team's protection
     *  rule reaches its members rather than being re-decided per machine. */
    allowOnProtectedBranch?: boolean
  }
  pullRequest?: {
    autoLinkTickets?: boolean
    watchCI?: boolean
    testAccounts?: string        // 'off' | 'reference' | 'inline'
    testAccountsSource?: string
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
  /**
   * A reviewer picked the PR up (status 'in review'). Historic rows also carry
   * this value for 'Review addressed' — which is why the flow metrics treat a
   * bare `review` as a WEAK first-response signal and prefer the explicit
   * verdicts. Rows written from now on distinguish the two.
   */
  | 'review'
  /** The author pushed fixes answering a review (status 'Review addressed'). */
  | 'review_addressed'
  | 'merged'
  | 'review_approved'
  | 'review_changes_requested'
  /** The PR's CI went green (status 'CI green'), reported by magic-pr's watcher. */
  | 'ci_green'
  /** The work is finished and waiting for a PR (status 'ready for PR'). */
  | 'ready_for_pr'
  | 'waiting'
  | 'completed'
  | 'agent_created'
  | 'agent_closed'
  | 'agent_renamed'
  | 'agent_errored'
  // `done` was removed: nothing ever emitted it. magic-done reports 'PR merged',
  // which maps to `merged`, so the value only ever widened the type.

/**
 * One activity event on its way to `activity_events`. Write-only: nothing reads
 * these rows back per-user, so the shape carries no DB id — the row gets its own.
 */
export interface HistoryEntry {
  agentId: string
  agentName: string
  action: HistoryAction
  ticketId?: string
  description?: string
  repositories: string[]
  timestamp: number
  /** Idempotence key, minted at emission. See main/store/outbox.ts. */
  clientEventId?: string
}

/**
 * A named reason nothing is reaching the event tables. Codes rather than sentences,
 * so the renderer can translate them and the main process stays language-free.
 */
export type TelemetryHealthIssue =
  /** The PreToolUse hook is absent from ~/.claude/settings.json — no run is counted. */
  | 'hook-missing'
  /** `jq` is not on PATH; the hook parses Claude Code's payload with it and silently emits nothing. */
  | 'jq-missing'
  /** No Supabase session, so every write is a no-op. */
  | 'signed-out'
  /** The retry queue hit its cap and dropped its oldest events; some activity is permanently lost. */
  | 'queue-overflowed'

/**
 * Whether telemetry is actually being recorded, and what is holding it up.
 *
 * Exists because every link in the chain fails quietly (see main/usage/telemetry-health.ts):
 * without this, an empty dashboard and a broken pipeline are indistinguishable.
 */
export interface TelemetryHealth {
  /** The user's recording opt-in. False is a CHOICE, never an issue. */
  recordingEnabled: boolean
  signedIn: boolean
  hookInstalled: boolean
  jqInstalled: boolean
  /** Events written but not yet accepted by the backend; they retry on their own. */
  queuedEvents: number
  /** Skill runs the hook recorded that the app has not yet read. Drains on its own. */
  spooledSkillRuns: number
  /** Events lost to queue overflow since launch. Never recoverable. */
  droppedEvents: number
  /** Empty when everything that should be recording is. */
  issues: TelemetryHealthIssue[]
}

/**
 * Machine setup — what the `curl | bash` install script used to check and configure,
 * now owned by the app (see main/setup/).
 *
 * Codes and booleans only, no sentences: the main process stays language-free and the
 * renderer translates, same contract as TelemetryHealth above.
 */
export type PrerequisiteId = 'claude' | 'node' | 'git' | 'jq' | 'gh'

export interface PrerequisiteStatus {
  id: PrerequisiteId
  installed: boolean
  /** Installed, but below the minimum major version. Treated like missing. */
  outdated: boolean
  /** Detected version for display, e.g. "20.11.0". Null when absent or unparseable. */
  version: string | null
  /** Minimum major version, when one is enforced. */
  minVersion: string | null
  /** False for tools whose absence only degrades a feature (`gh`). */
  required: boolean
  /** Command that installs it, to show or to copy. Null when we can only link to docs. */
  installCommand: string | null
  /** True when the app can run installCommand itself — macOS with Homebrew present. */
  installable: boolean
  /** Where to send someone Homebrew cannot help (Claude Code's own installer). */
  docsUrl: string | null
}

export type McpServerId = 'atlassian' | 'github'

export interface McpServerStatus {
  id: McpServerId
  /**
   * - `configured` — registered at the URL this version provisions.
   * - `missing`    — absent; the app adds it on its own.
   * - `legacy`     — registered differently (the deprecated stdio GitHub package, or a
   *                  URL the user chose). Never rewritten without asking; see main/setup/mcp.ts.
   */
  state: 'configured' | 'missing' | 'legacy'
  url: string | null
  /** Set for a stdio server: the command it spawns. */
  command?: string | null
}

export interface SetupStatus {
  prerequisites: PrerequisiteStatus[]
  /** Whether Homebrew is available, i.e. whether one-click installs are offered. */
  homebrew: boolean
  mcpServers: McpServerStatus[]
  integrations: { github: boolean; atlassian: boolean }
  /** False until the user has been asked once — drives the first-run wizard. */
  integrationsChosen: boolean
  installedSkills: string[]
  missingSkills: string[]
  /** A required prerequisite is missing or too old: no skill can run. */
  blocked: boolean
  /**
   * Whether to open the first-run wizard. Decided in the main process (see
   * main/setup/status.ts) so the rule for "is this machine ready" lives in one place
   * rather than being restated by every surface that asks.
   */
  needsSetup: boolean
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

/** One selectable answer of an `AskUserQuestion` call. */
export interface TrayQuestionOption {
  label: string
  description?: string
}

/**
 * A question an agent is blocked on, surfaced in the menu bar panel so it can be
 * answered without bringing the app to the front (see main/questions/).
 *
 * `token` is what makes a late click safe: it is minted per question, and
 * `tray:answerQuestion` compares it against the store BEFORE writing anything to
 * the PTY. Answer the same question in the main window and the store is cleared,
 * so a click on the panel's now-stale card writes nothing at all.
 *
 * `unsupported` marks a question the panel cannot answer (several questions in one
 * call, no readable option, or the user has since typed in the terminal): the card
 * is still shown, but only offers "Open agent".
 */
export interface TrayQuestion {
  token: string
  /** `ask` = an AskUserQuestion tool call; `permission` = a permission prompt. */
  kind: 'ask' | 'permission'
  prompt: string
  /**
   * Empty for `permission`: the panel renders Allow / Deny from its own catalogue
   * rather than parroting the TUI's wording, which we never see.
   */
  options: TrayQuestionOption[]
  /**
   * Several options may be picked at once — the card renders checkboxes and a submit
   * button instead of one-click rows, and the answer carries every index.
   */
  multiSelect?: boolean
  /** Last lines of the terminal, ANSI-stripped — the real prompt, for permissions. */
  preview?: string
  receivedAt: number
  unsupported?: boolean
}

/**
 * What the user clicked on a question card. Indexes are 0-based and refer to
 * `TrayQuestion.options` (for a permission, index 0 is Allow).
 *
 * `options` is the multiSelect answer: every box the user ticked, submitted in one
 * go. It is a separate variant rather than an array on `option` so that a card and
 * a question that disagree about multiSelect cannot silently half-work — `keysFor`
 * matches the variant against the question and refuses the mismatch.
 */
export type TrayAnswerChoice =
  | { kind: 'option'; index: number }
  | { kind: 'options'; indexes: number[] }
  | { kind: 'deny' }

/**
 * Outcome of `tray:answerQuestion`. `ok: false` always means nothing at all was
 * written to the PTY — which is the only distinction the panel acts on. Why it
 * refused (a stale token, or keystrokes we would have had to guess) is logged in
 * main rather than carried here, since no caller branches on it.
 */
export interface TrayAnswerResult {
  ok: boolean
}

/**
 * One row of the menu bar panel (renderer/pages/TrayPopover). A flattened
 * AgentSummary: `createdAt` is a number because it crosses IPC, where a Date
 * would arrive as a string.
 */
export interface TrayAgent {
  id: string
  name: string
  state: TerminalState
  ticketId: string
  title: string
  createdAt: number
  /** Absent for the overwhelmingly common case: an agent nobody is waiting on. */
  pendingQuestion?: TrayQuestion
}

/**
 * The panel's view of the updater — deliberately narrower than main's
 * `UpdateStatus`, because the panel only has a version chip in its header to say
 * this with: it either offers a check, reports one in flight, or offers a restart.
 */
export type TrayUpdate =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'downloading'; percent: number }
  | { phase: 'ready'; version: string }
  | { phase: 'error' }

/** Everything the menu bar panel paints, in one poll (see `tray:getState`). */
export interface TrayState {
  version: string
  update: TrayUpdate
  agents: TrayAgent[]
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
