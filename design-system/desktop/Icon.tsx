import type { CSSProperties } from 'react'
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
 * The five rungs, in the order a reader meets them.
 *
 * Taken from what the app already does rather than invented: `sm` is its most
 * common icon by a factor of three, which is why it is the default and why the
 * scale is denser at the bottom than a doubling scale would be. `xl` is the
 * largest that still sits IN a line of text; anything above it is an illustration
 * and belongs to its own call site, not to a rung here.
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export const ICON_SIZES: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
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
