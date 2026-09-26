import type { ThemeGridOption } from '@ds/desktop'
import { DESKTOP_THEMES, DESKTOP_THEME_IDS } from '@/lib/desktopTheme'

/**
 * The site's copy of the registry — CSS variables — as the five colours a `ThemeGrid`
 * swatch is made of.
 *
 * A module of its own because two places draw that grid: the `ThemeGrid` entry, and the
 * rail's theme picker at the foot of every page. One mapping, so the picker a reader
 * uses and the component the page documents cannot disagree about which token is "the
 * panel".
 */
export const THEME_SWATCHES: ThemeGridOption[] = DESKTOP_THEME_IDS.map((id) => {
  const { label, vars } = DESKTOP_THEMES[id]
  return {
    id,
    label,
    colors: {
      floor: `rgb(${vars['--c-bg']})`,
      panel: vars['--c-surface-strong'],
      line: vars['--c-line-strong'],
      ink: `rgb(${vars['--c-ink']})`,
      accent: `rgb(${vars['--c-accent']})`,
    },
  }
})
