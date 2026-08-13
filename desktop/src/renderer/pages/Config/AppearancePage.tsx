import { Check, ChevronDown, Minus, Palette, PanelsTopLeft, Plus, RotateCcw, Scaling } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { useZoom } from '../../hooks/useZoom'
import { showToast } from '../../components/Toast'
import { SectionHeader } from './SectionHeader'
import { ToggleRow } from './ToggleRow'
import { THEMES, THEME_IDS, useTheme } from '../../theme'
import { useT } from '../../i18n'
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM, type ThemeId } from '../../../types'

/**
 * Miniature of a theme, painted with that theme's own tokens rather than the
 * one in use — the point is to show what you are about to switch to.
 */
function ThemePreview({ id }: { id: ThemeId }) {
  const { tokens } = THEMES[id]
  return (
    <div
      className="h-20 w-full overflow-hidden rounded-lg border"
      style={{
        backgroundColor: `rgb(${tokens.bgRgb})`,
        borderColor: tokens.lineStrong,
      }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-1 px-2 py-1.5" style={{ backgroundColor: tokens.surface }}>
        {['redRgb', 'yellowRgb', 'greenRgb'].map((key) => (
          <span
            key={key}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: `rgb(${tokens[key as 'redRgb']})` }}
          />
        ))}
      </div>
      {/* A sidebar, some text, an accent */}
      <div className="flex h-full gap-1.5 p-2">
        <div className="w-1/4 rounded" style={{ backgroundColor: tokens.surfaceStrong }} />
        <div className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-3/4 rounded-full" style={{ backgroundColor: `rgb(${tokens.inkRgb})` }} />
          <span
            className="h-1.5 w-1/2 rounded-full"
            style={{ backgroundColor: `rgb(${tokens.textSecondaryRgb})` }}
          />
          <span className="mt-1 h-2.5 w-2/5 rounded" style={{ backgroundColor: `rgb(${tokens.accentRgb})` }} />
        </div>
      </div>
    </div>
  )
}

/**
 * Theme picker. The list is the registry, so a theme added in
 * src/themes.ts shows up here with no change to this file.
 */
/**
 * Interface scale. The buttons walk the same steps as ⌘+ / ⌘−, and the value
 * shown follows the menu too — both go through the main process.
 */
function ZoomControl() {
  const { zoom, set, step } = useZoom()
  const t = useT()
  const percent = Math.round(zoom * 100)

  return (
    <div className="bg-surface border border-line-strong rounded-xl p-4 flex items-center justify-between gap-6">
      <div className="flex-1">
        <div className="text-sm font-medium mb-0.5">{t('settings.appearance.scale')}</div>
        <p className="text-xs text-text-secondary/50">
          {t('settings.appearance.scaleHelpBefore')}{' '}
          <kbd className="px-1 py-0.5 bg-surface-strong rounded text-[10px]">⌘ +</kbd>{' '}
          <kbd className="px-1 py-0.5 bg-surface-strong rounded text-[10px]">⌘ −</kbd>
          {t('settings.appearance.scaleHelpAfter')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => step(-1)}
          disabled={zoom <= MIN_ZOOM}
          title={t('menu.zoomOut')}
          className="flex items-center justify-center h-7 w-7 text-text-secondary bg-surface border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all disabled:opacity-40 disabled:hover:bg-surface"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        {/* Tabular figures so the row does not jitter between 90% and 125%. */}
        <span className="w-12 text-center text-sm font-medium tabular-nums">{percent}%</span>
        <button
          onClick={() => step(1)}
          disabled={zoom >= MAX_ZOOM}
          title={t('menu.zoomIn')}
          className="flex items-center justify-center h-7 w-7 text-text-secondary bg-surface border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all disabled:opacity-40 disabled:hover:bg-surface"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => set(DEFAULT_ZOOM)}
          disabled={zoom === DEFAULT_ZOOM}
          title={t('settings.appearance.zoomReset')}
          className="flex items-center justify-center h-7 w-7 text-text-secondary bg-surface border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all disabled:opacity-40 disabled:hover:bg-surface"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

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
 * "Compact" here and the card in the sidebar collapses; collapse it there and
 * this select follows. Native <select> with the chevron drawn over it, like the
 * launch-mode picker in Settings.
 */
function FormatSelect({ minimized, onChange, ariaLabel, errorMessage }: FormatSelectProps) {
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

  return (
    <div className="relative">
      <select
        value={value ? 'minimized' : 'full'}
        onChange={(e) => choose(e.target.value === 'minimized')}
        aria-label={ariaLabel}
        className="w-32 pl-3 pr-7 py-1.5 bg-surface border border-line-field rounded-lg text-xs focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
      >
        <option value="full">{t('settings.appearance.sidebars.format.full')}</option>
        <option value="minimized">{t('settings.appearance.sidebars.format.minimized')}</option>
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/50 pointer-events-none" />
    </div>
  )
}

/**
 * Whether Claude Code in the terminal panes follows the app's theme.
 *
 * Sits directly under the theme picker rather than in a section of its own: it
 * has no meaning apart from the theme chosen above — it says how far that choice
 * reaches — and a "Terminal" heading of its own made it read as a separate
 * subject you had to scroll past the sidebars to find.
 */
function ClaudeThemeToggle() {
  const { config, updateSyncClaudeTheme } = useConfig()
  const t = useT()

  return (
    <div className="bg-surface border border-line-strong rounded-xl p-4">
      <ToggleRow
        label={t('settings.appearance.claudeTheme.label')}
        help={t('settings.appearance.claudeTheme.help')}
        value={config?.syncClaudeTheme}
        onChange={updateSyncClaudeTheme}
        errorMessage={t('toast.claudeThemeSyncFailed')}
      />
    </div>
  )
}

/**
 * The two optional panels of the two sidebars, in one card.
 *
 * The usage card switch used to live under Application, next to the machine
 * setup and the background workers — things the app DOES. Showing a panel or not
 * is a decision about what the window looks like, so it belongs here, and the
 * agent's context card (the same kind of panel, on the other side of the screen)
 * is only comprehensible next to it: one card, one question — which panels do
 * you want to see, and in which form.
 */
function SidebarPanelsSection() {
  const {
    config,
    updateUsageCardEnabled,
    updateUsageCardMinimized,
    updateAgentContextEnabled,
    updateAgentContextMinimized,
  } = useConfig()
  const t = useT()

  return (
    <div className="bg-surface border border-line-strong rounded-xl p-4 space-y-4">
      <ToggleRow
        label={t('settings.appearance.sidebars.usageCard.label')}
        help={t('settings.appearance.sidebars.usageCard.help')}
        value={config?.usageCardEnabled}
        onChange={updateUsageCardEnabled}
        errorMessage={t('toast.sidebarPanelFailed')}
        /* Hidden card, hidden format: the choice still exists in the config and
           comes back untouched when the card does, but offering it here would be
           asking how to lay out something that is not on screen. */
        trailing={(enabled) => enabled && (
          <FormatSelect
            minimized={config?.usageCardMinimized}
            onChange={updateUsageCardMinimized}
            ariaLabel={`${t('settings.appearance.sidebars.usageCard.label')} — ${t('settings.appearance.sidebars.format.label')}`}
            errorMessage={t('toast.sidebarPanelFailed')}
          />
        )}
      />
      <div className="border-t border-line-subtle" />
      <ToggleRow
        label={t('settings.appearance.sidebars.agentContext.label')}
        help={t('settings.appearance.sidebars.agentContext.help')}
        value={config?.agentContextEnabled}
        onChange={updateAgentContextEnabled}
        errorMessage={t('toast.sidebarPanelFailed')}
        trailing={(enabled) => enabled && (
          <FormatSelect
            minimized={config?.agentContextMinimized}
            onChange={updateAgentContextMinimized}
            ariaLabel={`${t('settings.appearance.sidebars.agentContext.label')} — ${t('settings.appearance.sidebars.format.label')}`}
            errorMessage={t('toast.sidebarPanelFailed')}
          />
        )}
      />
    </div>
  )
}

export function AppearancePage() {
  const { updateTheme } = useConfig()
  const active = useTheme()
  const t = useT()

  const choose = async (id: ThemeId) => {
    if (id === active) return
    try {
      await updateTheme(id)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.themeChangeFailed'), 'error')
    }
  }

  return (
    <div>
      <SectionHeader icon={Palette} title={t('settings.appearance.themeSection')} />
      <div className="grid grid-cols-4 gap-3">
        {THEME_IDS.map((id) => {
          const theme = THEMES[id]
          const isActive = id === active
          return (
            <button
              key={id}
              onClick={() => choose(id)}
              aria-pressed={isActive}
              className={`text-left p-2.5 rounded-xl border transition-all ${
                isActive
                  ? 'border-accent bg-accent/10'
                  : 'border-line-strong bg-surface hover:bg-surface-strong'
              }`}
            >
              <ThemePreview id={id} />
              <div className="flex items-center gap-1.5 mt-2.5">
                {/* min-w-0 + truncate: a longer theme name must not widen its
                    column and unbalance the row. */}
                <span className="text-sm font-medium truncate min-w-0">{t(theme.labelKey)}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
              </div>
              <p className="text-xs text-text-secondary/50 mt-0.5">{t(theme.descriptionKey)}</p>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-text-secondary/50 mt-3">
        {t('settings.appearance.followsAccount')}
      </p>

      {/* Part of the theme section, not a section of its own: it decides how far
          the theme above reaches, and read anywhere else it is a question about
          nothing. */}
      <div className="mt-3">
        <ClaudeThemeToggle />
      </div>

      <div className="mt-8">
        <SectionHeader icon={PanelsTopLeft} title={t('settings.appearance.sidebars.section')} />
        <SidebarPanelsSection />
      </div>

      <div className="mt-8">
        <SectionHeader icon={Scaling} title={t('settings.appearance.displaySection')} />
        <ZoomControl />
      </div>
    </div>
  )
}
