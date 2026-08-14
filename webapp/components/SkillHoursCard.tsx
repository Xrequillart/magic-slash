'use client'

import { Timer } from 'lucide-react'
import {
  formatLastUsed,
  formatSkillSince,
  formatSkillTime,
  type SkillHours,
} from '@/lib/skillHours'
import { Card } from '@/components/ui'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The three figures themselves: total, this week, last used. Pure presentation — it is
 * handed hours and draws them, and every decision about WHETHER there is anything worth
 * drawing belongs to `SkillHoursBanner`, which owns the read.
 *
 * Split out of the banner so the opt-in panel can lean a copy of the REAL card against
 * its copy instead of a hand-built lookalike (`SkillHoursOptIn`). An illustration
 * redrawn by hand is an illustration that stops matching the moment a column is added
 * here — this way the mock is the card, with sample numbers in it.
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
/** The three figures, in the order they are drawn. */
export const SKILL_HOURS_STATS = ['total', 'week', 'last'] as const
export type SkillHoursStat = (typeof SKILL_HOURS_STATS)[number]

/**
 * Grid template per figure count, as literals — Tailwind scans source text, so a class
 * name assembled at runtime (`sm:grid-cols-${n}`) is a class it never generates. One
 * figure gets no template at all: a lone column has nothing to line up with.
 */
const COLUMNS: Record<number, string> = {
  1: '',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
}

export function SkillHoursCard({
  hours,
  className = '',
  stats = SKILL_HOURS_STATS,
}: {
  /** null draws placeholders — the read is still in flight. */
  hours: SkillHours | null
  className?: string
  /**
   * Which figures to draw. Everything, unless told otherwise.
   *
   * A subset is for the ILLUSTRATION in `SkillHoursOptIn` and nothing else: leaning at
   * an angle and shrunk to a third of the page, three columns read as a wall of numbers
   * rather than as a promise. The real card on the dashboard always draws all three —
   * this is a crop, not a variant, and there is deliberately no way to reach it from
   * the banner.
   */
  stats?: readonly SkillHoursStat[]
}) {
  const { t, lang } = useT()
  const loading = hours === null

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Timer className="h-5 w-5" />
        </span>

        {/* `aria-busy` while the read is in flight, because the placeholders below are
            decoration a screen reader is not shown — without it the labels would be
            read out with nothing after them and no indication that anything is coming. */}
        <dl
          aria-busy={loading}
          className={`grid min-w-0 flex-1 gap-x-8 gap-y-6 ${COLUMNS[stats.length] ?? ''}`}
        >
          {stats.includes('total') && (
            <Stat
              label={t('skillHours.label.total')}
              loading={loading}
              // Roughly the width of "453h" plus its suffix, so the block stands in for
              // what is coming rather than for a number of some other size.
              placeholderClass="w-40"
              hasSuffix
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
          )}
          {/* Monday to Sunday in the reader's own timezone, not a rolling seven days —
              the boundary is computed in the RPC from the zone the browser reports. The
              suffix says which of the two it is, because the difference is invisible in
              the number and a Monday morning is meant to read as a fresh week. */}
          {stats.includes('week') && (
            <Stat
              label={t('skillHours.label.week')}
              loading={loading}
              placeholderClass="w-32"
              hasSuffix
              value={hours ? formatSkillTime(hours.weekSeconds, t) : ''}
              suffix={hours ? t('skillHours.sinceMonday') : undefined}
            />
          )}
          {stats.includes('last') && (
            <Stat
              label={t('skillHours.label.last')}
              loading={loading}
              placeholderClass="w-36"
              // An em dash here is NOT a loading state: it is the label for a date that
              // does not exist, and `formatLastUsed` is where that decision is made.
              value={hours ? formatLastUsed(hours.lastRunAt, lang) : ''}
              // What that date was spent on. Absent for a run with no agent, one whose
              // agent has been deleted, or a database still on 20260814120000 — the date
              // then stands alone, which is what this column was before the name existed.
              //
              // `hasSuffix` even though that name is not guaranteed, unlike the periods
              // on its neighbours. The skeleton is read as a picture of the card, and a
              // column missing the grey line its two neighbours have looks like a column
              // that failed rather than one whose label is optional. When the read comes
              // back with no agent the line simply goes: the row keeps the height its
              // neighbours give it, so nothing around it moves.
              hasSuffix
              suffix={
                hours?.lastRunAgent
                  ? t('skillHours.byAgent', { name: hours.lastRunAgent })
                  : undefined
              }
            />
          )}
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
  hasSuffix = false,
}: {
  label: string
  value: string
  suffix?: string
  title?: string
  loading?: boolean
  /** Width of the placeholder, chosen per column to approximate its real value. */
  placeholderClass?: string
  /**
   * This figure comes with a period under it once it is known — so the line it will
   * take is held open while the read is in flight.
   *
   * It cannot be inferred from `suffix`, which is undefined during the load precisely
   * because its text is one of the things being read. Without it the card would settle
   * a line shorter and then grow as the numbers land, which is the shift the
   * placeholders exist to prevent.
   */
  hasSuffix?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      {/* Stacked, not on the baseline beside the figure. Set inline, the period reads as
          part of the measurement — "35h depuis lundi" is one phrase, and the eye has to
          finish it before it can compare the number to the one next door. Under it, the
          figure is the line and the period is its footnote, which is also what lets the
          columns be as narrow as their labels.

          Each part is `block` in a plain box rather than a flex row: the placeholder
          below carries its height in a class, and height on a bare inline span does
          nothing at all. */}
      <dd className="mt-1.5">
        {loading ? (
          // Exactly the height of the value it stands in for (text-3xl, leading-none),
          // so the row does not resize when the number replaces it.
          //
          // `motion-safe:` because a pulse is decoration: someone who asked their system
          // for less motion gets the same grey block, holding the same space, still.
          <span
            aria-hidden
            className={`block h-[30px] rounded-lg bg-black/[0.06] motion-safe:animate-pulse ${placeholderClass}`}
          />
        ) : (
          <span
            className="block font-display text-3xl font-black leading-none tracking-tight text-ink"
            title={title}
          >
            {value}
          </span>
        )}
        {loading
          ? hasSuffix && (
              // The height of the `text-xs` line it stands in for, at the width of a
              // short period ("depuis lundi") rather than of the longest one.
              <span
                aria-hidden
                className="mt-1.5 block h-4 w-24 rounded bg-black/[0.06] motion-safe:animate-pulse"
              />
            )
          : suffix && <span className="mt-1.5 block text-xs text-muted">{suffix}</span>}
      </dd>
    </div>
  )
}
