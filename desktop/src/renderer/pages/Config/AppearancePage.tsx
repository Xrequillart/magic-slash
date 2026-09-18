import { Palette, PanelsTopLeft, Scaling } from '@ds/desktop/icons'
import {
  SectionHeader,
  SettingsCard,
  Text,
  ThemePreviewGrid,
  type SettingRowControl,
  type SettingsCardRow,
  type ThemePreviewOption,
} from '@ds/desktop'
import { useEffect, useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { useZoom } from '../../hooks/useZoom'
import { showToast } from '../../components/Toast'
import { useToggleRow } from './ToggleRow'
import { THEMES, THEME_IDS, useTheme } from '../../theme'
import { useT } from '../../i18n'
import {
  CODE_THEME_MODES, DEFAULT_CODE_THEME_MODE, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM,
  type CodeThemeMode, type ThemeId,
} from '../../../types'

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

interface FormatSelectProps {
  /** The stored flag. `undefined` = never chosen, which reads as expanded. */
  minimized: boolean | undefined
  onChange: (minimized: boolean) => Promise<unknown>
  ariaLabel: string
  errorMessage?: string
}

/**
 * Expanded or compact, for one card.
 *
 * The same value the card's own ± button writes, so the two never disagree: pick
 * "Compact" here and the card in the sidebar collapses; collapse it there and this
 * follows.
 *
 * A HOOK AND NOT A COMPONENT, which is the shape `SettingRow` asks for: that row draws
 * its own controls, at its own rung, and takes them as DATA rather than as nodes — a
 * node arrives with a size the call site has already decided, which is the whole thing
 * the row exists to stop. So what is this app's stays here (the optimistic write, the
 * toast, the two words) and what comes out is a control the row can draw.
 */
function useFormatSelect({ minimized, onChange, ariaLabel, errorMessage }: FormatSelectProps): SettingRowControl {
  const t = useT()
  const [value, setValue] = useState(minimized === true)

  useEffect(() => {
    setValue(minimized === true)
  }, [minimized])

  const choose = async (next: boolean) => {
    setValue(next)
    try {
      await onChange(next)
    } catch (error) {
      setValue(!next)
      showToast(error instanceof Error ? error.message : errorMessage ?? '', 'error')
    }
  }

  return {
    kind: 'select',
    value: value ? 'minimized' : 'full',
    options: [
      { value: 'full', label: t('settings.appearance.sidebars.format.full') },
      { value: 'minimized', label: t('settings.appearance.sidebars.format.minimized') },
    ],
    onChange: (next) => choose(next === 'minimized'),
    ariaLabel,
    width: 128,
  }
}

/**
 * Which appearance the file preview highlights code in, as a row.
 *
 * A select rather than a switch because "follow the theme" is a third state, not the off
 * position of a toggle: pinning light and pinning dark are both real answers, and neither
 * is "don't follow".
 *
 * Optimistic like every other control in Settings — the value moves first and reverts if
 * the write fails.
 */
function useCodeThemeRow(): SettingsCardRow {
  const { config, updateCodeTheme } = useConfig()
  const t = useT()
  const stored = config?.codeTheme ?? DEFAULT_CODE_THEME_MODE
  const [value, setValue] = useState<CodeThemeMode>(stored)

  useEffect(() => {
    setValue(stored)
  }, [stored])

  const choose = async (next: CodeThemeMode) => {
    if (next === value) return
    const previous = value
    setValue(next)
    try {
      await updateCodeTheme(next)
    } catch (error) {
      setValue(previous)
      showToast(error instanceof Error ? error.message : t('toast.codeThemeFailed'), 'error')
    }
  }

  return {
    id: 'codeTheme',
    label: t('settings.appearance.codeTheme.label'),
    hint: t('settings.appearance.codeTheme.help'),
    control: {
      kind: 'select',
      value,
      options: CODE_THEME_MODES.map((mode) => ({
        value: mode,
        label: t(`settings.appearance.codeTheme.${mode}`),
      })),
      onChange: (next) => choose(next as CodeThemeMode),
      ariaLabel: t('settings.appearance.codeTheme.label'),
      width: 160,
    },
  }
}

export function AppearancePage() {
  const {
    config,
    updateTheme,
    updateSyncClaudeTheme,
    updateUsageCardEnabled,
    updateUsageCardMinimized,
    updateAgentContextEnabled,
    updateAgentContextMinimized,
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
  const agentContextFormat = useFormatSelect({
    minimized: config?.agentContextMinimized,
    onChange: updateAgentContextMinimized,
    ariaLabel: `${t('settings.appearance.sidebars.agentContext.label')} — ${t('settings.appearance.sidebars.format.label')}`,
    errorMessage: t('toast.sidebarPanelFailed'),
  })

  const claudeThemeRow = useToggleRow({
    label: t('settings.appearance.claudeTheme.label'),
    help: t('settings.appearance.claudeTheme.help'),
    value: config?.syncClaudeTheme,
    onChange: updateSyncClaudeTheme,
    errorMessage: t('toast.claudeThemeSyncFailed'),
  })
  const codeThemeRow = useCodeThemeRow()

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
  const agentContextRow = useToggleRow({
    label: t('settings.appearance.sidebars.agentContext.label'),
    help: t('settings.appearance.sidebars.agentContext.help'),
    value: config?.agentContextEnabled,
    onChange: updateAgentContextEnabled,
    errorMessage: t('toast.sidebarPanelFailed'),
    trailing: (enabled) => enabled && agentContextFormat,
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
        rows={[{ id: 'claudeTheme', ...claudeThemeRow }, codeThemeRow]}
      />

      <div className="mt-8">
        <SectionHeader icon={PanelsTopLeft} title={t('settings.appearance.sidebars.section')} />
        {/* The two optional panels of the two sidebars, in one card. The usage card's
            switch used to live under Application, next to the machine setup and the
            background workers — things the app DOES. Showing a panel or not is a decision
            about what the window looks like, so it belongs here, and the agent's context
            card (the same kind of panel, on the other side of the screen) is only
            comprehensible next to it: one card, one question — which panels do you want
            to see, and in which form. */}
        <SettingsCard
          rows={[
            { id: 'usageCard', ...usageCardRow },
            { id: 'agentContext', ...agentContextRow },
          ]}
        />
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
