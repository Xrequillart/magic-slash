'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

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
 * The same control as the desktop app's `components/TabSweep.tsx`, ported rather than
 * imported for the same reason `TabStrip` is: the two are separate builds. Keep the two
 * in step — a tab switch that travels differently in the app and on the site reads as a
 * bug in whichever one you saw second.
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
    <div className={clipX ? 'overflow-x-clip' : undefined}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </div>
  )
}
