import { describe, it, expect } from 'vitest'
import { ACCOUNT_AVATAR_VARIANTS, type AccountAvatarVariant } from './accountAvatarSize'

// The component itself is not rendered anywhere in this suite, and cannot be: there is
// no jsdom and no React in the ROOT node_modules the suite runs on. What is worth
// asserting is the table — the class strings three surfaces are measured against.
const VARIANTS: AccountAvatarVariant[] = ['card', 'footer', 'sidebar']

describe('ACCOUNT_AVATAR_VARIANTS', () => {
  it('covers every surface that draws the account photo', () => {
    expect(Object.keys(ACCOUNT_AVATAR_VARIANTS).sort()).toEqual([...VARIANTS].sort())
  })

  it('keeps the identity card exactly as story #288 shipped it', () => {
    // Non-regression: the card is the only surface that already existed, and adding a
    // variant prop must not have moved it by a pixel.
    expect(ACCOUNT_AVATAR_VARIANTS.card).toEqual({ box: 'w-11 h-11', glyph: 'w-6 h-6', badge: true })
  })

  it('sizes each new surface to the element it replaces', () => {
    // 20 px was the initial badge in the settings rail footer, 14 px the sidebar's
    // CircleUserRound. Either one changing shifts a row that must not move.
    expect(ACCOUNT_AVATAR_VARIANTS.footer.box).toBe('w-5 h-5')
    expect(ACCOUNT_AVATAR_VARIANTS.sidebar.box).toBe('w-3.5 h-3.5')
  })

  it('drops the badge chrome on the sidebar and nowhere else', () => {
    // The point of the field: the sidebar's no-photo state is the bare glyph it has
    // always been, while the card and the footer keep their bg-accent/20 pill.
    const bare = VARIANTS.filter((variant) => !ACCOUNT_AVATAR_VARIANTS[variant].badge)
    expect(bare).toEqual(['sidebar'])
  })

  it('gives the bare glyph the whole box and the badged ones room to breathe', () => {
    // Standing alone the icon IS the mark and takes the full width the row was built
    // around; inside a pill it has to leave the fill visible around it.
    expect(ACCOUNT_AVATAR_VARIANTS.sidebar.glyph).toBe(ACCOUNT_AVATAR_VARIANTS.sidebar.box)
    expect(ACCOUNT_AVATAR_VARIANTS.card.glyph).not.toBe(ACCOUNT_AVATAR_VARIANTS.card.box)
    expect(ACCOUNT_AVATAR_VARIANTS.footer.glyph).not.toBe(ACCOUNT_AVATAR_VARIANTS.footer.box)
  })

  it('spells every dimension as a literal Tailwind pair', () => {
    // Tailwind's JIT scans source text: a class assembled at runtime compiles to
    // nothing, and the avatar would render at whatever size its parent allows. Every
    // value has to be a `w-… h-…` string a grep can find.
    const LITERAL_PAIR = /^w-\d+(\.\d+)? h-\d+(\.\d+)?$/
    for (const variant of VARIANTS) {
      expect(ACCOUNT_AVATAR_VARIANTS[variant].box).toMatch(LITERAL_PAIR)
      expect(ACCOUNT_AVATAR_VARIANTS[variant].glyph).toMatch(LITERAL_PAIR)
    }
  })
})
