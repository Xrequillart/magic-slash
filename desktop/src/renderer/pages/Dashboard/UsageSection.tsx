import { Fragment, useEffect, useMemo, useState } from 'react'
import { Coins } from 'lucide-react'
import type { UsageStats } from '../../../types'
import { useOrg } from '../../hooks/useOrg'
import { useT, useLocale } from '../../i18n'
import {
  aggregateUsageByMember,
  aggregateUsageByModel,
  aggregateUsageTotals,
  formatUsageDuration,
  formatUsd,
} from '../../utils/usageStats'

/**
 * What the organization's work COST, beside what it is doing.
 *
 * SCOPED TO THE ACTIVE ORGANIZATION, and it says so in its own heading: the read
 * filters on `org_id`, so these are not the viewer's totals and not every org's — a
 * figure this size with no name on it would be read as whichever of the three the
 * reader expected. It deliberately does not follow the tab strip below, which is a
 * view over the agents roster and has no say in which org the usage read answers about.
 *
 * THE TOTALS ARE A FLOOR whenever the read hits its row cap. A partial sum drawn as a
 * whole number is a lie, so the cap is printed under the figures rather than left to the
 * reader to suspect.
 */
export function UsageSection() {
  const t = useT()
  const locale = useLocale()
  const { org, members } = useOrg()

  // undefined = the read is in flight, null = it failed, a value = it landed. The
  // three states draw differently on purpose: zeros held up while a read is running
  // are a measurement the app does not have yet.
  const [stats, setStats] = useState<UsageStats | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    window.electronAPI.org
      .getUsageStats()
      .then((next) => {
        if (!cancelled) setStats(next)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // user_id → email, so a member row reads as a person rather than as a uuid.
  // The same map `RepoSection` builds for the agent rows; it belongs on `useOrg`
  // alongside the roster it derives from, which is the follow-up that would delete
  // both copies.
  const emailByMember = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.email) map.set(m.userId, m.email)
    }
    return map
  }, [members])

  // One memo for all four, keyed on the single read that feeds them: `rows` only ever
  // changes when `stats` does, so splitting them apart would buy nothing but four
  // dependency arrays.
  const { rows, totals, byMember, byModel } = useMemo(() => {
    const rows = stats?.rows ?? []
    return {
      rows,
      totals: aggregateUsageTotals(rows),
      byMember: aggregateUsageByMember(rows),
      byModel: aggregateUsageByModel(rows),
    }
  }, [stats])

  const loading = stats === undefined

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Coins className="w-4 h-4" />
        <span>{t('dashboard.usage.section')}</span>
        {/* The organization's own name, never translated and never a placeholder in a
            sentence: it is what stops these totals reading as global ones. */}
        {org && <span className="text-xs text-text-secondary/50 truncate">· {org.name}</span>}
      </div>

      {stats === null ? (
        <p className="text-sm text-text-secondary/60">{t('dashboard.usage.failed')}</p>
      ) : (
        <>
          <div className="rounded-xl bg-surface-subtle border border-line-field p-4">
            {/* `aria-busy` while the read is in flight: the placeholders are decoration a
                screen reader is not shown, so without it the labels would be announced
                with nothing after them and no sign anything is coming. */}
            <dl aria-busy={loading} className="grid gap-x-6 gap-y-4 sm:grid-cols-4">
              <Stat label={t('dashboard.usage.cost')} loading={loading} placeholderClass="w-24" value={formatUsd(totals.costUsd, locale)} />
              <Stat label={t('dashboard.usage.sessions')} loading={loading} placeholderClass="w-16" value={totals.sessions.toLocaleString(locale)} />
              {/* Added and removed side by side rather than netted: a refactor that
                  deletes as much as it writes is not the same work as one that writes
                  nothing, and a single net figure cannot tell them apart. */}
              <Stat
                label={t('dashboard.usage.lines')}
                loading={loading}
                placeholderClass="w-28"
                value={`+${totals.linesAdded.toLocaleString(locale)} / −${totals.linesRemoved.toLocaleString(locale)}`}
              />
              <Stat label={t('dashboard.usage.duration')} loading={loading} placeholderClass="w-20" value={formatUsageDuration(totals.durationMs, t)} />
            </dl>
          </div>

          {/* Nothing below the figures until the read lands — the two splits and the
              "nothing here" panel are both statements about rows that have arrived. */}
          {!loading &&
            (rows.length === 0 ? (
              <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
                <Coins className="w-8 h-8 opacity-30" />
                {/* Neutral on purpose. With no active organization the read resolves to no
                    rows too, which is indistinguishable here from an organization that has
                    genuinely recorded nothing — so this must not claim the team did no work. */}
                <p>{t('dashboard.usage.empty')}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Split
                  title={t('dashboard.usage.byMember')}
                  rows={byMember.map((m) => ({
                    key: m.userId,
                    // An empty key is a row whose owner the event never carried.
                    label: m.userId ? emailByMember.get(m.userId) ?? m.userId : t('dashboard.unassigned'),
                    sessions: m.sessions,
                    costUsd: m.costUsd,
                  }))}
                />
                <Split
                  title={t('dashboard.usage.byModel')}
                  rows={byModel.map((m) => ({
                    // `''` for the missing-model bucket: no model survives the trim as an
                    // empty string, so this cannot collide with a real name — including one
                    // that happens to be "unknown".
                    key: m.model ?? '',
                    // The absent bucket is translated; a real model name never is.
                    label: m.model ?? t('dashboard.usage.unknownModel'),
                    sessions: m.sessions,
                    costUsd: m.costUsd,
                  }))}
                />
              </div>
            ))}

          {/* The count IS the cap: the read only reports itself capped when it came back
              full, so this names the real limit instead of repeating it in the copy,
              where raising the limit would leave the sentence lying. */}
          {stats?.capped && (
            <p className="text-xs text-text-secondary/50">
              {t('dashboard.usage.capped', { count: rows.length.toLocaleString(locale) })}
            </p>
          )}
        </>
      )}
    </div>
  )
}

/**
 * One of the two breakdowns. Same three columns in both so they can be read as a pair:
 * who or what on the left, how many sessions, how much they cost.
 *
 * Reads its own copy and locale rather than being handed them — both call sites would
 * otherwise pass the same two labels, and every other row component on this page
 * (`AgentRow`, `RepoCard`, `OwnerLabel`) already calls `useT()` for itself.
 */
function Split({
  title,
  rows,
}: {
  title: string
  rows: { key: string; label: string; sessions: number; costUsd: number }[]
}) {
  const t = useT()
  const locale = useLocale()

  return (
    <div className="rounded-xl bg-surface-subtle border border-line-field p-4">
      <p className="text-[11px] uppercase tracking-wider text-text-secondary/50 mb-3">{title}</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm items-baseline">
        {/* The label column's header is deliberately blank — the block's own title above
            already names it — so the two figure headers start at column 2 rather than
            an empty span standing in for one. */}
        <span className="col-start-2 text-text-secondary/50 text-xs uppercase tracking-wider text-right">
          {t('dashboard.usage.sessions')}
        </span>
        <span className="text-text-secondary/50 text-xs uppercase tracking-wider text-right">
          {t('dashboard.usage.cost')}
        </span>

        {rows.map((row) => (
          <Fragment key={row.key}>
            <span className="text-text-secondary truncate" title={row.label}>{row.label}</span>
            <span className="font-mono text-right">{row.sessions.toLocaleString(locale)}</span>
            <span className="font-mono text-right text-ink">{formatUsd(row.costUsd, locale)}</span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/**
 * One headline figure: what it is above, how much below.
 *
 * The LABEL is never a placeholder — it is static copy, known before the read starts —
 * so only the value waits. That is what makes the row settle in place instead of
 * assembling itself.
 *
 * The same markup as `SkillHoursCard`'s own `Stat`, whose extra `suffix`/`title` props
 * are already optional; the pair belongs in `parts.tsx` next to the other shared Team
 * vocabulary, which is the follow-up that would leave one copy of this geometry.
 */
function Stat({
  label,
  value,
  loading,
  placeholderClass,
}: {
  label: string
  value: string
  loading: boolean
  /** Width of the placeholder, chosen per column to approximate its real value. */
  placeholderClass: string
}) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-text-secondary">{label}</dt>
      <dd className="mt-1">
        {loading ? (
          // Exactly the height of the value it stands in for, so nothing resizes when
          // the number replaces it.
          <span aria-hidden className={`block h-6 rounded-md bg-surface-strong animate-pulse ${placeholderClass}`} />
        ) : (
          <span className="block text-2xl font-semibold leading-none tracking-tight text-ink">{value}</span>
        )}
      </dd>
    </div>
  )
}
