/**
 * Version comparison for app builds reported by the desktop app.
 *
 * Deliberately free of any Supabase import so it stays a pure, testable module —
 * same reason `teamRows.ts` is. `lib/installations.ts` re-exports both functions,
 * so nothing that already imports them from there has to change; the split exists
 * so `lib/adminRollups.ts` can reach them without dragging the Supabase client
 * into the root vitest run, which does not install `webapp/`'s dependencies.
 */

/**
 * Compares two version strings by their numeric components. Coarse on purpose:
 * a pre-release suffix (`0.54.1-beta.2`) compares as its leading number, which
 * is enough to answer "is this machine behind another one?" — the only question
 * asked of it.
 *
 * One definition, because the back-office asks the same question of the whole
 * fleet as `/application` does of one user's machines. A second implementation
 * would be the same coarseness decided twice, and the two would drift the first
 * time one of them learned about pre-release suffixes.
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.')
  const pb = b.split('.')
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const na = parseInt(pa[i] ?? '0', 10) || 0
    const nb = parseInt(pb[i] ?? '0', 10) || 0
    if (na !== nb) return na - nb
  }
  return 0
}

/**
 * The newest version any of these machines runs, or null when there are none.
 *
 * Structurally typed for the same reason `compareVersions` is shared: the
 * back-office asks this of the whole fleet (`AdminInstallation`) and
 * `/application` asks it of one user's machines (`Installation`).
 */
export function highestVersion(installs: { appVersion: string }[]): string | null {
  if (installs.length === 0) return null
  return installs.reduce(
    (best, i) => (compareVersions(i.appVersion, best) > 0 ? i.appVersion : best),
    installs[0].appVersion,
  )
}

/** Where one build sits relative to what has shipped. `unknown` = never launched. */
export type VersionStanding = 'current' | 'behind' | 'unknown'

/**
 * Whether a machine is on the shipped build, and the one thing this used to get
 * wrong.
 *
 * "Up to date" was `version === highestVersion(fleet)` — the newest build ANY machine
 * reports. That reads as an answer and is not one: minutes after a release nobody has
 * installed it, so the fleet maximum is still the old build and every machine on it
 * reports itself current. Worse, it can never say otherwise for a fleet of one,
 * because that machine IS the maximum. The reference has to come from outside the
 * fleet — `LATEST_DESKTOP_VERSION` (lib/desktopRelease.ts).
 *
 * `>=`, not `===`: someone running a build from source sits AHEAD of the published
 * release, and "en retard" would be a strange thing to tell them.
 */
export function versionStanding(version: string | null, released: string): VersionStanding {
  if (!version) return 'unknown'
  return compareVersions(version, released) >= 0 ? 'current' : 'behind'
}
