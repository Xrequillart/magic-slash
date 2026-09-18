import { useEffect, useState } from 'react'
import {
  AlertTriangle, BarChart3, Columns, GitPullRequest, Lightbulb,
  MonitorSmartphone, Search,
} from '@ds/desktop/icons'
import { DisclosureCard, SectionHeader, SettingsCard } from '@ds/desktop'
import { TelemetryHealthCard } from './TelemetryHealthCard'
import { SetupHealthCard } from './SetupHealthCard'
import { useToggleRow } from './ToggleRow'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import type { SpotlightShortcut } from '../../../types'

/**
 * THE APP ITSELF — how this machine is set up, and every feature that can be switched
 * off. The settings modal's Application tab, until the modal lost it.
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

/**
 * The eight chords Quick Launch will take. Also read by the Shortcuts tab, which SHOWS
 * the one in force without offering to change it — see `pages/Config/index.tsx`.
 *
 * ONE ENTRY PER KEY, and not the single label this was. A `<select>` needs a flat
 * string and joins them below; the Shortcuts tab needs the keys apart, because `Kbd`
 * sets a modifier glyph a rung above a word and a chord arriving as `'⌃ Space'`
 * would have to be split on a space that is a separator here and a KEY NAME there.
 * Composed where the chords are written rather than parsed where they are drawn.
 */
/**
 * How often the pull-request watcher looks, in milliseconds, and what each interval is
 * called. Keys rather than labels, for `SPOTLIGHT_OPTIONS`' reason: module scope is
 * evaluated once at import, so a `t()` here would pin the list to the boot language.
 */
export const PR_WATCHER_INTERVALS = [30_000, 60_000, 120_000, 300_000] as const

const PR_WATCHER_INTERVAL_LABEL: Record<(typeof PR_WATCHER_INTERVALS)[number], MessageKey> = {
  30_000: 'settings.application.prWatcher.interval30s',
  60_000: 'settings.application.prWatcher.interval1m',
  120_000: 'settings.application.prWatcher.interval2m',
  300_000: 'settings.application.prWatcher.interval5m',
}

export const SPOTLIGHT_OPTIONS: { keys: string[]; value: string }[] = [
  { keys: ['⌃', 'Space'], value: 'Control+Space' },
  { keys: ['⌃⇧', 'Space'], value: 'Control+Shift+Space' },
  { keys: ['⌥', 'Space'], value: 'Alt+Space' },
  { keys: ['⌥⇧', 'Space'], value: 'Alt+Shift+Space' },
  { keys: ['⌃', 'M'], value: 'Control+M' },
  { keys: ['⌃⇧', 'M'], value: 'Control+Shift+M' },
  { keys: ['⌥', 'M'], value: 'Alt+M' },
  { keys: ['⌥⇧', 'M'], value: 'Alt+Shift+M' },
]

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
  const { config, splitActive, toggleSplitActive, setConfig } = useStore()
  const { updateSpotlight } = useConfig()

  const [autoStart, setAutoStart] = useState(false)
  const [spotlightEnabled, setSpotlightEnabled] = useState(config?.spotlight?.enabled ?? true)
  const [spotlightShortcut, setSpotlightShortcut] = useState(config?.spotlight?.shortcut ?? 'Control+Space')
  const [spotlightError, setSpotlightError] = useState(false)
  const [usageLogsEnabled, setUsageLogsEnabled] = useState(config?.usageLogsEnabled ?? true)
  const [prWatcherEnabled, setPrWatcherEnabled] = useState(config?.prReviews?.enabled ?? true)
  const [prWatcherInterval, setPrWatcherInterval] = useState(config?.prReviews?.pollIntervalMs ?? 60_000)
  const [prWatcherAutoLaunch, setPrWatcherAutoLaunch] = useState(config?.prReviews?.autoLaunchSkills ?? false)

  useEffect(() => {
    window.electronAPI.config.getAutoStart().then(setAutoStart)
  }, [])

  const configSpotlightEnabled = config?.spotlight?.enabled
  const configSpotlightShortcut = config?.spotlight?.shortcut
  useEffect(() => {
    if (configSpotlightEnabled !== undefined) setSpotlightEnabled(configSpotlightEnabled)
    if (configSpotlightShortcut !== undefined) setSpotlightShortcut(configSpotlightShortcut)
  }, [configSpotlightEnabled, configSpotlightShortcut])

  const configUsageLogsEnabled = config?.usageLogsEnabled
  useEffect(() => {
    if (configUsageLogsEnabled !== undefined) setUsageLogsEnabled(configUsageLogsEnabled)
  }, [configUsageLogsEnabled])

  const configPrWatcherEnabled = config?.prReviews?.enabled
  const configPrWatcherInterval = config?.prReviews?.pollIntervalMs
  const configPrWatcherAutoLaunch = config?.prReviews?.autoLaunchSkills
  useEffect(() => {
    if (configPrWatcherEnabled !== undefined) setPrWatcherEnabled(configPrWatcherEnabled)
    if (configPrWatcherInterval !== undefined) setPrWatcherInterval(configPrWatcherInterval)
    if (configPrWatcherAutoLaunch !== undefined) setPrWatcherAutoLaunch(configPrWatcherAutoLaunch)
  }, [configPrWatcherEnabled, configPrWatcherInterval, configPrWatcherAutoLaunch])

  const handleSpotlightToggle = async () => {
    const newEnabled = !spotlightEnabled
    setSpotlightEnabled(newEnabled)
    setSpotlightError(false)
    try {
      const result = await updateSpotlight({ enabled: newEnabled, shortcut: spotlightShortcut })
      if (newEnabled && !result.registered) {
        setSpotlightError(true)
      }
    } catch {
      setSpotlightEnabled(!newEnabled) // revert on error
    }
  }

  const handleSpotlightShortcutChange = async (newShortcut: SpotlightShortcut) => {
    const previousShortcut = spotlightShortcut
    setSpotlightShortcut(newShortcut)
    setSpotlightError(false)
    try {
      const result = await updateSpotlight({ enabled: spotlightEnabled, shortcut: newShortcut })
      if (spotlightEnabled && !result.registered) {
        setSpotlightError(true)
      }
    } catch {
      setSpotlightShortcut(previousShortcut)
    }
  }

  // The one switch on this page whose write is the app's ordinary optimistic one, so it
  // is the one that reaches for the hook. The others each do something particular on the
  // way — registering a global shortcut with the OS, pushing the result into the store —
  // and spell their own handler above.
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

      {/* Split View Section — THE SWITCH IS THE SPLIT ITSELF, the same value the
          Control Center's tile carries. There used to be a second, wider switch behind
          it: this one said the feature was allowed, the tile said the window was in two
          panes, and both had to be on for anything to happen. Nobody could see why a lit
          switch did nothing, so the permission went and the state stayed. */}
      <div>
        <SectionHeader icon={Columns} title={t('settings.application.split.section')} />
        <SettingsCard
          rows={[
            {
              id: 'split',
              label: t('settings.application.split.label'),
              hint: t('settings.application.split.help'),
              control: {
                kind: 'switch',
                checked: splitActive,
                onChange: () => toggleSplitActive(),
                label: t('settings.application.split.label'),
              },
            },
          ]}
        />
      </div>

      {/* Spotlight Section */}
      <div>
        <SectionHeader icon={Search} title={t('settings.application.spotlight.section')} />
        <SettingsCard
          rows={[
            {
              id: 'spotlight',
              label: t('settings.application.spotlight.label'),
              hint: t('settings.application.spotlight.help'),
              control: {
                kind: 'switch',
                checked: spotlightEnabled,
                onChange: handleSpotlightToggle,
                label: t('settings.application.spotlight.label'),
              },
            },
            {
              id: 'spotlightShortcut',
              label: t('settings.application.spotlight.shortcutLabel'),
              hint: t('settings.application.spotlight.shortcutHelp'),
              control: {
                kind: 'select',
                value: spotlightShortcut,
                options: SPOTLIGHT_OPTIONS.map((opt) => ({ value: opt.value, label: opt.keys.join(' ') })),
                onChange: (next) => handleSpotlightShortcutChange(next as SpotlightShortcut),
                disabled: !spotlightEnabled,
                ariaLabel: t('settings.application.spotlight.shortcutLabel'),
                width: SELECT_WIDTH,
              },
            },
          ]}
          /* The chord is set and the OS refused to register it — another app holds it.
             The picker above still shows what was chosen, so this strip is the only
             thing saying it did not take. */
          alert={
            spotlightError
              ? { message: t('settings.application.spotlight.error'), icon: AlertTriangle }
              : undefined
          }
        />
      </div>

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

      {/* Plan session sync (ON by default — an explicit false opts out) */}
      <div>
        <SectionHeader icon={Lightbulb} title={t('settings.application.planSync.section')} />
        <SettingsCard
          rows={[{ id: 'planSync', ...planSyncRow }]}
          note={t('settings.application.planSync.footnote')}
        />
      </div>

      {/* PR Review Watcher Section */}
      <div>
        <SectionHeader icon={GitPullRequest} title={t('settings.application.prWatcher.section')} />
        <SettingsCard
          rows={[
            {
              id: 'prWatcher',
              label: t('settings.application.prWatcher.label'),
              hint: t('settings.application.prWatcher.help'),
              control: {
                kind: 'switch',
                checked: prWatcherEnabled,
                onChange: async () => {
                  const newValue = !prWatcherEnabled
                  setPrWatcherEnabled(newValue)
                  // Pushed into the store, not just written to disk: the PR card in
                  // the agent sidebar reads this setting to decide whether to say
                  // "watching is off", and it would otherwise keep claiming the
                  // opposite until the next config load.
                  setConfig(await window.electronAPI.prWatcher.setEnabled(newValue))
                },
                label: t('settings.application.prWatcher.label'),
              },
            },
            // Both are questions about a watcher that is running: how often, and what it
            // may start on its own. Left out rather than dimmed while it is not.
            prWatcherEnabled && {
              id: 'prWatcherInterval',
              label: t('settings.application.prWatcher.intervalLabel'),
              hint: t('settings.application.prWatcher.intervalHelp'),
              control: {
                kind: 'select' as const,
                value: String(prWatcherInterval),
                // The interval is a NUMBER of milliseconds and the picker deals in
                // strings, so it is parsed on the way back — where the native select
                // made the same trip through `e.target.value`.
                options: PR_WATCHER_INTERVALS.map((ms) => ({
                  value: String(ms),
                  label: t(PR_WATCHER_INTERVAL_LABEL[ms]),
                })),
                onChange: (next: string) => {
                  const newInterval = parseInt(next, 10)
                  setPrWatcherInterval(newInterval)
                  window.electronAPI.prWatcher.setInterval(newInterval)
                },
                ariaLabel: t('settings.application.prWatcher.intervalLabel'),
                width: SELECT_WIDTH,
              },
            },
            prWatcherEnabled && {
              id: 'prWatcherAutoLaunch',
              label: t('settings.application.prWatcher.autoLaunchLabel'),
              hint: t('settings.application.prWatcher.autoLaunchHelp'),
              control: {
                kind: 'switch' as const,
                checked: prWatcherAutoLaunch,
                onChange: () => {
                  const newValue = !prWatcherAutoLaunch
                  setPrWatcherAutoLaunch(newValue)
                  window.electronAPI.prWatcher.setAutoLaunchSkills(newValue)
                },
                label: t('settings.application.prWatcher.autoLaunchLabel'),
              },
            },
          ]}
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
