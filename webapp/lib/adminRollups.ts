/**
 * The back-office's four fleet rollups.
 *
 * Deliberately free of any Supabase import so it stays a pure, testable module —
 * the same reason `teamRows.ts` is, and a load-bearing one here: the root vitest
 * run includes `webapp/lib/**` but CI installs only the root's dependencies, so a
 * test that reaches `lib/supabase.ts` fails to resolve `@supabase/supabase-js`
 * before a single assertion runs. `lib/admin.ts` re-exports everything below, so
 * callers keep importing from there.
 *
 * These four are the only logic on the back-office that can be wrong in a way a
 * screenshot would not reveal, which is why they are unit-tested
 * (`adminRollups.test.ts`) rather than inlined into the components that render
 * them. No React, no Supabase, and no `Date.now()` — the one that needs the clock
 * takes it as an argument.
 */

import { compareVersions, highestVersion } from './versions'

/**
 * The device fields these rollups actually read. Structurally typed and generic
 * so `AdminInstallation` (or anything else carrying these four) goes in and comes
 * back out unchanged, without this module importing the Supabase-backed type.
 */
export interface FleetDevice {
  appVersion: string
  platform: string | null
  arch: string | null
  lastSeenAt: string
}

export interface VersionBucket {
  version: string
  count: number
}

export interface CountBucket {
  value: string
  count: number
}

/** Which device-shape fields the breakdown can group on. */
export type BreakdownKey = 'platform' | 'arch'

/** Label used for a device that never reported a platform or an arch. */
export const UNKNOWN_VALUE = 'unknown'

/**
 * Devices per version, newest version first — the fleet histogram.
 *
 * Counts DEVICES, not users: "62% of the fleet is on 0.54.1" is a statement about
 * machines, and a user with two of them contributes twice because both need the
 * update. Ordering is by version rather than by count so the bars read as a
 * timeline and the tail of old builds stays on the same side of the chart between
 * releases.
 */
export function bucketByVersion(installations: FleetDevice[]): VersionBucket[] {
  const counts = new Map<string, number>()
  for (const i of installations) {
    counts.set(i.appVersion, (counts.get(i.appVersion) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([version, count]) => ({ version, count }))
    // compareVersions is coarse (numeric components only), so two spellings of
    // the same version can tie; the string comparison keeps the order stable
    // instead of leaving it to the sort implementation.
    .sort((a, b) => compareVersions(b.version, a.version) || b.version.localeCompare(a.version))
}

/**
 * The devices not on the highest version any device reports.
 *
 * "Highest observed", not "latest released": nothing here knows what has shipped,
 * and a fleet where every machine is one release behind would report itself fully
 * up to date. That is the honest limit of this signal, and it is still the useful
 * one — it answers "who is behind the others", which is what a support question
 * asks. Empty in, empty out; a single-version fleet has no outdated devices.
 */
export function outdatedInstallations<T extends FleetDevice>(installations: T[]): T[] {
  const highest = highestVersion(installations)
  if (highest === null) return []
  return installations.filter((i) => compareVersions(i.appVersion, highest) < 0)
}

/**
 * Devices grouped by `platform` or `arch`, most common first. A missing value
 * becomes `unknown` rather than being dropped, so the buckets always sum to the
 * fleet size — a breakdown that quietly omits rows invites the wrong conclusion.
 *
 * Ties break alphabetically, so two equal buckets do not swap places between
 * renders.
 */
export function countBy(installations: FleetDevice[], key: BreakdownKey): CountBucket[] {
  const counts = new Map<string, number>()
  for (const i of installations) {
    const value = i[key]?.trim() || UNKNOWN_VALUE
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

/** A device unseen for this long is worth surfacing on its own. */
export const QUIET_DAYS = 14

/**
 * The devices that have not launched the app in `days`.
 *
 * `now` is a parameter rather than a `Date.now()` read so this stays pure like its
 * three siblings above — and so it is testable, which matters more here than for
 * any of them: a flipped comparison or a wrong unit renders as a plausible-looking
 * list of names, with nothing on screen to say it is wrong.
 */
export function quietInstallations<T extends FleetDevice>(
  installations: T[],
  now: number,
  days = QUIET_DAYS,
): T[] {
  const cutoff = days * 24 * 60 * 60 * 1000
  return installations.filter((i) => now - new Date(i.lastSeenAt).getTime() > cutoff)
}
