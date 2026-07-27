import type { Translate } from '../i18n'

/**
 * Format an elapsed duration for the Team page, coarsening as it grows: minutes
 * under an hour, hours under a day, then days. Ages there are routinely measured
 * in days ("this PR has been waiting 3d"), which the existing hour-capped
 * formatters cannot express.
 */
export function formatAge(ms: number, t: Translate): string {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 1) return t('duration.lessThanMinute')
  if (totalMin < 60) return t('duration.minutesShort', { count: totalMin })

  const totalHours = Math.floor(totalMin / 60)
  if (totalHours < 24) {
    const m = totalMin % 60
    return m === 0 ? t('duration.hours', { count: totalHours }) : t('duration.hoursMinutes', { hours: totalHours, minutes: m })
  }

  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return hours === 0 ? t('duration.days', { count: days }) : t('duration.daysHours', { days, hours })
}
