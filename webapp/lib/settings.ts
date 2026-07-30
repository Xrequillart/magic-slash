import { getSupabase } from './supabase'

// The defaults live in the catalog, which has no I/O and can therefore be unit
// tested — see the note there. Re-exported so every caller keeps importing them from
// the module it already imports `UserSettings` and `fetchUserSettings` from.
export { DEFAULTS } from './settingsCatalog'

/**
 * Application-level preferences, one row per user in `user_settings`.
 *
 * These are the DESKTOP app's settings. The webapp only edits them: it is a
 * fixed light theme in English, so choosing "dark" or "Français" here changes
 * what the desktop paints and speaks, not this page.
 *
 * Every column is nullable on purpose and NULL is a third state, distinct from
 * false: it means the user never chose, and the app applies its own default.
 * Nothing here normalises a null away — reads use the DEFAULTS below for
 * display, and a column is only written once the user touches it.
 *
 * Deliberately absent: the Spotlight shortcut and "launch at login", which are
 * properties of a machine rather than of an account (and writing
 * auto_start_at_login=false from here would make the app touch the macOS login
 * item on its next start), plus split_active, which is a transient view state.
 */

export interface UserSettings {
  theme: string | null
  language: string | null
  usageCardEnabled: boolean | null
  usageLogsEnabled: boolean | null
  dailyDigestEnabled: boolean | null
  splitEnabled: boolean | null
  prReviewsEnabled: boolean | null
  prReviewsPollIntervalMs: number | null
  prReviewsAutoLaunchSkills: boolean | null
  launchMode: string | null
}

export type UserSettingsPatch = Partial<UserSettings>

interface UserSettingsRow {
  theme: string | null
  language: string | null
  usage_card_enabled: boolean | null
  usage_logs_enabled: boolean | null
  daily_digest_enabled: boolean | null
  split_enabled: boolean | null
  pr_reviews_enabled: boolean | null
  pr_reviews_poll_interval_ms: number | null
  pr_reviews_auto_launch_skills: boolean | null
  launch_mode: string | null
}

const COLUMNS =
  'theme, language, usage_card_enabled, usage_logs_enabled, daily_digest_enabled, split_enabled, pr_reviews_enabled, pr_reviews_poll_interval_ms, pr_reviews_auto_launch_skills, launch_mode'

/** Maps a camelCase field to its column. Also the list of writable fields. */
const FIELD_TO_COLUMN: Record<keyof UserSettings, keyof UserSettingsRow> = {
  theme: 'theme',
  language: 'language',
  usageCardEnabled: 'usage_card_enabled',
  usageLogsEnabled: 'usage_logs_enabled',
  dailyDigestEnabled: 'daily_digest_enabled',
  splitEnabled: 'split_enabled',
  prReviewsEnabled: 'pr_reviews_enabled',
  prReviewsPollIntervalMs: 'pr_reviews_poll_interval_ms',
  prReviewsAutoLaunchSkills: 'pr_reviews_auto_launch_skills',
  launchMode: 'launch_mode',
}

/** What the page shows before the fetch resolves, and when no row exists yet. */
export const EMPTY_SETTINGS: UserSettings = {
  theme: null,
  language: null,
  usageCardEnabled: null,
  usageLogsEnabled: null,
  dailyDigestEnabled: null,
  splitEnabled: null,
  prReviewsEnabled: null,
  prReviewsPollIntervalMs: null,
  prReviewsAutoLaunchSkills: null,
  launchMode: null,
}


function toSettings(row: UserSettingsRow): UserSettings {
  return {
    theme: row.theme,
    language: row.language,
    usageCardEnabled: row.usage_card_enabled,
    usageLogsEnabled: row.usage_logs_enabled,
    dailyDigestEnabled: row.daily_digest_enabled,
    splitEnabled: row.split_enabled,
    prReviewsEnabled: row.pr_reviews_enabled,
    prReviewsPollIntervalMs: row.pr_reviews_poll_interval_ms,
    prReviewsAutoLaunchSkills: row.pr_reviews_auto_launch_skills,
    launchMode: row.launch_mode,
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
    throw new Error('Your settings could not be saved — please sign in again and retry.')
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
  label: string
  description: string
  swatch: ThemeSwatch
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'dark',
    label: 'Dark',
    description: 'The original, near-black.',
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
    label: 'Midnight',
    description: 'Dark, in deep blue.',
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
    label: 'Espresso',
    description: 'Warm brown-black.',
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
    label: 'High contrast',
    description: 'White on black, hard edges.',
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
    label: 'Light',
    description: 'Bright and neutral.',
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
    label: 'Mist',
    description: 'Cool blue-grey daylight.',
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
    label: 'Sepia',
    description: 'A warm ivory page.',
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
    label: 'Daylight',
    description: 'Black on white, hard edges.',
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

/** The mode Claude Code agents launch in. `bypassPermissions` is gated in the UI. */
export const LAUNCH_MODE_OPTIONS = [
  {
    value: 'plan',
    label: 'Plan',
    description: 'Read-only — Claude explores and analyzes but never modifies anything',
  },
  {
    value: 'default',
    label: 'Standard',
    description: 'Claude asks permission for every sensitive action',
  },
  {
    value: 'acceptEdits',
    label: 'Accept Edits',
    description: 'Auto-accepts file edits, still asks for bash commands',
  },
  {
    value: 'auto',
    label: 'Auto',
    description: 'Auto-approves most actions based on configured allowlists',
  },
  {
    value: 'bypassPermissions',
    label: 'Bypass',
    description: 'No permission checks — for sandboxed environments only',
  },
]

export const POLL_INTERVAL_OPTIONS = [
  { value: '30000', label: '30 seconds' },
  { value: '60000', label: '1 minute' },
  { value: '120000', label: '2 minutes' },
  { value: '300000', label: '5 minutes' },
]
