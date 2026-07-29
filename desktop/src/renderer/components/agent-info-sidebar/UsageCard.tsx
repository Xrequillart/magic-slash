import { useEffect, useState } from 'react'
import { Gauge, DollarSign, Cpu, Clock, RefreshCw, Minus, Plus } from 'lucide-react'
import type { TerminalUsage } from '../../../types'
import { formatTimestamp, contextColors } from './utils'
import { useT, useLocale, type Translate } from '../../i18n'
import { formatUsd } from '../../utils/usageStats'

interface UsageCardProps {
  usage: TerminalUsage
}

// The mantissa goes through toLocaleString and the unit through the catalogue:
// French writes "12,5 M", not "12.5M".
function formatTokens(n: number, locale: string, t: Translate): string {
  const scaled = (value: number, digits: number, unit: string) =>
    `${value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit}`
  if (n >= 1_000_000) return scaled(n / 1_000_000, 2, t('usage.unit.million'))
  if (n >= 1_000) return scaled(n / 1_000, 1, t('usage.unit.thousand'))
  return n.toLocaleString(locale)
}

function formatDuration(ms: number, t: Translate): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return t('duration.hoursMinutes', { hours: h, minutes: m })
  if (m > 0) return t('duration.minutesSeconds', { minutes: m, seconds: s })
  return t('relative.seconds', { count: s })
}

export function UsageCard({ usage }: UsageCardProps) {
  const t = useT()
  const locale = useLocale()
  const {
    costUsd,
    contextPercent,
    contextTokens,
    contextWindowSize,
    model,
    durationMs,
    updatedAt,
  } = usage

  // The gauge is always rendered, so it needs a reading for "no figure yet" that
  // is not 0%: an empty green bar labelled 0% would claim the context is untouched,
  // which is a measurement, not the absence of one. The bar sits empty and the
  // label falls back to an em dash until the usage feed reports a percentage.
  const hasContext = typeof contextPercent === 'number'
  const pct = Math.min(100, Math.max(0, contextPercent ?? 0))
  const colors = contextColors(pct)
  const pctLabel = hasContext ? `${Math.round(pct)}%` : '—'
  const pctColor = hasContext ? colors.text : 'text-text-secondary/50'

  const [minimized, setMinimized] = useState(false)

  // Re-render every 30s so the "updated X ago" label stays fresh.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const relative = typeof updatedAt === 'number' ? formatTimestamp(updatedAt, now, t) : null

  // Minimized: single-line — "Session" label, small progress bar, percent, expand button.
  if (minimized) {
    return (
      <div className="bg-surface rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-xs text-text-secondary/50 uppercase tracking-wider shrink-0">{t('agentInfo.sessionContext')}</span>
        {/* Capped at a third of the row so the bar doesn't span the whole card;
            ml-auto pushes it right, grouping it with the percent + expand button. */}
        <div className="h-1.5 flex-1 min-w-0 max-w-[33%] ml-auto rounded-full bg-surface-sunken overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-medium text-xs shrink-0 ${pctColor}`}>{pctLabel}</span>
        <button
          onClick={() => setMinimized(false)}
          title={t('usage.expand')}
          className="p-0.5 rounded text-text-secondary/50 hover:text-ink hover:bg-surface-strong transition-colors shrink-0"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="text-xs text-text-secondary/50 uppercase tracking-wider">{t('agentInfo.session')}</span>
          {relative && (
            <span className="flex items-center gap-1 text-[11px] text-text-secondary/50 normal-case tracking-normal">
              <RefreshCw className="w-3 h-3" />
              {relative === t('relative.now') ? t('relative.justNow') : t('relative.ago', { time: relative })}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {model && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple/15 text-purple text-[11px] font-medium">
              <Cpu className="w-3 h-3" />
              {model}
            </span>
          )}
          {/* self-stretch makes the button exactly as tall as the model pill next
              to it, whatever that pill's line-height works out to. With no model
              it keeps its natural height. */}
          <button
            onClick={() => setMinimized(true)}
            title={t('usage.minimize')}
            className="self-stretch px-1 flex items-center justify-center rounded-md text-text-secondary/50 hover:text-ink hover:bg-surface-strong transition-colors shrink-0"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Context usage — always present, empty until the feed reports a figure. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Gauge className="w-3.5 h-3.5" />
            {t('agentInfo.context')}
          </span>
          <span className={`font-medium ${pctColor}`}>{pctLabel}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {typeof contextTokens === 'number' && typeof contextWindowSize === 'number' && (
          <div className="text-[11px] text-text-secondary/70 tabular-nums">
            {t('agentInfo.tokensOf', { used: formatTokens(contextTokens, locale, t), total: formatTokens(contextWindowSize, locale, t) })}
          </div>
        )}
      </div>

      {/* Cost + duration. Gated as a pair: with the card now rendering before any
          usage arrives, an unguarded row would contribute its space-y-3 gap below
          the gauge with nothing in it. */}
      {(typeof costUsd === 'number' || typeof durationMs === 'number') && (
        <div className="flex items-center justify-between text-xs">
          {typeof costUsd === 'number' && (
            <span className="flex items-center gap-1.5 text-text-secondary">
              <DollarSign className="w-3.5 h-3.5" />
              {/* tabular-nums keeps the digits from shifting as the cost ticks up,
                  which is what the mono face used to buy us. */}
              <span className="tabular-nums font-medium text-ink">{formatUsd(costUsd, locale)}</span>
            </span>
          )}
          {typeof durationMs === 'number' && (
            <span className="flex items-center gap-1.5 text-text-secondary">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">{formatDuration(durationMs, t)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
