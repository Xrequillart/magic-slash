import type { ReactNode } from 'react'

import { RAISED_PLATE } from './plate'

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

/**
 * What the card is painted on.
 *
 * `surface` is the card — 6% ink over the window, which is what a raised panel on the
 * app's ground has always been. `raised` is `RAISED_PLATE`: opaque, and the same plate the
 * tiles and the stepper stand on, for the one place a card sits among them —
 * `ControlCenter`'s sheet, where a translucent card over frost was a lighter hole beside
 * darker holes. It is a ground and not a `className` for `padding`'s reason: two
 * background classes on one element are decided by Tailwind's emit order.
 */
export type CardGround = 'surface' | 'raised'

const GROUND: Record<CardGround, string> = {
  surface: 'bg-surface',
  raised: RAISED_PLATE,
}

/**
 * The corners. `rounded` is the card — `rounded-xl`, the radius every panel in the app
 * wears. `pill` is for a card ONE ROW TALL among round things: on the quick-settings
 * sheet every control of one point's height is a circle or a pill, and a card of that
 * height with 12px corners was the one square-shouldered thing in the column. A prop and
 * not a `className`, for `padding`'s reason: two radius classes on one element are decided
 * by Tailwind's emit order, and `rounded-full` passed in lost to the card's own.
 */
export type CardShape = 'rounded' | 'pill'

const SHAPE: Record<CardShape, string> = {
  rounded: 'rounded-xl',
  pill: 'rounded-full',
}

export interface CardProps {
  children: ReactNode
  padding?: CardPadding
  ground?: CardGround
  shape?: CardShape
  /**
   * Layout INSIDE and around — `flex flex-col gap-2`, `flex-1 min-h-0`, a margin.
   * Not the ground, the radius or the padding: those are the card, and a second
   * spelling of the padding would win or lose on the order Tailwind emitted them in.
   */
  className?: string
}

export function Card({ children, padding = 'regular', ground = 'surface', shape = 'rounded', className = '' }: CardProps) {
  return <div className={`${GROUND[ground]} ${SHAPE[shape]} ${PADDING[padding]} ${className}`.trim()}>{children}</div>
}
