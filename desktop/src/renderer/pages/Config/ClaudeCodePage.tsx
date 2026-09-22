import { useEffect, useMemo, useState } from 'react'
import {
  Banner,
  Card,
  EmptyLine,
  FactList,
  RateLimitBar,
  SectionHeader,
  SettingRow,
  UsageTable,
  type FactListRow,
} from '@ds/desktop'
import { AlertTriangle, Coins, Gauge, Shield, User } from '@ds/desktop/icons'
import { formatReset } from '../../components/agent-info-sidebar/LimitGauge'
import { showToast } from '../../components/Toast'
import { useConfig } from '../../hooks/useConfig'
import { useStore } from '../../store'
import { formatUsd } from '../../utils/usageStats'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import type { ClaudeAccount, LaunchMode, SpendSummary } from '../../../types'

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
 *
 * ── FIVE BLOCKS, FIVE COMPONENTS ──────────────────────────────────────────────────
 *
 * Every one of them is the design system's now, and each went whole: `FactList` for the
 * account read off disk, `SettingRow` twice for the two pickers, `Banner` for the
 * confirmation the bypass mode asks for, `RateLimitBar` for the gauges and `UsageTable`
 * for the figures. Between them they took away four spellings of the same plate, three
 * of the same centred empty line, two of the same "name over a help line with a control
 * at the right", and a pair of confirmation buttons drawn out of raw classes.
 *
 * WHAT IS LEFT HERE IS THE READING: which account is on disk, which usage report is the
 * freshest, how a figure is written in the reader's language, and the optimistic writes.
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
  const { updateLaunchMode } = useConfig()

  const [launchMode, setLaunchMode] = useState<LaunchMode>(config?.launchMode ?? 'default')
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

  // The countdown as a SENTENCE, built here and handed over: the design system's gauge
  // cannot read a translation, and a component that set its own interval would re-render
  // every surface drawing one on a timer none of them asked for.
  const resetLabel = (resetsAt?: number) =>
    typeof resetsAt === 'number'
      ? t('usage.resetsIn', { time: formatReset(resetsAt, usageNow, t) })
      : undefined

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

  // The account as a list of facts, built here because WHICH facts exist is a property
  // of what was on disk: a personal account has no organization, a token-less one has no
  // plan. Absent fields are dropped rather than drawn empty.
  const accountFacts: FactListRow[] = claudeAccount
    ? [
        { id: 'name', label: t('settings.claude.name'), value: claudeAccount.displayName },
        { id: 'email', label: t('settings.claude.email'), value: claudeAccount.emailAddress },
        { id: 'organization', label: t('settings.claude.organization'), value: claudeAccount.organizationName },
        {
          id: 'plan',
          label: t('settings.claude.plan'),
          // Anthropic's own plan names, not translated — identical in every language.
          value: claudeAccount.seatTier ? SEAT_TIER_LABELS[claudeAccount.seatTier] ?? claudeAccount.seatTier : undefined,
          badge: true,
        },
      ].flatMap((fact) => (fact.value ? [{ ...fact, value: fact.value }] : []))
    : []

  const activeLaunchMode = LAUNCH_MODE_OPTIONS.find((option) => option.value === launchMode)

  return (
    <div className="flex flex-col gap-8">
      {/* Account — the Claude identity read from ~/.claude, not the cloud account */}
      <div>
        <SectionHeader icon={User} title={t('settings.claude.account')} />
        <Card>
          <FactList rows={accountFacts} empty={t('settings.claude.noAccount')} />
        </Card>
      </div>

      <div>
        <SectionHeader icon={Shield} title={t('settings.launchMode.section')} />
        <Card className="flex flex-col gap-4">
          <SettingRow
            label={t('settings.launchMode.label')}
            hint={t('settings.launchMode.help')}
            note={activeLaunchMode ? t(activeLaunchMode.descriptionKey) : undefined}
            control={{
              kind: 'select',
              value: launchMode,
              options: LAUNCH_MODE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
              onChange: (next) => handleLaunchModeChange(next as LaunchMode),
              ariaLabel: t('settings.launchMode.label'),
              width: SELECT_WIDTH,
            }}
          />
          {/* The one mode that asks before it is set. It is not a toast and not a modal:
              the question is about the row above it and the answer changes that row, so
              it belongs in the card, which is what `Banner` is. The confirm is the
              primary — it is what the reader just asked for — and cancelling simply puts
              the picker back where it was. */}
          {showBypassWarning && (
            <Banner
              variant="danger"
              icon={AlertTriangle}
              layout="stacked"
              actions={[
                {
                  label: t('settings.launchMode.bypassConfirm'),
                  primary: true,
                  onClick: () => applyLaunchMode('bypassPermissions'),
                },
                { label: t('common.cancel'), onClick: () => setShowBypassWarning(false) },
              ]}
            >
              {t('settings.launchMode.bypassWarning')}
            </Banner>
          )}
        </Card>
      </div>

      {/* Rate usage — plan limits reported by the running agents */}
      <div>
        <SectionHeader icon={Gauge} title={t('settings.rate.section')} />
        <Card className="flex flex-col gap-4">
          {hasRateLimits ? (
            <>
              {typeof accountUsage?.fiveHourPercent === 'number' && (
                <RateLimitBar
                  label={t('usage.session')}
                  percent={accountUsage.fiveHourPercent}
                  resets={resetLabel(accountUsage.fiveHourResetsAt)}
                />
              )}
              {typeof accountUsage?.sevenDayPercent === 'number' && (
                <RateLimitBar
                  label={t('usage.weekly')}
                  percent={accountUsage.sevenDayPercent}
                  resets={resetLabel(accountUsage.sevenDayResetsAt)}
                />
              )}
            </>
          ) : (
            <EmptyLine>{t('settings.rate.empty')}</EmptyLine>
          )}
        </Card>
      </div>

      {/* Spend & tokens */}
      <div>
        <SectionHeader icon={Coins} title={t('settings.spend.section')} />
        <Card>
          {/* Three states, not two: `spend` is null until the fold comes back, and showing
              the empty copy during that read said "no history" to users who have plenty of
              it. A row with no figures is what `UsageTable` draws its skeletons for. */}
          <UsageTable
            columns={[t('settings.spend.tokens'), t('settings.spend.estCost')]}
            rows={spend === null || spend.hasData
              ? ([
                  { id: 'today', label: t('settings.spend.today'), bucket: spend?.today },
                  { id: 'week', label: t('settings.spend.week'), bucket: spend?.week },
                  { id: 'allTime', label: t('settings.spend.allTime'), bucket: spend?.allTime },
                ]).map(({ id, label, bucket }) => ({
                  id,
                  label,
                  figures: bucket
                    ? [formatTokensCompact(bucket.tokens, locale, t), `~${formatUsd(bucket.costUsd, locale)}`]
                    : undefined,
                }))
              : []}
            note={t('settings.spend.disclaimer')}
            empty={t('settings.spend.empty')}
          />
        </Card>
      </div>
    </div>
  )
}
