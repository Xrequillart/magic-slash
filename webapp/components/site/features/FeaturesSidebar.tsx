'use client'

import { useEffect, useRef, useState } from 'react'
import { FEATURE_FAMILIES, PAGE_CHROME } from '@/lib/features'
import { useT } from '@/lib/i18n/useLanguage'
import { POPOVER_ROW } from '../NavDropdown'

/**
 * The `/features` sidebar: one row per family, highlighting whichever the reader has
 * scrolled to.
 *
 * A VERTICAL LIST AND NOT A FILTER, which is the shape the story asked for and worth
 * stating because the obvious next commit is a search box. There is nothing to search:
 * the whole inventory is on the page at once, and a filter over ~30 rows hides more than
 * it finds. This is a table of contents.
 *
 * HIDDEN BELOW `lg`. A 220px rail beside the content leaves the rows ~90px on a phone,
 * and a table of contents that has to be scrolled past to reach the contents is worse
 * than none — the sections are in the document in reading order, so nothing is lost.
 * `lg` and not `md`: at 768px the two columns would be 220 + 500, and the feature rows
 * are an icon tile plus prose that needs the width more than the rail does.
 *
 * THE SCROLL-SPY IS THE ONE EFFECT IN THIS TREE, and it is written the way the rest of
 * this site writes them — passive where it can be, doing as little as possible per
 * frame. It carries TWO guards, and it needs both because they hold back different
 * costs:
 *
 *   • `frame` COALESCES THE MEASUREMENTS. `read()` calls `getBoundingClientRect()` once
 *     per family, and a layout read after a scroll forces the browser to flush layout —
 *     five forced reads for one answer. Scroll events are not capped at one per frame:
 *     a trackpad fling or a smooth-scrolling wheel fires them faster than the page
 *     paints, so a listener that measured inline would measure several times over for a
 *     frame that can only show one result. The listeners therefore only SCHEDULE, and
 *     scheduling is a no-op while a frame is already pending: one measurement pass per
 *     frame, whatever the input device does.
 *   • `last` COALESCES THE RENDERS. Five sections means the answer changes about five
 *     times in a full scroll; without the ref the same anchor would be written back
 *     into state on every pass and React would rebuild this list each time.
 *
 * The two are not interchangeable. `last` guards `setActive` and nothing else — it
 * cannot stop the reads that produced the value it then discards, which is precisely
 * what the frame guard is for.
 *
 * AND IT LISTENS FOR `resize`, NOT JUST `scroll`. A viewport change moves the sections
 * without the page scrolling an inch: rotating a tablet, opening devtools, dragging the
 * window narrower or crossing the `lg` breakpoint all reflow the column and can carry a
 * heading across the 120px line. With `scroll` alone the highlight would keep pointing
 * at the family the reader has left until they happened to scroll again — and at the
 * exact moment they resized, the rail is what they were reading.
 */

/**
 * The anchor the rail opens on, and the answer `read()` falls back to before anything
 * has been reached.
 *
 * GUARDED, and not because an empty `FEATURE_FAMILIES` is plausible — `features.test.ts`
 * pins five families, and a page with none would be an empty column with or without
 * this. It is guarded because of what `[0]` costs when it IS wrong: the array is typed
 * `readonly FeatureFamily[]` and `noUncheckedIndexedAccess` is off, so the compiler
 * hands back a `FeatureFamily` that is `undefined` at runtime, and reading `.anchor`
 * off it throws — during the initial `useState`, in a client component, which unmounts
 * the whole page rather than this rail. `''` matches no family's anchor, so the honest
 * degraded state is a table of contents that highlights nothing.
 */
const FIRST_ANCHOR: string = FEATURE_FAMILIES.length > 0 ? FEATURE_FAMILIES[0].anchor : ''

export function FeaturesSidebar() {
  const { t } = useT()

  // The first family, so the server's HTML and the first client paint agree: the reader
  // starts at the top of the page, and the effect corrects it on the first frame if they
  // arrived on an anchor instead.
  const [active, setActive] = useState(FIRST_ANCHOR)
  const last = useRef(active)

  useEffect(() => {
    // Resolved ONCE, not per event — the same shape `DocSidebar`'s effect has, and for
    // the same reason: the anchors are fixed for the life of the page, so re-querying
    // the document on every scroll pays a lookup per family per frame for an answer
    // that cannot have changed. Safe from a child's effect because React commits the
    // whole tree before any of them runs, so the parent's sections are already there.
    const sections = FEATURE_FAMILIES.map((family) => ({
      anchor: family.anchor,
      node: document.getElementById(family.anchor),
    }))

    // The pending frame, or 0 for "none scheduled". `requestAnimationFrame` never
    // returns 0, so the id doubles as the flag — one variable to reason about instead
    // of an id and a boolean that could disagree.
    let frame = 0

    const read = () => {
      // Cleared FIRST, so a scroll event arriving while this pass runs schedules the
      // next one instead of being swallowed as a duplicate of the pass in flight.
      frame = 0
      let current = FIRST_ANCHOR

      for (const { anchor, node } of sections) {
        if (!node) continue
        // `getBoundingClientRect().top` and NOT `offsetTop`, which is what the
        // documentation sidebar uses. `offsetTop` is measured from the nearest
        // positioned ancestor, and these sections live inside `HomeSection`'s
        // `relative` column — so comparing it against `window.scrollY` would be
        // comparing two different origins and the highlight would sit one section
        // behind. A viewport-relative read has no such ancestor to care about.
        //
        // 120px is the fixed bar (64px) plus enough air that a section counts as
        // "reached" when its heading is comfortably on screen rather than the instant
        // its top edge slides under the header.
        if (node.getBoundingClientRect().top <= 120) current = anchor
      }

      if (current === last.current) return
      last.current = current
      setActive(current)
    }

    // What the listeners actually call. Everything expensive is behind this: measuring
    // is what costs, and a frame is the finest granularity anything measured can be
    // SEEN at, so there is no reason to do it twice for one paint.
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(read)
    }

    // Read on MOUNT as well as on scroll, and SYNCHRONOUSLY rather than through
    // `schedule`: a reader arriving on `/features#insights` starts mid-page — the
    // browser has already jumped to the fragment by the time effects run — and a
    // listener that only reacted to the first scroll EVENT would highlight the first
    // family until they moved. Measuring here rather than a frame later also means the
    // highlight is correct in the first painted frame, so a deep link never shows the
    // wrong row and then corrects itself.
    read()
    window.addEventListener('scroll', schedule, { passive: true })
    // No `passive` on this one: the flag only means anything for events a listener
    // could block, and `resize` is not one of them.
    window.addEventListener('resize', schedule)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      // A frame still pending when the reader navigates away would run `read()` against
      // a tree React has already unmounted, measuring nodes that are gone and calling
      // `setActive` on a component that is not there to receive it.
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return (
    // `lg:sticky` with `lg:top-24` — 96px, which clears the 64px bar and leaves the
    // rail's first row breathing room under it. `self-start` is what makes the sticky
    // work at all: a grid item stretches to the row's height by default, and a box as
    // tall as the whole column has nothing left to stick.
    // LEVEL WITH THE FIRST FAMILY HEADING, then pinned near the top as you scroll.
    //
    // It was centred in the viewport — an `h-screen` sticky box with the list on the
    // screen's middle line — and that was wrong for the one moment that matters most:
    // ARRIVING. The grid starts below a centred headline and its lead, so the middle of
    // the viewport at the top of the grid is below the fold, and a reader landing on the
    // page could not see the rail at all. A table of contents nobody sees on arrival is
    // a table of contents that does not exist.
    //
    // So `self-start` puts its first row level with `Skills`, the first family's
    // heading, which is also the honest position: it is the index OF that list, so it
    // begins where the list begins. `lg:top-24` — 96px — then clears the `fixed h-16`
    // bar with room under it, and the pin happens on the first scroll rather than
    // needing one.
    //
    // `self-start` is what makes the sticky work at all: a grid item stretches to its
    // row's height by default, and a box as tall as the whole column has nothing left
    // to stick.
    <nav
      aria-label={t(PAGE_CHROME.onThisPage)}
      className="hidden self-start lg:sticky lg:top-24 lg:block"
    >
      {/* THE VISIBLE HEADING IS GONE, and the string is not. It used to render as an
          `h2` above the rows — "On this page" — and it was doing no work the rows were
          not already doing: five family names in a rail beside the content read as a
          table of contents without being told they are one. The reference page has no
          such label either.

          But a landmark still needs a NAME, or a screen reader announces "navigation"
          and this page has three of them (the bar, the footer, this). So the key moved
          from `aria-labelledby` on a rendered heading to `aria-label` here: the same
          catalogue string, still `PAGE_CHROME`'s and therefore still checked for real by
          `features.test.ts`, just no longer drawn. Removing it outright would have taken
          the only name this rail has with it. */}
      <ul className="flex w-full flex-col gap-1">
        {FEATURE_FAMILIES.map((family) => (
          <li key={family.id}>
            {/* A plain `<a>` and not `Link`: this is a same-page fragment, so there is
                no route to prefetch and nothing for the router to do. `aria-current`
                rather than the colour alone — the highlight is the only thing marking
                the reader's place, and colour is not announced. `location` and not
                `page`: every row points INTO the page the reader is already on, and
                `page` would claim five of them are five different pages. */}
            {/* THE GEOMETRY still comes from `NavDropdown` — `POPOVER_ROW` is the
                site's nav-row box (radius, padding, `text-sm`, the transition), exported
                for exactly this, and the header's Product rows and the footer's language
                picker already draw on it. Retyping it here would have made this the
                fourth copy and the first one a change to that dress would miss.

                THE COLOURS ARE THIS PAGE'S OWN, and that is the deliberate part.
                `POPOVER_ROW_REST` dresses a row in `muted` with a `black/[0.04]` hover,
                which is right for a popover over the site's tinted ground. This rail is
                on white and in the one-ink hierarchy described in `FeaturesContent` —
                so a row at rest is the page's ink at 60%, and the state it moves to is
                MORE of the same ink, not a different hue.

                Which is also why the active row is not `accent` any more. It was
                `bg-accent/10 text-accent`, and a blue pill in a column of grey rows
                reads as a link you have not clicked yet rather than as the place you
                are. The reference page settles this the same way: full ink, a 6% ink
                pill, and the weight stepped up — no colour at all. `bg-ink/5` is the
                closest declared step to its 6%, and the weight does the rest.

                `aria-current` carries what the colour cannot: a highlight is the only
                thing marking the reader's place, and no screen reader announces a
                background. `location` and not `page` — every row points INTO the page
                the reader is already on, and `page` would claim these are five
                different pages. */}
            <a
              href={`#${family.anchor}`}
              aria-current={family.anchor === active ? 'location' : undefined}
              className={[
                POPOVER_ROW,
                family.anchor === active
                  ? 'bg-ink/5 font-semibold text-ink'
                  : 'text-ink/60 hover:bg-ink/5 hover:text-ink',
              ].join(' ')}
            >
              {t(family.title)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
