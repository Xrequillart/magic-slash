import { Palette, PanelsTopLeft, Scaling } from '@ds/desktop/icons'
import {
  SectionHeader,
  SettingsCard,
  Text,
  ThemePreviewGrid,
  type ThemePreviewOption,
} from '@ds/desktop'
import { useConfig } from '../../hooks/useConfig'
import { useZoom } from '../../hooks/useZoom'
import { showToast } from '../../components/Toast'
import { useToggleRow } from './ToggleRow'
import { useFormatSelect } from './FormatSelect'
import { THEMES, THEME_IDS, useTheme } from '../../theme'
import { useT } from '../../i18n'
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, type ThemeId } from '../../../types'

/**
 * WHAT THE WINDOW LOOKS LIKE: the theme, how far it reaches, which optional panels are
 * on, and how big the whole thing is drawn.
 *
 * ── FOUR BLOCKS, ALL OF THEM THE DESIGN SYSTEM'S ──────────────────────────────────
 *
 * `ThemePreviewGrid` for the eight miniatures and `SettingsCard` for the three cards
 * under them. What went with the migration: a hand-drawn tile with its own ring and its
 * own truncation, a `ThemePreview` that painted a window out of nine inline styles,
 * three spellings of the settings plate, a `CodeThemeSelect` that respelled
 * `SettingRow`'s own arrangement to "line up inside the card" — its comment said so —
 * and the interface scale, which was three bordered squares and a number that a reader
 * had to group by proximity into one control.
 *
 * THE SCALE IS A `Stepper` NOW, through `SettingRow`'s new `stepper` kind: the value sits
 * visibly between the two arrows that change it, and the reset is the readout itself,
 * which is the platform's own convention. Three buttons became one pill.
 *
 * WHAT IS LEFT HERE is this app's: the theme registry (which the main process reads too,
 * so it cannot move into the design system), the optimistic writes, and which of the two
 * language-independent numbers the zoom is at.
 */

export function AppearancePage() {
  const {
    config,
    updateTheme,
    updateSyncClaudeTheme,
    updateUsageCardEnabled,
    updateUsageCardMinimized,
  } = useConfig()
  const active = useTheme()
  const { zoom, set, step } = useZoom()
  const t = useT()

  const choose = async (id: ThemeId) => {
    if (id === active) return
    try {
      await updateTheme(id)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.themeChangeFailed'), 'error')
    }
  }

  // The registry's eight, as the colours a miniature is painted with — resolved here,
  // because `ThemePreviewGrid` knows no theme and the registry cannot move into the
  // design system (the main process reads it too). Same mapping as the quick-settings
  // sheet's swatches, plus the three fields a window has and a colour patch has not.
  const themes: ThemePreviewOption[] = THEME_IDS.map((id) => {
    const { tokens } = THEMES[id]
    return {
      id,
      label: t(THEMES[id].labelKey),
      description: t(THEMES[id].descriptionKey),
      colors: {
        floor: `rgb(${tokens.bgRgb})`,
        bar: tokens.surface,
        panel: tokens.surfaceStrong,
        line: tokens.lineStrong,
        ink: `rgb(${tokens.inkRgb})`,
        textSecondary: `rgb(${tokens.textSecondaryRgb})`,
        accent: `rgb(${tokens.accentRgb})`,
        lights: [`rgb(${tokens.redRgb})`, `rgb(${tokens.yellowRgb})`, `rgb(${tokens.greenRgb})`],
      },
    }
  })

  // At the top of the component and not inside the rows' `trailing` callbacks: these are
  // hooks, and a hook called from a callback is a hook called conditionally. What the
  // rows decide is whether to OFFER the control, which is what the callbacks do with the
  // value these return.
  const usageCardFormat = useFormatSelect({
    minimized: config?.usageCardMinimized,
    onChange: updateUsageCardMinimized,
    ariaLabel: `${t('settings.appearance.sidebars.usageCard.label')} — ${t('settings.appearance.sidebars.format.label')}`,
    errorMessage: t('toast.sidebarPanelFailed'),
  })

  const claudeThemeRow = useToggleRow({
    label: t('settings.appearance.claudeTheme.label'),
    help: t('settings.appearance.claudeTheme.help'),
    value: config?.syncClaudeTheme,
    onChange: updateSyncClaudeTheme,
    errorMessage: t('toast.claudeThemeSyncFailed'),
  })

  const usageCardRow = useToggleRow({
    label: t('settings.appearance.sidebars.usageCard.label'),
    help: t('settings.appearance.sidebars.usageCard.help'),
    value: config?.usageCardEnabled,
    onChange: updateUsageCardEnabled,
    errorMessage: t('toast.sidebarPanelFailed'),
    /* Hidden card, hidden format: the choice still exists in the config and comes back
       untouched when the card does, but offering it here would be asking how to lay out
       something that is not on screen. */
    trailing: (enabled) => enabled && usageCardFormat,
  })

  return (
    <div>
      <SectionHeader icon={Palette} title={t('settings.appearance.themeSection')} />
      <ThemePreviewGrid themes={themes} value={active} onSelect={(id) => choose(id as ThemeId)} />
      <Text size="xs" tone="secondary" className="mt-3 block opacity-50">
        {t('settings.appearance.followsAccount')}
      </Text>

      {/* Part of the theme section, not a section of its own: these two decide how far
          the theme above reaches, and read anywhere else they are a question about
          nothing. */}
      <SettingsCard
        className="mt-3"
        rows={[{ id: 'claudeTheme', ...claudeThemeRow }]}
      />

      <div className="mt-8">
        <SectionHeader icon={PanelsTopLeft} title={t('settings.appearance.sidebars.section')} />
        {/* The left sidebar's optional panel. Its switch used to live under
            Application, next to the machine setup and the background workers, things the
            app DOES; showing a panel or not is a decision about what the window looks
            like. The agent's context card, its counterpart on the right, moved to the
            Agents page with everything else about an agent. */}
        <SettingsCard rows={[{ id: 'usageCard', ...usageCardRow }]} />
      </div>

      <div className="mt-8">
        <SectionHeader icon={Scaling} title={t('settings.appearance.displaySection')} />
        {/* The scale walks the same steps as ⌘+ / ⌘−, and the value shown follows the
            menu too — both go through the main process. The caps at the end of the help
            line are the row's (`hintKeys`), and where the value is KEPT is the card's
            note: it is a fact about the whole card rather than about the control. */}
        <SettingsCard
          rows={[
            {
              id: 'zoom',
              label: t('settings.appearance.scale'),
              hint: t('settings.appearance.scaleHelp'),
              hintKeys: [['⌘', '+'], ['⌘', '−']],
              control: {
                kind: 'stepper',
                // Formatted here: the stepper draws a readout and does not know the
                // number — the zoom walks 0.8, 0.9, 1, 1.1, 1.25, and a control that
                // added one would be wrong at every rung.
                value: `${Math.round(zoom * 100)}%`,
                label: t('settings.appearance.scale'),
                onDecrement: () => step(-1),
                onIncrement: () => step(1),
                canDecrement: zoom > MIN_ZOOM,
                canIncrement: zoom < MAX_ZOOM,
                decrementTitle: t('menu.zoomOut'),
                incrementTitle: t('menu.zoomIn'),
                onReset: () => set(DEFAULT_ZOOM),
                resetTitle: t('settings.appearance.zoomReset'),
                canReset: zoom !== DEFAULT_ZOOM,
              },
            },
          ]}
          note={t('settings.appearance.scaleNote')}
        />
      </div>
    </div>
  )
}
