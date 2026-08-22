import type { Config, SpotlightConfig } from '../../types'
import { isValidLanguage, isValidTheme } from '../../types'
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
  plan_sync_enabled: boolean | null
  daily_digest_enabled: boolean | null
  split_enabled: boolean | null
  split_active: boolean | null
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
  auto_start_at_login: boolean | null
  launch_mode: string | null
  atlassian_integration_enabled: boolean | null
  theme: string | null
  language: string | null
  sync_claude_theme: boolean | null
  default_agent_type: string | null
}

export const USER_SETTINGS_COLUMNS =
  'usage_card_enabled, usage_card_minimized, agent_context_enabled, ' +
  'agent_context_minimized, usage_logs_enabled, plan_sync_enabled, ' +
  'daily_digest_enabled, notifications_enabled, notification_agent_waiting, ' +
  'notification_agent_completed, notification_pr_review, ' +
  'notification_pr_changes_requested, split_enabled, split_active, pr_reviews_enabled, ' +
  'pr_reviews_poll_interval_ms, pr_reviews_auto_launch_skills, spotlight_enabled, ' +
  'spotlight_shortcut, auto_start_at_login, launch_mode, atlassian_integration_enabled, theme, ' +
  'language, sync_claude_theme, default_agent_type'

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
  'planSyncEnabled',
  'dailyDigest',
  'notifications',
  'splitEnabled',
  'splitActive',
  'prReviews',
  'spotlight',
  'autoStartAtLogin',
  'launchMode',
  'defaultAgentType',
  'integrations',
  'theme',
  'language',
  'syncClaudeTheme',
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
    plan_sync_enabled: orNull(config.planSyncEnabled),
    daily_digest_enabled: orNull(config.dailyDigest?.enabled),
    split_enabled: orNull(config.splitEnabled),
    split_active: orNull(config.splitActive),
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
    auto_start_at_login: orNull(config.autoStartAtLogin),
    launch_mode: orNull(config.launchMode),
    atlassian_integration_enabled: orNull(config.integrations?.atlassian),
    theme: orNull(config.theme),
    language: orNull(config.language),
    sync_claude_theme: orNull(config.syncClaudeTheme),
    default_agent_type: orNull(config.defaultAgentType),
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
  if (isSet(row.plan_sync_enabled)) config.planSyncEnabled = row.plan_sync_enabled
  if (isSet(row.daily_digest_enabled)) config.dailyDigest = { enabled: row.daily_digest_enabled }
  if (isSet(row.split_enabled)) config.splitEnabled = row.split_enabled
  if (isSet(row.split_active)) config.splitActive = row.split_active
  if (isSet(row.auto_start_at_login)) config.autoStartAtLogin = row.auto_start_at_login
  if (isValidLaunchMode(row.launch_mode)) config.launchMode = row.launch_mode
  // Re-validated rather than trusted: a newer version may have stored a theme
  // this build has never heard of, and it must read as "unset", not as a theme.
  if (isValidTheme(row.theme)) config.theme = row.theme
  // Same treatment for the interface language: an unknown one reads as "unset",
  // so this build falls back to English rather than to a locale it cannot show.
  if (isValidLanguage(row.language)) config.language = row.language
  if (isSet(row.sync_claude_theme)) config.syncClaudeTheme = row.sync_claude_theme
  // Re-validated like launchMode and the theme: a newer build may have stored a kind
  // this one does not know, and that must read as "unset" rather than lay out an
  // agent as something this version cannot render.
  if (isValidAgentType(row.default_agent_type)) config.defaultAgentType = row.default_agent_type

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
