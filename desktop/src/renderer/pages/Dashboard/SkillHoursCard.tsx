import { Timer } from 'lucide-react'
import type { SkillHours } from '../../../types'
import { useT, useLocale } from '../../i18n'
import { formatLastUsed, formatSkillSince, formatSkillTime } from '../../utils/skillHours'

/**
 * The three figures themselves: total, this week, last used. Pure presentation — it is
 * handed hours and draws them, and every decision about WHETHER there is anything worth
 * drawing belongs to `SkillHoursBanner`, which owns the read.
 *
 * The same card as the webapp's `components/SkillHoursCard.tsx`, at desktop scale and on
 * theme tokens: the figure drops from `text-3xl` to `text-2xl` because this sits in a
 * panel and not on a page, and the loading blocks are `bg-surface-strong` rather than the
 * webapp's `bg-black/[0.06]`, which would be invisible on a dark window.
 *
 * THE DURATIONS ARE A FLOOR. Only a run that reported finishing carries a duration, so an
 * interrupted one adds nothing, and `close_skill_run` will not attach an end more than
 * four hours out. The total is therefore always less than the time really spent, which is
 * why the period is dated from the first MEASURED run and why the caveat is on the card.
 *
 * LAST USED plays by a different rule on purpose: it counts a run that never closed, so it
 * can be more recent than the period the hours cover. Anything else would tell someone who
 * launched a skill an hour ago and interrupted it that they last used the app days ago —
 * the one fact on the card they can check themselves.
 */
export function SkillHoursCard({ hours }: { hours: SkillHours | null }) {
  const t = useT()
  const locale = useLocale()
  const loading = hours === null

  return (
    <div className="rounded-xl bg-surface-subtle border border-line-field p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Timer className="w-4 h-4" />
        </span>

        {/* `aria-busy` while the read is in flight, because the placeholders below are
            decoration a screen reader is not shown — without it the labels would be read
            out with nothing after them and no indication that anything is coming. */}
        <dl aria-busy={loading} className="grid min-w-0 flex-1 gap-x-6 gap-y-4 sm:grid-cols-3">
          <Stat
            label={t('skillHours.label.total')}
            loading={loading}
            // Roughly the width of "453h" plus its suffix, so the block stands in for what
            // is coming rather than for a number of some other size.
            placeholderClass="w-28"
            hasSuffix
            value={hours ? formatSkillTime(hours.totalSeconds, t) : ''}
            // The caveat lives on the total, which is the number it qualifies.
            title={hours ? t('skillHours.hint') : undefined}
            // No period to name until something has been measured, and "since —" is worse
            // than nothing under a figure that already reads as zero.
            suffix={
              hours?.firstMeasuredAt
                ? t('skillHours.since', { date: formatSkillSince(hours.firstMeasuredAt, locale) })
                : undefined
            }
          />
          {/* Monday to Sunday in the machine's own timezone, not a rolling seven days —
              the boundary is computed in the RPC from the zone the main process reports.
              The suffix says which of the two it is, because the difference is invisible
              in the number and a Monday morning is meant to read as a fresh week. */}
          <Stat
            label={t('skillHours.label.week')}
            loading={loading}
            placeholderClass="w-24"
            hasSuffix
            value={hours ? formatSkillTime(hours.weekSeconds, t) : ''}
            suffix={hours ? t('skillHours.sinceMonday') : undefined}
          />
          <Stat
            label={t('skillHours.label.last')}
            loading={loading}
            placeholderClass="w-24"
            // An em dash here is NOT a loading state: it is the label for a date that does
            // not exist, and `formatLastUsed` is where that decision is made.
            value={hours ? formatLastUsed(hours.lastRunAt, locale) : ''}
            // What that date was spent on. Absent for a run with no agent, or one whose
            // agent has been deleted — the date then stands alone.
            //
            // `hasSuffix` even though that name is not guaranteed, unlike the periods on
            // its neighbours: the skeleton is read as a picture of the card, and a column
            // missing the grey line its two neighbours have looks like a column that
            // failed rather than one whose label is optional.
            hasSuffix
            suffix={hours?.lastRunAgent ? t('skillHours.byAgent', { name: hours.lastRunAgent }) : undefined}
          />
        </dl>
      </div>
    </div>
  )
}

/**
 * One figure: what it is above, how much below. Label first in the markup as well as on
 * screen, so a `dl` reads in pairs.
 *
 * The LABELS are never a placeholder — they are static copy and known before the read
 * starts, so only the values wait. That is what makes the card settle in place instead of
 * assembling itself: nothing moves when the numbers land except the numbers.
 */
function Stat({
  label,
  value,
  suffix,
  title,
  loading = false,
  placeholderClass = 'w-24',
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
   * This figure comes with a period under it once it is known — so the line it will take
   * is held open while the read is in flight.
   *
   * It cannot be inferred from `suffix`, which is undefined during the load precisely
   * because its text is one of the things being read. Without it the card would settle a
   * line shorter and then grow as the numbers land, which is the shift the placeholders
   * exist to prevent.
   */
  hasSuffix?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-text-secondary">{label}</dt>
      {/* Stacked, not on the baseline beside the figure. Set inline, the period reads as
          part of the measurement — "35h since Monday" is one phrase, and the eye has to
          finish it before it can compare the number to the one next door. Under it, the
          figure is the line and the period is its footnote, which is also what lets the
          columns be as narrow as their labels. */}
      <dd className="mt-1">
        {loading ? (
          // Exactly the height of the value it stands in for (text-2xl, leading-none), so
          // the row does not resize when the number replaces it.
          <span aria-hidden className={`block h-6 rounded-md bg-surface-strong animate-pulse ${placeholderClass}`} />
        ) : (
          <span className="block text-2xl font-semibold leading-none tracking-tight text-ink" title={title}>
            {value}
          </span>
        )}
        {loading
          ? hasSuffix && (
              // The height of the `text-[11px]` line it stands in for, at the width of a
              // short period ("since Monday") rather than of the longest one.
              <span aria-hidden className="mt-1.5 block h-3 w-20 rounded bg-surface-strong animate-pulse" />
            )
          : suffix && <span className="mt-1.5 block text-[11px] text-text-secondary/60">{suffix}</span>}
      </dd>
    </div>
  )
}
