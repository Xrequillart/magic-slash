import { DEFAULT_THEME, isValidTheme, THEME_APPEARANCE, type ThemeId } from '../../types'
import { THEMES, type ThemeTokens } from '../../themes'

/**
 * Paints a theme by writing its tokens as CSS variables on <html>, which is what
 * every Tailwind colour in the app resolves against. Switching themes is
 * therefore one pass of `setProperty` — no re-render, no component aware of it.
 */

/**
 * `bgSecondaryRgb` → `--c-bg-secondary`, `windowWash` → `--c-window-wash`. The
 * name is derived rather than mapped so a new token needs no bookkeeping here;
 * the `Rgb` suffix marks the bare-channel tokens and is not part of the name.
 */
export function cssVarName(token: string): string {
  return `--c-${token.replace(/Rgb$/, '').replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`
}

/** The theme to paint for a stored preference, falling back on anything unknown.
 *  A newer app version may have stored a theme this one has never heard of. */
export function resolveTheme(preference: unknown): ThemeId {
  return isValidTheme(preference) ? preference : DEFAULT_THEME
}

export function applyTheme(preference: unknown): ThemeId {
  const id = resolveTheme(preference)
  const { tokens } = THEMES[id]
  const root = document.documentElement

  for (const [token, value] of Object.entries(tokens)) {
    // `terminal` is read straight from the registry by xterm, which takes hex
    // strings rather than CSS — it has no business being a variable.
    if (typeof value !== 'string') continue
    root.style.setProperty(cssVarName(token), value)
  }

  root.dataset.theme = id
  // Lets form controls, scrollbars and any other UA-painted chrome match.
  root.style.colorScheme = THEME_APPEARANCE[id]
  return id
}

/** The tokens currently painted — for the bits that need values, not classes. */
export function themeTokens(preference: unknown): ThemeTokens {
  return THEMES[resolveTheme(preference)].tokens
}
