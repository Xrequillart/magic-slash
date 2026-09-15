import type { CSSProperties } from 'react'

import type { ComponentSize } from './componentSizes'
import type { IconComponent } from './types'

/**
 * Every icon in the app, drawn at one of five sizes in one of three weights.
 *
 * It renders a GLYPH it is handed rather than looking one up by name, and the
 * glyph can be any of the four thousand Lucide exports or one of the five brand
 * marks in `brand.tsx` — they all come out of `icons.ts` and they are all the same
 * kind of thing here. A name-keyed registry was the other option and it costs the
 * bundle everything: a `Record<string, IconComponent>` over all of Lucide is a
 * reference to all of Lucide, and nothing can be shaken out of it. Passing the
 * component keeps each call site importing exactly the glyphs it draws.
 *
 * WHAT IT IS FOR, given a glyph already renders on its own:
 *
 *  - SIZE. The app spells `w-3.5 h-3.5` 249 times, `w-4 h-4` 81 times, `w-3 h-3`
 *    69 — and a handful of `w-7`, `w-2`, `w-2.5` that nobody chose on purpose.
 *    Five rungs, named, and the odd ones out become visible as the exceptions they
 *    are.
 *  - WEIGHT. `themes.ts` has said for a while that an icon is never an alpha of
 *    something — there are exactly two opaque weights, `icon` and `icon-muted`,
 *    and `text-icon/50` is a bug rather than a shade. That rule had no enforcement
 *    until now; `tone` is it.
 *  - A SINGLE `aria-hidden`. Icons here are decoration beside a label, and the one
 *    case where a mark IS the content — a bare tracker badge — labels itself on
 *    the wrapper rather than on the glyph.
 */

/**
 * The seven rungs — `ComponentSize` — in the order a reader meets them.
 *
 * THE MIDDLE FIVE ARE WHAT THE APP ALREADY DID rather than something invented: `sm`
 * is its most common icon by a factor of three, which is why it is the default and
 * why the ladder is denser at the bottom than a doubling scale would be.
 *
 * THE TWO ENDS ARE NEW and are the folder's shared ladder reaching this far: `2xs`
 * for a mark below a row, `2xl` for one above a heading. Neither is a rung to reach
 * for without a reason, and each says its own below.
 */
export type IconSize = ComponentSize

export const ICON_SIZES: Record<IconSize, string> = {
  /**
   * 10px. BELOW WHAT A GLYPH CAN BE TOLD APART AT, for anything with a shape to
   * read: a tick and a cross at 10px are two grey smudges. It is here for the marks
   * that are not read but COUNTED — a dot, a chevron, the caret in a chip — and for
   * the rare glyph nested inside something already small.
   */
  '2xs': 'w-2.5 h-2.5',
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  /**
   * 28px. PAST THE LINE OF TEXT — `xl` is the largest that still sits IN one, and
   * this is the first rung that does not. It is for a mark that is the subject: an
   * empty state, a dialog's icon. Anything above it is an illustration and belongs
   * to its call site.
   */
  '2xl': 'w-7 h-7',
}

/**
 * The two weights the theme defines, plus the way out.
 *
 * `inherit` is not a third weight — it is the absence of one, for a glyph that
 * takes its colour from what it sits in: a `Banner`'s mark wears the variant's
 * tone, a button's wears the button's label colour. Without it every such call
 * site would have to fight a colour this component had already set.
 */
export type IconTone = 'default' | 'muted' | 'inherit'

const TONES: Record<IconTone, string> = {
  default: 'text-icon',
  muted: 'text-icon-muted',
  inherit: '',
}

export interface IconProps {
  /**
   * The glyph — a Lucide export or one of the brand marks, both from
   * `@ds/desktop/icons`. Passed as a component, never named as a string: see the
   * note above on what a registry would cost.
   */
  glyph: IconComponent
  size?: IconSize
  tone?: IconTone
  /**
   * Colour and layout only — `flex-shrink-0`, a margin, or the tone class a
   * `Banner` paints its mark with. Not a size: `w-4 h-4` here would fight the rung
   * above it, and which of the two won would depend on the order Tailwind happened
   * to emit them in.
   */
  className?: string
  /**
   * A BRAND'S OWN COLOUR, and nothing else.
   *
   * `style={{ color: CLAUDE_CORAL }}` is the whole use: a borrowed colour is a hex
   * that must never become a token, so it cannot be a class and Tailwind would not
   * emit one for it anyway. Everything the theme owns goes through `tone`.
   */
  style?: CSSProperties
}

export function Icon({
  glyph: Glyph,
  size = 'sm',
  tone = 'default',
  className = '',
  style,
}: IconProps) {
  return <Glyph className={`${ICON_SIZES[size]} ${TONES[tone]} ${className}`.trim()} style={style} />
}
