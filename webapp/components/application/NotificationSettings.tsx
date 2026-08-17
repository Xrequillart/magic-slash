'use client'

import { Bell, Bot, GitPullRequest, Users } from 'lucide-react'
import { SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import { useT } from '@/lib/i18n/useLanguage'
import { DEFAULTS } from '@/lib/settings'
import { useAppSettings } from '@/components/application/SettingsContext'

/**
 * Notifications tab: how much the desktop app is allowed to interrupt you.
 *
 * Mirrors `desktop/src/renderer/pages/Config/NotificationsPage.tsx` — same four
 * sections, same order, same wording — because the columns behind it are the same
 * per-user row, so a change made here reaches a running app immediately and vice
 * versa. Being interrupted is one subject, and it has one place on both surfaces.
 *
 * The master switch is checked at the single sink in the app's main process, so it
 * covers the kinds with no switch of their own too (a colleague picking up your
 * ticket). Turning it off UNMOUNTS everything below rather than dimming it: three
 * cards of controls that cannot do anything is noise. The per-kind choices are
 * kept — hiding a Toggle patches nothing — and one line says so.
 *
 * Every notification is already suppressed while the app window is focused — that
 * is a hard rule in the main process, not a setting, so nothing here offers it.
 */
export function NotificationSettings() {
  const { t } = useT()
  const { settings, patch } = useAppSettings()

  // Absent means never chosen, which is on — the same reading the main process
  // uses when it decides whether to notify.
  const enabled = settings.notificationsEnabled ?? DEFAULTS.notificationsEnabled

  return (
    <>
      <div>
        <SettingsCard icon={Bell} title={t('settings.notifications.section')}>
          <SettingRow
            label={t('settings.notifications.master.label')}
            description={t('settings.notifications.master.help')}
          >
            <Toggle
              checked={enabled}
              onChange={(notificationsEnabled) => patch({ notificationsEnabled })}
              label={t('settings.notifications.master.label')}
            />
          </SettingRow>
        </SettingsCard>
        {/* The one thing that must survive the hiding: without it, everything
            vanishing reads as the page failing to load rather than as the switch
            doing its job. */}
        {!enabled && <p className="mt-3 text-xs text-muted">{t('settings.notifications.allOff')}</p>}
      </div>

      {/* Hidden, not disabled — see the note at the top of the file. `enabled` is
          the only gate, and nothing below patches on unmount, so every per-kind
          column stays as it was and the page comes back exactly as it left. */}
      {enabled && (
        <>
          <SettingsCard icon={Bot} title={t('settings.notifications.agents.section')}>
            <SettingRow
              label={t('settings.notifications.agentWaiting.label')}
              description={t('settings.notifications.agentWaiting.help')}
            >
              <Toggle
                checked={settings.notificationAgentWaiting ?? DEFAULTS.notificationAgentWaiting}
                onChange={(notificationAgentWaiting) => patch({ notificationAgentWaiting })}
                label={t('settings.notifications.agentWaiting.label')}
              />
            </SettingRow>
            <SettingRow
              label={t('settings.notifications.agentCompleted.label')}
              description={t('settings.notifications.agentCompleted.help')}
            >
              <Toggle
                checked={settings.notificationAgentCompleted ?? DEFAULTS.notificationAgentCompleted}
                onChange={(notificationAgentCompleted) => patch({ notificationAgentCompleted })}
                label={t('settings.notifications.agentCompleted.label')}
              />
            </SettingRow>
          </SettingsCard>

          {/* Two switches rather than one, because these are two different senders:
              the app's own PR watcher, and the team activity stream. */}
          <SettingsCard icon={GitPullRequest} title={t('settings.notifications.pr.section')}>
            <SettingRow
              label={t('settings.notifications.prReview.label')}
              description={t('settings.notifications.prReview.help')}
            >
              <Toggle
                checked={settings.notificationPrReview ?? DEFAULTS.notificationPrReview}
                onChange={(notificationPrReview) => patch({ notificationPrReview })}
                label={t('settings.notifications.prReview.label')}
              />
            </SettingRow>
            <SettingRow
              label={t('settings.notifications.prChangesRequested.label')}
              description={t('settings.notifications.prChangesRequested.help')}
            >
              <Toggle
                checked={settings.notificationPrChangesRequested ?? DEFAULTS.notificationPrChangesRequested}
                onChange={(notificationPrChangesRequested) => patch({ notificationPrChangesRequested })}
                label={t('settings.notifications.prChangesRequested.label')}
              />
            </SettingRow>
          </SettingsCard>

          <div>
            <SettingsCard icon={Users} title={t('settings.notifications.team.section')}>
              {/* The one notification that was always optional. It is opt-in and stays
                  opt-in: read with no `?? true` anywhere, so an unset column is off. */}
              <SettingRow label={t('settings.digest.label')} description={t('settings.digest.help')}>
                <Toggle
                  checked={settings.dailyDigestEnabled ?? DEFAULTS.dailyDigestEnabled}
                  onChange={(dailyDigestEnabled) => patch({ dailyDigestEnabled })}
                  label={t('settings.digest.label')}
                />
              </SettingRow>
            </SettingsCard>
            <p className="mt-3 text-xs text-muted">{t('settings.notifications.team.footnote')}</p>
          </div>
        </>
      )}
    </>
  )
}
