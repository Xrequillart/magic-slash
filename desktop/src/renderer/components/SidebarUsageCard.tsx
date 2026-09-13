import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { UsageClaudeCodeCard, type UsageLimit } from '@ds/desktop'
import { LIMIT_THRESHOLDS, formatReset } from './agent-info-sidebar/LimitGauge'
import { useT } from '../i18n'
import type { ClaudeAccount } from '../../types'

/**
 * The Claude usage card, pinned to the foot of the left sidebar.
 *
 * WHAT IS LEFT IN THIS FILE is where the numbers come from: the account-level rate
 * limits are global — identical across agents — so the card reads the most recently
 * reported usage that actually carries them, rather than any one agent's. The bars,
 * the chip, the collapsed line and the one control are `UsageClaudeCodeCard`.
 *
 * THE COLLAPSED STATE IS PERSISTED CONFIG, which is why it lives here and is handed
 * down: a card holding its own copy would fight the one that survives a restart.
 *
 * The countdown is formatted HERE, for the reason the component's note gives — "2h14"
 * needs a translator and a clock, and neither is on the far side of the alias.
 */
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

  // Formatted here rather than in the component: a countdown needs a translator and a
  // clock, and `now` ticks every 30s so the strings stay honest.
  const limits: UsageLimit[] = []
  if (typeof accountUsage?.fiveHourPercent === 'number') {
    limits.push({
      id: 'session',
      label: t('usage.session'),
      shortLabel: t('usage.sessionShort'),
      percent: accountUsage.fiveHourPercent,
      reset: typeof accountUsage.fiveHourResetsAt === 'number'
        ? formatReset(accountUsage.fiveHourResetsAt, now, t)
        : undefined,
    })
  }
  if (typeof accountUsage?.sevenDayPercent === 'number') {
    limits.push({
      id: 'weekly',
      label: t('usage.weekly'),
      shortLabel: t('usage.weeklyShort'),
      percent: accountUsage.sevenDayPercent,
      reset: typeof accountUsage.sevenDayResetsAt === 'number'
        ? formatReset(accountUsage.sevenDayResetsAt, now, t)
        : undefined,
    })
  }

  return (
    // `mb-1`: the version line below carries 8px of its own padding, and 8+8 put this
    // card most of a blank row above the number it sits on.
    <UsageClaudeCodeCard
      className="mx-2 mb-1"
      account={accountLabel}
      limits={limits}
      thresholds={LIMIT_THRESHOLDS}
      collapsed={minimized}
      onToggle={toggleMinimized}
      expandLabel={t('usage.expand')}
      collapseLabel={t('usage.minimize')}
      emptyLabel={t('usage.noData')}
      emptyHint={t('usage.noDataHint')}
    />
  )
}
