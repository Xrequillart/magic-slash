import type { LucideIcon } from 'lucide-react'

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
 */
export function SectionHeader({
  icon: Icon,
  title,
  action,
  spacing = 'default',
}: {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
  spacing?: 'default' | 'none'
}) {
  return (
    <div className={`flex items-center justify-between h-5 ${spacing === 'none' ? '' : 'mb-4'}`}>
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>
      {action}
    </div>
  )
}
