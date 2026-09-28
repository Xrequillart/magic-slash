import { useEffect, useState } from 'react'
import { AlertTriangle, Rocket, TextCursorInput } from '@ds/desktop/icons'
import { SectionHeader, SettingsCard } from '@ds/desktop'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { useT } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import { showToast } from '../../components/Toast'
import { useToggleRow } from './ToggleRow'
import { LAUNCH_MODE_OPTIONS } from './AgentsPage'
import type { LaunchMode, SpotlightShortcut } from '../../../types'

/**
 * QUICK LAUNCH: the bar a global chord opens from anywhere on the Mac, which starts an
 * agent on whatever is typed into it.
 *
 * It was a section of Application, between the machine setup and the background app. A
 * page of its own, under Features, for the reason Split view got one: the feature has
 * room to grow, and the quick settings sheet already treats it as one of the app's
 * features (its tile carries the same mark as this page's heading).
 */

/**
 * The eight chords Quick Launch will take. Also read by the Shortcuts tab, which SHOWS
 * the one in force without offering to change it.
 *
 * ONE ENTRY PER KEY, and not the single label this was. A `<select>` needs a flat
 * string and joins them below; the Shortcuts tab needs the keys apart, because `Kbd`
 * sets a modifier glyph a rung above a word and a chord arriving as `'⌃ Space'`
 * would have to be split on a space that is a separator here and a KEY NAME there.
 * Composed where the chords are written rather than parsed where they are drawn.
 */
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

export function QuickLaunchPage() {
  const t = useT()
  const config = useStore((s) => s.config)
  const { updateSpotlight } = useConfig()

  const [spotlightEnabled, setSpotlightEnabled] = useState(config?.spotlight?.enabled ?? true)
  const [spotlightShortcut, setSpotlightShortcut] = useState(config?.spotlight?.shortcut ?? 'Control+Space')
  const [spotlightError, setSpotlightError] = useState(false)

  const configSpotlightEnabled = config?.spotlight?.enabled
  const configSpotlightShortcut = config?.spotlight?.shortcut
  useEffect(() => {
    if (configSpotlightEnabled !== undefined) setSpotlightEnabled(configSpotlightEnabled)
    if (configSpotlightShortcut !== undefined) setSpotlightShortcut(configSpotlightShortcut)
  }, [configSpotlightEnabled, configSpotlightShortcut])

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
      <div>
        <SectionHeader icon={TextCursorInput} title={t('settings.application.spotlight.section')} />
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
      <LaunchSection />
    </div>
  )
}

/** "The Agents page's" in the mode picker: no override, the ordinary launch mode. */
const INHERIT = '__inherit__'

/**
 * WHAT A LAUNCH DOES: which repository the agent opens in, which permission mode it
 * starts in, and whether the main window comes forward for it.
 */
function LaunchSection() {
  const t = useT()
  const config = useStore((s) => s.config)
  const { updateQuickLaunch } = useConfig()

  const storedRepo = config?.quickLaunchRepo ?? 'first'
  const storedMode = config?.quickLaunchLaunchMode ?? INHERIT
  const [repo, setRepo] = useState(storedRepo)
  const [mode, setMode] = useState<string>(storedMode)
  const [showBypassWarning, setShowBypassWarning] = useState(false)
  useEffect(() => setRepo(storedRepo), [storedRepo])
  useEffect(() => setMode(storedMode), [storedMode])

  // Optimistic, then reverted on failure: the shape every write in Settings uses.
  const write = async (patch: Parameters<typeof updateQuickLaunch>[0], revert: () => void) => {
    try {
      await updateQuickLaunch(patch)
    } catch (error) {
      revert()
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const chooseRepo = (next: string) => {
    if (next === repo) return
    const previous = repo
    setRepo(next)
    void write({ repo: next }, () => setRepo(previous))
  }

  const applyMode = (next: string) => {
    const previous = mode
    setMode(next)
    setShowBypassWarning(false)
    void write({ launchMode: next === INHERIT ? null : (next as LaunchMode) }, () => setMode(previous))
  }

  // Bypass asks first here too, as on the Agents page: a prompt typed into a bar from
  // anywhere on the Mac, run with every permission, is the last place to skip the question.
  const chooseMode = (next: string) => {
    if (next === mode) return
    if (next === 'bypassPermissions') return setShowBypassWarning(true)
    applyMode(next)
  }

  const backgroundRow = useToggleRow({
    label: t('settings.quickLaunch.background.label'),
    help: t('settings.quickLaunch.background.help'),
    // Absent is OFF here, unlike the rows that read absent as on: the main window has
    // always come forward, and an untouched account keeps that.
    value: config?.quickLaunchBackground ?? false,
    onChange: (next) => updateQuickLaunch({ background: next }),
    errorMessage: t('toast.settingUpdateFailed'),
  })

  const repositories = Object.keys(config?.repositories ?? {})
  const repoOptions = [
    { value: 'first', label: t('settings.quickLaunch.repo.first') },
    { value: 'match', label: t('settings.quickLaunch.repo.match') },
    ...repositories.map((name) => ({ value: name, label: name })),
    // A repository removed since it was picked stays on screen as what is stored; the
    // launch itself falls back to the first one (quickLaunchRepo.ts).
    ...(repo !== 'first' && repo !== 'match' && !repositories.includes(repo) ? [{ value: repo, label: repo }] : []),
  ]
  const repoNote = repo === 'first'
    ? t('settings.quickLaunch.repo.first.help')
    : repo === 'match'
      ? t('settings.quickLaunch.repo.match.help')
      : undefined

  const inherited = LAUNCH_MODE_OPTIONS.find((o) => o.value === (config?.launchMode ?? 'default'))
  const active = LAUNCH_MODE_OPTIONS.find((o) => o.value === mode)
  const modeOptions = [
    { value: INHERIT, label: t('settings.quickLaunch.mode.inherit', { mode: inherited ? t(inherited.labelKey) : '' }) },
    ...LAUNCH_MODE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
  ]

  return (
    <div>
      <SectionHeader icon={Rocket} title={t('settings.quickLaunch.launch.section')} />
      <SettingsCard
        rows={[
          {
            id: 'quickLaunchRepo',
            label: t('settings.quickLaunch.repo.label'),
            hint: t('settings.quickLaunch.repo.help'),
            note: repoNote,
            control: {
              kind: 'select',
              value: repo,
              options: repoOptions,
              onChange: chooseRepo,
              ariaLabel: t('settings.quickLaunch.repo.label'),
              width: SELECT_WIDTH,
            },
          },
          {
            id: 'quickLaunchLaunchMode',
            label: t('settings.quickLaunch.mode.label'),
            hint: t('settings.quickLaunch.mode.help'),
            note: mode === INHERIT ? t('settings.quickLaunch.mode.inherit.help') : active ? t(active.descriptionKey) : undefined,
            control: {
              kind: 'select',
              value: mode,
              options: modeOptions,
              onChange: chooseMode,
              ariaLabel: t('settings.quickLaunch.mode.label'),
              width: SELECT_WIDTH,
            },
          },
          { id: 'quickLaunchBackground', ...backgroundRow },
        ]}
        alert={
          showBypassWarning
            ? {
                message: t('settings.launchMode.bypassWarning'),
                icon: AlertTriangle,
                actions: [
                  { label: t('settings.launchMode.bypassConfirm'), primary: true, onClick: () => applyMode('bypassPermissions') },
                  { label: t('common.cancel'), onClick: () => setShowBypassWarning(false) },
                ],
              }
            : undefined
        }
      />
    </div>
  )
}
