import { useEffect, useState } from 'react'
import { Gauge, DollarSign, Cpu, Clock, RefreshCw, Minus, Plus } from 'lucide-react'
import type { TerminalUsage } from '../../../types'
import { formatTimestamp } from './utils'
import { gaugeColors } from './LimitGauge'

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

export function UsageCard({ usage }: UsageCardProps) {
  const {
    costUsd,
    contextPercent,
    contextTokens,
    contextWindowSize,
    model,
    durationMs,
    updatedAt,
  } = usage

  const hasContext = typeof contextPercent === 'number'
  const pct = Math.min(100, Math.max(0, contextPercent ?? 0))
  const colors = gaugeColors(pct)

  const [minimized, setMinimized] = useState(false)

  // Re-render every 30s so the "updated X ago" label stays fresh.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const relative = typeof updatedAt === 'number' ? formatTimestamp(updatedAt, now) : null

  // Minimized: single-line — "Session" label, small progress bar, percent, expand button.
  if (minimized) {
    return (
      <div className="bg-white/[0.06] rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-xs text-text-secondary/50 uppercase tracking-wider shrink-0">Session</span>
        <div className="h-1.5 flex-1 min-w-0 rounded-full bg-white/[0.08] overflow-hidden">
          <div
            className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`font-mono font-medium text-xs shrink-0 ${colors.text}`}>{Math.round(pct)}%</span>
        <button
          onClick={() => setMinimized(false)}
          title="Expand"
          className="p-0.5 rounded text-text-secondary/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    )
  }

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
        <div className="flex items-center gap-1.5">
          {model && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple/15 text-purple text-[11px] font-medium">
              <Cpu className="w-3 h-3" />
              {model}
            </span>
          )}
          <button
            onClick={() => setMinimized(true)}
            title="Minimize"
            className="p-0.5 rounded text-text-secondary/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Context usage */}
      {hasContext && (
        <div className="space-y-1.5">
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
