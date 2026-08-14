'use client'

import { useMemo } from 'react'
import { Check, GitPullRequest, Sparkles, X } from 'lucide-react'
import { Dropdown } from '@/components/Dropdown'
import { SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import type { MessageKey, Translate } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { DEFAULTS, POLL_INTERVAL_OPTIONS } from '@/lib/settings'
import { useAppSettings } from '@/components/application/SettingsContext'
import { translateOptions } from '@/components/application/options'

/**
 * Features tab: what the desktop app DOES on its own — what it records, how it
 * lays agents out, and the background worker that watches pull requests.
 *
 * What it LOOKS like is the Appearance tab, and how loud it is is Notifications:
 * this one is the app's behaviour, and nothing in it is about the window.
 */

/**
 * What activity recording does and does not send, side by side. Mirrors
 * `UsageLogsBreakdown` in `desktop/src/renderer/pages/Config/index.tsx` — same
 * items, same order — so the two surfaces cannot drift into telling users
 * different things. Both read the same four-and-six list of message keys.
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

// The last two answer what the skills line opposite invites: a run now carries its
// duration and its outcome, so whether the words typed after /magic:pr travel with
// it (they do not) and which skills reach the table at all are the two questions
// that follow. Both are enforced desktop-side, in main/usage/skill-invocations.ts.
//
// The second is deliberately a NAME test rather than an ownership one: isMagicSkill
// folds the plugin prefix and then requires a `magic-` basename, so a third-party
// `acme:magic-deploy` clears it. Wording it as "nothing that is not ours" would
// promise more than the filter delivers.
const NEVER_COLLECTED: MessageKey[] = [
  'settings.usageLogs.excluded.prompts',
  'settings.usageLogs.excluded.code',
  'settings.usageLogs.excluded.terminal',
  'settings.usageLogs.excluded.secrets',
  'settings.usageLogs.excluded.args',
  'settings.usageLogs.excluded.otherSkills',
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

export function FeatureSettings() {
  const { t } = useT()
  const { settings, patch } = useAppSettings()

  const pollIntervalOptions = useMemo(() => translateOptions(POLL_INTERVAL_OPTIONS, t), [t])

  const usageLogs = settings.usageLogsEnabled ?? DEFAULTS.usageLogsEnabled
  const prReviews = settings.prReviewsEnabled ?? DEFAULTS.prReviewsEnabled
  const pollInterval = settings.prReviewsPollIntervalMs ?? DEFAULTS.prReviewsPollIntervalMs

  return (
    <>
      <SettingsCard icon={Sparkles} title={t('settings.features')}>
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
                onChange={(usageLogsEnabled) => patch({ usageLogsEnabled })}
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
        <SettingRow label={t('settings.split.label')} description={t('settings.split.help')}>
          <Toggle
            checked={settings.splitEnabled ?? DEFAULTS.splitEnabled}
            onChange={(splitEnabled) => patch({ splitEnabled })}
            label={t('settings.split.label')}
          />
        </SettingRow>
      </SettingsCard>

      <SettingsCard icon={GitPullRequest} title={t('settings.prWatcher.section')}>
        <SettingRow label={t('settings.prWatcher.label')} description={t('settings.prWatcher.help')}>
          <Toggle
            checked={prReviews}
            onChange={(prReviewsEnabled) => patch({ prReviewsEnabled })}
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
                onChange={(next) => patch({ prReviewsPollIntervalMs: Number(next) })}
                className="w-52"
              />
            </SettingRow>
            <SettingRow
              label={t('settings.prWatcher.autoLaunchLabel')}
              description={t('settings.prWatcher.autoLaunchHelp')}
            >
              <Toggle
                checked={settings.prReviewsAutoLaunchSkills ?? DEFAULTS.prReviewsAutoLaunchSkills}
                onChange={(prReviewsAutoLaunchSkills) => patch({ prReviewsAutoLaunchSkills })}
                label={t('settings.prWatcher.autoLaunchLabel')}
              />
            </SettingRow>
          </>
        )}
      </SettingsCard>
    </>
  )
}
