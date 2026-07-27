import { Check, Minus, Palette, Plus, RotateCcw, Scaling } from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { useZoom } from '../../hooks/useZoom'
import { showToast } from '../../components/Toast'
import { SectionHeader } from './SectionHeader'
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
 * renderer/theme/themes.ts shows up here with no change to this file.
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

      <div className="mt-8">
        <SectionHeader icon={Scaling} title={t('settings.appearance.displaySection')} />
        <ZoomControl />
      </div>
    </div>
  )
}
