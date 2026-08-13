import { Bell, Bot, Users } from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { SectionHeader } from './SectionHeader'
import { ToggleRow } from './ToggleRow'
import { useT } from '../../i18n'

/**
 * Notifications tab: how much this app is allowed to interrupt you.
 *
 * WHY IT IS ITS OWN TAB
 * ---------------------------------------------------------------------------
 * The app had six kinds of OS notification and one opt-in (the daily digest),
 * buried among the background workers under Application. Everything else fired
 * unconditionally, so "make it stop" had no answer short of silencing the app in
 * macOS's own settings — which also silences the things you DO want. Being
 * interrupted is one subject, and it now has one place.
 *
 * The master switch is checked at the single sink in the main process, so it
 * covers the kinds with no switch of their own too (a PR review landing, a
 * colleague picking up your ticket). Turning it off dims the rest rather than
 * hiding it: the per-kind choices are kept, and what is being suppressed stays
 * legible while it is off.
 *
 * Every notification is ALREADY suppressed while the window is focused — that is
 * a hard rule in the main process, not a setting, so nothing here mentions it.
 */
export function NotificationsPage() {
  const { config, updateNotifications, updateDailyDigestEnabled } = useConfig()
  const t = useT()

  // Absent means never chosen, which is on — the same reading the main process
  // uses when it decides whether to notify.
  const enabled = config?.notifications?.enabled !== false

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionHeader icon={Bell} title={t('settings.notifications.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <ToggleRow
            label={t('settings.notifications.master.label')}
            help={t('settings.notifications.master.help')}
            value={config?.notifications?.enabled}
            onChange={(next) => updateNotifications({ enabled: next })}
            errorMessage={t('toast.notificationsFailed')}
          />
        </div>
      </div>

      <div>
        <SectionHeader icon={Bot} title={t('settings.notifications.agents.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <ToggleRow
            label={t('settings.notifications.agentWaiting.label')}
            help={t('settings.notifications.agentWaiting.help')}
            value={config?.notifications?.agentWaiting}
            onChange={(next) => updateNotifications({ agentWaiting: next })}
            errorMessage={t('toast.notificationsFailed')}
            disabled={!enabled}
          />
          <div className="border-t border-line-subtle" />
          <ToggleRow
            label={t('settings.notifications.agentCompleted.label')}
            help={t('settings.notifications.agentCompleted.help')}
            value={config?.notifications?.agentCompleted}
            onChange={(next) => updateNotifications({ agentCompleted: next })}
            errorMessage={t('toast.notificationsFailed')}
            disabled={!enabled}
          />
        </div>
      </div>

      <div>
        <SectionHeader icon={Users} title={t('settings.notifications.team.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          {/* The one notification that was already optional, moved here from
              Application. It is opt-in and stays opt-in: `value` is read with no
              `?? true` anywhere, and an absent flag means off for this one. */}
          <ToggleRow
            label={t('settings.notifications.digest.label')}
            help={t('settings.notifications.digest.help')}
            value={config?.dailyDigest?.enabled ?? false}
            onChange={updateDailyDigestEnabled}
            errorMessage={t('toast.notificationsFailed')}
            disabled={!enabled}
          />
        </div>
        <p className="text-xs text-text-secondary/50 mt-3">
          {t('settings.notifications.team.footnote')}
        </p>
      </div>
    </div>
  )
}
