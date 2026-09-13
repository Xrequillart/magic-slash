import type { ReactNode } from 'react'

/**
 * A raised panel on the app's ground — the shape every card in the right-hand agent
 * sidebar is drawn in.
 *
 * `bg-surface rounded-xl p-4`, four times over: the ticket header, the repository
 * card, the agent context card and the spec panel, each respelling it, and one of
 * them quietly disagreeing about the padding. That is the whole component. It holds a
 * ground, a radius and a padding, and it holds nothing else — no header, no title, no
 * border, no shadow. A card that knew what went inside it would be a layout, and a
 * layout is not a foundation.
 *
 * NAMED FOR THE DRAWING AND NOT THE PLACE. It arrived as `SidebarInfoCard`, which is
 * where it happens to be used today; a design system that knows the name of a screen
 * is a design system with the app inside it — the same reason `Avatar`'s sizes stopped
 * being called `card` and `sidebar`. Nothing about this shape is about being on the
 * right.
 */

/**
 * How much air the card puts around its content.
 *
 * `regular` is the one to use. The other three exist because the sidebars genuinely
 * have them: a minimised card is one line, where `p-4` would undo the point of
 * minimising; a panel whose body SCROLLS cannot have padding on the outside — the
 * scrollbar would sit inside it and the first row would be clipped before it reached
 * the top; and `tight` is the LEFT sidebar, which is a different column altogether.
 *
 * THE LEFT SIDEBAR IS 228px WHERE THE RIGHT IS 320. `compact`'s 16px of side padding
 * is 14% of the narrow column's width before anything is drawn in it, and the card
 * that lives there holds two progress bars that need every pixel they can get. It is
 * a rung and not a `className`, for the reason the note below gives: a second spelling
 * of the padding wins or loses on the order Tailwind emitted the two.
 */
export type CardPadding = 'regular' | 'compact' | 'tight' | 'none'

const PADDING: Record<CardPadding, string> = {
  regular: 'p-4',
  compact: 'px-4 py-2',
  tight: 'px-2 py-1.5',
  none: '',
}

export interface CardProps {
  children: ReactNode
  padding?: CardPadding
  /**
   * Layout INSIDE and around — `flex flex-col gap-2`, `flex-1 min-h-0`, a margin.
   * Not the ground, the radius or the padding: those are the card, and a second
   * spelling of the padding would win or lose on the order Tailwind emitted them in.
   */
  className?: string
}

export function Card({ children, padding = 'regular', className = '' }: CardProps) {
  return <div className={`bg-surface rounded-xl ${PADDING[padding]} ${className}`.trim()}>{children}</div>
}
