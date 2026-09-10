import { MousePointer2 } from 'lucide-react'

/**
 * THE SITE'S ONE DRAWN CURSOR: lucide's arrow, filled `ink` with a white edge and the
 * preset drop shadow, so it reads on a dark drawer and on a pale plate alike.
 *
 * ONE COMPONENT, FOUR DRAWINGS. The merge button on `/workflow`, the switch on the
 * homepage's "make it yours" card, and the two stories on `/features` that click through
 * the app (the dev server, the review drawer) each drew a pointer of their own, as three
 * hand-traced SVG paths and one lucide glyph, and the product owner asked for the
 * workflow's on all of them. A cursor is the one object on the site that stands for the
 * READER's hand, and four hands in four styles is four sites.
 *
 * WHERE IT IS AND HOW IT MOVES IS THE CALLER'S. This draws the arrow and its press; the
 * glide, the keyframe, the measured target are each drawing's own, so the wrapper that
 * positions it is the one that transitions. `pressed` is the click: a dip about the tip,
 * which is where the hot spot of a pointer is, not its centre.
 */
export function Pointer({ pressed = false, className = 'h-6 w-6' }: { pressed?: boolean; className?: string }) {
  return (
    <MousePointer2
      aria-hidden
      className={`fill-ink text-white drop-shadow transition-transform duration-150 ${
        pressed ? 'scale-[0.85]' : 'scale-100'
      } ${className}`}
      style={{ transformOrigin: '25% 15%' }}
    />
  )
}
