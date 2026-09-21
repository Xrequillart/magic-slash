import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * ONE COLUMN OF A BOARD: a heading that stays with it, and whatever is stacked under it.
 *
 * A CONTAINER, so it takes `children` — the one shape of prop this folder is otherwise
 * suspicious of, and the same exception `Card` and `ItemGroup` already are. What goes in
 * a column is the caller's; a column that took its cards as data would be a column that
 * only ever holds one kind of card.
 *
 * THE HEADING IS TWO NESTED BOXES, and that is the one thing that has to be right about a
 * sticky band: cards slide under it as the page scrolls, so it has to be OPAQUE. Every
 * `surface-*` token in this folder is an ALPHA colour — a tint meant to sit on a ground,
 * not a ground — so a heading painted with one alone is 96% transparent, which is exactly
 * as much as it sounds like. The outer box lays down the page's own opaque ground and the
 * inner one puts the column's tint back on top of it.
 *
 * NO HAIRLINE UNDER THE HEADING. It had `border-b border-line-subtle`, which was the only
 * thing separating it from a column body painted the same colour — and with the rule gone
 * the separation is the inset instead: the cards are plates on the column's plate, and the
 * heading is the plate showing through above them. One fewer edge on a board that has four
 * of these side by side.
 *
 * THE TOP RADIUS IS THE THIRD THING, and it only holds while the heading is at REST: a
 * rounded corner paints nothing outside its arc, so a pinned heading rounded at the top has
 * two 12px holes in its first rows with the board sliding behind them. See `pinned`.
 */

/**
 * The heading mark's hue, and there are two because a board has two kinds of column.
 *
 * `alert` is for the one that has STOPPED and needs a person. The others are states work
 * passes through, and colouring them would make the board a traffic light — which is the
 * whole argument, and the reason this is a pair rather than the ten-hue scale `Status`
 * offers. A column is not a state on a plate; it is a place, and a place has at most one
 * thing worth saying about it.
 */
export type BoardColumnTone = 'neutral' | 'alert'

const TONES: Record<BoardColumnTone, string> = {
  neutral: 'text-icon-muted',
  alert: 'text-red',
}

export interface BoardColumnProps {
  /** What the column is called, already translated. */
  title: string
  /** The mark beside it. Optional — a column with no glyph is still a column. */
  icon?: IconComponent
  tone?: BoardColumnTone
  /**
   * How many are in it, ALREADY WORDED — a number, or the caller's own form for a count
   * that is a floor rather than a total ("100+").
   *
   * Drawn always, zero included: a column that showed nothing and said nothing would be
   * indistinguishable from one that failed to render. A string and not a number because
   * whether a count is exact is a fact about the read, which is the caller's.
   */
  count: string | number
  /** The tooltip on the count, for the case it needs to explain itself. */
  countTitle?: string
  /**
   * The sentence for a column with nothing in it, already translated.
   *
   * A word rather than an empty box. Absent draws neither — for a board whose empty
   * columns are meant to read as empty space.
   */
  empty?: string
  /**
   * Where the heading pins, in pixels from the top of the scrolling pane. 0 unless
   * something else is already pinned there.
   *
   * THE CALLER'S, and it cannot be otherwise: what is stacked above a band is a fact
   * about the page around it, which is the one thing this folder cannot know. `Banner`'s
   * `className` note says the same in fewer words.
   */
  headingTop?: number
  /**
   * Whether it HAS pinned there, which is the only thing that changes about it: its top
   * corners. The caller owns the question too — the sentinel that answers it has to sit
   * where the column starts, and a band that has moved cannot report that position.
   */
  pinned?: boolean
  children?: ReactNode
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function BoardColumn({
  title,
  icon,
  tone = 'neutral',
  count,
  countTitle,
  empty,
  headingTop = 0,
  pinned = false,
  children,
  className = '',
}: BoardColumnProps) {
  // Both boxes lose it together: the outer is the opaque ground, and rounding the inner
  // alone would cut two dark notches out of the band instead of two see-through ones.
  const headRadius = pinned ? '' : 'rounded-t-xl'

  // An EMPTY ARRAY is what a caller's `cards.map()` hands over for a column with nothing
  // in it, and an empty array is truthy — so the emptiness has to be asked about rather
  // than inferred from `children` being absent.
  const isEmpty = !children || (Array.isArray(children) && children.length === 0)

  return (
    // NO `overflow-hidden` here, however much the rounded corners want it: `overflow`
    // makes an element a scroll container, and a `sticky` child then pins to THAT rather
    // than to the pane — which, on a box that does not scroll, means it never moves at
    // all. The heading rounds its own top corners instead.
    <div className={`flex flex-col min-w-0 rounded-xl bg-surface-subtle ${className}`.trim()}>
      <div className={`sticky z-10 bg-bg-secondary ${headRadius}`} style={{ top: headingTop }}>
        <div className={`flex items-center gap-2 px-2.5 py-2 bg-surface-subtle ${headRadius}`}>
          {icon && <Icon glyph={icon} size="sm" tone="inherit" className={`flex-shrink-0 ${TONES[tone]}`} />}
          <Text weight="medium" className="truncate">
            {title}
          </Text>
          <Text tone="secondary" title={countTitle} className="ml-auto flex-shrink-0 opacity-60">
            {String(count)}
          </Text>
        </div>
      </div>

      {/* The inset is deliberately thin. Four columns share a modal's width, so every
          pixel spent here is taken from a card's line length — which is the one dimension
          a ticket title actually needs. The cards keep their own padding; it is what makes
          them read as cards rather than as a striped list. */}
      <div className="p-1.5 flex flex-col gap-1.5">
        {isEmpty ? (
          empty && (
            // A WORD RATHER THAN AN EMPTY BOX: what is interesting about an empty column
            // is that it is empty, and a box with nothing in it reads as a column that
            // failed to render. `EmptyLine`'s rule, at a column's scale.
            <Text tone="secondary" className="block px-1 py-5 text-center opacity-40">
              {empty}
            </Text>
          )
        ) : (
          children
        )}
      </div>
    </div>
  )
}
