import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus, User } from 'lucide-react'
import { useStore } from '../store'
import { gaugeColors, formatReset } from './agent-info-sidebar/LimitGauge'
import type { ClaudeAccount } from '../../types'

// Small colored "session 5h 89%" pill used in the collapsed card.
function UsagePill({ label, percent }: { label: string; percent: number }) {
  const pct = Math.min(100, Math.max(0, percent))
  const colors = gaugeColors(pct)
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/[0.04] text-[10px] whitespace-nowrap">
      <span className="text-text-secondary/60">{label}</span>
      <span className={`font-mono font-semibold ${colors.text}`}>{Math.round(pct)}%</span>
    </span>
  )
}

// Full-width horizontal progress bar for one rate limit.
function UsageBar({ label, percent, resetsAt, now }: {
  label: string
  percent: number
  resetsAt?: number
  now: number
}) {
  const pct = Math.min(100, Math.max(0, percent))
  const colors = gaugeColors(pct)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-text-secondary/60">{label}</span>
        <span className="flex items-center gap-1.5">
          {typeof resetsAt === 'number' && (
            <span className="text-text-secondary/35">{formatReset(resetsAt, now)}</span>
          )}
          <span className={`font-mono font-semibold ${colors.text}`}>{Math.round(pct)}%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Compact Claude usage card pinned to the bottom of the left sidebar. Shows the
// connected account and the two account-level rate limits (Session 5h / Weekly
// 7d) as horizontal progress bars — no cost/tokens here. Collapsible to percent
// pills via the header button. Visibility and collapsed state are persisted config.
export function SidebarUsageCard() {
  const { terminals, config, setConfig } = useStore()
  const minimized = config?.usageCardMinimized === true

  // Account rate limits are account-global (identical across agents); take the
  // most recently reported usage that actually carries plan limits.
  const accountUsage = useMemo(() => {
    let latest: NonNullable<typeof terminals[number]['metadata']>['usage'] | undefined
    for (const t of terminals) {
      const u = t.metadata?.usage
      if (!u) continue
      if (typeof u.fiveHourPercent !== 'number' && typeof u.sevenDayPercent !== 'number') continue
      if (!latest || (u.updatedAt ?? 0) > (latest.updatedAt ?? 0)) latest = u
    }
    return latest
  }, [terminals])

  const [account, setAccount] = useState<ClaudeAccount | null>(null)
  useEffect(() => {
    let cancelled = false
    window.electronAPI.usage.getAccount().then((a) => { if (!cancelled) setAccount(a) })
    return () => { cancelled = true }
  }, [])

  // Refresh every 30s so the reset countdowns stay fresh.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const toggleMinimized = async () => {
    const result = await window.electronAPI.config.setUsageCardMinimized(!minimized)
    setConfig(result.config)
  }

  const hasFive = typeof accountUsage?.fiveHourPercent === 'number'
  const hasSeven = typeof accountUsage?.sevenDayPercent === 'number'
  const hasGauges = hasFive || hasSeven

  return (
    <div className="mx-2 mb-2 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-1.5">
      {minimized ? (
        <div className="flex items-center justify-between gap-1.5">
          {hasGauges ? (
            <div className="flex items-center gap-1 min-w-0 flex-wrap">
              {hasFive && <UsagePill label="session 5h" percent={accountUsage!.fiveHourPercent!} />}
              {hasSeven && <UsagePill label="hebdo 7d" percent={accountUsage!.sevenDayPercent!} />}
            </div>
          ) : (
            <span className="text-[10px] text-text-secondary/40">No usage data</span>
          )}
          <button
            onClick={toggleMinimized}
            title="Expand"
            className="p-0.5 rounded text-text-secondary/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2 gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-text-secondary/60 min-w-0">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {account?.displayName ?? account?.emailAddress ?? 'Claude account'}
              </span>
            </span>
            <button
              onClick={toggleMinimized}
              title="Minimize"
              className="p-0.5 rounded text-text-secondary/50 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
          {hasGauges ? (
            <div className="space-y-2">
              {hasFive && (
                <UsageBar
                  label="Session (5h)"
                  percent={accountUsage!.fiveHourPercent!}
                  resetsAt={accountUsage!.fiveHourResetsAt}
                  now={now}
                />
              )}
              {hasSeven && (
                <UsageBar
                  label="Weekly (7d)"
                  percent={accountUsage!.sevenDayPercent!}
                  resetsAt={accountUsage!.sevenDayResetsAt}
                  now={now}
                />
              )}
            </div>
          ) : (
            <div className="text-[10px] text-text-secondary/40 text-center py-1.5 leading-snug">
              No usage data yet — Claude.ai Pro/Max after the first agent activity.
            </div>
          )}
        </>
      )}
    </div>
  )
}
