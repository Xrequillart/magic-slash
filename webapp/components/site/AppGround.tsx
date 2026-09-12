'use client'

import type { CSSProperties, ReactNode } from 'react'
import { DESKTOP_THEMES, type DesktopThemeId } from '@/lib/desktopTheme'

/**
 * A patch of the DESKTOP APP inside a marketing page.
 *
 * It writes a theme's `--c-*` variables onto one element and paints the app's own
 * window colour under them, so a component from `design-system/desktop/` resolves its
 * colours here exactly as it does in Electron. Without it a shared component renders
 * on the site's light tokens and looks like nothing the product ships.
 *
 * THIS IS WHAT MAKES A REAL COMPONENT USABLE IN AN ILLUSTRATION. The mockups on this
 * site were hand-drawn reproductions — `ContextCardMockup` carried a forty-line note
 * explaining which of the app's classes it had copied, and the app had moved on
 * without it. A drawing that IS the component cannot fall behind one.
 *
 * `dark` by default: it is the app's own default theme, and its window (`10 10 11`) is
 * the `bg-ink` these illustrations were already drawn on.
 *
 * The same idea as `Stage` on `/design-system`, kept separate on purpose — that one is
 * a workbench with a theme picker, this one is a picture with a fixed ground.
 */
export function AppGround({
  children,
  theme = 'dark',
  paint = true,
  className = '',
}: {
  children: ReactNode
  theme?: DesktopThemeId
  /**
   * Whether it paints the window under the variables, or only declares them.
   *
   * Off for a ground that already exists: the desktop page's sidebar panel is itself a
   * reproduction of the app's column, with its own `bg-black/30`, and a second window
   * colour inside it would be a panel drawn on a panel. The variables still land, which
   * is all a real component needs from this.
   */
  paint?: boolean
  className?: string
}) {
  const { vars, appearance } = DESKTOP_THEMES[theme]

  return (
    <div
      style={
        {
          ...vars,
          ...(paint ? { backgroundColor: 'rgb(var(--c-bg))' } : null),
          colorScheme: appearance,
          // `text-ink` as a VALUE and not a class: anything inside drawn in
          // `currentColor` — an `Avatar`'s bare glyph, a mark that follows its row —
          // would otherwise climb past this ground to the site's own near-black.
          color: 'rgb(var(--c-ink))',
        } as CSSProperties
      }
      className={className}
    >
      {children}
    </div>
  )
}
