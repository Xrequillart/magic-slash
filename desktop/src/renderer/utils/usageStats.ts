import { localeOf } from '../../i18n'
import { DEFAULT_LANGUAGE, type UsageStatRow } from '../../types'
import type { Translate } from '../i18n'

/**
 * Format a USD amount for display: `<$0.01` under a cent, rounded thousands, else
 * two decimals.
 *
 * The locale is a parameter rather than read from the language store because this
 * is a plain function, not a component — a hook is impossible here. Callers pass
 * `useLocale()`. It only affects the thousands grouping (a French reader expects
 * `$12 500`, not `$12,500`); the `$` stays, since the amount genuinely is USD.
 */
export function formatUsd(n: number, locale: string = localeOf(DEFAULT_LANGUAGE)): string {
  if (n > 0 && n < 0.01) return '<$0.01'
  if (n >= 1000) return `$${Math.round(n).toLocaleString(locale)}`
  return `$${n.toFixed(2)}`
}

export interface UsageTotals {
  costUsd: number
  linesAdded: number
  linesRemoved: number
  durationMs: number
  sessions: number
}

export interface MemberUsage {
  userId: string
  costUsd: number
  sessions: number
}

export interface ModelUsage {
  /**
   * `null` is the bucket for a row whose model could not be named — the same encoding
   * `UsageStatRow.model` already uses for it, rather than a second one invented here.
   *
   * Deliberately NOT a sentinel string like `'unknown'`: a model really could be called
   * that, and it would then be merged into the missing-model bucket and relabelled,
   * silently and with nothing to catch it. (`aggregateUsageByMember` gets away with `''`
   * for the same job only because no user id can ever be the empty string.) The view
   * translates the null; this layer never does.
   */
  model: string | null
  costUsd: number
  sessions: number
  linesAdded: number
  linesRemoved: number
  durationMs: number
}

/** Sum the headline totals across all usage rows. */
export function aggregateUsageTotals(rows: UsageStatRow[]): UsageTotals {
  const totals: UsageTotals = { costUsd: 0, linesAdded: 0, linesRemoved: 0, durationMs: 0, sessions: rows.length }
  for (const r of rows) {
    totals.costUsd += r.costUsd
    totals.linesAdded += r.linesAdded
    totals.linesRemoved += r.linesRemoved
    totals.durationMs += r.durationMs
  }
  return totals
}

/** Per-member cost + session counts, sorted by cost descending. Rows with no owner are grouped under ''. */
export function aggregateUsageByMember(rows: UsageStatRow[]): MemberUsage[] {
  const byUser = new Map<string, MemberUsage>()
  for (const r of rows) {
    const userId = r.userId ?? ''
    const entry = byUser.get(userId) ?? { userId, costUsd: 0, sessions: 0 }
    entry.costUsd += r.costUsd
    entry.sessions += 1
    byUser.set(userId, entry)
  }
  return [...byUser.values()].sort((a, b) => b.costUsd - a.costUsd)
}

/**
 * Per-model cost, sessions, lines and duration, sorted by cost descending.
 *
 * Rows with no model are BUCKETED under `null`, not dropped: sessions recorded before
 * the statusLine hook started reporting one carry a null model, and silently leaving
 * them out would make the per-model split add up to less than the totals beside it.
 * An empty or whitespace-only name lands in the same bucket — a model written as
 * `''` is no more identifiable than a missing one.
 */
export function aggregateUsageByModel(rows: UsageStatRow[]): ModelUsage[] {
  const byModel = new Map<string | null, ModelUsage>()
  for (const r of rows) {
    const model = r.model?.trim() || null
    const entry = byModel.get(model) ?? { model, costUsd: 0, sessions: 0, linesAdded: 0, linesRemoved: 0, durationMs: 0 }
    entry.costUsd += r.costUsd
    entry.sessions += 1
    entry.linesAdded += r.linesAdded
    entry.linesRemoved += r.linesRemoved
    entry.durationMs += r.durationMs
    byModel.set(model, entry)
  }
  return [...byModel.values()].sort((a, b) => b.costUsd - a.costUsd)
}

/**
 * "2h 5m", "5m 30s", "42s" — a duration for the Team page's usage block.
 *
 * The same three catalogue keys, and the same rounding, as `formatDuration` in
 * `components/agent-info-sidebar/UsageCard.tsx`: the two figures describe the same
 * measurement, one session at a time versus a team's worth, and a reader who saw them
 * disagree would be right to distrust both.
 *
 * THIS IS THE COPY THAT SHOULD SURVIVE. The card's is a private duplicate of this body,
 * kept alive only because it predates this function — and it already imports `formatUsd`
 * from this very module, so adopting this one adds no coupling it does not have. Deleting
 * it is the follow-up; until then the rounding rule is kept in step by hand, which is
 * exactly the thing a shared function exists to stop.
 *
 * `t` is a parameter for the same reason the locale is on `formatUsd`: this is a plain
 * function, so a hook is impossible here. Callers pass `useT()`.
 */
export function formatUsageDuration(ms: number, t: Translate): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return t('duration.hoursMinutes', { hours: h, minutes: m })
  if (m > 0) return t('duration.minutesSeconds', { minutes: m, seconds: s })
  return t('relative.seconds', { count: s })
}

/**
 * Session count per calendar day, keyed as YYYY-MM-DD in local time — the exact
 * key shape ActivityHeatmap expects, so the heatmap can render usage over time.
 */
export function computeUsageHeatmap(rows: UsageStatRow[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = new Date(r.occurredAt)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
}
