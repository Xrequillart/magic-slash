import { getSupabase } from './supabase'

/** Where the desktop app is downloaded from. */
export const DOWNLOAD_URL = 'https://github.com/xrequillart/magic-slash/releases/latest'

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

/** Version of the most recently active machine — what the user actually runs. */
export function latestVersion(rows: Installation[]): string | null {
  return rows[0]?.appVersion ?? null
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Coarse "time ago" label. Precision beyond a day is not useful here. */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return 'unknown'

  const diff = Date.now() - then
  if (diff < 0) return 'just now'
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  const d = Math.floor(diff / DAY)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(then).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/** "darwin · arm64" — omits whichever half is missing. */
export function formatDevicePlatform(install: Installation): string {
  return [install.platform, install.arch].filter(Boolean).join(' · ')
}
