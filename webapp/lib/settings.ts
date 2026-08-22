import { getSupabase } from './supabase'
import { t, type MessageKey } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'

// The defaults live in the catalog, which has no I/O and can therefore be unit
// tested — see the note there. Re-exported so every caller keeps importing them from
// the module it already imports `UserSettings` and `fetchUserSettings` from.
export { DEFAULTS } from './settingsCatalog'

/**
 * Application-level preferences, one row per user in `user_settings`.
 *
 * These are the DESKTOP app's settings. The webapp only edits them: it is a fixed
 * light theme, so choosing "dark" here changes what the desktop paints, not this
 * page — and `language` is the language the DESKTOP speaks. The website's own
 * language is a browser preference and lives in `lib/i18n/useLanguage.ts`, which is
 * why picking "Français" in this form does not translate the form.
 *
 * Every column is nullable on purpose and NULL is a third state, distinct from
 * false: it means the user never chose, and the app applies its own default.
 * Nothing here normalises a null away — reads use the DEFAULTS below for
 * display, and a column is only written once the user touches it.
 *
 * Deliberately absent: the Spotlight SHORTCUT and "launch at login", which are
 * properties of a machine rather than of an account (and writing
 * auto_start_at_login=false from here would make the app touch the macOS login
 * item on its next start), plus split_active, which is a transient view state.
 *
 * `spotlight_enabled` is here even so, and the line between it and the shortcut
 * next to it is not arbitrary: whether you want a global panel at all travels with
 * you, while which keys open it is a negotiation with the other software on that
 * particular machine.
 */

export interface UserSettings {
  theme: string | null
  syncClaudeTheme: boolean | null
  language: string | null
  usageCardEnabled: boolean | null
  usageCardMinimized: boolean | null
  agentContextEnabled: boolean | null
  agentContextMinimized: boolean | null
  usageLogsEnabled: boolean | null
  planSyncEnabled: boolean | null
  notificationsEnabled: boolean | null
  notificationAgentWaiting: boolean | null
  notificationAgentCompleted: boolean | null
  notificationPrReview: boolean | null
  notificationPrChangesRequested: boolean | null
  dailyDigestEnabled: boolean | null
  splitEnabled: boolean | null
  spotlightEnabled: boolean | null
  prReviewsEnabled: boolean | null
  prReviewsPollIntervalMs: number | null
  prReviewsAutoLaunchSkills: boolean | null
  launchMode: string | null
  defaultAgentType: string | null
}

export type UserSettingsPatch = Partial<UserSettings>

interface UserSettingsRow {
  theme: string | null
  sync_claude_theme: boolean | null
  language: string | null
  usage_card_enabled: boolean | null
  usage_card_minimized: boolean | null
  agent_context_enabled: boolean | null
  agent_context_minimized: boolean | null
  usage_logs_enabled: boolean | null
  plan_sync_enabled: boolean | null
  notifications_enabled: boolean | null
  notification_agent_waiting: boolean | null
  notification_agent_completed: boolean | null
  notification_pr_review: boolean | null
  notification_pr_changes_requested: boolean | null
  daily_digest_enabled: boolean | null
  split_enabled: boolean | null
  spotlight_enabled: boolean | null
  pr_reviews_enabled: boolean | null
  pr_reviews_poll_interval_ms: number | null
  pr_reviews_auto_launch_skills: boolean | null
  launch_mode: string | null
  default_agent_type: string | null
}

const COLUMNS =
  'theme, sync_claude_theme, language, usage_card_enabled, usage_card_minimized, agent_context_enabled, agent_context_minimized, usage_logs_enabled, plan_sync_enabled, notifications_enabled, notification_agent_waiting, notification_agent_completed, notification_pr_review, notification_pr_changes_requested, daily_digest_enabled, split_enabled, spotlight_enabled, pr_reviews_enabled, pr_reviews_poll_interval_ms, pr_reviews_auto_launch_skills, launch_mode, default_agent_type'

/** Maps a camelCase field to its column. Also the list of writable fields. */
const FIELD_TO_COLUMN: Record<keyof UserSettings, keyof UserSettingsRow> = {
  theme: 'theme',
  syncClaudeTheme: 'sync_claude_theme',
  language: 'language',
  usageCardEnabled: 'usage_card_enabled',
  usageCardMinimized: 'usage_card_minimized',
  agentContextEnabled: 'agent_context_enabled',
  agentContextMinimized: 'agent_context_minimized',
  usageLogsEnabled: 'usage_logs_enabled',
  planSyncEnabled: 'plan_sync_enabled',
  notificationsEnabled: 'notifications_enabled',
  notificationAgentWaiting: 'notification_agent_waiting',
  notificationAgentCompleted: 'notification_agent_completed',
  notificationPrReview: 'notification_pr_review',
  notificationPrChangesRequested: 'notification_pr_changes_requested',
  dailyDigestEnabled: 'daily_digest_enabled',
  splitEnabled: 'split_enabled',
  spotlightEnabled: 'spotlight_enabled',
  prReviewsEnabled: 'pr_reviews_enabled',
  prReviewsPollIntervalMs: 'pr_reviews_poll_interval_ms',
  prReviewsAutoLaunchSkills: 'pr_reviews_auto_launch_skills',
  launchMode: 'launch_mode',
  defaultAgentType: 'default_agent_type',
}

/** What the page shows before the fetch resolves, and when no row exists yet. */
export const EMPTY_SETTINGS: UserSettings = {
  theme: null,
  syncClaudeTheme: null,
  language: null,
  usageCardEnabled: null,
  usageCardMinimized: null,
  agentContextEnabled: null,
  agentContextMinimized: null,
  usageLogsEnabled: null,
  planSyncEnabled: null,
  notificationsEnabled: null,
  notificationAgentWaiting: null,
  notificationAgentCompleted: null,
  notificationPrReview: null,
  notificationPrChangesRequested: null,
  dailyDigestEnabled: null,
  splitEnabled: null,
  spotlightEnabled: null,
  prReviewsEnabled: null,
  prReviewsPollIntervalMs: null,
  prReviewsAutoLaunchSkills: null,
  launchMode: null,
  defaultAgentType: null,
}


function toSettings(row: UserSettingsRow): UserSettings {
  return {
    theme: row.theme,
    syncClaudeTheme: row.sync_claude_theme,
    language: row.language,
    usageCardEnabled: row.usage_card_enabled,
    usageCardMinimized: row.usage_card_minimized,
    agentContextEnabled: row.agent_context_enabled,
    agentContextMinimized: row.agent_context_minimized,
    usageLogsEnabled: row.usage_logs_enabled,
    planSyncEnabled: row.plan_sync_enabled,
    notificationsEnabled: row.notifications_enabled,
    notificationAgentWaiting: row.notification_agent_waiting,
    notificationAgentCompleted: row.notification_agent_completed,
    notificationPrReview: row.notification_pr_review,
    notificationPrChangesRequested: row.notification_pr_changes_requested,
    dailyDigestEnabled: row.daily_digest_enabled,
    splitEnabled: row.split_enabled,
    spotlightEnabled: row.spotlight_enabled,
    prReviewsEnabled: row.pr_reviews_enabled,
    prReviewsPollIntervalMs: row.pr_reviews_poll_interval_ms,
    prReviewsAutoLaunchSkills: row.pr_reviews_auto_launch_skills,
    launchMode: row.launch_mode,
    defaultAgentType: row.default_agent_type,
  }
}

/**
 * This user's preferences. `user_settings` is own-rows-only on every verb, so
 * RLS already scopes the result — no user filter is needed.
 *
 * Someone who has never run the desktop app has no row at all, which is not an
 * error: it reads as "nothing chosen", the all-null settings.
 */
export async function fetchUserSettings(): Promise<UserSettings> {
  const { data, error } = await getSupabase().from('user_settings').select(COLUMNS).maybeSingle()
  if (error || !data) return EMPTY_SETTINGS
  return toSettings(data as UserSettingsRow)
}

/**
 * Writes a patch and returns the stored row, so the caller's state follows what
 * is actually persisted rather than what it hoped for.
 *
 * An upsert rather than an update: the row only exists once something has
 * written it, and the first write may well come from here. PostgREST builds the
 * ON CONFLICT SET list from the payload keys, so a partial patch leaves every
 * other column untouched.
 *
 * Throws when the write touched no row. PostgREST reports an RLS-filtered write
 * as a success with zero rows, not as an error, so selecting the affected rows
 * back is what makes a forbidden write observable.
 *
 * Returns null when the patch was empty and no write was issued.
 */
export async function updateUserSettings(
  userId: string,
  patch: UserSettingsPatch,
  lang: LanguageId = DEFAULT_LANGUAGE,
): Promise<UserSettings | null> {
  const row: Record<string, unknown> = {}
  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    const value = patch[field as keyof UserSettings]
    if (value !== undefined) row[column] = value
  }
  if (Object.keys(row).length === 0) return null

  const { data, error } = await getSupabase()
    .from('user_settings')
    .upsert({ user_id: userId, ...row }, { onConflict: 'user_id' })
    .select(COLUMNS)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) {
    throw new Error(t('settings.saveFailed', lang))
  }
  return toSettings(data[0] as UserSettingsRow)
}

// ── Option lists ─────────────────────────────────────────────────────────────
//
// Mirrored from the desktop app, which the webapp cannot import from (separate
// TypeScript project, separate build). When any of these change there, change
// them here too:
//   themes  → desktop/src/renderer/theme/themes.ts + THEME_IDS in desktop/src/types.ts
//   labels  → the `theme.*`, `settings.launchMode.*` keys in desktop/src/i18n/en.ts
//   modes   → LaunchMode in desktop/src/types.ts (mirrored by a CHECK constraint
//             on user_settings.launch_mode)
//
// The lists carry message KEYS, not text: they are DATA shared by the settings page
// and the back-office, and only one of the two is translated. Whoever renders an
// option decides which language to render it in.

/**
 * The five colours a theme miniature needs. Bare `R G B` channels where the
 * preview applies an opacity, complete colours where the translucency is part
 * of the theme.
 */
export interface ThemeSwatch {
  bgRgb: string
  surface: string
  inkRgb: string
  accentRgb: string
  lineStrong: string
}

export interface ThemeOption {
  id: string
  labelKey: MessageKey
  descriptionKey: MessageKey
  swatch: ThemeSwatch
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    labelKey: 'theme.dark',
    descriptionKey: 'theme.dark.help',
    swatch: {
      bgRgb: '10 10 11',
      surface: 'rgba(255, 255, 255, 0.06)',
      inkRgb: '255 255 255',
      accentRgb: '99 102 241',
      lineStrong: 'rgba(255, 255, 255, 0.15)',
    },
  },
  {
    id: 'midnight',
    labelKey: 'theme.midnight',
    descriptionKey: 'theme.midnight.help',
    swatch: {
      bgRgb: '11 16 32',
      surface: 'rgba(255, 255, 255, 0.07)',
      inkRgb: '237 240 252',
      accentRgb: '129 140 248',
      lineStrong: 'rgba(255, 255, 255, 0.17)',
    },
  },
  {
    id: 'espresso',
    labelKey: 'theme.espresso',
    descriptionKey: 'theme.espresso.help',
    swatch: {
      bgRgb: '26 21 18',
      surface: 'rgba(255, 245, 230, 0.07)',
      inkRgb: '245 238 230',
      accentRgb: '129 140 248',
      lineStrong: 'rgba(255, 240, 225, 0.17)',
    },
  },
  {
    id: 'high-contrast',
    labelKey: 'theme.highContrast',
    descriptionKey: 'theme.highContrast.help',
    swatch: {
      bgRgb: '0 0 0',
      surface: 'rgba(255, 255, 255, 0.12)',
      inkRgb: '255 255 255',
      accentRgb: '147 157 255',
      lineStrong: 'rgba(255, 255, 255, 0.85)',
    },
  },
  {
    id: 'light',
    labelKey: 'theme.light',
    descriptionKey: 'theme.light.help',
    swatch: {
      bgRgb: '255 255 255',
      surface: 'rgba(0, 0, 0, 0.045)',
      inkRgb: '24 24 27',
      accentRgb: '79 70 229',
      lineStrong: 'rgba(0, 0, 0, 0.2)',
    },
  },
  {
    id: 'mist',
    labelKey: 'theme.mist',
    descriptionKey: 'theme.mist.help',
    swatch: {
      bgRgb: '244 247 251',
      surface: 'rgba(15, 23, 42, 0.05)',
      inkRgb: '15 23 42',
      accentRgb: '67 56 202',
      lineStrong: 'rgba(15, 23, 42, 0.21)',
    },
  },
  {
    id: 'sepia',
    labelKey: 'theme.sepia',
    descriptionKey: 'theme.sepia.help',
    swatch: {
      bgRgb: '250 246 238',
      surface: 'rgba(74, 54, 28, 0.05)',
      inkRgb: '43 35 26',
      accentRgb: '79 70 229',
      lineStrong: 'rgba(74, 54, 28, 0.22)',
    },
  },
  {
    id: 'daylight',
    labelKey: 'theme.daylight',
    descriptionKey: 'theme.daylight.help',
    swatch: {
      bgRgb: '255 255 255',
      surface: 'rgba(0, 0, 0, 0.09)',
      inkRgb: '0 0 0',
      accentRgb: '49 46 129',
      lineStrong: 'rgba(0, 0, 0, 0.85)',
    },
  },
]

/** Autonyms, deliberately untranslated — you pick your language in your own. */
export const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

/** An option whose label and help text are named, not written. */
export interface KeyedOption {
  value: string
  labelKey: MessageKey
  descriptionKey?: MessageKey
}

/** The mode Claude Code agents launch in. `bypassPermissions` is gated in the UI. */
export const LAUNCH_MODE_OPTIONS: KeyedOption[] = [
  {
    value: 'plan',
    labelKey: 'settings.launchMode.plan',
    descriptionKey: 'settings.launchMode.plan.help',
  },
  {
    value: 'default',
    labelKey: 'settings.launchMode.default',
    descriptionKey: 'settings.launchMode.default.help',
  },
  {
    value: 'acceptEdits',
    labelKey: 'settings.launchMode.acceptEdits',
    descriptionKey: 'settings.launchMode.acceptEdits.help',
  },
  {
    value: 'auto',
    labelKey: 'settings.launchMode.auto',
    descriptionKey: 'settings.launchMode.auto.help',
  },
  {
    value: 'bypassPermissions',
    labelKey: 'settings.launchMode.bypass',
    descriptionKey: 'settings.launchMode.bypass.help',
  },
]

/**
 * How a sidebar panel is drawn. Two values rather than a boolean because this is
 * a picker, and `usage_card_minimized` / `agent_context_minimized` are the
 * booleans behind it — 'minimized' is true, 'full' is false. Mirrors the
 * FormatSelect in `desktop/src/renderer/pages/Config/AppearancePage.tsx`, which
 * writes the same two columns.
 */
export const PANEL_FORMAT_OPTIONS: KeyedOption[] = [
  { value: 'full', labelKey: 'settings.sidebars.format.full' },
  { value: 'minimized', labelKey: 'settings.sidebars.format.minimized' },
]

export const POLL_INTERVAL_OPTIONS: KeyedOption[] = [
  { value: '30000', labelKey: 'settings.prWatcher.interval30s' },
  { value: '60000', labelKey: 'settings.prWatcher.interval1m' },
  { value: '120000', labelKey: 'settings.prWatcher.interval2m' },
  { value: '300000', labelKey: 'settings.prWatcher.interval5m' },
]
