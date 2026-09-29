import { useEffect, useState } from 'react'
import { BarChart3, Lightbulb, MonitorSmartphone, PanelLeft } from '@ds/desktop/icons'
import { DisclosureCard, SectionHeader, SettingsCard } from '@ds/desktop'
import { TelemetryHealthCard } from './TelemetryHealthCard'
import { SetupHealthCard } from './SetupHealthCard'
import { SidebarPagesModal } from './SidebarPagesModal'
import { useToggleRow } from './ToggleRow'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey } from '../../i18n'

/**
 * THE APP ITSELF — how this machine is set up, and every feature that can be switched
 * off. The settings modal's Application tab, until the modal lost it.
 *
 * Quick Launch moved to a page of its own (`QuickLaunchPage`). The split view moved to a page of its own (`SplitViewPage`). The new-agent defaults moved to the Agents page (`AgentsPage`). The PR watcher's card moved to Code & reviews (`CodeReviewsPage`), beside the palette
 * the reviews it watches are read in.
 *
 * WHY IT IS A COMPONENT AND NOT A TAB ANY MORE. The quick-settings sheet took over the
 * on/off half of this page — the split view, Quick Launch, the login start, the PR
 * watcher, plan sync, activity sharing are all tiles now — and the modal's tab was
 * dropped with the three others the sheet covers. What the sheet has no room for stayed
 * here: the machine's setup card with its installers, the Quick Launch SHORTCUT, the PR
 * watcher's interval and its skill auto-launch, and the two explanatory blocks. This
 * file is that remainder, and `AllSettingsPanel` is where it is read now.
 *
 * It owns its own state, which is what moving out of the modal bought: the page used to
 * borrow eight `useState`s from the settings shell, and the shell kept them alive for
 * the ten tabs that never looked at them.
 *
 * ── SIX CARDS, TWO COMPONENTS ─────────────────────────────────────────────────────
 *
 * `SettingsCard` for five of them and `DisclosureCard` for the sixth, both the design
 * system's. This page was the last and worst of the hand-drawn plates: six spellings of
 * `bg-surface border border-line-strong rounded-xl p-4`, nine rows of label-over-help
 * with a control at the right written out by hand — the shape `SettingRow` has owned
 * since the Claude Code tab — a red strip approximating `Banner`, four sizes of small
 * print, and dividers pushed between the rows as loose `<div>`s that only stayed correct
 * while nobody added a row at the end.
 *
 * WHAT IS LEFT HERE IS THE WIRING: which switch writes where, which of them go through
 * the store because another pane reads them, and which rows are offered at all.
 */

// The two halves of the activity-recording breakdown. Message keys rather than
// labels, for the same reason as the rail's tabs: module scope is evaluated once at
// import, so a literal would pin the list to the boot language.
const USAGE_LOGS_COLLECTED: MessageKey[] = [
  'settings.application.usageLogs.collected.activity',
  'settings.application.usageLogs.collected.skills',
  'settings.application.usageLogs.collected.session',
  'settings.application.usageLogs.collected.context',
]

// The last two are the counterweight to the skills line opposite: now that a run
// carries its duration and its outcome, the obvious next question is whether the
// words next to /magic:pr travel with it (they do not — types.ts, SkillInvocationInput)
// and which skills reach the table at all.
//
// That second one is worded as a NAME test, not as ownership, because that is all
// isMagicSkill does (main/usage/skill-invocations.ts): it folds the plugin prefix,
// then requires the basename to start with `magic-`. Promising "nothing that is not
// ours" would over-claim — a third-party skill called `acme:magic-deploy` clears that
// filter. The panel states the rule the code actually enforces.
const USAGE_LOGS_EXCLUDED: MessageKey[] = [
  'settings.application.usageLogs.excluded.prompts',
  'settings.application.usageLogs.excluded.code',
  'settings.application.usageLogs.excluded.terminal',
  'settings.application.usageLogs.excluded.secrets',
  'settings.application.usageLogs.excluded.args',
  'settings.application.usageLogs.excluded.otherSkills',
]

export function ApplicationPage() {
  const t = useT()
  const { config, setConfig } = useStore()

  const [autoStart, setAutoStart] = useState(false)
  const [sidebarEditorOpen, setSidebarEditorOpen] = useState(false)
  const [usageLogsEnabled, setUsageLogsEnabled] = useState(config?.usageLogsEnabled ?? true)

  useEffect(() => {
    window.electronAPI.config.getAutoStart().then(setAutoStart)
  }, [])

  const configUsageLogsEnabled = config?.usageLogsEnabled
  useEffect(() => {
    if (configUsageLogsEnabled !== undefined) setUsageLogsEnabled(configUsageLogsEnabled)
  }, [configUsageLogsEnabled])


  // The one switch on this page whose write is the app's ordinary optimistic one, so it
  // is the one that reaches for the hook. The others each do something particular on the
  // way — registering a global shortcut with the OS, pushing the result into the store —
  // and spell their own handler above.
  const { updateSidebarPages } = useConfig()
  const sidebarCompactRow = useToggleRow({
    label: t('settings.application.sidebar.compact.label'),
    help: t('settings.application.sidebar.compact.help'),
    value: config?.sidebarCompact === true,
    onChange: async (next) => {
      await updateSidebarPages({ compact: next })
    },
    errorMessage: t('toast.settingUpdateFailed'),
  })

  const planSyncRow = useToggleRow({
    label: t('settings.application.planSync.label'),
    help: t('settings.application.planSync.help'),
    value: config?.planSyncEnabled,
    onChange: async (next) => {
      const result = await window.electronAPI.config.setPlanSyncEnabled(next)
      setConfig(result.config)
    },
    errorMessage: t('settings.application.planSync.error'),
  })

  const usageLogsRow = useToggleRow({
    label: t('settings.application.usageLogs.label'),
    help: t('settings.application.usageLogs.help'),
    value: usageLogsEnabled,
    onChange: async (next) => {
      setUsageLogsEnabled(next)
      const result = await window.electronAPI.config.setUsageLogsEnabled(next)
      setConfig(result.config)
    },
    // The generic key: a failed write here is a setting that did not save, and the
    // switch springing back is most of the message. Previously this switch had no
    // failure path at all — it moved, the write rejected into nothing, and the next
    // config load put it back with no explanation.
    errorMessage: t('toast.settingUpdateFailed'),
  })

  return (
    <div className="flex flex-col gap-8">
      {/* Machine setup (prerequisites, MCP servers, integrations) */}
      <SetupHealthCard />

      {/* Background App Section */}
      <div>
        <SectionHeader icon={MonitorSmartphone} title={t('settings.application.background.section')} />
        <SettingsCard
          rows={[
            {
              id: 'autoStart',
              label: t('settings.application.background.autoStartLabel'),
              hint: t('settings.application.background.autoStartHelp'),
              control: {
                kind: 'switch',
                checked: autoStart,
                onChange: () => {
                  const newValue = !autoStart
                  setAutoStart(newValue)
                  window.electronAPI.config.setAutoStart(newValue)
                },
                label: t('settings.application.background.autoStartLabel'),
              },
            },
            // No control, deliberately: closing the window leaving the app in the menu
            // bar is not a setting, it is what the row above implies. It is in the card
            // because that is what it is about.
            {
              id: 'menuBar',
              label: t('settings.application.background.menuBarLabel'),
              hint: t('settings.application.background.menuBarHelp'),
            },
          ]}
        />
      </div>

      {/* The sidebar's menu: its pages' order and which of them it draws. The editor is a
          dialog rather than rows here, on the reference the reader gave: four rows with a
          grip and a select each would push every card below it down the page. */}
      <div>
        <SectionHeader icon={PanelLeft} title={t('settings.application.sidebar.section')} />
        <SettingsCard
          rows={[
            {
              id: 'sidebarPages',
              label: t('settings.application.sidebar.label'),
              hint: t('settings.application.sidebar.help'),
              control: {
                kind: 'button',
                size: 'sm',
                children: t('settings.application.sidebar.customize'),
                onClick: () => setSidebarEditorOpen(true),
              },
            },
            { id: 'sidebarCompact', ...sidebarCompactRow },
          ]}
        />
        <SidebarPagesModal isOpen={sidebarEditorOpen} onClose={() => setSidebarEditorOpen(false)} />
      </div>

      {/* Plan session sync (ON by default — an explicit false opts out) */}
      <div>
        <SectionHeader icon={Lightbulb} title={t('settings.application.planSync.section')} />
        <SettingsCard
          rows={[{ id: 'planSync', ...planSyncRow }]}
          note={t('settings.application.planSync.footnote')}
        />
      </div>

      {/* Activity recording (ON by default — an explicit false opts out) */}
      <div>
        <SectionHeader icon={BarChart3} title={t('settings.application.usageLogs.section')} />
        {/*
          The breakdown answers "what am I sharing?", so it goes away with the
          sharing — same for the sentence about who can read it. What stays in
          both states is the agents caveat: it is truest for the person who just
          turned this off, since their agents keep syncing regardless.
        */}
        <DisclosureCard
          row={usageLogsRow}
          collected={
            usageLogsEnabled
              ? {
                  title: t('settings.application.usageLogs.collected'),
                  items: USAGE_LOGS_COLLECTED.map((key) => t(key)),
                }
              : undefined
          }
          excluded={
            usageLogsEnabled
              ? {
                  title: t('settings.application.usageLogs.excluded'),
                  items: USAGE_LOGS_EXCLUDED.map((key) => t(key)),
                }
              : undefined
          }
          note={
            usageLogsEnabled
              ? [t('settings.application.usageLogs.footnote'), t('settings.application.usageLogs.footnote.agents')]
              : t('settings.application.usageLogs.footnote.agents')
          }
        />
        {/* WHETHER THE RECORDING ABOVE IS ACTUALLY ARRIVING. Every link in that chain
            fails quietly by design — the shell hook ends in `|| true`, the writers
            swallow their errors so telemetry can never break a session — which made an
            empty dashboard indistinguishable from a broken pipeline. It lived on the
            About tab, where nothing else mentioned recording and it read as a verdict on
            the RELEASE. Here it is a verdict on the switch directly above it. */}
        <TelemetryHealthCard />
      </div>
    </div>
  )
}
