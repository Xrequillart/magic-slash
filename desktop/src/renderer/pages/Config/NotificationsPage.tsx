import { Bell, Bot, GitPullRequest, Users } from 'lucide-react'
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
 * covers the kinds with no switch of their own too (a colleague picking up your
 * ticket). Turning it off UNMOUNTS everything below rather than dimming it: three
 * cards of controls that cannot do anything is noise, and a greyed-out toggle
 * still reads as a setting you are allowed to reason about. What is left is one
 * switch and a line saying the per-kind choices are kept — which they are, since
 * hiding a ToggleRow writes nothing.
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
        {/* The one thing that must survive the hiding: without it, everything
            vanishing reads as the page failing to load rather than as the switch
            doing its job. */}
        {!enabled && (
          <p className="text-xs text-text-secondary/50 mt-3">
            {t('settings.notifications.allOff')}
          </p>
        )}
      </div>

      {/* Hidden, not disabled — see the note at the top of the file. `enabled` is
          the only gate, and nothing below writes on unmount, so every per-kind
          value stays as it was and the page comes back exactly as it left. */}
      {enabled && (
        <>
          <div>
            <SectionHeader icon={Bot} title={t('settings.notifications.agents.section')} />
            <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
              <ToggleRow
                label={t('settings.notifications.agentWaiting.label')}
                help={t('settings.notifications.agentWaiting.help')}
                value={config?.notifications?.agentWaiting}
                onChange={(next) => updateNotifications({ agentWaiting: next })}
                errorMessage={t('toast.notificationsFailed')}
              />
              <div className="border-t border-line-subtle" />
              <ToggleRow
                label={t('settings.notifications.agentCompleted.label')}
                help={t('settings.notifications.agentCompleted.help')}
                value={config?.notifications?.agentCompleted}
                onChange={(next) => updateNotifications({ agentCompleted: next })}
                errorMessage={t('toast.notificationsFailed')}
              />
            </div>
          </div>

          {/* Two switches rather than one, because these are two different senders:
              the local PR watcher (a review status moved on a PR open in the app)
              and the team realtime stream (a reviewer asked for changes on one of
              yours). Silencing the poller you turned on yourself is a different
              intent from silencing your reviewers. */}
          <div>
            <SectionHeader icon={GitPullRequest} title={t('settings.notifications.pr.section')} />
            <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
              <ToggleRow
                label={t('settings.notifications.prReview.label')}
                help={t('settings.notifications.prReview.help')}
                value={config?.notifications?.prReview}
                onChange={(next) => updateNotifications({ prReview: next })}
                errorMessage={t('toast.notificationsFailed')}
              />
              <div className="border-t border-line-subtle" />
              <ToggleRow
                label={t('settings.notifications.prChangesRequested.label')}
                help={t('settings.notifications.prChangesRequested.help')}
                value={config?.notifications?.prChangesRequested}
                onChange={(next) => updateNotifications({ prChangesRequested: next })}
                errorMessage={t('toast.notificationsFailed')}
              />
            </div>
          </div>

          <div>
            <SectionHeader icon={Users} title={t('settings.notifications.team.section')} />
            <div className="bg-surface border border-line-strong rounded-xl p-4">
              {/* The one notification that was already optional, moved here from
                  Application. It is opt-in and stays opt-in: `value` is read with
                  no `?? true` anywhere, and an absent flag means off for this one. */}
              <ToggleRow
                label={t('settings.notifications.digest.label')}
                help={t('settings.notifications.digest.help')}
                value={config?.dailyDigest?.enabled ?? false}
                onChange={updateDailyDigestEnabled}
                errorMessage={t('toast.notificationsFailed')}
              />
            </div>
            <p className="text-xs text-text-secondary/50 mt-3">
              {t('settings.notifications.team.footnote')}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
