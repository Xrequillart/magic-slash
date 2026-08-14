'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { fetchSkillHours } from '@/lib/skills'
import {
  formatLastUsed,
  formatSkillSince,
  formatSkillTime,
  hasNeverRun,
  type SkillHours,
} from '@/lib/skillHours'
import { Card } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * How long this person has spent inside the skills — all time, this week, and when they
 * last used them.
 *
 * ABOVE THE TABS, and that placement is the argument for the component's shape: the
 * tabs below it scope the repository list and the skill counts to one organization,
 * while these figures are the VIEWER's own across every scope. A card that changed when
 * you switched tabs would be claiming to be scoped; one that sits above them says it is
 * not, and it does not need `activeScope` passed to it to prove that.
 *
 * Counts beside it answer "is the cycle being used"; this answers "what has it cost",
 * which is the number a person recognises as theirs.
 *
 * THE DURATIONS ARE A FLOOR. Only a run that reported finishing carries a duration, so
 * an interrupted one adds nothing, and `close_skill_run` will not attach an end more
 * than four hours out — a longer session is truncated to the part that could be proved.
 * The total is therefore always less than the time really spent, which is why the period
 * is dated from the first MEASURED run and why the caveat is on the card rather than in
 * a commit message.
 *
 * LAST USED plays by a different rule on purpose: it counts a run that never closed, so
 * it can be more recent than the period the hours cover. Anything else would tell
 * someone who launched a skill an hour ago and interrupted it that they last used the
 * app days ago — the one fact on the card they can check themselves.
 */
export function SkillHoursBanner() {
  const { t, lang } = useT()
  // undefined = still reading, null = the read failed. The first draws placeholders,
  // the second draws nothing: a card of zeros would be a claim, and a failed read has
  // nothing to claim.
  const [hours, setHours] = useState<SkillHours | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetchSkillHours().then((next) => {
      if (!cancelled) setHours(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (hours === null) return null
  // Never run anything: three em dashes under three headings say nothing worth the
  // space. The dashboard has a checklist for that stage of the account.
  if (hours && hasNeverRun(hours)) return null

  const loading = hours === undefined

  return (
    <Card className="mb-4 p-6">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Timer className="h-5 w-5" />
        </span>

        {/* `aria-busy` while the read is in flight, because the placeholders below are
            decoration a screen reader is not shown — without it the labels would be
            read out with nothing after them and no indication that anything is coming. */}
        <dl aria-busy={loading} className="grid min-w-0 flex-1 gap-x-8 gap-y-6 sm:grid-cols-3">
          <Stat
            label={t('skillHours.label.total')}
            loading={loading}
            // Roughly the width of "453h" plus its suffix, so the block stands in for
            // what is coming rather than for a number of some other size.
            placeholderClass="w-40"
            value={hours ? formatSkillTime(hours.totalSeconds, t) : ''}
            // The caveat lives on the total, which is the number it qualifies.
            title={hours ? t('skillHours.hint') : undefined}
            // No period to name until something has been measured, and "depuis le —"
            // is worse than nothing under a figure that already reads as zero.
            suffix={
              hours?.firstMeasuredAt
                ? t('skillHours.since', { date: formatSkillSince(hours.firstMeasuredAt, lang) })
                : undefined
            }
          />
          {/* Monday to Sunday in the reader's own timezone, not a rolling seven days —
              the boundary is computed in the RPC from the zone the browser reports. The
              suffix says which of the two it is, because the difference is invisible in
              the number and a Monday morning is meant to read as a fresh week. */}
          <Stat
            label={t('skillHours.label.week')}
            loading={loading}
            placeholderClass="w-32"
            value={hours ? formatSkillTime(hours.weekSeconds, t) : ''}
            suffix={hours ? t('skillHours.sinceMonday') : undefined}
          />
          <Stat
            label={t('skillHours.label.last')}
            loading={loading}
            placeholderClass="w-36"
            // An em dash here is NOT a loading state: it is the label for a date that
            // does not exist, and `formatLastUsed` is where that decision is made.
            value={hours ? formatLastUsed(hours.lastRunAt, lang) : ''}
          />
        </dl>
      </div>
    </Card>
  )
}

/**
 * One figure: what it is above, how much below. Label first in the markup as well as on
 * screen, so a `dl` reads in pairs.
 *
 * The LABELS are never a placeholder — they are static copy and known before the read
 * starts, so only the values wait. That is what makes the card settle in place instead
 * of assembling itself: nothing moves when the numbers land except the numbers.
 */
function Stat({
  label,
  value,
  suffix,
  title,
  loading = false,
  placeholderClass = 'w-32',
}: {
  label: string
  value: string
  suffix?: string
  title?: string
  loading?: boolean
  /** Width of the placeholder, chosen per column to approximate its real value. */
  placeholderClass?: string
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        {loading ? (
          // Exactly the height of the value it stands in for (text-3xl, leading-none),
          // so the row does not resize when the number replaces it.
          //
          // `motion-safe:` because a pulse is decoration: someone who asked their system
          // for less motion gets the same grey block, holding the same space, still.
          <span
            aria-hidden
            className={`h-[30px] rounded-lg bg-black/[0.06] motion-safe:animate-pulse ${placeholderClass}`}
          />
        ) : (
          <span
            className="font-display text-3xl font-black leading-none tracking-tight text-ink"
            title={title}
          >
            {value}
          </span>
        )}
        {suffix && <span className="text-xs text-muted">{suffix}</span>}
      </dd>
    </div>
  )
}
