import type { ThemeGridOption, ThemePreviewOption } from '@ds/desktop'
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

/**
 * The webapp's own copy of the registry, mapped the way the desktop maps its own — this
 * page is the one place the two can be compared side by side. Read by the
 * `ThemePreviewGrid` entry and by the Themes page, which picks with it.
 */
export const THEME_PREVIEWS: ThemePreviewOption[] = DESKTOP_THEME_IDS.map((id) => {
  const { label, appearance, vars } = DESKTOP_THEMES[id]
  // The catalogue keeps its colours as the custom properties a `style` prop wants, so
  // the bare triples are wrapped and the `rgba()` ones are already values. Exactly the
  // mapping the desktop writes against its own registry.
  const rgb = (name: string) => `rgb(${vars[name]})`
  return {
    id,
    label,
    description: appearance === 'dark' ? 'Built on a dark ground' : 'Built on a light ground',
    colors: {
      floor: rgb('--c-bg'),
      bar: vars['--c-surface'],
      panel: vars['--c-surface-strong'],
      line: vars['--c-line-strong'],
      ink: rgb('--c-ink'),
      textSecondary: rgb('--c-text-secondary'),
      accent: rgb('--c-accent'),
      lights: [rgb('--c-red'), rgb('--c-yellow'), rgb('--c-green')],
    },
  }
})
