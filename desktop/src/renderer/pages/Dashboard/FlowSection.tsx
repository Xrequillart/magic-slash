import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, Clock, GitMerge, RefreshCw, Timer } from 'lucide-react'
import { useOrgActivity } from '../../hooks/useOrgActivity'
import { useOrgAgents } from '../../hooks/useOrgAgents'
import { useOrgUsageStats } from '../../hooks/useOrgUsageStats'
import { useOrg } from '../../hooks/useOrg'
import { aggregateUsageTotals, formatUsd } from '../../utils/usageStats'
import { formatAge } from '../../utils/formatDuration'
import {
  buildPipeline,
  buildTicketFlows,
  collectStageDurations,
  collectStalled,
  computeThroughputByWeek,
  groupEventsByFlowKey,
  stageTimeBreakdown,
  summarizeSamples,
  type MetricSummary,
} from '../../utils/flowMetrics'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'
import { StatTile, type StatTone } from './parts'
import { PipelineStrip, StageTimeBar, StalledList, ThroughputBars } from './flow-parts'

const DAY_MS = 24 * 60 * 60 * 1000
const THROUGHPUT_WEEKS = 13
/** Ages are shown in days and hours, so a minute-scale refresh is plenty. */
const NOW_TICK_MS = 60_000
const MIN_CYCLES_FOR_MEDIAN = 3

const WINDOWS = [
  { days: 7, labelKey: 'dashboard.flow.window7' as MessageKey },
  { days: 30, labelKey: 'dashboard.flow.window30' as MessageKey },
  { days: 90, labelKey: 'dashboard.flow.window90' as MessageKey },
]

/**
 * Render a metric summary as a StatTile.
 *
 * The confidence ladder is enforced here, once, so no caller can accidentally
 * print a median of two samples as a headline: `raw` shows the actual values,
 * `weak` shows the median with its sample size and nothing else, `ok` earns a
 * spread and a trend.
 */
function MetricTile({
  icon,
  labelKey,
  summary,
  t,
}: {
  icon: typeof Clock
  labelKey: MessageKey
  summary: MetricSummary
  t: Translate
}) {
  const label = t(labelKey)

  if (summary.confidence === 'none') {
    return <StatTile icon={icon} label={label} value="—" sub={t('dashboard.flow.noSample')} />
  }

  if (summary.confidence === 'raw') {
    return (
      <StatTile
        icon={icon}
        label={label}
        value={summary.raw.map((ms) => formatAge(ms, t)).join(' · ')}
        sub={t('dashboard.flow.sampleRaw', { count: summary.n })}
      />
    )
  }

  const parts = [t('dashboard.flow.sample', { count: summary.n })]
  if (summary.p25Ms !== null && summary.p75Ms !== null) {
    parts.push(`${formatAge(summary.p25Ms, t)}–${formatAge(summary.p75Ms, t)}`)
  }
  if (summary.deltaRatio !== null && Math.abs(summary.deltaRatio) >= 0.05) {
    const pct = Math.round(Math.abs(summary.deltaRatio) * 100)
    parts.push(summary.deltaRatio > 0 ? `▲ ${pct}%` : `▼ ${pct}%`)
  }

  return (
    <StatTile
      icon={icon}
      label={label}
      value={summary.medianMs === null ? '—' : formatAge(summary.medianMs, t)}
      sub={parts.join(' · ')}
    />
  )
}

/**
 * The Team page's flow panel: "where is it stuck right now?".
 *
 * Composition order is a deliberate claim about what matters. The live board comes
 * first because it is exact with a single ticket and needs no history at all; the
 * medians come after because a small team produces a handful of cycles a month, so
 * they are context rather than headline. On a solo repo the board is the entire
 * value of this page.
 */
export function FlowSection() {
  const { events, capped, since, loading } = useOrgActivity()
  const { agents } = useOrgAgents()
  const { members } = useOrg()
  const { rows: usageRows, capped: usageCapped } = useOrgUsageStats()
  const t = useT()
  const locale = useLocale()

  const [windowDays, setWindowDays] = useState(30)

  // Ages are relative to "now", so without this they would freeze at mount for as
  // long as the Team modal stays open.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), NOW_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const emailByOwner = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      if (m.email) map.set(m.userId, m.email)
    }
    return map
  }, [members])

  const grouped = useMemo(() => groupEventsByFlowKey(events), [events])
  const { flows } = useMemo(() => buildTicketFlows(events), [events])

  const windowStart = now - windowDays * DAY_MS
  const samples = useMemo(
    () => collectStageDurations(flows, windowStart, now),
    [flows, windowStart, now],
  )
  // Same length, immediately before — the only fair comparison for a trend.
  const previous = useMemo(
    () => collectStageDurations(flows, windowStart - windowDays * DAY_MS, windowStart),
    [flows, windowStart, windowDays],
  )

  const reviewWait = useMemo(() => summarizeSamples(samples.reviewWait, previous.reviewWait), [samples, previous])
  const coding = useMemo(() => summarizeSamples(samples.coding, previous.coding), [samples, previous])
  const prToMerge = useMemo(() => summarizeSamples(samples.prToMerge, previous.prToMerge), [samples, previous])
  const breakdown = useMemo(() => stageTimeBreakdown(samples), [samples])

  const pipeline = useMemo(() => buildPipeline(agents, grouped.byKey, now), [agents, grouped, now])

  // Agents the sibling widgets already render, so the stalled list never repeats them.
  const excludeAgentIds = useMemo(() => {
    const ids = new Set<string>()
    for (const a of agents) {
      if (a.status === 'changes requested') ids.add(a.id)
      for (const r of a.prReviews ?? []) {
        if (r.merged || r.closed) continue
        if (r.status && r.status !== 'approved') ids.add(a.id)
      }
    }
    return ids
  }, [agents])

  const stalled = useMemo(
    () => collectStalled(pipeline.entries, excludeAgentIds, grouped.byKey),
    [pipeline, excludeAgentIds, grouped],
  )

  const throughput = useMemo(
    () => computeThroughputByWeek(flows, now, THROUGHPUT_WEEKS, Date.parse(since) || 0),
    [flows, now, since],
  )

  const usageTotals = useMemo(() => aggregateUsageTotals(usageRows), [usageRows])

  const header = (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Activity className="w-4 h-4" />
        <span>{t('dashboard.flow.section')}</span>
      </div>
      <div className="flex items-center gap-1">
        {WINDOWS.map((w) => (
          <button
            key={w.days}
            onClick={() => setWindowDays(w.days)}
            className={`h-7 px-2 text-[11px] font-medium rounded-lg border transition-all ${
              windowDays === w.days
                ? 'bg-accent/15 border-accent/30 text-accent'
                : 'bg-surface border-line text-text-secondary hover:bg-surface-strong hover:text-ink'
            }`}
          >
            {t(w.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )

  if (loading && events.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <div className="py-10 flex items-center justify-center text-text-secondary text-sm">{t('common.loading')}</div>
      </div>
    )
  }

  // Empty state 1 — nothing recorded at all. The action is "run the skills".
  if (events.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {header}
        <div className="py-10 flex flex-col items-center justify-center text-text-secondary text-sm gap-2 bg-surface-subtle border border-line-subtle rounded-xl">
          <Activity className="w-8 h-8 opacity-30" />
          <p>{t('dashboard.flow.empty')}</p>
          <p className="text-xs text-text-secondary/60 max-w-sm text-center">{t('dashboard.flow.emptyHint')}</p>
        </div>
      </div>
    )
  }

  // Empty state 2 — events exist but none carry a ticket id, so nothing can be
  // correlated across an agent's lifetime. Without naming this case explicitly it
  // looks like a bug rather than a missing habit.
  const hasTicketedFlow = flows.some((f) => !f.key.startsWith('agent:'))
  const cyclesMeasured = samples.coding.length + samples.reviewWait.length + samples.prToMerge.length

  return (
    <div className="flex flex-col gap-4">
      {header}

      {/* The live board — exact, and useful with a single ticket. */}
      <PipelineStrip stages={pipeline.stages} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <AlertTriangle className="w-4 h-4" />
          <span>{t('dashboard.flow.stalled')}</span>
          {stalled.length > 0 && <span className="text-xs text-text-secondary/50">{stalled.length}</span>}
        </div>
        <StalledList items={stalled} emailByOwner={emailByOwner} />
      </div>

      {!hasTicketedFlow ? (
        <div className="text-xs text-text-secondary/60 bg-surface-subtle border border-line-subtle rounded-xl px-3 py-2">
          <p className="text-text-secondary">{t('dashboard.flow.noTickets')}</p>
          <p className="mt-0.5">{t('dashboard.flow.noTicketsHint')}</p>
        </div>
      ) : cyclesMeasured === 0 ? (
        // Empty state 3 — correlated events but no measurable cycle yet. The live
        // board above still renders: it must never be hidden behind this.
        <div className="text-xs text-text-secondary/60 bg-surface-subtle border border-line-subtle rounded-xl px-3 py-2">
          {t('dashboard.flow.notEnough', { need: MIN_CYCLES_FOR_MEDIAN })}
        </div>
      ) : (
        <>
          {breakdown && <StageTimeBar breakdown={breakdown} />}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricTile icon={Timer} labelKey="dashboard.flow.metric.reviewWait" summary={reviewWait} t={t} />
            <MetricTile icon={Clock} labelKey="dashboard.flow.metric.coding" summary={coding} t={t} />
            <MetricTile icon={GitMerge} labelKey="dashboard.flow.metric.prToMerge" summary={prToMerge} t={t} />
            <ReworkTile samples={samples} t={t} />
          </div>

          <ThroughputBars buckets={throughput} />
        </>
      )}

      {/* Footnotes: what the numbers could not see, then the one cost line. */}
      <div className="flex flex-col gap-1.5">
        {capped && (
          <div className="text-xs text-yellow/80 bg-yellow/10 border border-yellow/20 rounded-lg px-3 py-2">
            {t('dashboard.flow.capped')}
          </div>
        )}
        {samples.inFlight > 0 && (
          <div className="text-xs text-text-secondary/50">
            {t('dashboard.flow.inFlight', { count: samples.inFlight })}
          </div>
        )}
        {grouped.unattributed > 0 && (
          <div className="text-xs text-text-secondary/50">
            {t('dashboard.flow.unattributed', { count: grouped.unattributed })}
          </div>
        )}
        {usageRows.length > 0 && (
          <div className="text-xs text-text-secondary/50">
            {t('dashboard.flow.usage', {
              cost: formatUsd(usageTotals.costUsd, locale),
              count: usageTotals.sessions.toLocaleString(locale),
            })}
            {usageCapped && ` · ${t('dashboard.capped')}`}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Rework is a ratio, not a duration, and it is rendered as "2 of 7" rather than a
 * percentage: at seven samples a percentage claims a precision the data does not
 * have.
 */
function ReworkTile({ samples, t }: { samples: ReturnType<typeof collectStageDurations>; t: Translate }) {
  const label = t('dashboard.flow.metric.rework')
  if (samples.cyclesWithPr === 0) {
    return <StatTile icon={RefreshCw} label={label} value="—" sub={t('dashboard.flow.noSample')} />
  }
  const ratio = samples.cyclesWithRework / samples.cyclesWithPr
  const tone: StatTone = ratio >= 0.5 ? 'bad' : ratio >= 0.25 ? 'warn' : 'default'
  return (
    <StatTile
      icon={RefreshCw}
      label={label}
      value={t('dashboard.flow.reworkRatio', { count: samples.cyclesWithRework, total: samples.cyclesWithPr })}
      sub={t('dashboard.flow.reworkHint')}
      tone={tone}
    />
  )
}
