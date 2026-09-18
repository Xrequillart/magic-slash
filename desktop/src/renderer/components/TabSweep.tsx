import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/**
 * How far the arriving panel travels. The same 24px `SweepPane` uses sideways, so a
 * tab switch and a sub-page opening move by the same amount.
 */
const SLIDE_PX = 24

/** How long it takes to arrive. Short enough that the panel reads as switched, not played. */
const SLIDE_MS = 200

/**
 * Slides the panel under a `TabStrip` in the direction of the tab you picked.
 *
 * Picking a tab to the RIGHT brings the new panel in from the right, so both the old
 * and the new content travel left — the eye follows the pill. Picking one to the left
 * goes the other way. That is `SweepPane`'s horizontal convention (forward sweeps
 * left), which the settings rail already moves by, so the two never disagree about
 * which way "further along" looks.
 *
 * Ported to the webapp as `components/TabSweep.tsx`, the way `TabStrip` is — separate
 * builds, one control. Keep the two in step: a tab switch that travels differently in
 * the app and on the site reads as a bug in whichever one you saw second.
 *
 * WHY THE WEB ANIMATIONS API and not a keyed div with an `animate-sweep-in-*` class.
 * A key would remount the panel's subtree on every switch, re-running the fetches of
 * pages that merely change scope (the dashboard's org tabs, for one). A class alone
 * would not restart the animation when two switches run the same way — going right
 * twice keeps the same class name, and CSS only replays on a change. `animate()` is
 * driven by the switch itself, so neither problem exists.
 *
 * ENTER ONLY, with no exit half: the outgoing panel is gone by the time this runs.
 * `SweepPane` can animate both because it holds the previous element to do it, which
 * costs a frozen copy of the page; between two tabs of one page, a 200ms arrival
 * reads the same and keeps the panel a single mounted subtree.
 */
export function TabSweep({
  tabKey,
  order,
  className = '',
  style,
  bleed = false,
  children,
}: {
  /** The active tab. A change slides; the first render does not. */
  tabKey: string | undefined
  /**
   * Every tab key, in the order the strip lays them out. Which way the gap between the
   * old key and the new one runs is what picks the direction.
   */
  order: string[]
  className?: string
  /**
   * Styles for the travelling element — which is what the PADDING of a page belongs on.
   *
   * A scrolling box clips at its padding box, so a page inset from its pane's edge has
   * nowhere to go: sliding it 24px cuts its leading 24px of pixels for the length of the
   * animation, and every card arrives with a side missing. On the layer, that 24px is
   * the layer's own empty inset and the content arrives whole. `pages/Config/index.tsx`
   * makes the same arrangement for `SweepPane`, in classes; this takes a style object
   * because the page overlay's padding is a measured number it is handed.
   */
  style?: CSSProperties
  /**
   * BORROW THE PANEL'S OWN INSET WHILE TRAVELLING — for a sweep NESTED inside a padded
   * layer, which is the one case where the padding cannot simply be moved down here.
   *
   * The repository page's sub-tabs are inside the window's sweep layer, which carries
   * the `p-6` its own sideways travel needs; the organization tabs are inside the
   * account overlay's, which carries the measured column padding. Either way the panel
   * above has already inset the content, so the cards sit flush against the box that
   * clips and 24px of every card is cut off for the length of the slide.
   *
   * This widens the clipping box by the travel distance on each side and puts the same
   * amount back as padding on the layer, so nothing moves at rest and the content has
   * exactly its own travel to disappear into.
   *
   * ONLY WHEN THE PANEL ABOVE INSETS BY AT LEAST `SLIDE_PX`. Borrowing room that is not
   * there would paint the page over whatever sits beside it. Both call sites are inset
   * by exactly 24. A caller that bleeds does not set a horizontal padding of its own —
   * the bleed is it.
   */
  bleed?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef(tabKey)
  /**
   * Whether the panel is clipped sideways. It overhangs by SLIDE_PX for the length of
   * the slide, which would otherwise show a horizontal scrollbar on the page holding
   * it. `clip` and not `hidden`: hidden would make this a scroll container of its own.
   * Held only while it travels, so anything that legitimately overhangs a panel at
   * rest — a dropdown, a tooltip — is not cut off.
   */
  const [clipX, setClipX] = useState(false)

  // Joined into a string rather than used as the array it is: callers build the list
  // inline, so a fresh array every render would re-run this on every render.
  const keys = order.join('\u0000')

  useLayoutEffect(() => {
    const from = previous.current
    previous.current = tabKey
    // Nothing to travel from on the first render, and nothing to travel between while
    // the active tab is still being resolved.
    if (from === undefined || tabKey === undefined || from === tabKey) return

    const el = ref.current
    // No `animate` under jsdom, and none for anyone who asked for less motion: the
    // panel still switches, it just switches without travelling.
    if (!el || typeof el.animate !== 'function') return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const list = keys.split('\u0000')
    const forward = list.indexOf(tabKey) > list.indexOf(from)
    setClipX(true)
    const animation = el.animate(
      [
        { opacity: 0, transform: `translateX(${forward ? SLIDE_PX : -SLIDE_PX}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ],
      { duration: SLIDE_MS, easing: 'ease-out' },
    )
    animation.addEventListener('finish', () => setClipX(false))
    // A switch landing mid-slide cancels the one in flight and starts its own, rather
    // than leaving two animations fighting over the same transform.
    return () => {
      animation.cancel()
      setClipX(false)
    }
  }, [tabKey, keys])

  return (
    // The margin and the padding are PERMANENT and cancel each other out; only the clip
    // is held for the length of the slide. Toggling the inset with it would move the
    // whole page sideways by 24px at the start of every switch.
    <div
      className={clipX ? 'overflow-x-clip' : undefined}
      style={bleed ? { marginLeft: -SLIDE_PX, marginRight: -SLIDE_PX } : undefined}
    >
      <div
        ref={ref}
        className={className}
        style={bleed ? { ...style, paddingLeft: SLIDE_PX, paddingRight: SLIDE_PX } : style}
      >
        {children}
      </div>
    </div>
  )
}
