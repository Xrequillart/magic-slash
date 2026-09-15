import { useEffect, useState } from 'react'
import {
  AlertTriangle, BarChart3, ChevronDown, Check, Columns, GitPullRequest, Lightbulb,
  MonitorSmartphone, Search, X,
} from '@ds/desktop/icons'
import { Switch } from '@ds/desktop'
import { SectionHeader } from './SectionHeader'
import { SetupHealthCard } from './SetupHealthCard'
import { ToggleRow } from './ToggleRow'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey, type Translate } from '../../i18n'
import { SELECT } from '../../theme/controls'
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
 */

/** The eight chords Quick Launch will take. Also read by the Shortcuts tab, which
 *  SHOWS the one in force without offering to change it — see `pages/Config/index.tsx`. */
export const SPOTLIGHT_OPTIONS: { label: string; value: string }[] = [
  { label: '\u2303 Space', value: 'Control+Space' },
  { label: '\u2303\u21E7 Space', value: 'Control+Shift+Space' },
  { label: '\u2325 Space', value: 'Alt+Space' },
  { label: '\u2325\u21E7 Space', value: 'Alt+Shift+Space' },
  { label: '\u2303 M', value: 'Control+M' },
  { label: '\u2303\u21E7 M', value: 'Control+Shift+M' },
  { label: '\u2325 M', value: 'Alt+M' },
  { label: '\u2325\u21E7 M', value: 'Alt+Shift+M' },
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

/**
 * What activity recording does and does not send, side by side. Shown whatever
 * the toggle's state: someone who turned it off is exactly the person who wants
 * to know what they turned off, and someone deciding needs the two lists to
 * compare — a paragraph the length of both never gets read.
 *
 * `t` is passed in rather than pulled from useT() so the desktop and the webapp's
 * copy of this block stay diffable line by line.
 */
function UsageLogsBreakdown({ t }: { t: Translate }) {
  const columns = [
    { titleKey: 'settings.application.usageLogs.collected', keys: USAGE_LOGS_COLLECTED, Icon: Check, tone: 'text-green' },
    { titleKey: 'settings.application.usageLogs.excluded', keys: USAGE_LOGS_EXCLUDED, Icon: X, tone: 'text-red' },
  ] as const

  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 mt-4 pt-4 border-t border-line-subtle">
      {columns.map(({ titleKey, keys, Icon, tone }) => (
        <div key={titleKey}>
          <div className="text-[11px] uppercase tracking-wider text-text-secondary/50 mb-2">
            {t(titleKey)}
          </div>
          <ul className="space-y-1.5">
            {keys.map((key) => (
              <li key={key} className="flex items-start gap-2 text-xs text-text-secondary leading-snug">
                <Icon className={`w-3.5 h-3.5 shrink-0 mt-px ${tone}`} />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

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
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.application.split.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.application.split.help')}</div>
            </div>
            <Switch
              checked={splitActive}
              onChange={() => toggleSplitActive()}
              label={t('settings.application.split.label')}
            />
          </div>
        </div>
      </div>

      {/* Spotlight Section */}
      <div>
        <SectionHeader icon={Search} title={t('settings.application.spotlight.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.application.spotlight.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.application.spotlight.help')}</div>
            </div>
            <Switch
              checked={spotlightEnabled}
              onChange={handleSpotlightToggle}
              label={t('settings.application.spotlight.label')}
            />
          </div>
          <div className="border-t border-line-subtle pt-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{t('settings.application.spotlight.shortcutLabel')}</div>
                <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.application.spotlight.shortcutHelp')}</div>
              </div>
              <div className="relative">
                <select
                  value={spotlightShortcut}
                  onChange={(e) => handleSpotlightShortcutChange(e.target.value as SpotlightShortcut)}
                  disabled={!spotlightEnabled}
                  className={`${SELECT} w-52 disabled:opacity-50`}
                >
                  {SPOTLIGHT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icon pointer-events-none" />
              </div>
            </div>
          </div>
          {spotlightError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{t('settings.application.spotlight.error')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Background App Section */}
      <div>
        <SectionHeader icon={MonitorSmartphone} title={t('settings.application.background.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.application.background.autoStartLabel')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.application.background.autoStartHelp')}</div>
            </div>
            <Switch
              checked={autoStart}
              onChange={() => {
                const newValue = !autoStart
                setAutoStart(newValue)
                window.electronAPI.config.setAutoStart(newValue)
              }}
              label={t('settings.application.background.autoStartLabel')}
            />
          </div>
          <div className="border-t border-line-subtle pt-4">
            <div className="text-sm font-medium mb-1">{t('settings.application.background.menuBarLabel')}</div>
            <div className="text-xs text-text-secondary/50">
              {t('settings.application.background.menuBarHelp')}
            </div>
          </div>
        </div>
      </div>

      {/* Plan session sync (ON by default — an explicit false opts out) */}
      <div>
        <SectionHeader icon={Lightbulb} title={t('settings.application.planSync.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <ToggleRow
            label={t('settings.application.planSync.label')}
            help={t('settings.application.planSync.help')}
            value={config?.planSyncEnabled}
            onChange={async (next) => {
              const result = await window.electronAPI.config.setPlanSyncEnabled(next)
              setConfig(result.config)
            }}
            errorMessage={t('settings.application.planSync.error')}
          />
          <div className="text-[11px] text-text-secondary/40 mt-3 leading-snug">
            {t('settings.application.planSync.footnote')}
          </div>
        </div>
      </div>

      {/* PR Review Watcher Section */}
      <div>
        <SectionHeader icon={GitPullRequest} title={t('settings.application.prWatcher.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('settings.application.prWatcher.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.application.prWatcher.help')}</div>
            </div>
            <Switch
              checked={prWatcherEnabled}
              onChange={async () => {
                const newValue = !prWatcherEnabled
                setPrWatcherEnabled(newValue)
                // Pushed into the store, not just written to disk: the PR card in
                // the agent sidebar reads this setting to decide whether to say
                // "watching is off", and it would otherwise keep claiming the
                // opposite until the next config load.
                setConfig(await window.electronAPI.prWatcher.setEnabled(newValue))
              }}
              label={t('settings.application.prWatcher.label')}
            />
          </div>
          {prWatcherEnabled && (
            <>
              <div className="border-t border-line-subtle pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{t('settings.application.prWatcher.intervalLabel')}</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.application.prWatcher.intervalHelp')}</div>
                  </div>
                  <div className="relative">
                    <select
                      value={prWatcherInterval}
                      onChange={(e) => {
                        const newInterval = parseInt(e.target.value, 10)
                        setPrWatcherInterval(newInterval)
                        window.electronAPI.prWatcher.setInterval(newInterval)
                      }}
                      className={`${SELECT} w-52`}
                    >
                      <option value={30_000}>{t('settings.application.prWatcher.interval30s')}</option>
                      <option value={60_000}>{t('settings.application.prWatcher.interval1m')}</option>
                      <option value={120_000}>{t('settings.application.prWatcher.interval2m')}</option>
                      <option value={300_000}>{t('settings.application.prWatcher.interval5m')}</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icon pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="border-t border-line-subtle pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{t('settings.application.prWatcher.autoLaunchLabel')}</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">{t('settings.application.prWatcher.autoLaunchHelp')}</div>
                  </div>
                  <Switch
              checked={prWatcherAutoLaunch}
              onChange={() => {
                const newValue = !prWatcherAutoLaunch
                setPrWatcherAutoLaunch(newValue)
                window.electronAPI.prWatcher.setAutoLaunchSkills(newValue)
              }}
              label={t('settings.application.prWatcher.autoLaunchLabel')}
            />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Activity recording (ON by default — an explicit false opts out) */}
      <div>
        <SectionHeader icon={BarChart3} title={t('settings.application.usageLogs.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t('settings.application.usageLogs.label')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">
                {t('settings.application.usageLogs.help')}
              </div>
            </div>
            <Switch
              checked={usageLogsEnabled}
              onChange={async () => {
                const newValue = !usageLogsEnabled
                setUsageLogsEnabled(newValue)
                const result = await window.electronAPI.config.setUsageLogsEnabled(newValue)
                setConfig(result.config)
              }}
              label={t('settings.application.usageLogs.label')}
            />
          </div>
          {/*
            The breakdown answers "what am I sharing?", so it goes away with the
            sharing — same for the sentence about who can read it. What stays in
            both states is the agents caveat: it is truest for the person who just
            turned this off, since their agents keep syncing regardless.
          */}
          {usageLogsEnabled && (
            <>
              <UsageLogsBreakdown t={t} />
              <div className="text-[11px] text-text-secondary/40 mt-3 leading-snug">
                {t('settings.application.usageLogs.footnote')}
              </div>
            </>
          )}
          <div className="text-[11px] text-text-secondary/40 mt-3 leading-snug">
            {t('settings.application.usageLogs.footnote.agents')}
          </div>
        </div>
      </div>
    </div>
  )
}
