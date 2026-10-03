import { useCallback, useState } from 'react'
import type { ContextAgentCardProps, ContextAgentModelPicker } from '@ds/desktop'
import type { ClaudeModelOption, TerminalUsage } from '../../../types'
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

/** The pause between the command and its Enter, the chat's own (`AgentPane`). */
const SUBMIT_DELAY_MS = 60

/** `claude-opus-5-5[1m]` and `claude-opus-5-5` are one model: the suffix is a context size. */
function baseModelId(id: string): string {
  return id.replace(/\[[^\]]*\]$/, '')
}

/**
 * THE MODEL PICKER: the list `/model` offers, from the same CLI question Settings → Agents
 * asks (`claude:listModels`, kept by main for the life of the app), and a pick typed into
 * the agent's terminal as `/model <value>` — with the argument, Claude Code switches
 * without opening its dialog. Nothing is held here about which model is in force: the
 * next statusLine reports it, and the chip follows.
 */
function useModelPicker(terminalId: string, modelId: string | undefined): ContextAgentModelPicker {
  const t = useT()
  const [models, setModels] = useState<ClaudeModelOption[] | 'loading' | 'failed' | null>(null)

  const onOpen = useCallback(() => {
    if (Array.isArray(models)) return
    setModels('loading')
    window.electronAPI.config.listClaudeModels()
      .then(setModels)
      .catch(() => setModels('failed'))
  }, [models])

  const onSelect = useCallback((value: string) => {
    if (!terminalId) return
    void window.electronAPI.terminal.write(terminalId, `/model ${value}`).then(() => {
      setTimeout(() => void window.electronAPI.terminal.write(terminalId, '\r'), SUBMIT_DELAY_MS)
    })
  }, [terminalId])

  const current = modelId ? baseModelId(modelId) : undefined
  const list = Array.isArray(models) ? models : []
  // The FIRST row on that model, and only it: an alias and a full id can both resolve to it.
  const selectedValue = list.find((m) => current && baseModelId(m.resolvedModel ?? m.value) === current)?.value

  return {
    options: list.map((m) => ({ id: m.value, label: m.label, selected: m.value === selectedValue })),
    onOpen,
    onSelect,
    loading: models === 'loading',
    labels: {
      title: t('agentInfo.model.change'),
      loading: t('agentInfo.model.loading'),
      empty: t('agentInfo.model.unavailable'),
    },
  }
}

interface UsageCardOptions {
  /** The agent whose terminal a picked model is typed into. '' when none is inspected. */
  terminalId: string
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
  terminalId,
  usage,
  minimized,
  onMinimizedChange,
}: UsageCardOptions): ContextAgentCardProps {
  const t = useT()
  const locale = useLocale()
  const { costUsd, contextPercent, contextTokens, contextWindowSize, model, modelId, durationMs } = usage
  const modelPicker = useModelPicker(terminalId, modelId)

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
    modelPicker,
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
