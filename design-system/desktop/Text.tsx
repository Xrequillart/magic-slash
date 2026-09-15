import type { ReactNode } from 'react'

import type { ComponentSize } from './componentSizes'

/**
 * Text, in the app's own face, at one of six sizes in one of four weights — four
 * REAL ones: see `TEXT_WEIGHTS` for the measurement that cut the scale down.
 *
 * IT NAMES CERA PRO DIRECTLY rather than using `font-sans`, and that is not
 * belt-and-braces: `font-sans` is Cera Pro in the desktop and AVENIR in the webapp
 * (see either `tailwind.config`). A shared component leaning on it would render in
 * one face in the app and another on the page documenting the app — the exact
 * failure a design system exists to prevent. The face is declared as a `@font-face`
 * in both, so naming it works in both.
 *
 * The stack behind it is the same one the desktop's `sans` carries, so a glyph Cera
 * Pro does not have falls back identically here and there.
 */
export const TEXT_FACE = "font-['Cera_Pro',-apple-system,BlinkMacSystemFont,system-ui,sans-serif]"

/**
 * The sizes — `ComponentSize`, the folder's one ladder, resolved to type.
 *
 * THEY USED TO BE NAMED AFTER THEIR TAILWIND CLASSES, which was one vocabulary
 * instead of two right up until every other component in the folder grew a scale of
 * its own. Then it was the odd one out: `md` was a rung on five components and this
 * called its equivalent `base`, so a caller writing `size="md"` on a `Label` and
 * `size="base"` on the `Text` inside it was spelling one decision two ways. The
 * class each rung emits is in `TEXT_SIZES` and is still `text-base` — the CLASS did
 * not move, only what a caller has to remember.
 *
 * `base` HAD NO CALL SITES, which is the whole reason this was affordable: the
 * rename touched the table, the showcase and nothing else.
 *
 * Weighted the way the app actually reads: `text-xs` appears 460 times in the
 * renderer and `text-sm` 191, which together are 95% of its text. Everything from
 * `lg` up is a page heading and is counted in single figures, so the scale is dense
 * at the bottom and sparse at the top on purpose.
 *
 * `xs` is therefore the DEFAULT. A design system whose default type size is the one
 * its product almost never uses makes every call site argue with it. It is the one
 * rung whose name and whose class disagree the least — and the reason the scale is
 * dense at the bottom and sparse at the top is the app, not the ladder.
 *
 * `2xs` IS THE FLOOR AND IT IS NOT A TAILWIND CLASS — there is no `text-2xs`, so it
 * is spelled as the arbitrary value it is. It exists because the scale stopped one
 * rung above what the app draws: `text-[10px]` is still spelled by hand twelve times in
 * this folder — three in `PullRequestCard`, two each in `ReviewThreadLine`,
 * `SelectIcon` and `UsageClaudeCodeCard`, one each in `EditableText`, `SpecCard` and
 * `Sidebar` — and `Tally` and `CheckList` each carried a comment explaining that
 * `Text` had no rung for it. A scale a dozen call sites step around is the scale
 * being wrong, not the call sites.
 *
 * WHAT IT IS FOR, and the whole of it: DETAIL UNDER A 12px LABEL. A fold whose
 * contents are the same size as the header that opened them reads as a second card
 * rather than as the inside of the first — the drop to 10px is what makes the header
 * a header. It is not a rung for small print in general, and nothing a reader has to
 * read on its own belongs here.
 *
 * THOSE TWELVE ARE NOT CONVERTED YET, and each is its own small decision about
 * whether its 10px was a hierarchy or a habit. This rung is what lets them be asked
 * one at a time rather than standing as an argument against the scale.
 */
export type TextSize = ComponentSize

export const TEXT_SIZES: Record<TextSize, string> = {
  '2xs': 'text-[10px]',
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
}

/**
 * The four weights that EXIST, named after the files they are.
 *
 * The shipped family is Light, Medium, Bold and Black — 300, 500, 700, 900 — plus
 * two italics. There is no upright Regular at all: the `@font-face` at weight 400
 * in both apps points at `Cera Pro Regular Italic.otf` and declares
 * `font-style: italic`, so nothing upright answers to 400.
 *
 * That is not a deduction from the CSS spec, it is measured. Rendering
 * "Handgloves 123" at 40px in Chrome:
 *
 *     300 → 285.89px      600 → 293.28px
 *     400 → 290.69px      700 → 293.28px
 *     500 → 290.69px      900 → 296.61px
 *
 * 400 and 500 are the same drawing, and so are 600 and 700. A scale offering
 * `normal`, `medium`, `semibold` and `bold` would therefore be four names for two
 * faces — which is the kind of thing a design system exists to stop, not to ship.
 *
 * `medium` IS the body weight here, and the default. Nothing changes on screen: text
 * with no weight class was already falling through 400 to this exact face.
 */
export type TextWeight = 'light' | 'medium' | 'bold' | 'black'

export const TEXT_WEIGHTS: Record<TextWeight, string> = {
  light: 'font-light',
  medium: 'font-medium',
  bold: 'font-bold',
  black: 'font-black',
}

/**
 * Colour, which a text component has to own or every call site will pass a class
 * for it — and `Banner` proves the point: its message was `text-ink` spelled at the
 * call site, next to a size spelled at the call site.
 *
 * Two rungs and an escape hatch, the shape `Icon` uses: `ink` is what the reader is
 * meant to read, `secondary` is what supports it, and `inherit` is for text taking
 * the colour of what it sits in — a coloured button's label, a tone-carrying chip.
 */
export type TextTone = 'ink' | 'secondary' | 'inherit'

const TONES: Record<TextTone, string> = {
  ink: 'text-ink',
  secondary: 'text-text-secondary',
  inherit: '',
}

export interface TextProps {
  /**
   * The words. A STRING, deliberately — not a `ReactNode`.
   *
   * Text that needs a node inside it is text with structure, and structure is what
   * makes a "just a label" component grow a `<strong>`, then a link, then a layout.
   * Anything that rich is a paragraph the call site should compose itself out of
   * several of these.
   */
  children: string
  size?: TextSize
  weight?: TextWeight
  tone?: TextTone
  /**
   * Layout and truncation — `truncate`, `min-w-0`, a margin. Not a size, a weight
   * or a colour: those are the three props above, and a second spelling of any of
   * them would win or lose by the order Tailwind emitted the classes in.
   */
  className?: string
  /** The native tooltip, for a line that may be truncated. */
  title?: string
}

/**
 * A `<span>` and never a `<p>`: this renders inside rows, chips and buttons far
 * more often than it renders a paragraph, and a block element in a flex row is a
 * surprise. A call site that wants a paragraph wraps one.
 */
export function Text({
  children,
  size = 'xs',
  weight = 'medium',
  tone = 'ink',
  className = '',
  title,
}: TextProps): ReactNode {
  return (
    <span
      title={title}
      className={`${TEXT_FACE} ${TEXT_SIZES[size]} ${TEXT_WEIGHTS[weight]} ${TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
