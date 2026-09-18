/* eslint-disable @next/next/no-img-element */

/**
 * THE WORDMARK, AND THE ONE PLACE THE FILE IS NAMED.
 *
 * Seven surfaces drew it before this existed — the site header and footer, the sign-in
 * page, the invitation page twice, the app bar, the back-office bar and the
 * email-confirmed screen — and each one spelled its own `<img src="/img/logo-….svg">`.
 * Two consequences, and the second is the reason this file exists:
 *
 *   * the artwork had already SPLIT. The header and the footer carried the current
 *     mark; four other surfaces were still on `logo-readme-light.svg`, the wordmark it
 *     replaced. Nobody decided that — it is what happens when the new file lands at the
 *     two call sites somebody happened to be looking at;
 *   * changing the logo meant finding seven call sites, and finding all seven is the
 *     kind of thing you get right until the eighth is added.
 *
 * So the path lives here and nowhere else. Swapping the artwork is now one line in this
 * file, and it reaches the whole site at once — which is what it was asked to do.
 *
 * ── WHY A SIZE LADDER AND NOT A HEIGHT CLASS ──────────────────────────────────────
 *
 * The obvious shape for this component takes `className` and lets each caller say
 * `h-9`, `h-11`, `h-7`. That is what the call sites already did, and it is exactly how
 * the drift above started: a height is a number somebody picks by eye against the page
 * they are on, so seven pages produce seven numbers with no relation between them.
 *
 * It also cannot survive a change of artwork, and this mark has had one. The old
 * wordmark was 693×130 — 5.33:1, ink edge to edge. The current one is 736×214, 3.44:1,
 * and it carries vertical air the old one did not, so the SAME height puts visibly less
 * ink on the screen. `SiteHeader` found the conversion by hand when it moved first:
 * `h-[30px]` of the old mark reads like `h-12` of this one, a factor of about 1.6. Every
 * rung below is a call site's old height run through that factor and rounded to the
 * scale, which is why they are not a geometric series — they are the sizes the pages
 * were already drawing, restated in the current artwork.
 *
 * A NEW ARTWORK THEREFORE RE-TUNES THIS TABLE ONCE, here, rather than re-tuning seven
 * pages nobody thinks to open.
 */

/**
 * Which file. `black` is the mark for a light ground and is what every page but the
 * footer wants; `white` is for a dark one.
 *
 * NOT DERIVED FROM A THEME, and deliberately: these pages have no theme to read. The
 * site is light everywhere, the footer is dark because the footer is dark, and a
 * component that tried to work that out would be guessing at what is behind it.
 */
export type LogoVariant = 'black' | 'white'

const LOGO_SRC: Readonly<Record<LogoVariant, string>> = Object.freeze({
  // ── THE LOGO. Change these two lines and the whole site follows. ──
  black: '/img/logo-black.svg',
  white: '/img/logo-white.svg',
})

/** How much of the page the mark is entitled to — see the note at the top. */
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg'

const LOGO_HEIGHT: Readonly<Record<LogoSize, string>> = Object.freeze({
  // 32px — a mark in a dense bar, where it names the product and nothing more.
  xs: 'h-8',
  // 40px — the back-office bar (56px tall) and the corner mark on the email-confirmed
  // screen, where the heading in the middle is what the eye should land on.
  sm: 'h-10',
  // 48px — the site header and footer, and the app's own bar. The house size: in a
  // 64px bar it leaves 8px of air above and below.
  md: 'h-12',
  // 56px — a page that OPENS on the mark, with no navigation above it to share the
  // attention: signing in, accepting an invitation.
  lg: 'h-14',
})

export interface LogoProps {
  variant?: LogoVariant
  size?: LogoSize
  /**
   * The mark is a decoration rather than content.
   *
   * Pass it wherever the name is already said next to the mark — a labelled link
   * around it, a heading a line below — because a screen reader announcing "Magic
   * Slash" twice in two seconds is a worse page than one that skips a picture. It sets
   * `alt=""`, which is the correct value for a decorative image and not a missing one.
   */
  decorative?: boolean
  /** Margins and placement. Not the height, which the size owns. */
  className?: string
}

export function Logo({ variant = 'black', size = 'md', decorative = false, className = '' }: LogoProps) {
  return (
    <img
      src={LOGO_SRC[variant]}
      alt={decorative ? '' : 'Magic Slash'}
      className={`${LOGO_HEIGHT[size]} w-auto ${className}`.trim()}
    />
  )
}
