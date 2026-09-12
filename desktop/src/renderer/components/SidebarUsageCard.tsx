import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus } from '@ds/desktop/icons'
import { useStore } from '../store'
import { Label, PROGRESS_TEXT, ProgressBar, progressTone } from '@ds/desktop'
import { ACTION_CHIP, ACTION_CHIP_SQUARE } from './actionChip'
import { LIMIT_THRESHOLDS, formatReset } from './agent-info-sidebar/LimitGauge'
import { useT } from '../i18n'
import type { ClaudeAccount } from '../../types'

// "session ▬▬ 89%" gauge for the collapsed card, at 11px — one step under the
// expanded card's `text-xs`, because three of these share a row where the expanded
// bars get one each. Both gauges share one row, so
// each takes half of it: label and percent are shrink-0 and the bar absorbs
// whatever is left — it goes very small on a narrow sidebar, by design.
function UsageMiniBar({ label, percent }: { label: string; percent: number }) {
  const pct = Math.min(100, Math.max(0, percent))
  const tone = progressTone(pct, LIMIT_THRESHOLDS)
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <span className="shrink-0 text-[11px] text-text-secondary/60">{label}</span>
      <ProgressBar value={pct} thresholds={LIMIT_THRESHOLDS} size="xs" label={label} className="flex-1 min-w-[8px]" />
      <span className={`shrink-0 text-[11px] font-semibold ${PROGRESS_TEXT[tone]}`}>{Math.round(pct)}%</span>
    </div>
  )
}

// Full-width horizontal progress bar for one rate limit.
function UsageBar({ label, percent, resetsAt, now }: {
  label: string
  percent: number
  resetsAt?: number
  now: number
}) {
  const t = useT()
  const pct = Math.min(100, Math.max(0, percent))
  const tone = progressTone(pct, LIMIT_THRESHOLDS)
  return (
    <div className="space-y-1">
      {/* `text-xs`, up from 10px. This card is the one thing in the left sidebar a
          person READS a number off rather than glances at, and 10px was set when the
          row was an afterthought pinned under the agent list. The reset stamp keeps a
          step below the two figures it qualifies, at 11px — it is context for the
          percentage, not a third reading. */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary/60">{label}</span>
        <span className="flex items-center gap-1.5">
          {typeof resetsAt === 'number' && (
            <span className="text-[11px] text-text-secondary/35">{formatReset(resetsAt, now, t)}</span>
          )}
          <span className={`font-semibold ${PROGRESS_TEXT[tone]}`}>{Math.round(pct)}%</span>
        </span>
      </div>
      <ProgressBar value={pct} thresholds={LIMIT_THRESHOLDS} label={label} />
    </div>
  )
}

// Compact Claude usage card pinned to the bottom of the left sidebar. Shows the
// connected account and the two account-level rate limits (Session 5h / Weekly
// 7d) as horizontal progress bars — no cost/tokens here. Collapsible to percent
// pills via the header button. Visibility and collapsed state are persisted config.
export function SidebarUsageCard() {
  const { terminals, config, setConfig } = useStore()
  const t = useT()
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

  const accountLabel = account?.displayName ?? account?.emailAddress ?? t('usage.claudeAccount')

  const hasFive = typeof accountUsage?.fiveHourPercent === 'number'
  const hasSeven = typeof accountUsage?.sevenDayPercent === 'number'
  const hasGauges = hasFive || hasSeven

  return (
    /* A CARD, so the card's own two values: `bg-surface` and `rounded-xl`, the pair every
       panel in the right-hand sidebar wears. It was `surface-subtle` inside a
       `line-subtle` rule at `rounded-lg` — a lighter plate that needed the rule to be
       seen at all, in the one radius between the chips and the cards.

       `mb-1`: the version line below is 8px of its own padding away, and 8+8 put this
       card most of a blank row above the number it sits on. */
    <div className="mx-2 mb-1 bg-surface rounded-xl px-2 py-1.5">
      {minimized ? (
        <div className="flex items-center justify-between gap-1.5">
          {hasGauges ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {hasFive && <UsageMiniBar label={t('usage.sessionShort')} percent={accountUsage!.fiveHourPercent!} />}
              {hasSeven && <UsageMiniBar label={t('usage.weeklyShort')} percent={accountUsage!.sevenDayPercent!} />}
            </div>
          ) : (
            <span className="text-[10px] text-text-secondary/40">{t('usage.noData')}</span>
          )}
          <button
            onClick={toggleMinimized}
            title={t('usage.expand')}
            className={`${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-ink/10 hover:text-ink`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2 gap-2">
            {/* WHOSE usage this is — and it is Claude's, so it wears Claude's chip: the
                same mark, the same coral ground and the same ink label as the agent
                card's on the other side of the window. The two cards are a pair, one
                per sidebar, and this is what says so. A generic user glyph on a grey
                plate named the person without naming what they are signed in to.

                `min-w-0` on the chip and `truncate` on the name, unlike the fixed labels
                it borrows from: an account is whatever the person is called, in a 230px
                column. The full value stays in the tooltip. */}
            <Label tone="claude-code" title={accountLabel} truncate>
              {accountLabel}
            </Label>
            <button
              onClick={toggleMinimized}
              title={t('usage.minimize')}
              className={`${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-ink/10 hover:text-ink`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
          {hasGauges ? (
            <div className="space-y-2">
              {hasFive && (
                <UsageBar
                  label={t('usage.session')}
                  percent={accountUsage!.fiveHourPercent!}
                  resetsAt={accountUsage!.fiveHourResetsAt}
                  now={now}
                />
              )}
              {hasSeven && (
                <UsageBar
                  label={t('usage.weekly')}
                  percent={accountUsage!.sevenDayPercent!}
                  resetsAt={accountUsage!.sevenDayResetsAt}
                  now={now}
                />
              )}
            </div>
          ) : (
            <div className="text-[10px] text-text-secondary/40 text-center py-1.5 leading-snug">
              {t('usage.noDataHint')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
