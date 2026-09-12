import type { ReactNode } from 'react'

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
const FACE = "font-['Cera_Pro',-apple-system,BlinkMacSystemFont,system-ui,sans-serif]"

/**
 * The sizes, named after the Tailwind classes they are — one vocabulary, not two.
 *
 * Weighted the way the app actually reads: `text-xs` appears 460 times in the
 * renderer and `text-sm` 191, which together are 95% of its text. Everything from
 * `lg` up is a page heading and is counted in single figures, so the scale is dense
 * at the bottom and sparse at the top on purpose.
 *
 * `xs` is therefore the DEFAULT. A design system whose default type size is the one
 * its product almost never uses makes every call site argue with it.
 */
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'

export const TEXT_SIZES: Record<TextSize, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
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
      className={`${FACE} ${TEXT_SIZES[size]} ${TEXT_WEIGHTS[weight]} ${TONES[tone]} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
