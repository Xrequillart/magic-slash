import { useSyncExternalStore } from 'react'
import type { ThemeId } from '../../types'
import { applyTheme, resolveTheme } from './applyTheme'
import { THEMES, type ThemeTokens } from '../../themes'

export { THEMES, THEME_IDS } from '../../themes'
export type { Theme, ThemeTokens } from '../../themes'
export { resolveTheme } from './applyTheme'

/**
 * The renderer's view of the current theme, for the three windows at once.
 *
 * It deliberately does not come from the config store: the tray popover and the
 * quick launch never load a config, and the main window only gets one seconds
 * after it opens. The main process is the one that knows — it hands the theme
 * over as a launch argument and broadcasts every change — so this listens to it
 * instead. One mechanism, whichever window is asking.
 */

let current: ThemeId = resolveTheme(window.electronAPI?.theme?.initial())
const listeners = new Set<() => void>()

function set(theme: ThemeId): void {
  const applied = applyTheme(theme)
  if (applied === current) return
  current = applied
  for (const listener of listeners) listener()
}

/**
 * Paint the boot theme and follow later changes. Call once per window entry
 * point, at module scope — before React renders, so nothing paints twice.
 */
export function initTheme(): void {
  applyTheme(current)
  window.electronAPI?.theme?.onChanged(set)
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
}

/** Current token values, for the few places that need colours, not classes. */
export function useThemeTokens(): ThemeTokens {
  return THEMES[useTheme()].tokens
}
