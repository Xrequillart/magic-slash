'use client'

/**
 * The artwork beside the `In the menu bar` row: a real capture of the top-right corner of
 * a Mac's screen, with the app's icon among the status items and a count beside it.
 *
 * A PHOTOGRAPH AND NOT A DRAWING, alone among the visuals on this page. The menu bar is a
 * translucent strip over the wallpaper with black glyphs on it, and every attempt to draw
 * that — a dark band, then a row of icons over a gradient — was either a bar from a
 * different operating system or a row of icons. What sells it is the wallpaper showing
 * through, and a wallpaper is not something to redraw.
 *
 * `public/img/menu-bar.png` is a 376×216 capture at 2×, cropped tight: the rabbit with
 * its count of waiting agents and the first two system items, on the purple macOS
 * wallpaper. Cropped to the plate by `object-cover` anchored at the TOP, because the bar
 * is the only part that matters and the wallpaper below it is what may go.
 *
 * `aria-hidden` on the plate and an empty `alt`: it is a picture of somebody else's UI.
 */
export function MenuBarMockup() {
  return (
    <div aria-hidden className="h-full min-h-44 overflow-hidden rounded-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/menu-bar.png" alt="" className="h-full w-full object-cover object-top" />
    </div>
  )
}
