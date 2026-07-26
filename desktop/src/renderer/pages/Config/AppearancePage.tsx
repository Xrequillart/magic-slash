import { Check, Palette } from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { showToast } from '../../components/Toast'
import { SectionHeader } from './SectionHeader'
import { THEMES, THEME_IDS, useTheme } from '../../theme'
import type { ThemeId } from '../../../types'

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
export function AppearancePage() {
  const { updateTheme } = useConfig()
  const active = useTheme()

  const choose = async (id: ThemeId) => {
    if (id === active) return
    try {
      await updateTheme(id)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to change theme', 'error')
    }
  }

  return (
    <div>
      <SectionHeader icon={Palette} title="Theme" />
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
                <span className="text-sm font-medium truncate min-w-0">{theme.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-accent shrink-0" />}
              </div>
              <p className="text-xs text-text-secondary/50 mt-0.5">{theme.description}</p>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-text-secondary/50 mt-3">
        The theme follows your account — every machine you sign in on uses it.
      </p>
    </div>
  )
}
