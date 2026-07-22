import { Gauge, DollarSign, Cpu, Clock } from 'lucide-react'
import type { TerminalUsage } from '../../../types'

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

// Traffic-light color for context fill: green → yellow → red as it fills up.
function contextColors(pct: number): { bar: string; text: string } {
  if (pct >= 85) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 65) return { bar: 'bg-yellow', text: 'text-yellow' }
  return { bar: 'bg-green', text: 'text-green' }
}

export function UsageCard({ usage }: UsageCardProps) {
  const {
    costUsd,
    contextPercent,
    contextTokens,
    contextWindowSize,
    model,
    durationMs,
    linesAdded,
    linesRemoved,
  } = usage

  const hasContext = typeof contextPercent === 'number'
  const pct = Math.min(100, Math.max(0, contextPercent ?? 0))
  const colors = contextColors(pct)

  return (
    <div className="bg-white/[0.06] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary/50 uppercase tracking-wider">Session</span>
        {model && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple/15 text-purple text-[11px] font-medium">
            <Cpu className="w-3 h-3" />
            {model}
          </span>
        )}
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

      {/* Cost + duration + lines */}
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

      {(typeof linesAdded === 'number' || typeof linesRemoved === 'number') && (
        (linesAdded ?? 0) + (linesRemoved ?? 0) > 0 && (
          <div className="flex items-center gap-2 text-[11px] font-mono">
            {typeof linesAdded === 'number' && linesAdded > 0 && (
              <span className="text-green">+{linesAdded}</span>
            )}
            {typeof linesRemoved === 'number' && linesRemoved > 0 && (
              <span className="text-red">-{linesRemoved}</span>
            )}
            <span className="text-text-secondary/50">lines</span>
          </div>
        )
      )}
    </div>
  )
}
