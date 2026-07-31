import { getSupabase } from './supabase'
import { localeOf, t } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'

/** Where the desktop app is downloaded from. */
export const DOWNLOAD_URL = 'https://github.com/xrequillart/magic-slash/releases/latest'

/** One-liner that installs the app — same command as the landing page. */
export const INSTALL_COMMAND = 'curl -fsSL https://magic-slash.io/install.sh | bash'

export interface Installation {
  deviceId: string
  deviceName: string | null
  appVersion: string
  platform: string | null
  arch: string | null
  firstSeenAt: string
  lastSeenAt: string
}

interface InstallationRow {
  device_id: string
  device_name: string | null
  app_version: string
  platform: string | null
  arch: string | null
  first_seen_at: string
  last_seen_at: string
}

/**
 * The machines this user has signed in to the desktop app from, most recently
 * seen first. Rows are written by the desktop app on every launch; the webapp
 * never creates them.
 *
 * `app_installations` is own-rows-only on every verb, so no user filter is
 * needed here — RLS already scopes the result to the caller.
 */
export async function fetchInstallations(): Promise<Installation[]> {
  const { data, error } = await getSupabase()
    .from('app_installations')
    .select('device_id, device_name, app_version, platform, arch, first_seen_at, last_seen_at')
    .order('last_seen_at', { ascending: false })
  if (error || !data) return []

  return (data as InstallationRow[]).map((r) => ({
    deviceId: r.device_id,
    deviceName: r.device_name,
    appVersion: r.app_version,
    platform: r.platform,
    arch: r.arch,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
  }))
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * Absolute date, for the lifecycle moments where "3 months ago" reads as vague.
 * Null or unparseable input renders as an em dash — the back-office shows a lot of
 * nullable timestamps, and "—" is the honest label for "never".
 *
 * `formatRelative` falls through to this once a date is too old for a relative
 * label, so the app has one absolute date format rather than one per caller.
 *
 * `lang` defaults to English rather than being required, because the back-office
 * calls this from a dozen table cells and is not translated — the user-space callers
 * pass the language they got from `useT()`.
 */
export function formatAbsoluteDate(iso: string | null, lang: LanguageId = DEFAULT_LANGUAGE): string {
  const at = iso === null ? NaN : new Date(iso).getTime()
  if (Number.isNaN(at)) return '—'
  return new Date(at).toLocaleDateString(localeOf(lang), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Coarse "time ago" label. Precision beyond a day is not useful here.
 *
 * One entry per plural form rather than a suffix appended to a number: "1 minute ago"
 * and "il y a 1 minute" put the count in different places, so a template with an `s`
 * glued on the end cannot produce both.
 */
export function formatRelative(iso: string, lang: LanguageId = DEFAULT_LANGUAGE): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return t('time.unknown', lang)

  const diff = Date.now() - then
  if (diff < MINUTE) return t('time.justNow', lang)
  if (diff < HOUR) {
    const count = Math.floor(diff / MINUTE)
    return t(count === 1 ? 'time.minutes.one' : 'time.minutes.many', lang, { count })
  }
  if (diff < DAY) {
    const count = Math.floor(diff / HOUR)
    return t(count === 1 ? 'time.hours.one' : 'time.hours.many', lang, { count })
  }
  const count = Math.floor(diff / DAY)
  if (count < 30) return t(count === 1 ? 'time.days.one' : 'time.days.many', lang, { count })
  return formatAbsoluteDate(iso, lang)
}

/**
 * "darwin · arm64" — omits whichever half is missing.
 *
 * Takes the two fields it reads rather than an `Installation`, so the back-office's
 * `AdminInstallation` (same device, a different set of columns) shares the
 * separator and the omit-the-missing-half rule instead of restating them.
 */
export function formatDevicePlatform(device: { platform: string | null; arch: string | null }): string {
  return [device.platform, device.arch].filter(Boolean).join(' · ')
}

/**
 * Version comparison lives in `./versions`, which imports nothing — the root
 * vitest run covers `webapp/lib/**` without installing `webapp/`'s dependencies,
 * so anything a test reaches must not pull in the Supabase client this module
 * imports. Re-exported here because this is where callers already look for it.
 */
export { compareVersions, highestVersion } from './versions'
