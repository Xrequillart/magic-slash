import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import type { SkillCounts, SkillRunCounts } from '../../../types'
import type { RepoScope } from '../../utils/repoRows'
import { useT } from '../../i18n'

/**
 * The skills this row reports, in the order the development cycle runs them —
 * start, pick back up, commit, ship, review, fix the review, close.
 *
 * A FIXED list, though the RPCs return every skill that has ever run. The point is
 * that the same seven tiles sit in the same seven places whichever tab is open, so a
 * hole in the cycle ("plenty of commits, no PRs") is visible as a shape rather than
 * as a number to compare by hand.
 *
 * `skill` is what the PreToolUse hook logs; `label` is what a human calls it. Not
 * translated, and it must not be: these are command names the user types.
 *
 * The webapp keeps the same list in `lib/skills.ts`. Two copies rather than a shared
 * module because the desktop and the webapp are separate builds with no code path
 * between them — the same reason the theme options are declared twice. What holds them
 * together is the `skill` strings, which are the database's own values.
 */
const TRACKED_SKILLS: { skill: string; label: string }[] = [
  { skill: 'magic-start', label: 'start' },
  { skill: 'magic-continue', label: 'continue' },
  { skill: 'magic-commit', label: 'commit' },
  { skill: 'magic-pr', label: 'pr' },
  { skill: 'magic-review', label: 'review' },
  { skill: 'magic-resolve', label: 'resolve' },
  { skill: 'magic-done', label: 'done' },
]

/**
 * How much the tab on screen has actually RUN, beside the roster of what it HAS.
 *
 * TWO SCOPES, and they do not mean the same thing — which is why the heading changes
 * with them rather than only the numbers:
 *
 *  * an ORGANISATION tab counts EVERY member's work on that org's repositories;
 *  * the PERSONAL tab counts the VIEWER's OWN work outside any organisation. Nobody
 *    else can read those rows, so there is no team version of it.
 *
 * Read side by side without that distinction, a small personal number next to a large
 * org one invites the wrong conclusion, so the title says whose runs these are.
 *
 * Counts are all-time and arrive pre-aggregated from the database.
 */
/**
 * The full breakdown, on hover. Only the started count fits on a tile this size; the
 * rest is worth having but not worth crowding it.
 *
 * The abandoned count is deliberately absent, here and on the tile: a run only closes
 * on a voluntary signal, so "abandoned" counts interruptions as failures and reads as
 * an alarm about nothing.
 *
 * Not translated, and consistent with the tile labels for the same reason: these are
 * the command names the user types.
 */
function tileTitle(label: string, stats: SkillRunCounts | undefined): string {
  if (!stats) return `/magic:${label}`
  const parts = [`${stats.total} started`, `${stats.completed} completed`]
  if (stats.medianDurationMs !== null) parts.push(`median ${formatDuration(stats.medianDurationMs)}`)
  return `/magic:${label} — ${parts.join(', ')}`
}

/** Coarse on purpose: a median run is minutes, and seconds of precision suggest a
 *  confidence a median over a handful of runs does not have. */
function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function SkillStats({ scope }: { scope: RepoScope | undefined }) {
  const t = useT()
  // undefined = not fetched yet, so the tiles can hold their place with a dash
  // instead of flashing zeros and then filling in.
  const [counts, setCounts] = useState<SkillCounts | undefined>(undefined)

  const personal = scope === null

  useEffect(() => {
    // `undefined` is "no tab resolved yet" and is NOT the personal scope — null is.
    // Collapsing the two would draw personal counts under an org's name for the one
    // render before the tabs settle.
    if (scope === undefined) return

    // Reset first, then drop a late response: switching tabs must not print one
    // scope's numbers under another's name, and the reads resolve in any order.
    setCounts(undefined)
    let cancelled = false
    const pending =
      scope === null
        ? window.electronAPI.org.getPersonalSkillCounts()
        : window.electronAPI.org.getSkillCounts(scope)
    pending
      .then((next) => {
        if (!cancelled) setCounts(next)
      })
      .catch(() => {
        if (!cancelled) setCounts({})
      })
    return () => {
      cancelled = true
    }
  }, [scope])

  if (scope === undefined) return null

  const total = counts ? TRACKED_SKILLS.reduce((sum, { skill }) => sum + (counts[skill]?.total ?? 0), 0) : 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Zap className="w-4 h-4" />
        <span>{t(personal ? 'dashboard.skills.sectionPersonal' : 'dashboard.skills.section')}</span>
        {counts && (
          <span className="text-xs text-text-secondary/50 ml-auto">
            {t(total === 1 ? 'dashboard.skills.runs.one' : 'dashboard.skills.runs.other', { count: total })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {TRACKED_SKILLS.map(({ skill, label }) => {
          // Absent means never run: the RPC returns no row rather than a zero, so
          // this is where absence becomes the number to print.
          const stats = counts?.[skill]
          const runs = stats?.total ?? 0
          return (
            <div
              key={skill}
              title={tileTitle(label, stats)}
              className="rounded-lg bg-surface-subtle border border-line-field px-2.5 py-2 min-w-0"
            >
              <p className="text-[10px] uppercase tracking-wider text-text-secondary truncate">{label}</p>
              {/* A zero is dimmed rather than hidden: the tile holds its place so the
                  row stays comparable, but the eye should skip it. */}
              <p
                className={`mt-1 text-lg font-medium leading-none ${
                  counts && runs > 0 ? 'text-ink' : 'text-text-secondary/40'
                }`}
              >
                {counts ? runs : '—'}
              </p>
            </div>
          )
        })}
      </div>

      {counts && total === 0 && (
        // Said only when nothing has been recorded, which is the one state that reads
        // as a broken page rather than as data. The two scopes lose runs in opposite
        // directions, so each explains its own.
        <p className="text-xs text-text-secondary/50">
          {t(personal ? 'dashboard.skills.emptyPersonal' : 'dashboard.skills.empty')}
        </p>
      )}
    </div>
  )
}
