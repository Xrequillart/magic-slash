import { useCallback, useEffect, useState } from 'react'
import {
  ControlCenter,
  ControlCenterGroup,
  SelectIcon,
  SetupStatusCard,
  Stepper,
  ThemeGrid,
  TITLE_BAR_HEIGHT,
  ToggleButton,
  type SetupState,
  type ThemeGridOption,
} from '@ds/desktop'
import {
  Bell, BellOff, Braces, Brain, ChartSpline, CircleCheck, ClaudeCode, CloudCheck, GitPullRequest,
  GitPullRequestArrow, MessageCircleQuestionMark, MessageSquareWarning, MonitorPlay, Newspaper,
  ScrollText, SquareSplitHorizontal, TextCursorInput,
} from '@ds/desktop/icons'
import { useStore } from '../store'
import { useConfig } from '../hooks/useConfig'
import { useZoom } from '../hooks/useZoom'
import { THEMES, THEME_IDS, useTheme } from '../theme'
import { useLanguage, useT } from '../i18n'
import { showToast } from './Toast'
import {
  CODE_THEME_MODES, DEFAULT_CODE_THEME_MODE, DEFAULT_ZOOM, LANGUAGE_IDS, MAX_ZOOM, MIN_ZOOM,
  isValidCodeThemeMode, type LanguageId, type SetupStatus, type ThemeId,
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
 * FIVE SECTIONS, each a grid of four points to a row — a tile is one point, a picker or
 * the stepper three, the theme card all four — and the sections are the product owner's:
 * the machine's setup (its verdict and a re-check), appearance (the eight themes as the
 * miniatures the Appearance page paints, then the scale and the split view, then how far
 * the theme reaches — Claude Code in the terminals, and what the file preview highlights
 * code in), notifications (the master switch and every kind the Notifications page lists,
 * the kinds dark and greyed while the master is off), features, and language.
 */

export function ControlCenterMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT()
  const {
    config, updateSplitEnabled, updateSpotlight, updateNotifications, updateDailyDigestEnabled,
    updateTheme, updateLanguage, updateUsageCardEnabled, updateAgentContextEnabled,
    updateSyncClaudeTheme, updateCodeTheme,
  } = useConfig()
  const { splitEnabled, splitActive, toggleSplitEnabled, toggleSplitActive, setConfig, openSettingsModal } = useStore()
  const activeTheme = useTheme()
  const activeLanguage = useLanguage()
  const { zoom, set: setZoom, step: stepZoom } = useZoom()

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
    window.electronAPI.setup.getStatus().then(setSetup).catch(() => setSetupFailed(true))
  }, [])
  useEffect(() => {
    if (open) checkSetup()
  }, [open, checkSetup])
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

  // Absent means never chosen, which is on — the reading the main process makes. The
  // digest is the one opt-IN: absent means off, as on the Notifications page.
  const notificationsOn = config?.notifications?.enabled !== false
  /**
   * WHAT A KIND'S TILE SHOWS — and it is not quite what the config says: a kind is drawn
   * LIT ONLY WHILE THE MASTER IS LIT. With the master off, nothing will reach the person
   * whatever the per-kind flags say, and five filled circles under a red bell were the
   * sheet claiming otherwise.
   *
   * THE MASTER WRITES NOTHING BUT ITS OWN FLAG. The per-kind values stay exactly where
   * they were — `updateNotifications` in the main process merges rather than replaces,
   * deliberately — so this is a reading and not a reset: turn the master back on and
   * every tile comes back as the person left it, which on a config nobody has touched is
   * all four of them lit. The alternative was writing `false` across the block and the
   * defaults back over it, and that spends someone's "never tell me about PR reviews"
   * every time they silence the app for an afternoon.
   *
   * The tiles are `disabled` too, so an off kind cannot be pressed into a lie — the
   * value written would be true while nothing notifies.
   */
  const notification = (key: 'agentWaiting' | 'agentCompleted' | 'prReview' | 'prChangesRequested') =>
    notificationsOn && config?.notifications?.[key] !== false
  const digestOn = notificationsOn && (config?.dailyDigest?.enabled ?? false)
  const prWatcherOn = config?.prReviews?.enabled ?? true
  const planSyncOn = config?.planSyncEnabled !== false
  const usageLogsOn = config?.usageLogsEnabled !== false
  // The two optional sidebar panels — absent means never chosen, which is shown, the
  // reading the Appearance page's rows make.
  const usageCardOn = config?.usageCardEnabled !== false
  const agentContextOn = config?.agentContextEnabled !== false
  // HOW FAR THE THEME REACHES — the Appearance page's card under its picker, and the
  // same two readings: absent means on for Claude Code (a light theme with an unpainted
  // transcript reads as a bug), and the code preview follows the theme until told not to.
  const claudeThemeOn = config?.syncClaudeTheme !== false
  const codeTheme = config?.codeTheme ?? DEFAULT_CODE_THEME_MODE


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
    <ControlCenter open={open} onClose={onClose} top={TITLE_BAR_HEIGHT} label={t('controlCenter.title')}>
      {/* MACHINE SETUP — the verdict on three points and the re-check on the fourth.
          Pressing the verdict opens the Application page, where the fixes are. */}
      <ControlCenterGroup label={t('settings.application.setup.title')}>
        <SetupStatusCard
          state={setupState}
          label={t(SETUP_LABEL[setupState], { count: setupIssues })}
          openTitle={t('controlCenter.setup.open')}
          onOpen={() => { onClose(); openSettingsModal('application') }}
          refreshTitle={t('settings.application.setup.recheck')}
          onRefresh={checkSetup}
        />
      </ControlCenterGroup>

      {/* APPEARANCE — the eight themes to look at, then how far the chosen one reaches,
          then the scale and the split view: the window's own layout comes last. */}
      <ControlCenterGroup label={t('controlCenter.appearance')}>
        <ThemeGrid
          themes={themeOptions}
          value={activeTheme}
          onSelect={(id) => void write(() => updateTheme(id as ThemeId))}
        />
        {/* HOW FAR THE CHOSEN THEME REACHES, on the line DIRECTLY UNDER the miniatures —
            the Appearance page's second card, in one tile and one field. Both are
            meaningless apart from the theme above them, which is why they sit against it
            rather than after the scale: the eye picks a theme, then reads where it
            applies, and the window's own layout — the scale, the split — comes after.

            The tile first and the field after it, which is the scale row turned around:
            a tile and three points of field against three points and a tile, so the two
            lines fill the grid from opposite ends and the section reads as two pairs. */}
        <ToggleButton
          icon={ClaudeCode}
          checked={claudeThemeOn}
          onChange={(next) => void write(() => updateSyncClaudeTheme(next))}
          caption={false}
          label={t('settings.appearance.claudeTheme.label')}
        />
        {/* A SELECT AND NOT A TILE, because the choice is three-way: the code preview
            can follow the theme or be pinned to either appearance, and a circle can only
            say yes or no. `solid` and `round` are what put it in this row — the sheet's
            opaque plate, and the pill ends every control of one height wears here.

            THE TRIGGER SAYS THE SHORT WORD and the rows say the whole sentence: "Auto"
            at three tiles wide, where "Follows the theme" loses its tail, and the panel
            has the room to say what following the theme means. */}
        <SelectIcon
          icon={Braces}
          value={t(`controlCenter.codeTheme.${codeTheme}`)}
          title={t('settings.appearance.codeTheme.label')}
          size="2xl"
          tone="solid"
          round
          className="col-span-3 w-full"
          panelWidth={200}
          groups={[{
            label: t('settings.appearance.codeTheme.label'),
            items: CODE_THEME_MODES.map((mode) => ({
              id: mode,
              label: t(`settings.appearance.codeTheme.${mode}`),
              selected: mode === codeTheme,
            })),
          }]}
          // Guarded on the way back the way `AgentSort` guards its own: `onSelect` hands
          // over a string, and the type is what says this one is still a code theme.
          onSelect={({ id }) => {
            // Pulled out of the item before the closure: a property's narrowing does
            // not survive into a callback, and `write` takes one.
            if (!isValidCodeThemeMode(id) || id === codeTheme) return
            void write(() => updateCodeTheme(id))
          }}
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
            normal/split switch went when this arrived. Turning it on also turns the
            feature flag on if it was off, so the tile never lands in the state where it
            is lit and nothing happens; turning it off leaves the flag alone, since a
            window put back to one pane is not a feature being disabled. */}
        <ToggleButton
          icon={SquareSplitHorizontal}
          checked={splitActive}
          onChange={(next) => {
            if (next && !splitEnabled) { toggleSplitEnabled(); void write(() => updateSplitEnabled(true)) }
            if (next !== splitActive) toggleSplitActive()
          }}
          caption={false}
          label={t('controlCenter.splitView')}
        />
      </ControlCenterGroup>

      {/* NOTIFICATIONS — the master first, red while off, then every kind the page
          lists. The kinds are DISABLED while the master is off rather than hidden: the
          page hides them because three cards of dead controls are noise, but a tile is
          one circle, and a greyed circle says "kept, and coming back" where a missing
          one says nothing. They go DARK with it as well as grey — see `notification`:
          the master is the whole section's state, and only the config remembers what
          each kind was. */}
      <ControlCenterGroup label={t('controlCenter.notifications')}>
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
          icon={MessageCircleQuestionMark}
          checked={notification('agentWaiting')}
          disabled={!notificationsOn}
          onChange={(next) => void write(() => updateNotifications({ agentWaiting: next }))}
          caption={false}
          label={t('settings.notifications.agentWaiting.label')}
        />
        <ToggleButton
          icon={CircleCheck}
          checked={notification('agentCompleted')}
          disabled={!notificationsOn}
          onChange={(next) => void write(() => updateNotifications({ agentCompleted: next }))}
          caption={false}
          label={t('settings.notifications.agentCompleted.label')}
        />
        <ToggleButton
          icon={GitPullRequestArrow}
          checked={notification('prReview')}
          disabled={!notificationsOn}
          onChange={(next) => void write(() => updateNotifications({ prReview: next }))}
          caption={false}
          label={t('settings.notifications.prReview.label')}
        />
        <ToggleButton
          icon={MessageSquareWarning}
          checked={notification('prChangesRequested')}
          disabled={!notificationsOn}
          onChange={(next) => void write(() => updateNotifications({ prChangesRequested: next }))}
          caption={false}
          label={t('settings.notifications.prChangesRequested.label')}
        />
        <ToggleButton
          icon={Newspaper}
          checked={digestOn}
          disabled={!notificationsOn}
          onChange={(next) => void write(() => updateDailyDigestEnabled(next))}
          caption={false}
          label={t('settings.notifications.digest.label')}
        />
      </ControlCenterGroup>

      {/* FEATURES — what the app does that can be switched off. */}
      <ControlCenterGroup label={t('controlCenter.features')}>
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
        <ToggleButton
          icon={CloudCheck}
          checked={planSyncOn}
          onChange={(next) => void write(async () => {
            const result = await window.electronAPI.config.setPlanSyncEnabled(next)
            setConfig(result.config)
          })}
          caption={false}
          label={t('controlCenter.planSync')}
        />
        <ToggleButton
          icon={ScrollText}
          checked={usageLogsOn}
          onChange={(next) => void write(async () => {
            const result = await window.electronAPI.config.setUsageLogsEnabled(next)
            setConfig(result.config)
          })}
          caption={false}
          label={t('controlCenter.shareActivity')}
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
