import type { ContextAgentCardProps } from '@ds/desktop'
import type { TerminalUsage } from '../../../types'
import { useT, useLocale, type Translate } from '../../i18n'
import { formatUsd } from '../../utils/usageStats'

/**
 * THE DATA PATH for the agent context card. The drawing is `ContextAgentCard`, and the
 * column that places it is `SidebarAgentCoderInfo`; neither knows any of this — no
 * translator, no locale, no formatter.
 *
 * A HOOK AND NOT A COMPONENT, for the reason the ticket card and the scripts menu are
 * hooks: the column renders the card itself now, so what it wants handed to it is props.
 * A component here would be a second card inside a column that already knows where this
 * one goes.
 *
 * What is left is the half that is genuinely this app's — turning a `TerminalUsage` into
 * words in the reader's own language and currency, and handing the fold back to the store.
 * That split is the point: the arrangement is a design decision, "3.4k of 200k tokens" is
 * not.
 */

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

interface UsageCardOptions {
  usage: TerminalUsage
  /**
   * Collapsed to the context gauge alone. Owned by the caller (and through it by the
   * config) rather than here: it used to be local state, which meant the compact form was
   * forgotten on every agent switch, and the Appearance tab now offers the same choice as
   * a select. One value, two ways to set it.
   */
  minimized: boolean
  onMinimizedChange: (minimized: boolean) => void
}

export function useUsageCard({
  usage,
  minimized,
  onMinimizedChange,
}: UsageCardOptions): ContextAgentCardProps {
  const t = useT()
  const locale = useLocale()
  const { costUsd, contextPercent, contextTokens, contextWindowSize, model, durationMs } = usage

  // Everything the drawing cannot work out for itself: the words, and the numbers in the
  // reader's own locale.
  const detail =
    typeof contextTokens === 'number' && typeof contextWindowSize === 'number'
      ? t('agentInfo.tokensOf', {
          used: formatTokens(contextTokens, locale, t),
          total: formatTokens(contextWindowSize, locale, t),
        })
      : undefined

  return {
    contextPercent: contextPercent ?? 0,
    contextDetail: detail,
    model,
    cost: typeof costUsd === 'number' ? formatUsd(costUsd, locale) : undefined,
    duration: typeof durationMs === 'number' ? formatDuration(durationMs, t) : undefined,
    minimized,
    onMinimizedChange,
    labels: {
      context: t('agentInfo.context'),
      minimize: t('usage.minimize'),
      expand: t('usage.expand'),
    },
  }
}
