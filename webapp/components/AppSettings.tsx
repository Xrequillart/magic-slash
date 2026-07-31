'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Check,
  GitPullRequest,
  Languages,
  Palette,
  Sparkles,
  SquareTerminal,
  X,
} from 'lucide-react'
import { Dropdown } from '@/components/Dropdown'
import { ExamplePanel, SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import { Modal } from '@/components/Modal'
import { Button } from '@/components/ui'
import type { MessageKey, Translate } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import {
  DEFAULTS,
  LANGUAGE_OPTIONS,
  LAUNCH_MODE_OPTIONS,
  POLL_INTERVAL_OPTIONS,
  THEME_OPTIONS,
  type KeyedOption,
  type ThemeSwatch,
  type UserSettings,
  type UserSettingsPatch,
} from '@/lib/settings'

/**
 * Every application preference the webapp exposes, in the same order and with
 * the same wording as the desktop app's Settings tabs — Appearance, Language &
 * Region, Features, then Claude Code.
 *
 * Presentational: the page owns the state and the saving. One setting at a time
 * goes through `onPatch`, which is what makes each control save on its own.
 */

const BYPASS = 'bypassPermissions'

/** Turns the keyed option lists in `lib/settings` into what Dropdown renders. */
function translateOptions(options: KeyedOption[], t: Translate) {
  return options.map(({ value, labelKey, descriptionKey }) => ({
    value,
    label: t(labelKey),
    description: descriptionKey ? t(descriptionKey) : undefined,
  }))
}

/**
 * Miniature of a theme, painted with that theme's own colours rather than the
 * one in use — the point is to show what the desktop is about to look like.
 * Inline styles because these colours are outside the webapp's palette.
 *
 * Ported from `desktop/src/renderer/pages/Config/AppearancePage.tsx`.
 */
function ThemePreview({ swatch }: { swatch: ThemeSwatch }) {
  return (
    <div
      className="h-16 w-full overflow-hidden rounded-lg border"
      style={{ backgroundColor: `rgb(${swatch.bgRgb})`, borderColor: swatch.lineStrong }}
    >
      <div className="h-3 w-full" style={{ backgroundColor: swatch.surface }} />
      <div className="flex h-full gap-1.5 p-2">
        <div className="w-1/4 rounded" style={{ backgroundColor: swatch.surface }} />
        <div className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: `rgb(${swatch.inkRgb})` }} />
          <span
            className="h-1.5 w-1/2 rounded-full"
            style={{ backgroundColor: `rgb(${swatch.inkRgb} / 0.5)` }}
          />
          <span className="mt-1 h-2 w-2/5 rounded" style={{ backgroundColor: `rgb(${swatch.accentRgb})` }} />
        </div>
      </div>
    </div>
  )
}

/**
 * What activity recording does and does not send, side by side. Mirrors
 * `UsageLogsBreakdown` in `desktop/src/renderer/pages/Config/index.tsx` — same
 * items, same order — so the two surfaces cannot drift into telling users
 * different things. Both read the same four-and-four list of message keys.
 *
 * Shown whatever the toggle's state: someone who turned it off is exactly the
 * person who wants to know what they turned off.
 */
const COLLECTED: MessageKey[] = [
  'settings.usageLogs.collected.activity',
  'settings.usageLogs.collected.skills',
  'settings.usageLogs.collected.session',
  'settings.usageLogs.collected.context',
]

const NEVER_COLLECTED: MessageKey[] = [
  'settings.usageLogs.excluded.prompts',
  'settings.usageLogs.excluded.code',
  'settings.usageLogs.excluded.terminal',
  'settings.usageLogs.excluded.secrets',
]

function UsageLogsBreakdown({ t }: { t: Translate }) {
  const columns = [
    { title: t('settings.usageLogs.collected'), items: COLLECTED, Icon: Check, tone: 'text-green' },
    { title: t('settings.usageLogs.excluded'), items: NEVER_COLLECTED, Icon: X, tone: 'text-red' },
  ]

  return (
    <div className="mt-4 grid gap-x-6 gap-y-4 border-t border-black/5 pt-4 sm:grid-cols-2">
      {columns.map(({ title, items, Icon, tone }) => (
        <div key={title}>
          <p className="mb-2 text-[10px] uppercase tracking-wider text-muted">{title}</p>
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs leading-snug text-ink/70">
                <Icon className={`mt-px h-3.5 w-3.5 shrink-0 ${tone}`} />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function AppSettings({
  settings,
  onPatch,
}: {
  settings: UserSettings
  onPatch: (patch: UserSettingsPatch) => void
}) {
  const { t } = useT()
  /** Held until confirmed: bypass mode is not something to enable by a stray click. */
  const [confirmBypass, setConfirmBypass] = useState(false)

  const launchModeOptions = useMemo(() => translateOptions(LAUNCH_MODE_OPTIONS, t), [t])
  const pollIntervalOptions = useMemo(() => translateOptions(POLL_INTERVAL_OPTIONS, t), [t])

  // A null column means the user never chose, so the desktop applies its own
  // default — show that, never a normalised value.
  const theme = settings.theme ?? DEFAULTS.theme
  const language = settings.language ?? DEFAULTS.language
  const launchMode = settings.launchMode ?? DEFAULTS.launchMode
  const usageLogs = settings.usageLogsEnabled ?? DEFAULTS.usageLogsEnabled
  const prReviews = settings.prReviewsEnabled ?? DEFAULTS.prReviewsEnabled
  const pollInterval = settings.prReviewsPollIntervalMs ?? DEFAULTS.prReviewsPollIntervalMs

  return (
    <>
      {/* ── Appearance ──────────────────────────────────────────────────────── */}
      <SettingsCard icon={Palette} title={t('settings.appearance')}>
        <div className="py-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {THEME_OPTIONS.map((option) => {
              const active = option.id === theme
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => !active && onPatch({ theme: option.id })}
                  aria-pressed={active}
                  className={`rounded-xl border p-2 text-left transition-colors ${
                    active ? 'border-accent bg-accent/[0.06]' : 'border-black/10 hover:border-black/20'
                  }`}
                >
                  <ThemePreview swatch={option.swatch} />
                  <span className="mt-2 flex items-center gap-1.5">
                    <span className="min-w-0 truncate font-display text-xs font-bold text-ink">
                      {t(option.labelKey)}
                    </span>
                    {active && <Check className="h-3 w-3 shrink-0 text-accent" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                    {t(option.descriptionKey)}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted">{t('settings.appearance.note')}</p>
        </div>
      </SettingsCard>

      {/* ── Language & Region ───────────────────────────────────────────────── */}
      <SettingsCard icon={Languages} title={t('settings.language.section')}>
        <SettingRow
          label={t('settings.language.label')}
          description={t('settings.language.help')}
        >
          <Dropdown
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={(next) => onPatch({ language: next })}
            className="w-52"
          />
        </SettingRow>
        <div className="pb-5">
          <p className="text-xs text-muted">
            {t('settings.language.noteBefore')}{' '}
            <Link href="/organization" className="text-accent hover:underline">
              {t('settings.language.noteLink')}
            </Link>
            {t('settings.language.noteAfter')}
          </p>
        </div>
      </SettingsCard>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <SettingsCard icon={Sparkles} title={t('settings.features')}>
        <SettingRow
          label={t('settings.usageCard.label')}
          description={t('settings.usageCard.help')}
        >
          <Toggle
            checked={settings.usageCardEnabled ?? DEFAULTS.usageCardEnabled}
            onChange={(usageCardEnabled) => onPatch({ usageCardEnabled })}
            label={t('settings.usageCard.label')}
          />
        </SettingRow>
        {/*
          Hand-rolled rather than a SettingRow: the breakdown below has to sit
          INSIDE the row's border, or the two lists read as belonging to the next
          setting. Classes are SettingRow's own, so the row still lines up.
        */}
        <div className="border-b border-black/5 py-4 last:border-b-0">
          <div className="flex flex-col gap-x-6 gap-y-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-bold text-ink">
                {t('settings.usageLogs.label')}
              </p>
              <p className="mt-0.5 text-xs text-muted">{t('settings.usageLogs.help')}</p>
            </div>
            <div className="shrink-0">
              <Toggle
                checked={usageLogs}
                onChange={(usageLogsEnabled) => onPatch({ usageLogsEnabled })}
                label={t('settings.usageLogs.label')}
              />
            </div>
          </div>
          {/*
            The breakdown answers "what am I sharing?", so it goes away with the
            sharing — same for the sentence about who can read it. The agents
            caveat stays in both states: it is truest for the person who just
            turned this off, since their agents keep syncing regardless.
          */}
          {usageLogs && (
            <>
              <UsageLogsBreakdown t={t} />
              <p className="mt-3 text-[11px] leading-snug text-muted">
                {t('settings.usageLogs.footnote')}
              </p>
            </>
          )}
          <p className="mt-3 text-[11px] leading-snug text-muted">
            {t('settings.usageLogs.footnoteAgents')}
          </p>
        </div>
        <SettingRow label={t('settings.digest.label')} description={t('settings.digest.help')}>
          <Toggle
            checked={settings.dailyDigestEnabled ?? DEFAULTS.dailyDigestEnabled}
            onChange={(dailyDigestEnabled) => onPatch({ dailyDigestEnabled })}
            label={t('settings.digest.label')}
          />
        </SettingRow>
        <SettingRow label={t('settings.split.label')} description={t('settings.split.help')}>
          <Toggle
            checked={settings.splitEnabled ?? DEFAULTS.splitEnabled}
            onChange={(splitEnabled) => onPatch({ splitEnabled })}
            label={t('settings.split.label')}
          />
        </SettingRow>
      </SettingsCard>

      {/* ── PR Review Watcher ───────────────────────────────────────────────── */}
      <SettingsCard icon={GitPullRequest} title={t('settings.prWatcher.section')}>
        <SettingRow
          label={t('settings.prWatcher.label')}
          description={t('settings.prWatcher.help')}
        >
          <Toggle
            checked={prReviews}
            onChange={(prReviewsEnabled) => onPatch({ prReviewsEnabled })}
            label={t('settings.prWatcher.label')}
          />
        </SettingRow>
        {prReviews && (
          <>
            <SettingRow
              label={t('settings.prWatcher.intervalLabel')}
              description={t('settings.prWatcher.intervalHelp')}
            >
              <Dropdown
                value={String(pollInterval)}
                options={pollIntervalOptions}
                onChange={(next) => onPatch({ prReviewsPollIntervalMs: Number(next) })}
                className="w-52"
              />
            </SettingRow>
            <SettingRow
              label={t('settings.prWatcher.autoLaunchLabel')}
              description={t('settings.prWatcher.autoLaunchHelp')}
            >
              <Toggle
                checked={settings.prReviewsAutoLaunchSkills ?? DEFAULTS.prReviewsAutoLaunchSkills}
                onChange={(prReviewsAutoLaunchSkills) => onPatch({ prReviewsAutoLaunchSkills })}
                label={t('settings.prWatcher.autoLaunchLabel')}
              />
            </SettingRow>
          </>
        )}
      </SettingsCard>

      {/* ── Claude Code ─────────────────────────────────────────────────────── */}
      <SettingsCard icon={SquareTerminal} title={t('settings.claudeCode')}>
        <SettingRow
          label={t('settings.launchMode.label')}
          description={t('settings.launchMode.help')}
        >
          <Dropdown
            value={launchMode}
            options={launchModeOptions}
            onChange={(next) => (next === BYPASS ? setConfirmBypass(true) : onPatch({ launchMode: next }))}
            className="w-52"
          />
        </SettingRow>
        {launchMode === BYPASS && (
          <ExamplePanel tone="warning">
            <p className="text-xs text-ink">{t('settings.launchMode.bypassInline')}</p>
          </ExamplePanel>
        )}
      </SettingsCard>

      <Modal
        open={confirmBypass}
        onClose={() => setConfirmBypass(false)}
        icon={AlertTriangle}
        title={t('settings.launchMode.bypassTitle')}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" className="ml-auto" onClick={() => setConfirmBypass(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onPatch({ launchMode: BYPASS })
                setConfirmBypass(false)
              }}
            >
              {t('settings.launchMode.bypassConfirm')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{t('settings.launchMode.bypassWarning')}</p>
      </Modal>
    </>
  )
}
