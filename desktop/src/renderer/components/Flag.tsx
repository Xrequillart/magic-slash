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
 * The same component exists in `webapp/components/Flag.tsx`. Ported rather than
 * shared: two builds, no common module — and the paths are a fixed drawing that has
 * no reason to change on one side only.
 */

/** 3:2, the ratio both flags are drawn at, so neither is stretched. */
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
  // The red saltire is COUNTERCHANGED — offset against the white one rather than
  // centred on it — which is the detail that separates the real flag from the
  // approximation everyone draws. It needs a clip path, and a clip path needs an id
  // that is unique in the document: this component renders six times on the
  // Languages tab alone, and a hardcoded id would have all six clip to the first.
  const clip = useId()
  return (
    <svg viewBox="0 0 60 30" className={className} aria-hidden focusable="false">
      <clipPath id={clip}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${clip})`} stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
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
