import { useStore } from '../store'
import { useTheme } from '../theme'
import { codeAppearance, THEME_APPEARANCE } from '../../types'

/**
 * How the file preview should paint code: the theme's own appearance, unless the
 * reader pinned one in Settings → Appearance.
 *
 * A hook of its own rather than a line inside the preview, because two things need
 * the same answer and must not compute it apart: FileContentRenderer keys its read
 * cache on it (the main process highlights in this appearance, so a cached HTML
 * belongs to it and only to it), and CodeView draws its gutter and its diff rails in
 * it. It also deliberately sits outside renderer/theme/, which stays free of the
 * config store — the tray popover and the quick launch paint a theme without ever
 * loading a config, and this preference is the main window's business alone.
 */
export function useCodeAppearance(): { appearance: 'light' | 'dark'; blend: boolean } {
  const theme = useTheme()
  const mode = useStore((s) => s.config?.codeTheme)
  const appearance = codeAppearance(theme, mode)
  // Equal appearances mean shiki's background can go and the code can sit on the
  // panel's own surface; pinned the other way it is what keeps the code legible.
  return { appearance, blend: appearance === THEME_APPEARANCE[theme] }
}
