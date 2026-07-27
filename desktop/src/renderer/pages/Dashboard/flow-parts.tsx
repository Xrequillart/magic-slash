import { AlertTriangle, ExternalLink, GitMerge } from 'lucide-react'
import type { FlowStage, PipelineEntry, PipelineStageSummary, WeekBucket } from '../../utils/flowMetrics'
import { formatAge } from '../../utils/formatDuration'
import { useLocale, useT } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { OwnerLabel, RepoTag, TicketBadge } from './parts'

/**
 * Presentational pieces of the flow panel. Props-only — every derivation happens
 * in FlowSection, every number comes from flowMetrics.
 *
 * No chart library is used anywhere in this app, so the bars here are plain flex
 * boxes weighted by `flexGrow`. That is not a limitation to work around: a
 * proportional bar whose widest segment IS the bottleneck reads faster than any
 * axis-and-legend chart would at this size.
 */

export const STAGE_LABEL_KEYS: Record<FlowStage, MessageKey> = {
  coding: 'dashboard.flow.stage.coding',
  awaiting_review: 'dashboard.flow.stage.awaitingReview',
  changes_requested: 'dashboard.flow.stage.changesRequested',
  ready_to_merge: 'dashboard.flow.stage.readyToMerge',
}

const STAGE_BAR_CLASSES: Record<FlowStage, string> = {
  coding: 'bg-accent/60',
  awaiting_review: 'bg-yellow/60',
  changes_requested: 'bg-red/60',
  ready_to_merge: 'bg-green/60',
}

/** Counts per stage, plus a proportional bar that points at the bottleneck. */
export function PipelineStrip({ stages }: { stages: PipelineStageSummary[] }) {
  const t = useT()
  const total = stages.reduce((sum, s) => sum + s.count, 0)

  if (total === 0) {
    return <div className="text-xs text-text-secondary/50 py-1">{t('dashboard.flow.pipelineEmpty')}</div>
  }

  // The bottleneck is the fullest stage, but only when it actually dominates —
  // naming a "bottleneck" on a 2-vs-2 split would be noise dressed as insight.
  const busiest = [...stages].sort((a, b) => b.count - a.count)[0]
  const bottleneck = busiest.count > total / 2 ? busiest : null

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stages.map((s) => {
          const hasStall = s.stalledCount > 0
          return (
            <div
              key={s.stage}
              className={`rounded-xl p-4 flex flex-col gap-1.5 min-w-0 border ${
                hasStall ? 'bg-red/[0.04] border-red/[0.12]' : 'bg-surface border-line-field'
              }`}
            >
              <div className="text-xs text-text-secondary truncate">{t(STAGE_LABEL_KEYS[s.stage])}</div>
              <div className={`text-lg font-semibold ${hasStall ? 'text-red' : 'text-ink'}`}>{s.count}</div>
              <div className="text-xs text-text-secondary/60 truncate">
                {s.oldestAgeMs === null
                  ? ' '
                  : t('dashboard.flow.oldest', { age: formatAge(s.oldestAgeMs, t) })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex h-1.5 rounded-full overflow-hidden bg-line-subtle">
        {stages.map((s) => (
          <div key={s.stage} className={STAGE_BAR_CLASSES[s.stage]} style={{ flexGrow: s.count }} />
        ))}
      </div>

      {bottleneck && (
        <div className="text-xs text-text-secondary/60">
          {t('dashboard.flow.bottleneck', { stage: t(STAGE_LABEL_KEYS[bottleneck.stage]) })}
        </div>
      )}
    </div>
  )
}

const STALL_REASON_KEYS: Partial<Record<FlowStage, MessageKey>> = {
  coding: 'dashboard.flow.stalledCoding',
  ready_to_merge: 'dashboard.flow.stalledReadyToMerge',
}

/**
 * The only place a person is named, and only ever against something actionable.
 * The list is already scoped by `collectStalled` to stalls the other widgets do
 * not cover, so nothing appears twice on the page.
 */
export function StalledList({
  items,
  emailByOwner,
  max = 5,
}: {
  items: PipelineEntry[]
  emailByOwner: Map<string, string>
  max?: number
}) {
  const t = useT()

  if (items.length === 0) {
    return <div className="text-xs text-text-secondary/50 py-1">{t('dashboard.flow.stalledNone')}</div>
  }

  const shown = items.slice(0, max)
  const hidden = items.length - shown.length

  return (
    <div className="flex flex-col gap-2">
      {shown.map((item) => {
        const reasonKey = STALL_REASON_KEYS[item.stage]
        const prUrl = (item.agent.prReviews ?? []).find((r) => r.prUrl && !r.merged && !r.closed)?.prUrl
        return (
          <div
            key={item.agent.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red/[0.04] border border-red/[0.12] min-w-0"
          >
            <AlertTriangle className="w-4 h-4 text-red flex-shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-ink truncate">{item.agent.name}</span>
              <OwnerLabel agent={item.agent} emailByOwner={emailByOwner} />
            </div>
            <TicketBadge ticketId={item.agent.ticketId} />
            {item.agent.repositories.slice(0, 1).map((repo) => (
              <RepoTag key={repo} repo={repo} />
            ))}
            {reasonKey && (
              <span className="text-xs text-text-secondary/60 hidden sm:inline flex-shrink-0">{t(reasonKey)}</span>
            )}
            {item.ageMs !== null && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red/15 text-red flex-shrink-0 tabular-nums">
                {formatAge(item.ageMs, t)}
              </span>
            )}
            {prUrl && (
              <button
                onClick={() => window.electronAPI.shell.openExternal(prUrl)}
                title={t('dashboard.openPR')}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-colors flex-shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('dashboard.viewPR')}</span>
              </button>
            )}
          </div>
        )
      })}
      {hidden > 0 && (
        <div className="text-xs text-text-secondary/50">{t('dashboard.flow.stalledMore', { count: hidden })}</div>
      )}
    </div>
  )
}

/**
 * How the median lead time splits. Three segments, not four: rework is a count,
 * never a duration, so giving it a width would mean inventing data.
 */
export function StageTimeBar({ breakdown }: { breakdown: { coding: number; reviewWait: number; toMerge: number } }) {
  const t = useT()
  const segments = [
    { key: 'coding', ms: breakdown.coding, className: 'bg-accent/60', labelKey: 'dashboard.flow.stage.coding' as MessageKey },
    { key: 'reviewWait', ms: breakdown.reviewWait, className: 'bg-yellow/60', labelKey: 'dashboard.flow.segment.reviewWait' as MessageKey },
    { key: 'toMerge', ms: breakdown.toMerge, className: 'bg-green/60', labelKey: 'dashboard.flow.segment.toMerge' as MessageKey },
  ]

  return (
    <div className="bg-surface border border-line-field rounded-xl p-4 flex flex-col gap-3">
      <div className="text-xs text-text-secondary">{t('dashboard.flow.where')}</div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-line-subtle">
        {segments.map((s) => (
          <div key={s.key} className={s.className} style={{ flexGrow: s.ms }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.className}`} />
            <span className="text-text-secondary/60 truncate">{t(s.labelKey)}</span>
            <span className="text-ink/90 tabular-nums">{formatAge(s.ms, t)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Merged tickets per week. Counts, not estimates, so these bars stay honest at any
 * sample size — which is why they render from one event upward while the medians
 * stay silent below three.
 */
export function ThroughputBars({ buckets }: { buckets: WeekBucket[] }) {
  const t = useT()
  const locale = useLocale()
  const max = Math.max(...buckets.map((b) => b.count), 1)
  const monthDay = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' })

  return (
    <div className="bg-surface border border-line-field rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        <GitMerge className="w-3.5 h-3.5" />
        <span>{t('dashboard.flow.throughput')}</span>
      </div>

      <div className="flex items-end gap-1 h-16">
        {buckets.map((b) => (
          <div
            key={b.weekStartMs}
            className="flex-1 min-w-0 h-full flex items-end"
            title={
              b.trusted
                ? `${t('dashboard.flow.weekOf', { date: monthDay.format(b.weekStartMs) })} — ${t(
                    b.count === 1 ? 'dashboard.flow.weekCount.one' : 'dashboard.flow.weekCount.other',
                    { count: b.count },
                  )}`
                : `${t('dashboard.flow.weekOf', { date: monthDay.format(b.weekStartMs) })} — ${t('dashboard.flow.weekUnknown')}`
            }
          >
            {b.trusted ? (
              <div
                className="w-full rounded-t bg-accent/60"
                style={{ height: b.count === 0 ? '2px' : `${(b.count / max) * 100}%` }}
              />
            ) : (
              // Hatched, not zero: the read could not see this far back, and a flat
              // bar at the baseline would read as "we shipped nothing that week".
              <div
                className="w-full h-full rounded-t border border-line-subtle"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 5px)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-1 text-[10px] text-text-secondary/40">
        {buckets.map((b, i) => (
          <div key={b.weekStartMs} className="flex-1 min-w-0 truncate text-center">
            {i % 4 === 0 ? monthDay.format(b.weekStartMs) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
