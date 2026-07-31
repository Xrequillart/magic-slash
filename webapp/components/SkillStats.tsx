'use client'

import { useEffect, useState } from 'react'
import { Zap } from 'lucide-react'
import { fetchOrgSkillCounts, fetchPersonalSkillCounts, TRACKED_SKILLS, totalTrackedRuns } from '@/lib/skills'
import type { RepoScope } from '@/lib/teamRows'
import { Card, SectionHeader } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * How much the tab on screen has actually RUN, beside the roster of what it HAS.
 *
 * The web counterpart of the desktop's `pages/Dashboard/SkillStats.tsx`, reading the
 * same rollups through the same RPCs.
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
 * Counts are all-time and arrive pre-aggregated.
 */
export function SkillStats({ scope }: { scope: RepoScope | undefined }) {
  const { t } = useT()
  // undefined = not fetched yet, so the tiles hold their place with a dash instead of
  // flashing zeros and then filling in.
  const [counts, setCounts] = useState<Map<string, number> | undefined>(undefined)

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
    const pending = scope === null ? fetchPersonalSkillCounts() : fetchOrgSkillCounts(scope)
    pending.then((next) => {
      if (!cancelled) setCounts(next)
    })
    return () => {
      cancelled = true
    }
  }, [scope])

  if (scope === undefined) return null

  const total = counts ? totalTrackedRuns(counts) : 0

  return (
    <div className="mb-8">
      <SectionHeader
        icon={Zap}
        title={personal ? t('skills.titlePersonal') : t('skills.title')}
        action={
          counts ? (
            <span className="text-xs text-muted">
              {total === 1 ? t('skills.runs.one') : t('skills.runs.many', { count: total })}
            </span>
          ) : undefined
        }
      />

      <Card className="p-4">
        <dl className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {TRACKED_SKILLS.map(({ skill, label }) => {
            // Absent means never run: the RPC returns no row rather than a zero, so
            // this is where absence becomes the number to print.
            const runs = counts?.get(skill) ?? 0
            return (
              <div
                key={skill}
                title={label}
                className="min-w-0 rounded-xl border border-black/[0.07] bg-black/[0.015] px-2.5 py-2"
              >
                {/* The `/magic:` prefix is dropped: it is the same seven characters on
                    all seven tiles, and at this width it pushes the part that differs
                    out of view. The full command stays in the title attribute. */}
                <dt className="truncate text-[10px] uppercase tracking-wider text-muted">
                  {label.replace('/magic:', '')}
                </dt>
                {/* A zero is dimmed rather than hidden: the tile holds its place so
                    the row stays comparable, but the eye should skip it. */}
                <dd
                  className={`mt-1 font-display text-lg font-bold leading-none ${
                    counts && runs > 0 ? 'text-ink' : 'text-black/20'
                  }`}
                >
                  {counts ? runs : '—'}
                </dd>
              </div>
            )
          })}
        </dl>

        {counts && total === 0 && (
          // Said only when nothing has been recorded, which is the one state that
          // reads as a broken page rather than as data. The two scopes lose runs in
          // opposite directions, so each explains its own.
          <p className="mt-3 text-xs text-muted">
            {personal ? t('skills.emptyPersonal') : t('skills.empty')}
          </p>
        )}
      </Card>
    </div>
  )
}
