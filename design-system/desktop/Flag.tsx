import { useId } from 'react'

/**
 * Flags as inline SVG, not emoji.
 *
 * WHY NOT EMOJI. A flag emoji is a regional-indicator pair the FONT decides how to
 * draw — and on Windows there is no such glyph at all, so 🇫🇷 renders as the letters
 * "FR" in a box. Even where it works, the size and baseline are the font's to choose,
 * which is why an emoji flag never quite lines up with the text beside it. An inline
 * SVG is the same two rectangles on every machine, at exactly the size asked for.
 *
 * WHY THE UNION FLAG FOR ENGLISH. A flag names a country and a language names a
 * people, so no flag is ever right for a language — this one is a convention, picked
 * because the alternatives are worse: the Stars and Stripes says "American English"
 * to everyone who does not write it, and a flagless row loses the scanning speed the
 * flags are here for.
 *
 * IN THE DESIGN SYSTEM and not in the desktop's components any more, because two
 * things draw it: the desktop's language picker on the settings page and, here,
 * `ToggleButton`'s `flag` for the language tiles on the quick-settings sheet. It carries no
 * theme token — a flag's colours are the flag's — so it is the rare drawing here that
 * looks the same on every ground, which is exactly what a flag is for.
 *
 * The same component exists in `webapp/components/Flag.tsx`, the site's copy. It should
 * import this one now that this one is importable; it did not yet.
 */

/**
 * Every flag here is drawn in a 3:2 viewBox, and that is a hard rule rather than a
 * detail: an SVG whose viewBox ratio differs from the box it is given gets letterboxed
 * by `preserveAspectRatio`, centred, and rendered SHORTER. The Union Flag's own ratio
 * is 2:1, so drawn at its natural proportions next to the French 3:2 it came out a
 * quarter shorter with white gaps above and below — visibly, unpleasantly wrong in a
 * list where the two sit one under the other.
 *
 * So the Union Flag below is redrawn at 3:2 rather than squashed into it: the cross and
 * saltire widths are the standard fractions OF THE HEIGHT, recomputed for the taller
 * box, which is what flag icon sets do. Stretching the 2:1 drawing with
 * `preserveAspectRatio="none"` would have been one line and would have tilted every
 * diagonal.
 */
const BOX = 'shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10'

function FranceFlag({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 3 2" className={className} aria-hidden focusable="false">
      <rect width="3" height="2" fill="#fff" />
      <rect width="1" height="2" fill="#002654" />
      <rect x="2" width="1" height="2" fill="#ED2939" />
    </svg>
  )
}

function UnionFlag({ className }: { className: string }) {
  // Drawn in 60x40 — 3:2, matching France above — not the flag's own 60x30. Every
  // width below is the standard fraction of the HEIGHT, so the proportions are the real
  // ones for this box: white cross a third of the height, red cross a fifth, white
  // saltire a fifth, red saltire an eighth.
  //
  // The red saltire is COUNTERCHANGED — offset against the white one rather than centred
  // on it — which is the detail that separates the real flag from the approximation
  // everyone draws. It needs a clip path, and a clip path needs an id that is unique in
  // the document: this component renders six times on the Languages tab alone, and a
  // hardcoded id would have all six clip to the first.
  const clip = useId()
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden focusable="false">
      {/* One triangle per quadrant, alternating sides of the diagonal — that selection
          IS the counterchange. Centre is (30,20). */}
      <clipPath id={clip}>
        <path d="M30,20 h30 v20 z v20 h-30 z h-30 v-20 z v-20 h30 z" />
      </clipPath>
      <path d="M0,0 v40 h60 v-40 z" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="5" />
      <path d="M30,0 v40 M0,20 h60" stroke="#fff" strokeWidth="13.33" />
      <path d="M30,0 v40 M0,20 h60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  )
}

/**
 * The flag for a language code, or nothing for a code we have no drawing for.
 *
 * Returning null rather than a placeholder is deliberate: a new language should show
 * up as a row without a flag — plainly incomplete — rather than as a grey square that
 * looks like a broken image.
 */
export function Flag({ code, className = 'h-3 w-[18px]' }: { code: string; className?: string }) {
  const cls = `${BOX} ${className}`
  if (code === 'fr') return <FranceFlag className={cls} />
  if (code === 'en') return <UnionFlag className={cls} />
  return null
}

/**
 * THE ROUND FLAG — the marketing site's, from `LanguagesArt`, ported for the language
 * tiles on the quick-settings sheet: a disc rather than a rectangle, because the tile it
 * fills is a circle and a rectangle cut to a circle loses its corners and its meaning.
 *
 * DRAWN, NOT LOADED, and in the ICON'S palette rather than the flags' real colours — the
 * site's own choice, kept: the two marks were Icons8's 96px "round flag" PNGs redrawn as
 * SVG, indigo `#3F51B5`, off-white `#ECEFF1`, red `#FF3D00`, and the disc has to match
 * the site a reader may have just come from. These are icons of flags, in a flat set's
 * palette; the rectangles above are the ones that carry the real colours. The hexes
 * are the drawing's, like the rectangles' — a flag has no theme.
 *
 * Flat and uncounterchanged, as the icon is. `useId` on the clip for the reason
 * `UnionFlag` gives: `url(#id)` resolves against the whole document.
 */
export function RoundFlag({ code, className = 'h-10 w-10' }: { code: string; className?: string }) {
  const clip = useId()
  const clipPath = `url(#${clip})`
  if (code !== 'fr' && code !== 'en') return null
  return (
    <svg viewBox="0 0 96 96" className={`shrink-0 rounded-full ${className}`} aria-hidden focusable="false">
      <clipPath id={clip}>
        <circle cx="48" cy="48" r="48" />
      </clipPath>
      {code === 'fr' ? (
        <g clipPath={clipPath}>
          <rect width="32" height="96" fill="#3F51B5" />
          <rect x="32" width="32" height="96" fill="#ECEFF1" />
          <rect x="64" width="32" height="96" fill="#FF3D00" />
        </g>
      ) : (
        <g clipPath={clipPath}>
          <rect width="96" height="96" fill="#3F51B5" />
          <path d="M0,0 L96,96 M96,0 L0,96" stroke="#ECEFF1" strokeWidth="16" />
          <path d="M0,0 L96,96 M96,0 L0,96" stroke="#FF3D00" strokeWidth="6" />
          <path d="M48,0 V96 M0,48 H96" stroke="#ECEFF1" strokeWidth="26" />
          <path d="M48,0 V96 M0,48 H96" stroke="#FF3D00" strokeWidth="14" />
        </g>
      )}
    </svg>
  )
}
