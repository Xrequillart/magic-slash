import { useEffect, useMemo, useState, Fragment } from 'react'
import { AlertTriangle, Bot, ChevronDown, Coins, Gauge, Shield, User } from '@ds/desktop/icons'
import { SectionHeader } from './SectionHeader'
import { RateLimitBar } from '../../components/agent-info-sidebar/LimitGauge'
import { showToast } from '../../components/Toast'
import { useConfig } from '../../hooks/useConfig'
import { useStore } from '../../store'
import { formatUsd } from '../../utils/usageStats'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'
import { SELECT } from '../../theme/controls'
import type { AgentType, ClaudeAccount, LaunchMode, SpendSummary } from '../../../types'

/**
 * EVERYTHING ABOUT THE CLI ITSELF: the account it runs as, how it launches, and how
 * much of the plan it is consuming.
 *
 * It was a tab of the settings modal and it is a tab of the account sheet's panel now,
 * which is the move the whole modal made: what is left in that window is repositories,
 * and everything that answers "who is this app signed in as" hangs off the label in the
 * title bar instead. This page is the second kind twice over — the identity is read off
 * `~/.claude`, and the plan limits are the account's, not the machine's.
 *
 * NOTHING HERE CAME FROM THE CLOUD ACCOUNT and the distinction is the reason this is
 * its own tab rather than a section of Account: signing out of Magic Slash says nothing
 * about which Claude you are, and the two can perfectly well be different people.
 */

// Message keys rather than labels: module scope is evaluated once at import, so a
// literal here would pin the select to the boot language.
const LAUNCH_MODE_OPTIONS: { value: LaunchMode; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'plan', labelKey: 'settings.launchMode.plan', descriptionKey: 'settings.launchMode.plan.help' },
  { value: 'default', labelKey: 'settings.launchMode.default', descriptionKey: 'settings.launchMode.default.help' },
  { value: 'acceptEdits', labelKey: 'settings.launchMode.acceptEdits', descriptionKey: 'settings.launchMode.acceptEdits.help' },
  { value: 'auto', labelKey: 'settings.launchMode.auto', descriptionKey: 'settings.launchMode.auto.help' },
  { value: 'bypassPermissions', labelKey: 'settings.launchMode.bypass', descriptionKey: 'settings.launchMode.bypass.help' },
]

const AGENT_TYPE_OPTIONS: { value: AgentType; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'coder', labelKey: 'agentType.coder', descriptionKey: 'agentType.coderHint' },
  { value: 'planner', labelKey: 'agentType.planner', descriptionKey: 'agentType.plannerHint' },
]

// Human-readable label for a Claude seat tier / billing type. Not translated: these are
// Anthropic's own plan names, identical in every language.
const SEAT_TIER_LABELS: Record<string, string> = {
  team_standard: 'Team',
  team_premium: 'Team Premium',
  enterprise: 'Enterprise',
  max: 'Max',
  pro: 'Pro',
}

// toFixed would pin the decimal separator to a point, so the mantissa goes through
// toLocaleString: French wants "12,5 M", not "12.5M". The unit itself is a catalogue
// entry — French abbreviates a billion "Md" and spaces it.
function formatTokensCompact(n: number, locale: string, t: Translate): string {
  const scaled = (value: number, digits: number, unit: string) =>
    `${value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit}`
  if (n >= 1_000_000_000) return scaled(n / 1_000_000_000, 2, t('usage.unit.billion'))
  if (n >= 1_000_000) return scaled(n / 1_000_000, 1, t('usage.unit.million'))
  if (n >= 1_000) return scaled(n / 1_000, 1, t('usage.unit.thousand'))
  return n.toLocaleString(locale)
}

export function ClaudeCodePage() {
  const t = useT()
  const locale = useLocale()
  const config = useStore((s) => s.config)
  const terminals = useStore((s) => s.terminals)
  const { updateLaunchMode, updateDefaultAgentType } = useConfig()

  const [launchMode, setLaunchMode] = useState<LaunchMode>(config?.launchMode ?? 'default')
  const [defaultAgentType, setDefaultAgentType] = useState<AgentType>(config?.defaultAgentType ?? 'coder')
  const [showBypassWarning, setShowBypassWarning] = useState(false)

  const configLaunchMode = config?.launchMode
  useEffect(() => {
    if (configLaunchMode !== undefined) setLaunchMode(configLaunchMode)
  }, [configLaunchMode])

  const applyLaunchMode = async (mode: LaunchMode) => {
    const previous = launchMode
    setLaunchMode(mode)
    setShowBypassWarning(false)
    try {
      await updateLaunchMode(mode)
      showToast(t('toast.launchModeUpdated'), 'success')
    } catch {
      setLaunchMode(previous)
    }
  }

  // Optimistic, then reverted on failure — the same shape as applyLaunchMode above and
  // as ToggleRow, so every control in this page fails the same way.
  const applyDefaultAgentType = async (type: AgentType) => {
    const previous = defaultAgentType
    setDefaultAgentType(type)
    try {
      await updateDefaultAgentType(type)
      showToast(t('toast.defaultAgentTypeUpdated'), 'success')
    } catch {
      setDefaultAgentType(previous)
    }
  }

  const handleLaunchModeChange = (mode: LaunchMode) => {
    if (mode === 'bypassPermissions') {
      setShowBypassWarning(true)
      return
    }
    applyLaunchMode(mode)
  }

  // Latest known Claude account usage (plan rate limits). These are account-global, so
  // they're identical across agents — pick the most recently reported one that actually
  // carries plan limits (Claude.ai Pro/Max only).
  const accountUsage = useMemo(() => {
    let latest: NonNullable<typeof terminals[number]['metadata']>['usage'] | undefined
    for (const terminal of terminals) {
      const usage = terminal.metadata?.usage
      if (!usage) continue
      if (typeof usage.fiveHourPercent !== 'number' && typeof usage.sevenDayPercent !== 'number') continue
      if (!latest || (usage.updatedAt ?? 0) > (latest.updatedAt ?? 0)) {
        latest = usage
      }
    }
    return latest
  }, [terminals])

  // accountUsage can exist while carrying neither percentage, so gate the bars on the
  // values actually rendered rather than on the object itself.
  const hasRateLimits =
    typeof accountUsage?.fiveHourPercent === 'number' ||
    typeof accountUsage?.sevenDayPercent === 'number'

  // Re-render every 30s so the "resets in …" countdowns stay fresh.
  const [usageNow, setUsageNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setUsageNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  // Claude account identity + estimated spend, sourced from ~/.claude on disk. On mount
  // and not on a tab flag, unlike the version this was lifted out of: the panel mounts
  // only the open tab, so being mounted IS being the tab on screen.
  const [claudeAccount, setClaudeAccount] = useState<ClaudeAccount | null>(null)
  const [spend, setSpend] = useState<SpendSummary | null>(null)
  useEffect(() => {
    let cancelled = false
    window.electronAPI.usage.getAccount().then((a) => { if (!cancelled) setClaudeAccount(a) })
    window.electronAPI.usage.getSpend().then((s) => { if (!cancelled) setSpend(s) })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="flex flex-col gap-8">
      {/* Account — the Claude identity read from ~/.claude, not the cloud account */}
      <div>
        <SectionHeader icon={User} title={t('settings.claude.account')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          {claudeAccount ? (
            <div className="space-y-2 text-sm">
              {claudeAccount.displayName && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.name')}</span>
                  <span className="font-medium">{claudeAccount.displayName}</span>
                </div>
              )}
              {claudeAccount.emailAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.email')}</span>
                  <span className="font-medium">{claudeAccount.emailAddress}</span>
                </div>
              )}
              {claudeAccount.organizationName && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.organization')}</span>
                  <span className="font-medium">{claudeAccount.organizationName}</span>
                </div>
              )}
              {claudeAccount.seatTier && (
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary/60">{t('settings.claude.plan')}</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-medium">
                    {SEAT_TIER_LABELS[claudeAccount.seatTier] ?? claudeAccount.seatTier}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-text-secondary/50 text-center py-2">
              {t('settings.claude.noAccount')}
            </div>
          )}
        </div>
      </div>

      {/* Launch mode */}
      <div>
        <SectionHeader icon={Bot} title={t('settings.defaultAgentType.title')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.defaultAgentType.title')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.defaultAgentType.description')}</div>
            </div>
            <div className="relative">
              <select
                value={defaultAgentType}
                onChange={(e) => applyDefaultAgentType(e.target.value as AgentType)}
                className={`${SELECT} w-52`}
              >
                {AGENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icon pointer-events-none" />
            </div>
          </div>
          <div className="text-xs text-text-secondary/50">
            {(() => {
              const active = AGENT_TYPE_OPTIONS.find(o => o.value === defaultAgentType)
              return active ? t(active.descriptionKey) : null
            })()}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader icon={Shield} title={t('settings.launchMode.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.launchMode.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.launchMode.help')}</div>
            </div>
            <div className="relative">
              <select
                value={launchMode}
                onChange={(e) => handleLaunchModeChange(e.target.value as LaunchMode)}
                className={`${SELECT} w-52`}
              >
                {LAUNCH_MODE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icon pointer-events-none" />
            </div>
          </div>
          <div className="text-xs text-text-secondary/50">
            {(() => {
              const active = LAUNCH_MODE_OPTIONS.find(o => o.value === launchMode)
              return active ? t(active.descriptionKey) : null
            })()}
          </div>
          {showBypassWarning && (
            <div className="flex flex-col gap-3 px-3 py-3 bg-red/10 border border-red/20 rounded-lg">
              <div className="flex items-center gap-2 text-xs text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium">{t('settings.launchMode.bypassWarning')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => applyLaunchMode('bypassPermissions')}
                  className="px-3 py-1.5 bg-red/20 hover:bg-red/30 text-red text-xs rounded-lg transition-colors"
                >
                  {t('settings.launchMode.bypassConfirm')}
                </button>
                <button
                  onClick={() => setShowBypassWarning(false)}
                  className="px-3 py-1.5 bg-surface-strong hover:bg-ink/15 text-text-secondary text-xs rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rate usage — plan limits reported by the running agents */}
      <div>
        <SectionHeader icon={Gauge} title={t('settings.rate.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          {hasRateLimits ? (
            <div className="space-y-4">
              {typeof accountUsage?.fiveHourPercent === 'number' && (
                <RateLimitBar
                  label={t('usage.session')}
                  percent={accountUsage.fiveHourPercent}
                  resetsAt={accountUsage.fiveHourResetsAt}
                  now={usageNow}
                />
              )}
              {typeof accountUsage?.sevenDayPercent === 'number' && (
                <RateLimitBar
                  label={t('usage.weekly')}
                  percent={accountUsage.sevenDayPercent}
                  resetsAt={accountUsage.sevenDayResetsAt}
                  now={usageNow}
                />
              )}
            </div>
          ) : (
            <div className="text-sm text-text-secondary/50 text-center py-2">
              {t('settings.rate.empty')}
            </div>
          )}
        </div>
      </div>

      {/* Spend & tokens */}
      <div>
        <SectionHeader icon={Coins} title={t('settings.spend.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          {/* Three states, not two: `spend` is null until the fold comes back, and
              showing the empty copy during that read said "no history" to users who
              have plenty of it. */}
          {spend === null || spend.hasData ? (
            <>
              <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-2 text-sm items-baseline">
                <span className="text-text-secondary/50 text-xs uppercase tracking-wider"></span>
                <span className="text-text-secondary/50 text-xs uppercase tracking-wider text-right">{t('settings.spend.tokens')}</span>
                <span className="text-text-secondary/50 text-xs uppercase tracking-wider text-right">{t('settings.spend.estCost')}</span>

                {([
                  { key: 'settings.spend.today', b: spend?.today },
                  { key: 'settings.spend.week', b: spend?.week },
                  { key: 'settings.spend.allTime', b: spend?.allTime },
                ] as const).map(({ key, b }) => (
                  <Fragment key={key}>
                    <span className="text-text-secondary">{t(key)}</span>
                    {b ? (
                      <>
                        <span className="font-mono text-right">{formatTokensCompact(b.tokens, locale, t)}</span>
                        <span className="font-mono text-right text-ink">~{formatUsd(b.costUsd, locale)}</span>
                      </>
                    ) : (
                      // Sized to the numbers they stand in for, so nothing shifts
                      // when the values land.
                      <>
                        <span aria-hidden className="block h-4 w-16 justify-self-end rounded bg-surface-strong animate-pulse" />
                        <span aria-hidden className="block h-4 w-14 justify-self-end rounded bg-surface-strong animate-pulse" />
                      </>
                    )}
                  </Fragment>
                ))}
              </div>
              <div className="text-[11px] text-text-secondary/40 mt-3 leading-snug">
                {t('settings.spend.disclaimer')}
              </div>
            </>
          ) : (
            <div className="text-sm text-text-secondary/50 text-center py-2">
              {t('settings.spend.empty')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
