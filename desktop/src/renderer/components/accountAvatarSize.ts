/**
 * The three geometries `AccountAvatar` is drawn at, and the chrome each one keeps.
 *
 * A SEPARATE MODULE, and a deliberately empty one at the top: not a single runtime
 * import, not even a type one. The root Vitest suite runs on the ROOT node_modules,
 * where React and `lucide-react` do not exist — `AccountAvatar.tsx` itself is therefore
 * untestable from there (importing it would fail to RESOLVE, which reads as a broken
 * test rather than as a missing install). Pulling the table out into a file that
 * imports nothing is what makes the part worth asserting — the class strings — reachable
 * from the suite, exactly as `../../avatar.ts` stays pure so both processes and the
 * tests can share it. Keep it that way: the day this file imports React it stops being
 * covered, silently.
 *
 * WHY `variant` AND NOT `size`. The values name SURFACES, not pixel sizes, because the
 * table carries more than a width: `badge` says whether the no-photo fallback wears the
 * `bg-accent/20` pill or is a bare glyph. The sidebar draws a naked `CircleUserRound`
 * today and AC 1 of this story is that adding the photo must not change how that row
 * looks when there is no photo — a pill appearing behind the icon would be a visible
 * regression for every user who never uploads one. The card and the footer, on the
 * other hand, have always shown a filled round badge and keep it. A `size` prop could
 * not express that: `w-3.5` is not the reason the sidebar goes bare, being the sidebar
 * is.
 *
 * That per-variant chrome is a DEVIATION from the design brief's `Component structure`
 * section, which shows only the badge fallback and describes the new prop as a size.
 * It is mandated by AC 1 ("in place of the glyph … without shifting the row"), not
 * chosen for taste: honouring the brief literally would put a 14 px accent pill in a
 * row that has never had one. Everything else in the brief is followed to the letter —
 * `rounded-full`, `object-cover`, `shrink-0`, `bg-accent/20`, `text-accent`, and the
 * `CircleUserRound` fallback rather than an initial.
 *
 * The glyph is the same size as the box on the sidebar and smaller than it everywhere
 * else, and that follows from the same split: inside a badge the icon has to leave the
 * fill visible around it, standing alone it IS the whole mark and gets the full 14 px
 * the row was built around.
 */

/** The surfaces that draw the account photo. One entry per caller, never a spare. */
export type AccountAvatarVariant = 'card' | 'footer' | 'sidebar'

export interface AccountAvatarGeometry {
  /** Box classes for the photo and for the fallback alike, so the two never disagree. */
  box: string
  /** Size of the `CircleUserRound` mark inside (or, on the sidebar, instead of) the box. */
  glyph: string
  /** Whether the no-photo fallback wears the `bg-accent/20` pill. False = bare glyph. */
  badge: boolean
}

/**
 * Frozen, and a closed record rather than a lookup with a default: a variant that is
 * not in this table is a compile error at the call site, which is the whole point of
 * the prop being a literal union. Freezing is the same guard `avatar.ts` puts on its
 * constants — these strings are read by three components and owned by none of them.
 *
 * The class strings are LITERALS on purpose. Tailwind's JIT scans source text, so a
 * `w-${n}` built at runtime would compile to a class that exists in the DOM and in no
 * stylesheet. Every value here must stay something a grep can find.
 */
export const ACCOUNT_AVATAR_VARIANTS: Readonly<Record<AccountAvatarVariant, Readonly<AccountAvatarGeometry>>> =
  Object.freeze({
    // 44 px: large enough to read a face, small enough to sit on one line of the card.
    card: Object.freeze({ box: 'w-11 h-11', glyph: 'w-6 h-6', badge: true }),
    // 20 px: the size the initial badge occupied in the settings rail footer, kept so
    // the footer row's height and baseline are exactly what they were.
    footer: Object.freeze({ box: 'w-5 h-5', glyph: 'w-3 h-3', badge: true }),
    // 14 px: the size of the `CircleUserRound` this replaces in the sidebar. Same box,
    // same glyph, no pill — the row must not move by a pixel.
    sidebar: Object.freeze({ box: 'w-3.5 h-3.5', glyph: 'w-3.5 h-3.5', badge: false }),
  })
