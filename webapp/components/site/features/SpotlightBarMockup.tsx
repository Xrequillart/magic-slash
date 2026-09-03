'use client'

import { Search } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The artwork beside the `Spotlight` row: the Quick Launch bar, floating on a plate and
 * running off its right edge.
 *
 * DRAWN FROM `desktop/src/renderer/pages/QuickLaunch/index.tsx`, which is a window with
 * exactly one band in it: `flex items-center gap-4 px-5 py-4`, a `w-6` magnifier, and an
 * input at `text-2xl` in Cera Pro at 500 — `font-display` here is that same face. The
 * placeholder is the app's own, and it is the same string in both catalogues because it
 * is a ticket id followed by a command.
 *
 * THE WHOLE WINDOW IS THE PICTURE, not a bar inside a screenshot of one: Quick Launch has
 * no chrome, no title and no edges of its own — it is a dark rounded panel that appears
 * over whatever you were doing. So a dark rounded panel with a shadow under it, on a
 * ground, is not a simplification of that screen; it is that screen.
 *
 * CROPPED ON THE RIGHT, inside the plate rather than by the card. An input is a thing you
 * type into, and one that ends neatly inside its own picture is one you have already
 * filled — running it off the edge is what says there is room in it.
 *
 * `shadow-lift`, the scale's loudest rung, because the panel is floating over a page
 * rather than sitting on one. On this ground `shadow-card` would be invisible.
 *
 * `aria-hidden`: it is a drawing, and a search box that cannot be typed into should be
 * announced to nobody.
 */
export function SpotlightBarMockup() {
  const { t } = useT()

  return (
    <div
      aria-hidden
      className="flex h-full min-h-44 items-center overflow-hidden rounded-xl bg-tone-sky pl-6"
    >
      {/* `flex-1` AND `-mr-10` together are the crop, and the first is the half that is
          easy to leave out: a bar sized by its own text ends wherever the placeholder
          does, and a negative margin on something narrower than its container pushes
          nothing past the edge. Stretched to the remaining width first, it then runs 40px
          past and the plate's `overflow-hidden` cuts it.
          
          `whitespace-nowrap` so the placeholder leaves the frame sideways rather than
          wrapping into a second line the bar has no height for. */}
      <div className="-mr-10 flex min-w-0 flex-1 items-center gap-4 rounded-2xl bg-ink px-5 py-4 shadow-lift">
        <Search className="h-6 w-6 shrink-0 text-appink" />
        {/* The PLACEHOLDER tier, not typed text: the app draws it in `zinc-600`, which
            on black is dark enough to disappear at this size on a page nobody is
            focused on. `appink-icon` is the nearest declared ink that still reads. */}
        <span className="whitespace-nowrap font-display text-2xl font-medium text-appink-icon">
          {t('site.spotlightCard.placeholder')}
        </span>
      </div>
    </div>
  )
}
