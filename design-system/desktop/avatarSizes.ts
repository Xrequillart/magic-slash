/**
 * The geometries `Avatar` is drawn at.
 *
 * A SEPARATE MODULE, and a deliberately empty one at the top: not a single import,
 * not even a type one. The root Vitest suite runs on the ROOT `node_modules`, where
 * React does not exist — `Avatar.tsx` is therefore unreachable from there, and
 * importing it would fail to RESOLVE, which reads as a broken test rather than as a
 * missing install. Pulling the table out into a file that imports nothing is what
 * makes the part worth asserting — the class strings — testable at all.
 *
 * Keep it that way: the day this file imports React it stops being covered, silently.
 * It inherits that rule from `desktop/src/renderer/components/accountAvatarSize.ts`,
 * which is now the SURFACE map that points into this one.
 *
 * A SIZE AND NOT A SURFACE. The app's table named `card`, `footer`, `sidebar` and
 * `roster` — which was right while the component lived in the app, and is wrong here:
 * a design system that knows the name of a screen is a design system with the app
 * inside it. The four rungs below are the same four boxes under names that describe
 * the drawing, and the app maps its surfaces onto them.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

export interface AvatarGeometry {
  /** Box classes for the photo and for the fallback alike, so the two never disagree. */
  box: string
  /** The `Icon` rung the mark is drawn at INSIDE the badge, leaving the fill visible. */
  glyph: IconRung
  /**
   * The rung it is drawn at with no badge around it, where the mark IS the whole
   * thing and fills the box.
   *
   * A second field rather than reusing `glyph`, because the two answer different
   * questions and only agreed by accident at `xs` — the one size the app happened to
   * draw bare. A `sm` avatar has a 20px box and a 12px badge glyph; falling back to
   * that 12px mark with no badge made the footprint shrink the moment a photo was
   * missing, which is exactly the shift `box` exists to prevent.
   *
   * `lg` is the one rung that cannot fill: the icon scale stops at 24px and the box is
   * 44. The footprint still holds, because the mark is centred in the box rather than
   * standing alone — see `Avatar`.
   */
  bare: IconRung
}

/** The rungs `Icon` offers, spelled here so this file still imports nothing. */
type IconRung = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * Frozen, and a closed record rather than a lookup with a default: a size that is not
 * in this table is a compile error at the call site.
 *
 * The class strings are LITERALS on purpose. Tailwind's JIT scans source text, so a
 * `w-${n}` built at runtime would compile to a class that exists in the DOM and in no
 * stylesheet. Every value here must stay something a grep can find.
 */
export const AVATAR_SIZES: Readonly<Record<AvatarSize, Readonly<AvatarGeometry>>> = Object.freeze({
  // 14 px — the size of the `CircleUserRound` this replaced in the sidebar, and the
  // one rung where the glyph fills the whole box.
  xs: Object.freeze({ box: 'w-3.5 h-3.5', glyph: 'sm', bare: 'sm' }),
  // 20 px — the initial badge in the settings rail footer, kept so the row's height
  // and baseline are exactly what they were.
  sm: Object.freeze({ box: 'w-5 h-5', glyph: 'xs', bare: 'lg' }),
  // 24 px — one row of the org members table, sized UNDER the 28 px role pill sharing
  // the row rather than at it, so adding faces does not make every roster taller.
  md: Object.freeze({ box: 'w-6 h-6', glyph: 'sm', bare: 'xl' }),
  // 44 px — large enough to read a face, small enough to sit on one line of a card.
  lg: Object.freeze({ box: 'w-11 h-11', glyph: 'xl', bare: 'xl' }),
})
