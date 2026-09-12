import { describe, it, expect } from 'vitest'
import { AVATAR_SIZES } from '../../../../design-system/desktop/avatarSizes'
import { ACCOUNT_AVATAR_VARIANTS, type AccountAvatarVariant } from './accountAvatarSize'

/**
 * The component itself is not rendered anywhere in this suite, and cannot be: there
 * is no jsdom and no React in the ROOT `node_modules` the suite runs on. What is
 * worth asserting is the geometry each surface lands on.
 *
 * IT NOW ASSERTS A COMPOSITION, and is stronger for it. The table here says which
 * RUNG a surface asks for; `AVATAR_SIZES` in the design system says what that rung
 * draws. Either half can change without the other noticing, and the thing that must
 * not move is the product of the two — so that is what these assertions read.
 *
 * Reaching across into `design-system/` is fine HERE and nowhere in a build: vitest
 * runs at the repo root and resolves both trees, which is the same asymmetry
 * `webapp/lib/desktopTheme.test.ts` relies on. `avatarSizes.ts` imports nothing, so
 * there is no React to fail on.
 */
const VARIANTS: AccountAvatarVariant[] = ['card', 'footer', 'sidebar', 'roster']

/** What a surface actually draws, once its rung is resolved. */
const drawn = (variant: AccountAvatarVariant) => {
  const { size, fallback } = ACCOUNT_AVATAR_VARIANTS[variant]
  return { ...AVATAR_SIZES[size], fallback }
}

describe('ACCOUNT_AVATAR_VARIANTS', () => {
  it('covers every surface that draws the account photo', () => {
    expect(Object.keys(ACCOUNT_AVATAR_VARIANTS).sort()).toEqual([...VARIANTS].sort())
  })

  it('names a rung the design system actually has', () => {
    for (const variant of VARIANTS) {
      expect(AVATAR_SIZES[ACCOUNT_AVATAR_VARIANTS[variant].size], variant).toBeDefined()
    }
  })

  it('keeps the identity card exactly as story #288 shipped it', () => {
    // Non-regression: the card is the only surface that already existed, and neither
    // the variant prop nor the move into the design system may have shifted it.
    //
    // `toMatchObject` and not `toEqual`: the geometry table is the design system's and
    // may grow a field — `bare` arrived that way — without this surface having moved a
    // pixel. What must not change is the three values named here.
    expect(drawn('card')).toMatchObject({ box: 'w-11 h-11', glyph: 'xl', fallback: 'badge' })
  })

  it('sizes each new surface to the element it replaces', () => {
    // 20 px was the initial badge in the settings rail footer, 14 px the sidebar's
    // CircleUserRound. Either one changing shifts a row that must not move.
    expect(drawn('footer').box).toBe('w-5 h-5')
    expect(drawn('sidebar').box).toBe('w-3.5 h-3.5')
  })

  it('keeps the roster face under the role pill it shares a row with', () => {
    // The org members row is 28 px tall because of that pill. A face sized AT it — or
    // above it — would make every roster taller the moment anyone uploads a photo,
    // which is a layout change nobody asked for when they asked for faces.
    expect(drawn('roster').box).toBe('w-6 h-6')
  })

  it('drops the badge chrome on the sidebar and nowhere else', () => {
    // The point of the field: the sidebar's no-photo state is the bare glyph it has
    // always been, while the card and the footer keep their bg-accent/20 pill.
    const bare = VARIANTS.filter((variant) => drawn(variant).fallback === 'glyph')
    expect(bare).toEqual(['sidebar'])
  })

  it('gives the bare fallback the box, so a missing photo never shifts a row', () => {
    // The sidebar is the one surface that draws it, and 14px is the size the row was
    // built around. The BOX is what holds the footprint — the rung inside it only
    // decides how much of that box the mark fills.
    expect(drawn('sidebar').box).toBe('w-3.5 h-3.5')
    expect(drawn('sidebar').bare).toBe('sm')
  })

  it('spells every box as a literal Tailwind pair', () => {
    // Tailwind's JIT scans source text: a class assembled at runtime compiles to
    // nothing, and the avatar would render at whatever size its parent allows. Every
    // value has to be a `w-… h-…` string a grep can find.
    const LITERAL_PAIR = /^w-\d+(\.\d+)? h-\d+(\.\d+)?$/
    for (const variant of VARIANTS) {
      expect(drawn(variant).box, variant).toMatch(LITERAL_PAIR)
    }
  })
})
