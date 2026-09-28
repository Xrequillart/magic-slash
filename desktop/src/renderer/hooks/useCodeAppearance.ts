import { useStore } from '../store'
import { useTheme } from '../theme'
import { codeSyntaxTheme, THEME_APPEARANCE } from '../../types'

/**
 * How the file preview should paint code: the reader's palette family, in the variant
 * the interface theme calls for (Settings → Code & reviews).
 *
 * A hook of its own rather than a line inside the preview, because several things need
 * the same answer and must not compute it apart: FileContentRenderer keys its read cache
 * on `shikiTheme` (the main process highlights in it, so a cached HTML belongs to it and
 * only to it), and CodeView draws its gutter and its diff rails in `appearance`. It also
 * deliberately sits outside renderer/theme/, which stays free of the config store — the
 * tray popover and the quick launch paint a theme without ever loading a config, and
 * this preference is the main window's business alone.
 *
 * `blend` is always true now: a family always has a variant of the interface's own
 * appearance, so the palette's background can always go and the code sit on the panel's
 * surface. It stays in the answer so CodeView keeps one place that decides it.
 */
export function useCodeAppearance(): { appearance: 'light' | 'dark'; blend: boolean; shikiTheme: string } {
  const theme = useTheme()
  const choice = useStore((s) => s.config?.codeSyntax)
  return { appearance: THEME_APPEARANCE[theme], blend: true, shikiTheme: codeSyntaxTheme(theme, choice) }
}
