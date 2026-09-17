import type { LucideIcon } from '@ds/desktop/icons'

/**
 * Header of a settings section: icon + title, optionally with an action on the
 * right (a button, a toggle…).
 *
 * The row is pinned to `h-5` — the natural height of the bare title — so a
 * section carrying a taller action button lines up with one that doesn't.
 * Without it the button stretches the row and pushes that tab's content ~10px
 * lower than its neighbours. The action simply overflows the line, centered.
 *
 * `spacing="none"` drops the bottom margin, for parents that already space their
 * children with a flex `gap`.
 *
 * `count` RIDES WITH THE TITLE AND NOT IN `action`, which is the one thing about this
 * component worth a second look. They are both extras on one row, but they answer to
 * different sides: an action is a control and belongs at the far edge where the hand
 * goes, while a count is part of what the heading SAYS — "Personal, three of them" is
 * one phrase, and putting the figure at the other end of the row makes the eye travel
 * the width of the page to finish reading a label. Zero is drawn like any other number:
 * an empty section is a fact, and the list under it already says so in words.
 */
export function SectionHeader({
  icon: Icon,
  title,
  count,
  action,
  spacing = 'default',
}: {
  icon: LucideIcon
  title: string
  count?: number
  action?: React.ReactNode
  spacing?: 'default' | 'none'
}) {
  return (
    <div className={`flex items-center justify-between h-5 ${spacing === 'none' ? '' : 'mb-4'}`}>
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
        {count !== undefined && <span className="text-text-secondary/30">{count}</span>}
      </div>
      {action}
    </div>
  )
}
