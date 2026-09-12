import type { AvatarFallback, AvatarSize } from '@ds/desktop'

/**
 * Which drawing each SURFACE of this app asks the design system for.
 *
 * The table used to carry the geometry itself — `w-11 h-11`, `w-3 h-3`, a `badge`
 * flag. Those moved into `design-system/desktop/avatarSizes.ts` when `Avatar` did,
 * and what stays here is the half that is genuinely this app's: the fact that the
 * left sidebar is 14px and bare, and the identity card is 44px with a pill. A design
 * system that knew the word "sidebar" would be a design system with the app inside it.
 *
 * A SEPARATE MODULE STILL, and still one that imports nothing at runtime — the type
 * import above is erased. The root Vitest suite runs on the ROOT `node_modules`,
 * where React does not exist, so `AccountAvatar.tsx` cannot be reached from it.
 * Keeping the table here, pure, is what makes the mapping assertable. The day this
 * file imports React it stops being covered, silently.
 *
 * WHY `variant` AND NOT `size`. The values name SURFACES because the table carries
 * more than a width: `fallback` says whether the no-photo state wears the
 * `bg-accent/20` pill or is a bare glyph. The sidebar draws a naked `CircleUserRound`
 * and adding the photo must not change how that row looks when there is no photo — a
 * pill appearing behind the icon would be a visible regression for every user who
 * never uploads one. A `size` prop could not express that: `w-3.5` is not the reason
 * the sidebar goes bare, being the sidebar is.
 */

/** The surfaces that draw the account photo. One entry per caller, never a spare. */
export type AccountAvatarVariant = 'card' | 'footer' | 'sidebar' | 'roster'

export interface AccountAvatarSurface {
  size: AvatarSize
  fallback: AvatarFallback
}

/**
 * Frozen, and a closed record rather than a lookup with a default: a variant that is
 * not in this table is a compile error at the call site, which is the whole point of
 * the prop being a literal union.
 */
export const ACCOUNT_AVATAR_VARIANTS: Readonly<Record<AccountAvatarVariant, Readonly<AccountAvatarSurface>>> =
  Object.freeze({
    /** The identity card — 44px, large enough to read a face. */
    card: Object.freeze({ size: 'lg', fallback: 'badge' } as const),
    /** The settings rail footer — 20px, the size the initial badge occupied there. */
    footer: Object.freeze({ size: 'sm', fallback: 'badge' } as const),
    /** The left sidebar's account button — 14px, and BARE. See the note above. */
    sidebar: Object.freeze({ size: 'xs', fallback: 'glyph' } as const),
    /** One row of the org members table — 24px, sized under the role pill beside it. */
    roster: Object.freeze({ size: 'md', fallback: 'badge' } as const),
  })
