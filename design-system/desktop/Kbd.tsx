import { Text, type TextSize } from './Text'

/**
 * A KEY YOU PRESS, drawn as the cap it is written on.
 *
 * TWO SPELLINGS, AND THEY DISAGREED. The shortcuts page drew `px-2 py-0.5 bg-surface
 * border border-line rounded text-xs`; the appearance page, one tab away, drew `px-1
 * py-0.5 bg-surface-strong rounded text-[10px]` in the middle of a sentence. Same object,
 * two grounds, two radii, two type sizes and one of them with an outline. They are one
 * component, and this is it.
 *
 * WHAT IT IS NOT: `Label` NAMES a thing — a ticket, a repository, a product — on a plate
 * tinted with that thing's colour. This depicts a key on a keyboard, which is not a name
 * and carries nobody's brand. The difference shows in the one rule below that `Label` has
 * no reason to have.
 *
 * ── THE MODIFIERS ARE TYPESET A RUNG UP ───────────────────────────────────────────
 *
 * `⌘` at the same size as `N` reads smaller than it, because it is: the four Mac modifier
 * glyphs are drawn around the x-height where a capital fills the cap-height, so a chord
 * set at one size comes out as a small symbol beside a big letter. The shortcuts page had
 * already fixed this by hand — `<span className="text-sm">⌘</span>` inside a `text-xs`
 * cap — and that correction is the kind of thing that survives in one place and is
 * forgotten in the next, which is what happened on the appearance page.
 *
 * IT IS A FACT ABOUT THE GLYPHS AND NOT ABOUT THE APP, which is the only reason this
 * component is allowed to look at what it was handed. It reads four characters and knows
 * nothing else: what a key MEANS, whether a chord is bound, and which platform is
 * underneath are all the caller's.
 *
 * ── NO OUTLINE ────────────────────────────────────────────────────────────────────
 *
 * The cap is `surface-strong`, a step up from the `surface` every card that holds one is
 * drawn on, and it wears no hairline — `Button`'s rule, and the one `AccountCard` and
 * `RepositoryItem` learned the same way. The version with the border was drawn in
 * `bg-surface` on a `bg-surface` card, which is why it needed one: it was invisible
 * otherwise.
 */

/**
 * The four glyphs that come up short, and nothing else.
 *
 * NOT A LIST OF MODIFIERS — `Fn` and `Caps Lock` are modifiers too and are words, which
 * are typeset like every other word here. This is a list of CHARACTERS that need a rung,
 * and it is closed: adding to it means measuring a fifth glyph, not remembering a fifth
 * key.
 */
const RAISED = new Set(['⌘', '⌃', '⌥', '⇧'])

/**
 * Whether a key is set a rung up: EVERY character of it is one of the four.
 *
 * Per character and not per key, because the modifiers stack — Quick Launch offers
 * `⌃⇧ Space`, and a pair of glyphs is as short as either of them alone. `Space` is a
 * word and stays at the cap's own rung, which is the case the `every` is guarding: a
 * string containing a raised glyph is not the same thing as a string made of them.
 */
function raised(key: string): boolean {
  return key.length > 0 && [...key].every((character) => RAISED.has(character))
}

export type KbdSize = 'xs' | 'sm'

const SIZES: Record<KbdSize, { box: string; key: TextSize; raised: TextSize }> = {
  /**
   * 20px — INSIDE A SENTENCE. The appearance page names `⌘ +` and `⌘ −` in the middle of
   * a line of `xs` prose, and a cap at the row rung there would be taller than the line
   * it sits in.
   */
  xs: { box: 'h-5 gap-0.5 px-1.5 rounded', key: '2xs', raised: 'xs' },
  /** 24px — a row's VALUE: the chord at the right of a line that names what it does. */
  sm: { box: 'h-6 gap-1 px-2 rounded-md', key: 'xs', raised: 'sm' },
}

export interface KbdProps {
  /**
   * The chord, one entry per key: `['⌘', 'N']`, `['⌃', 'Space']`.
   *
   * A LIST AND NOT A STRING, which is the whole of the API decision. `"⌘ N"` would arrive
   * as one run of characters this component would then have to split on a space to
   * typeset — and a space is a separator in `⌘ N` and a KEY NAME in `⌃ Space`. The caller
   * knows which is which; a parser would be guessing.
   *
   * ONE CAP AND NOT ONE PER KEY. A chord is a single gesture — keys held together — so it
   * is drawn as a single cap. Two gestures are two `Kbd`s, which is exactly what the
   * appearance page's `⌘ +` and `⌘ −` are.
   */
  keys: string[]
  size?: KbdSize
  /** Margins and alignment. Not the ground, the radius or the type. */
  className?: string
}

export function Kbd({ keys, size = 'sm', className = '' }: KbdProps) {
  const shape = SIZES[size]

  return (
    /* `align-middle` because half its call sites are inline in prose: an `inline-flex`
       sits on the text baseline by default, which drops a 24px cap a few pixels below
       the line it interrupts. */
    <kbd
      className={`inline-flex shrink-0 items-center justify-center align-middle bg-surface-strong ${shape.box} ${className}`.trim()}
    >
      {keys.map((key, index) => (
        <Text
          // The index is part of the key because a chord can repeat a character —
          // `['⌘', '⌘']` is not a chord anybody presses, but a list with two equal
          // entries is a list React cannot tell apart.
          key={`${key}-${index}`}
          size={raised(key) ? shape.raised : shape.key}
          tone="secondary"
        >
          {key}
        </Text>
      ))}
    </kbd>
  )
}
