import { useEffect, useState } from 'react'
import { Gauge, DollarSign, Cpu, Clock, RefreshCw } from 'lucide-react'
import type { TerminalUsage } from '../../../types'
import { formatTimestamp } from './utils'

interface UsageCardProps {
  usage: TerminalUsage
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}

function formatCost(usd: number): string {
  // Show more precision for tiny amounts so it doesn't read as "$0.00"
  if (usd > 0 && usd < 0.01) return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(2)}`
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Traffic-light color for a fill gauge: green → yellow → red as it fills up.
function gaugeColors(pct: number): { bar: string; text: string } {
  if (pct >= 85) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 65) return { bar: 'bg-yellow', text: 'text-yellow' }
  return { bar: 'bg-green', text: 'text-green' }
}

// Compact "time until reset" from a unix-epoch-seconds timestamp: 45m, 2h14, 3d, soon.
function formatReset(resetsAtSec: number, nowMs: number): string {
  const diffSec = Math.floor((resetsAtSec * 1000 - nowMs) / 1000)
  if (diffSec <= 0) return 'soon'
  const days = Math.floor(diffSec / 86_400)
  if (days >= 1) return `${days}d`
  const hours = Math.floor(diffSec / 3_600)
  const minutes = Math.floor((diffSec % 3_600) / 60)
  if (hours >= 1) return `${hours}h${String(minutes).padStart(2, '0')}`
  return `${Math.max(1, minutes)}m`
}

// Semicircle "speedometer" gauge for a plan rate limit (5h / 7d).
// The arc fills left→right over the top; the percentage sits in the belly and the
// reset countdown sits underneath.
function LimitGauge({ label, percent, resetsAt, now }: {
  label: string
  percent: number
  resetsAt?: number
  now: number
}) {
  const pct = Math.min(100, Math.max(0, percent))
  const colors = gaugeColors(pct)

  // Geometry: centre bottom, radius r, semicircle from (cx-r, cy) to (cx+r, cy).
  const r = 26
  const cx = 34
  const cy = 32
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: 68, height: 40 }}>
        <svg viewBox="0 0 68 40" className="w-full h-full overflow-visible">
          {/* Track */}
          <path
            d={arc}
            fill="none"
            className="stroke-white/[0.08]"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={100}
          />
          {/* Value */}
          <path
            d={arc}
            fill="none"
            className={`${colors.text} transition-all duration-500`}
            stroke="currentColor"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} 100`}
          />
        </svg>
        {/* Percentage in the belly */}
        <span
          className={`absolute inset-x-0 bottom-0 text-center font-mono font-semibold text-sm ${colors.text}`}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <span className="text-[11px] text-text-secondary/70">{label}</span>
      {typeof resetsAt === 'number' && (
        <span className="text-[10px] text-text-secondary/50">resets in {formatReset(resetsAt, now)}</span>
      )}
    </div>
  )
}

export function UsageCard({ usage }: UsageCardProps) {
  const {
    costUsd,
    contextPercent,
    contextTokens,
    contextWindowSize,
    model,
    durationMs,
    fiveHourPercent,
    fiveHourResetsAt,
    sevenDayPercent,
    sevenDayResetsAt,
    updatedAt,
  } = usage

  const hasContext = typeof contextPercent === 'number'
  const pct = Math.min(100, Math.max(0, contextPercent ?? 0))
  const colors = gaugeColors(pct)
  const hasLimits = typeof fiveHourPercent === 'number' || typeof sevenDayPercent === 'number'

  // Re-render every 30s so the "updated X ago" label stays fresh.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const relative = typeof updatedAt === 'number' ? formatTimestamp(updatedAt, now) : null

  return (
    <div className="bg-white/[0.06] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="text-xs text-text-secondary/50 uppercase tracking-wider">Session</span>
          {relative && (
            <span className="flex items-center gap-1 text-[11px] text-text-secondary/50 normal-case tracking-normal">
              <RefreshCw className="w-3 h-3" />
              {relative === 'now' ? 'just now' : `${relative} ago`}
            </span>
          )}
        </span>
        {model && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple/15 text-purple text-[11px] font-medium">
            <Cpu className="w-3 h-3" />
            {model}
          </span>
        )}
      </div>

      {/* Context usage (left) + plan rate limits (right) on one line */}
      {(hasContext || hasLimits) && (
        <div className="flex items-center gap-4">
          {hasContext && (
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <Gauge className="w-3.5 h-3.5" />
                  Context
                </span>
                <span className={`font-mono font-medium ${colors.text}`}>{Math.round(pct)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {typeof contextTokens === 'number' && typeof contextWindowSize === 'number' && (
                <div className="text-[11px] text-text-secondary/70 font-mono">
                  {formatTokens(contextTokens)} / {formatTokens(contextWindowSize)} tokens
                </div>
              )}
            </div>
          )}

          {/* Plan rate limits (Claude.ai Pro/Max only) */}
          {hasLimits && (
            <div className="flex items-start gap-2 shrink-0">
              {typeof fiveHourPercent === 'number' && (
                <LimitGauge label="Session (5h)" percent={fiveHourPercent} resetsAt={fiveHourResetsAt} now={now} />
              )}
              {typeof sevenDayPercent === 'number' && (
                <LimitGauge label="Weekly (7d)" percent={sevenDayPercent} resetsAt={sevenDayResetsAt} now={now} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Cost + duration */}
      <div className="flex items-center justify-between text-xs">
        {typeof costUsd === 'number' && (
          <span className="flex items-center gap-1.5 text-text-secondary">
            <DollarSign className="w-3.5 h-3.5" />
            <span className="font-mono font-medium text-white">{formatCost(costUsd)}</span>
          </span>
        )}
        {typeof durationMs === 'number' && (
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{formatDuration(durationMs)}</span>
          </span>
        )}
      </div>
    </div>
  )
}
