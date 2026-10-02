import type { Config, SpotlightConfig } from '../../types'
import { cleanQuickSettings, cleanSidebarPages, isValidAgentSort, isValidCodeFontSize, isValidCodeSyntax, isValidLanguage, isValidModelName, isValidQuickLaunchRepo, isValidSplitNewAgentPane, isValidTheme, isValidWorkflowChainLimit, isValidWorkflowConfirmChain, isValidWorkflowMissingSkill } from '../../types'
import { isValidAgentType, isValidLaunchMode, isValidSpotlightShortcut } from '../config/defaults'

// ---------------------------------------------------------------------------
// Mapping between a Config and its public.user_settings row.
//
// Its own module, deliberately free of any Supabase or Electron import, because
// it has two consumers that must not drag each other's dependencies around:
//
//  - CloudStore, which reads and writes the row over the network;
//  - config/remote-sync, which applies a Realtime payload (the same row shape)
//    straight onto the config cache.
//
// Keeping this pure is what lets remote-sync be tested — and loaded — without
// pulling in @supabase/supabase-js.
// ---------------------------------------------------------------------------

/**
 * public.user_settings — one row per user, one column per application-level
 * preference (Settings → Application, Launch Mode, Atlassian flag). Every column is
 * nullable and NULL means "the user never chose": the app's withDefaults() owns
 * the defaults, and several settings genuinely treat absent as a third state
 * distinct from false (autoStartAtLogin only touches the macOS login item once
 * explicitly set).
 */
export interface UserSettingsRow {
  usage_card_enabled: boolean | null
  usage_card_minimized: boolean | null
  agent_context_enabled: boolean | null
  agent_context_minimized: boolean | null
  usage_logs_enabled: boolean | null
  info_sidebar_on_create: boolean | null
  plan_sync_enabled: boolean | null
  daily_digest_enabled: boolean | null
  split_enabled: boolean | null
  split_active: boolean | null
  split_new_agent_pane: string | null
  notifications_enabled: boolean | null
  notification_agent_waiting: boolean | null
  notification_agent_completed: boolean | null
  notification_pr_review: boolean | null
  notification_pr_changes_requested: boolean | null
  pr_reviews_enabled: boolean | null
  pr_reviews_poll_interval_ms: number | null
  pr_reviews_auto_launch_skills: boolean | null
  spotlight_enabled: boolean | null
  spotlight_shortcut: string | null
  quick_launch_repo: string | null
  quick_launch_background: boolean | null
  quick_launch_launch_mode: string | null
  quick_settings_enabled: boolean | null
  quick_settings_items: string[] | null
  sidebar_order: string[] | null
  sidebar_hidden: string[] | null
  sidebar_compact: boolean | null
  auto_start_at_login: boolean | null
  launch_mode: string | null
  atlassian_integration_enabled: boolean | null
  theme: string | null
  language: string | null
  sync_claude_theme: boolean | null
  code_syntax: string | null
  code_font_size: number | null
  default_agent_type: string | null
  default_model: string | null
  confirm_agent_archive: boolean | null
  agent_sort: string | null
  tasks_repo: string | null
  plans_repo: string | null
  workflow_confirm_chain: string | null
  workflow_chain_limit: number | null
  workflow_missing_skill: string | null
  workflow_run_actions: boolean | null
}

export const USER_SETTINGS_COLUMNS =
  'usage_card_enabled, usage_card_minimized, agent_context_enabled, ' +
  'agent_context_minimized, usage_logs_enabled, info_sidebar_on_create, ' +
  'plan_sync_enabled, ' +
  'daily_digest_enabled, notifications_enabled, notification_agent_waiting, ' +
  'notification_agent_completed, notification_pr_review, ' +
  'notification_pr_changes_requested, split_enabled, split_active, pr_reviews_enabled, ' +
  'pr_reviews_poll_interval_ms, pr_reviews_auto_launch_skills, spotlight_enabled, ' +
  'spotlight_shortcut, auto_start_at_login, launch_mode, atlassian_integration_enabled, theme, ' +
  'language, sync_claude_theme, code_syntax, code_font_size, default_agent_type, default_model, confirm_agent_archive, split_new_agent_pane, quick_launch_repo, quick_launch_background, quick_launch_launch_mode, quick_settings_enabled, quick_settings_items, sidebar_order, sidebar_hidden, sidebar_compact, agent_sort, tasks_repo, ' +
  'plans_repo, workflow_confirm_chain, workflow_chain_limit, workflow_missing_skill, workflow_run_actions'

/**
 * Config keys that live in `user_settings`. Stripped from the org-scoped
 * `configs` blob on every write so there is exactly one source of truth — the
 * blob keeps only what is genuinely org-scoped (the shared-config projection,
 * `currentOrgId`, `version`).
 *
 * Also the exact set config/remote-sync.ts clears before applying an incoming
 * Realtime row, so this list stays the single definition of "which config keys
 * user_settings owns".
 */
export const SETTINGS_KEYS = [
  'usageCardEnabled',
  'usageCardMinimized',
  'agentContextEnabled',
  'agentContextMinimized',
  'usageLogsEnabled',
  'infoSidebarOnCreate',
  'planSyncEnabled',
  'dailyDigest',
  'notifications',
  'splitEnabled',
  'splitActive',
  'splitNewAgentPane',
  'prReviews',
  'spotlight',
  'quickLaunchRepo',
  'quickLaunchBackground',
  'quickLaunchLaunchMode',
  'quickSettingsEnabled',
  'quickSettingsItems',
  'sidebarOrder',
  'sidebarHidden',
  'sidebarCompact',
  'autoStartAtLogin',
  'launchMode',
  'defaultAgentType',
  'defaultModel',
  'confirmAgentArchive',
  'agentSort',
  'tasksRepo',
  'plansRepo',
  'integrations',
  'theme',
  'language',
  'syncClaudeTheme',
  'codeSyntax',
  'codeFontSize',
  'workflow',
] as const

/** `undefined` (key absent from Config) → `null` (column unset). */
function orNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value
}

/** A column that actually carries a value (neither NULL nor missing from the projection). */
function isSet<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/** Project a Config onto its user_settings row. Absent keys become NULL. */
export function configToSettingsRow(config: Config): UserSettingsRow {
  return {
    usage_card_enabled: orNull(config.usageCardEnabled),
    usage_card_minimized: orNull(config.usageCardMinimized),
    agent_context_enabled: orNull(config.agentContextEnabled),
    agent_context_minimized: orNull(config.agentContextMinimized),
    usage_logs_enabled: orNull(config.usageLogsEnabled),
    info_sidebar_on_create: orNull(config.infoSidebarOnCreate),
    plan_sync_enabled: orNull(config.planSyncEnabled),
    daily_digest_enabled: orNull(config.dailyDigest?.enabled),
    split_enabled: orNull(config.splitEnabled),
    split_active: orNull(config.splitActive),
    split_new_agent_pane: orNull(config.splitNewAgentPane),
    notifications_enabled: orNull(config.notifications?.enabled),
    notification_agent_waiting: orNull(config.notifications?.agentWaiting),
    notification_agent_completed: orNull(config.notifications?.agentCompleted),
    notification_pr_review: orNull(config.notifications?.prReview),
    notification_pr_changes_requested: orNull(config.notifications?.prChangesRequested),
    pr_reviews_enabled: orNull(config.prReviews?.enabled),
    pr_reviews_poll_interval_ms: orNull(config.prReviews?.pollIntervalMs),
    pr_reviews_auto_launch_skills: orNull(config.prReviews?.autoLaunchSkills),
    spotlight_enabled: orNull(config.spotlight?.enabled),
    spotlight_shortcut: orNull(config.spotlight?.shortcut),
    quick_launch_repo: orNull(config.quickLaunchRepo),
    quick_launch_background: orNull(config.quickLaunchBackground),
    quick_launch_launch_mode: orNull(config.quickLaunchLaunchMode),
    quick_settings_enabled: orNull(config.quickSettingsEnabled),
    quick_settings_items: orNull(config.quickSettingsItems),
    sidebar_order: orNull(config.sidebarOrder),
    sidebar_hidden: orNull(config.sidebarHidden),
    sidebar_compact: orNull(config.sidebarCompact),
    auto_start_at_login: orNull(config.autoStartAtLogin),
    launch_mode: orNull(config.launchMode),
    atlassian_integration_enabled: orNull(config.integrations?.atlassian),
    theme: orNull(config.theme),
    language: orNull(config.language),
    sync_claude_theme: orNull(config.syncClaudeTheme),
    code_syntax: orNull(config.codeSyntax),
    code_font_size: orNull(config.codeFontSize),
    default_agent_type: orNull(config.defaultAgentType),
    default_model: orNull(config.defaultModel),
    confirm_agent_archive: orNull(config.confirmAgentArchive),
    agent_sort: orNull(config.agentSort),
    tasks_repo: orNull(config.tasksRepo),
    plans_repo: orNull(config.plansRepo),
    workflow_confirm_chain: orNull(config.workflow?.confirmChain),
    workflow_chain_limit: orNull(config.workflow?.chainLimit),
    workflow_missing_skill: orNull(config.workflow?.missingSkill),
    workflow_run_actions: orNull(config.workflow?.runActions),
  }
}

/**
 * Apply a user_settings row onto a Config, in place. NULL columns are skipped so
 * the key stays absent and withDefaults() (not this mapper) decides the default.
 * Enum-like columns are re-validated on read: the DB has matching CHECKs, but a
 * value written by a newer app version must not leak through as an invalid enum.
 *
 * A Realtime payload carries this same row shape, so applying `payload.new`
 * through here is what lets a remote settings change reach a running app with no
 * round trip at all (see config/remote-sync.ts).
 */
export function applySettingsRow(config: Config, row: UserSettingsRow): void {
  if (isSet(row.usage_card_enabled)) config.usageCardEnabled = row.usage_card_enabled
  if (isSet(row.usage_card_minimized)) config.usageCardMinimized = row.usage_card_minimized
  if (isSet(row.agent_context_enabled)) config.agentContextEnabled = row.agent_context_enabled
  if (isSet(row.agent_context_minimized)) config.agentContextMinimized = row.agent_context_minimized
  if (isSet(row.usage_logs_enabled)) config.usageLogsEnabled = row.usage_logs_enabled
  if (isSet(row.info_sidebar_on_create)) config.infoSidebarOnCreate = row.info_sidebar_on_create
  if (isSet(row.plan_sync_enabled)) config.planSyncEnabled = row.plan_sync_enabled
  if (isSet(row.daily_digest_enabled)) config.dailyDigest = { enabled: row.daily_digest_enabled }
  if (isSet(row.split_enabled)) config.splitEnabled = row.split_enabled
  if (isSet(row.split_active)) config.splitActive = row.split_active
  if (isValidSplitNewAgentPane(row.split_new_agent_pane)) config.splitNewAgentPane = row.split_new_agent_pane
  if (isSet(row.auto_start_at_login)) config.autoStartAtLogin = row.auto_start_at_login
  if (isValidLaunchMode(row.launch_mode)) config.launchMode = row.launch_mode
  if (isValidQuickLaunchRepo(row.quick_launch_repo)) config.quickLaunchRepo = row.quick_launch_repo
  if (isSet(row.quick_launch_background)) config.quickLaunchBackground = row.quick_launch_background
  if (isValidLaunchMode(row.quick_launch_launch_mode)) config.quickLaunchLaunchMode = row.quick_launch_launch_mode
  if (isSet(row.quick_settings_enabled)) config.quickSettingsEnabled = row.quick_settings_enabled
  // Cleaned rather than trusted: a tile a newer build knows and this one does not is
  // dropped from the sheet here, not drawn as nothing.
  const quickSettingsItems = cleanQuickSettings(row.quick_settings_items)
  if (quickSettingsItems) config.quickSettingsItems = quickSettingsItems
  // Cleaned for the same reason: a page a newer build has is not one this build can draw.
  const sidebarOrder = cleanSidebarPages(row.sidebar_order)
  if (sidebarOrder) config.sidebarOrder = sidebarOrder
  const sidebarHidden = cleanSidebarPages(row.sidebar_hidden)
  if (sidebarHidden) config.sidebarHidden = sidebarHidden
  if (isSet(row.sidebar_compact)) config.sidebarCompact = row.sidebar_compact
  // Re-validated rather than trusted: a newer version may have stored a theme
  // this build has never heard of, and it must read as "unset", not as a theme.
  if (isValidTheme(row.theme)) config.theme = row.theme
  // Same treatment for the interface language: an unknown one reads as "unset",
  // so this build falls back to English rather than to a locale it cannot show.
  if (isValidLanguage(row.language)) config.language = row.language
  if (isSet(row.sync_claude_theme)) config.syncClaudeTheme = row.sync_claude_theme
  // Re-validated like the theme above: a family a newer build knows and this one does
  // not must read as "unset" — the preview then takes the theme's own pairing.
  if (isValidCodeSyntax(row.code_syntax)) config.codeSyntax = row.code_syntax
  if (isValidCodeFontSize(row.code_font_size)) config.codeFontSize = row.code_font_size
  // Re-validated like launchMode and the theme: a newer build may have stored a kind
  // this one does not know, and that must read as "unset" rather than lay out an
  // agent as something this version cannot render.
  if (isValidAgentType(row.default_agent_type)) config.defaultAgentType = row.default_agent_type
  // A model NAME, not an enum: the legal values are the installed CLI's, so the shape is
  // all that can be checked. A name the CLI no longer knows is the CLI's to refuse.
  if (isValidModelName(row.default_model)) config.defaultModel = row.default_model
  if (isSet(row.confirm_agent_archive)) config.confirmAgentArchive = row.confirm_agent_archive
  // Re-validated like the four above: a sort mode this build does not know must read as
  // "unset" — the list then falls back to newest-first, the order it always had, rather
  // than to no order at all.
  if (isValidAgentSort(row.agent_sort)) config.agentSort = row.agent_sort
  // NOT re-validated against anything, unlike the five above, because there is no
  // enum to validate against: the value is a key of `Config.repositories`, and which
  // keys are legal is this account's own business and changes as repositories come
  // and go. A key that no longer resolves is handled where it is READ — the board
  // falls back to its first repository — which is the same outcome re-validation
  // buys the enums, reached from the only side that knows the answer.
  if (isSet(row.tasks_repo)) config.tasksRepo = row.tasks_repo
  // Not re-validated either, and for the same reason one line up — except that the value
  // is a `public.repositories` id rather than a config key, and which ids are legal is
  // decided by RLS at read time. An id that no longer names a visible repository is
  // handled where it is READ: the list falls back to showing every repository.
  if (isSet(row.plans_repo)) config.plansRepo = row.plans_repo

  // Same shape as prReviews below: a partial object is fine, since every flag in
  // it defaults to ON when absent and the block itself is optional.
  const notifications: NonNullable<Config['notifications']> = {}
  if (isSet(row.notifications_enabled)) notifications.enabled = row.notifications_enabled
  if (isSet(row.notification_agent_waiting)) notifications.agentWaiting = row.notification_agent_waiting
  if (isSet(row.notification_agent_completed)) notifications.agentCompleted = row.notification_agent_completed
  if (isSet(row.notification_pr_review)) notifications.prReview = row.notification_pr_review
  if (isSet(row.notification_pr_changes_requested)) {
    notifications.prChangesRequested = row.notification_pr_changes_requested
  }
  if (Object.keys(notifications).length > 0) config.notifications = notifications

  const prReviews: NonNullable<Config['prReviews']> = {}
  if (isSet(row.pr_reviews_enabled)) prReviews.enabled = row.pr_reviews_enabled
  if (isSet(row.pr_reviews_poll_interval_ms)) prReviews.pollIntervalMs = row.pr_reviews_poll_interval_ms
  if (isSet(row.pr_reviews_auto_launch_skills)) prReviews.autoLaunchSkills = row.pr_reviews_auto_launch_skills
  if (Object.keys(prReviews).length > 0) config.prReviews = prReviews

  // Re-validated like the enums above: a choice a newer build offers and this one does not
  // reads as unset, i.e. DEFAULT_WORKFLOW_SETTINGS, never as a policy this build cannot apply.
  const workflow: NonNullable<Config['workflow']> = {}
  if (isValidWorkflowConfirmChain(row.workflow_confirm_chain)) workflow.confirmChain = row.workflow_confirm_chain
  if (isValidWorkflowChainLimit(row.workflow_chain_limit)) workflow.chainLimit = row.workflow_chain_limit
  if (isValidWorkflowMissingSkill(row.workflow_missing_skill)) workflow.missingSkill = row.workflow_missing_skill
  if (typeof row.workflow_run_actions === 'boolean') workflow.runActions = row.workflow_run_actions
  if (Object.keys(workflow).length > 0) config.workflow = workflow

  // Spotlight is a two-field object; a partial one is fine because withDefaults()
  // merges DEFAULT_SPOTLIGHT under whatever is present.
  const spotlight: Partial<SpotlightConfig> = {}
  if (isSet(row.spotlight_enabled)) spotlight.enabled = row.spotlight_enabled
  if (isValidSpotlightShortcut(row.spotlight_shortcut)) spotlight.shortcut = row.spotlight_shortcut
  if (Object.keys(spotlight).length > 0) config.spotlight = spotlight as SpotlightConfig

  // github is a const true in the schema; only atlassian is user-settable.
  if (isSet(row.atlassian_integration_enabled)) {
    config.integrations = { github: true, atlassian: row.atlassian_integration_enabled }
  }
}
