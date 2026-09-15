import { useCallback, useEffect, useState } from 'react'
import {
  ControlCenter,
  ControlCenterGroup,
  Label,
  SetupStatusCard,
  Stepper,
  ThemeGrid,
  TITLE_BAR_HEIGHT,
  ToggleButton,
  type SetupState,
  type ThemeGridOption,
} from '@ds/desktop'
import {
  Bell, BellOff, Brain, ChartSpline, Cog, GitPullRequest, MonitorPlay,
  SquareSplitHorizontal, TextCursorInput,
} from '@ds/desktop/icons'
import { AllSettingsPanel } from './AllSettingsPanel'
import { getSetupStatus, SETUP_SIMULATION_EVENT } from '../dev/simulatedSetup'
import { useStore } from '../store'
import { useConfig } from '../hooks/useConfig'
import { useZoom } from '../hooks/useZoom'
import { THEMES, THEME_IDS, useTheme } from '../theme'
import { useLanguage, useT } from '../i18n'
import { showToast } from './Toast'
import {
  DEFAULT_ZOOM, LANGUAGE_IDS, MAX_ZOOM, MIN_ZOOM, type LanguageId, type SetupStatus, type ThemeId,
} from '../../types'

/**
 * THE QUICK SETTINGS, wired — what comes down when the title bar's sliders are pressed.
 *
 * The drawing is `ControlCenter` in `@ds/desktop`; this file is the store, the config
 * hook, the translator and the one-line handlers, which is the same split `TitleBar`
 * makes with `AppTitleBar`. Nothing here knows how the sheet slides or fades.
 *
 * WHAT IS ON IT, and why these and not everything: the Settings pages hold some forty
 * controls, and a menu that pulls down from the bar has room for the ones a person
 * reaches for WITHOUT wanting a page — the features that are on or off, the scale, the
 * theme and the language. A polling interval, a keyboard shortcut, a theme's reach into
 * Claude Code's terminal, the version and its changelog: those keep their rows on the
 * pages. Nothing is moved OFF the pages by this menu; it is a second, faster door to
 * the same values.
 *
 * FOUR SECTIONS, each a grid of four points to a row — a tile is one point, a picker or
 * the stepper three, the theme card all four — and the sections are the product owner's:
 * the machine's setup (its verdict and a re-check), appearance (the eight themes as the
 * miniatures the Appearance page paints, then the scale and the split view), features
 * (notifications first, then what the app does that can be switched off), and language.
 */

export function ControlCenterMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const {
    config, updateSpotlight, updateNotifications,
    updateTheme, updateLanguage, updateUsageCardEnabled, updateAgentContextEnabled,
  } = useConfig()
  const { splitActive, toggleSplitActive, setConfig } = useStore()
  const activeTheme = useTheme()
  const activeLanguage = useLanguage()
  const { zoom, set: setZoom, step: stepZoom } = useZoom()

  /**
   * WHETHER THE ALL-SETTINGS PANEL IS OUT, beside the sheet.
   *
   * Here and not in the store, because nothing outside this menu opens it and nothing
   * outside this menu needs to know: it is the state of one control on one sheet. It is
   * cleared whenever the sheet goes, so the menu always comes back the way it opens —
   * tiles first, and the page only if you ask for it again.
   */
  const [allSettings, setAllSettings] = useState(false)
  useEffect(() => {
    if (!open) setAllSettings(false)
  }, [open])

  // ── Launch at login: not in the config, asked of the main process ─────────
  const [autoStart, setAutoStart] = useState(false)
  useEffect(() => {
    if (!open) return
    window.electronAPI.config.getAutoStart().then(setAutoStart)
  }, [open])

  // ── Machine setup: the verdict `SetupHealthCard` gives, in two words ───────
  // Null while the check is in flight, so the card shows it is checking rather than a
  // verdict computed the last time the sheet was open. Checked on every open — setups
  // rot, which is the whole reason that card exists — and again on the refresh tile.
  const [setup, setSetup] = useState<SetupStatus | null>(null)
  const [setupFailed, setSetupFailed] = useState(false)
  const checkSetup = useCallback(() => {
    setSetup(null)
    setSetupFailed(false)
    // Through `dev/simulatedSetup` and not straight to the IPC, so the debug menu can
    // show what a machine in trouble looks like here. Outside the dev server it is the
    // IPC call and nothing else.
    getSetupStatus().then(setSetup).catch(() => setSetupFailed(true))
  }, [])
  useEffect(() => {
    if (open) checkSetup()
  }, [open, checkSetup])
  // The debug switch flipping while the sheet is down: ask again, so the verdict changes
  // under the eye rather than on the next open.
  useEffect(() => {
    window.addEventListener(SETUP_SIMULATION_EVENT, checkSetup)
    return () => window.removeEventListener(SETUP_SIMULATION_EVENT, checkSetup)
  }, [checkSetup])
  // The same three checks `SetupHealthCard` makes, counted rather than listed: the
  // required tools missing or too old, the MCP servers of the chosen integrations not
  // configured, the skills not installed.
  const setupIssues = setup
    ? setup.prerequisites.filter((p) => p.required && (!p.installed || p.outdated)).length
      + setup.mcpServers.filter((m) => m.state !== 'configured' && (m.id === 'github' ? setup.integrations.github : setup.integrations.atlassian)).length
      + setup.missingSkills.length
    : 0
  const setupState: SetupState = setupFailed ? 'failed' : setup === null ? 'checking' : setupIssues > 0 ? 'issues' : 'ready'

  // ── Quick Launch: a write that can succeed and still not register ───────────
  const [spotlightEnabled, setSpotlightEnabled] = useState(config?.spotlight?.enabled ?? true)
  const configSpotlightEnabled = config?.spotlight?.enabled
  useEffect(() => {
    if (configSpotlightEnabled !== undefined) setSpotlightEnabled(configSpotlightEnabled)
  }, [configSpotlightEnabled])

  const toggleSpotlight = async (next: boolean) => {
    setSpotlightEnabled(next)
    try {
      const result = await updateSpotlight({ enabled: next, shortcut: config?.spotlight?.shortcut ?? 'Control+Space' })
      if (next && !result.registered) showToast(t('settings.application.spotlight.error'), 'error')
    } catch {
      setSpotlightEnabled(!next)
    }
  }

  const toggleAutoStart = async (next: boolean) => {
    setAutoStart(next)
    try {
      await window.electronAPI.config.setAutoStart(next)
    } catch (error) {
      setAutoStart(!next)
      showToast(error instanceof Error ? error.message : t('controlCenter.saveFailed'), 'error')
    }
  }

  /**
   * The config-backed tiles share one shape: fire the write, let the store move the
   * tile, and if the write throws, say so. There is no local copy to revert because
   * the tile was never told the new value — a failed write leaves it where it was.
   */
  const write = async (run: () => Promise<unknown>) => {
    try {
      await run()
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('controlCenter.saveFailed'), 'error')
    }
  }

  // Absent means never chosen, which is on — the reading the main process makes. WHICH
  // KINDS it may speak about is the Notifications page's question now, not the sheet's;
  // this tile is the master and nothing else.
  const notificationsOn = config?.notifications?.enabled !== false
  const prWatcherOn = config?.prReviews?.enabled ?? true
  // The two optional sidebar panels — absent means never chosen, which is shown, the
  // reading the Appearance page's rows make.
  const usageCardOn = config?.usageCardEnabled !== false
  const agentContextOn = config?.agentContextEnabled !== false


  const percent = Math.round(zoom * 100)

  // The registry's eight, as the five colours a swatch is made of — resolved here,
  // because `ThemeGrid` knows no theme and the registry cannot move into the design
  // system (the main process reads it too).
  const themeOptions: ThemeGridOption[] = THEME_IDS.map((id) => {
    const { tokens } = THEMES[id]
    return {
      id,
      label: t(THEMES[id].labelKey),
      colors: {
        floor: `rgb(${tokens.bgRgb})`,
        panel: tokens.surfaceStrong,
        line: tokens.lineStrong,
        ink: `rgb(${tokens.inkRgb})`,
        accent: `rgb(${tokens.accentRgb})`,
      },
    }
  })

  return (
    <ControlCenter
      open={open}
      onClose={onClose}
      top={TITLE_BAR_HEIGHT}
      label={t('controlCenter.title')}
      aside={<AllSettingsPanel />}
      asideOpen={allSettings}
    >
      {/* MACHINE SETUP — the verdict on three points and the re-check on the fourth.
          Pressing the verdict opens the panel beside the sheet, where the setup card
          with the fixes is the first thing on it. It used to open the settings modal's
          Application tab; the tab is gone and the card came with it, so the menu no
          longer has to send you to another window to act on what it just told you. */}
      <ControlCenterGroup label={t('settings.application.setup.title')}>
        <SetupStatusCard
          state={setupState}
          label={t(SETUP_LABEL[setupState], { count: setupIssues })}
          openTitle={t('controlCenter.setup.open')}
          onOpen={() => setAllSettings(true)}
          refreshTitle={t('settings.application.setup.recheck')}
          onRefresh={checkSetup}
        />
      </ControlCenterGroup>

      {/* APPEARANCE — the eight themes to look at, then the scale and the split view.
          HOW FAR THE THEME REACHES IS NOT HERE: Claude Code's terminals and the file
          preview's highlighting were a tile and a picker on this row for a while, and
          they went back to the Appearance page in the settings panel. A tile says
          whether a feature is on; "does the code preview follow the theme" is a
          sentence, and the sheet has no room for the sentence. */}
      <ControlCenterGroup label={t('controlCenter.appearance')}>
        <ThemeGrid
          themes={themeOptions}
          value={activeTheme}
          onSelect={(id) => void write(() => updateTheme(id as ThemeId))}
        />
        <Stepper
          value={`${percent}%`}
          label={t('settings.appearance.scale')}
          className="col-span-3 w-full"
          onDecrement={() => stepZoom(-1)}
          onIncrement={() => stepZoom(1)}
          canDecrement={zoom > MIN_ZOOM}
          canIncrement={zoom < MAX_ZOOM}
          decrementTitle={t('menu.zoomOut')}
          incrementTitle={t('menu.zoomIn')}
          onReset={() => setZoom(DEFAULT_ZOOM)}
          canReset={zoom !== DEFAULT_ZOOM}
          resetTitle={t('settings.appearance.zoomReset')}
        />
        {/* The split view beside the scale: both are about how the window is laid out.
            THE TILE IS THE SPLIT ITSELF, not the permission for it — the title bar's
            normal/split switch went when this arrived, and the feature flag that used to
            sit behind it went too. One switch, one meaning: the window is in two panes
            or it is not, and the Application page says the same thing with the same
            value. */}
        <ToggleButton
          icon={SquareSplitHorizontal}
          checked={splitActive}
          onChange={(next) => {
            if (next !== splitActive) toggleSplitActive()
          }}
          caption={false}
          label={t('controlCenter.splitView')}
        />
      </ControlCenterGroup>

      {/* FEATURES — what the app does that can be switched off, NOTIFICATIONS FIRST.
          They were a section of their own, six tiles: a master and every kind the
          Notifications page lists. The kinds went back to that page — a tile can say
          whether the app may speak to you, and it takes a page to say which of five
          things it may speak about — and one switch is not a section, so the master
          stands at the head of this one. It is first because it is the loudest thing
          the app does: everything else here changes what you see when you look, this
          changes what reaches you when you are not looking. */}
      <ControlCenterGroup label={t('controlCenter.features')}>
        <ToggleButton
          icon={Bell}
          offIcon={BellOff}
          offTone="danger"
          checked={notificationsOn}
          onChange={(next) => void write(() => updateNotifications({ enabled: next }))}
          caption={false}
          label={t('settings.notifications.master.label')}
        />
        <ToggleButton
          icon={TextCursorInput}
          checked={spotlightEnabled}
          onChange={toggleSpotlight}
          caption={false}
          label={t('controlCenter.quickLaunch')}
        />
        <ToggleButton
          icon={MonitorPlay}
          checked={autoStart}
          onChange={toggleAutoStart}
          caption={false}
          label={t('controlCenter.launchAtLogin')}
        />
        <ToggleButton
          icon={ChartSpline}
          checked={usageCardOn}
          onChange={(next) => void write(() => updateUsageCardEnabled(next))}
          caption={false}
          label={t('settings.appearance.sidebars.usageCard.label')}
        />
        <ToggleButton
          icon={Brain}
          checked={agentContextOn}
          onChange={(next) => void write(() => updateAgentContextEnabled(next))}
          caption={false}
          label={t('settings.appearance.sidebars.agentContext.label')}
        />
        <ToggleButton
          icon={GitPullRequest}
          checked={prWatcherOn}
          onChange={(next) => void write(async () => setConfig(await window.electronAPI.prWatcher.setEnabled(next)))}
          caption={false}
          label={t('controlCenter.prWatcher')}
        />
      </ControlCenterGroup>

      {/* LANGUAGE — one tile per language, its flag on it, the one in force lit: the
          marketing site's row of flags, as tiles. A radio in a switch's clothes: pressing
          the lit one does nothing, pressing another moves the light. */}
      <ControlCenterGroup label={t('controlCenter.language')}>
        {LANGUAGE_IDS.map((id) => (
          <ToggleButton
            key={id}
            flag={id}
            checked={id === activeLanguage}
            onChange={(next) => { if (next && id !== activeLanguage) void write(() => updateLanguage(id)) }}
            caption={false}
            label={LANGUAGE_AUTONYMS[id]}
          />
        ))}
      </ControlCenterGroup>

      {/* ALL SETTINGS — the way to everything the tiles cannot say, under the last
          group and centred: a foot, not a fifth section, so it takes a `Label` rather
          than a tile. A LABEL AND NOT A BUTTON because that is what this folder's one
          chip is — a mark and a word on a plate — and `onClick` is what makes it
          pressable at all; without one it would light up under the cursor and do
          nothing, which is the bug that prop exists to prevent.

          It TOGGLES rather than opens: the control that brought the panel out is the
          obvious thing to press to put it away, and it is the only one on screen — the
          panel has no chrome of its own. */}
      <div className="flex justify-center">
        <Label icon={Cog} size="md" onClick={() => setAllSettings((out) => !out)}>
          {t('controlCenter.allSettings')}
        </Label>
      </div>
    </ControlCenter>
  )
}

/** The two words per setup state; `issues` carries the count. */
const SETUP_LABEL = {
  checking: 'controlCenter.setup.checking',
  ready: 'controlCenter.setup.ready',
  issues: 'controlCenter.setup.issues',
  failed: 'controlCenter.setup.failed',
} as const

/**
 * Each language named in itself — the same two words `LanguageSelect` carries, and for
 * the same reason: the list has to read correctly whatever the app is showing, so it
 * needs no translation and is clear of the module-scope freeze a `t()` here would bring.
 */
const LANGUAGE_AUTONYMS: Record<LanguageId, string> = {
  en: 'English',
  fr: 'Français',
}
