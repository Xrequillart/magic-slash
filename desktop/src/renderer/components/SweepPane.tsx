import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'

/**
 * How long the leaving page takes to clear the frame. Kept in sync with the
 * `sweep-out-*` animations in tailwind.config.cjs.
 */
const SWEEP_OUT_MS = 160

/**
 * When the incoming page starts, counted from the same instant. It waits for
 * the outgoing one to be gone, plus a beat of empty frame: overlapping the two
 * reads as a collision rather than as a sweep, however short the crossing is.
 */
const SWEEP_IN_DELAY_MS = 200

/** How long the arriving page takes to settle, once its delay has elapsed. */
const SWEEP_IN_MS = 200

type SweepDirection = 'up' | 'down' | 'left' | 'right'

/** Animation pair for each direction: the leaving page, then the arriving one. */
const SWEEP_CLASSES: Record<SweepDirection, { out: string; in: string }> = {
  up: { out: 'animate-sweep-out-down', in: 'animate-sweep-in-down' },
  down: { out: 'animate-sweep-out-up', in: 'animate-sweep-in-up' },
  left: { out: 'animate-sweep-out-left', in: 'animate-sweep-in-left' },
  right: { out: 'animate-sweep-out-right', in: 'animate-sweep-in-right' },
}

/** The page on its way out, frozen exactly as the last commit rendered it. */
interface LeavingPage {
  key: string
  node: ReactNode
  /** Scroll offset of the pane when the switch happened. */
  offset: number
  /** Visible height of the pane when the switch happened. */
  viewport: number
}

interface SweepPaneProps {
  /** Identifies the page on screen. A change starts a sweep. */
  pageKey: string
  /**
   * Rank of a page within the list it is picked from. The sign of the gap
   * between the outgoing and the incoming rank is what picks the direction.
   */
  order: (pageKey: string) => number
  /**
   * Whether a given switch travels sideways instead of along the rail. Use it
   * for a page that is opened rather than moved to: the rank still decides which
   * way, so a higher-ranked destination sweeps left and going back sweeps right.
   * Vertical when absent.
   */
  horizontal?: (fromKey: string, toKey: string) => boolean
  /** The scrolling pane wrapping this component. */
  scrollRef: RefObject<HTMLElement>
  /** Classes shared by both layers, so the leaving page keeps its layout. */
  className?: string
  children: ReactNode
}

/**
 * Swaps two pages with a vertical sweep whose direction follows the menu they
 * are picked from: going down the list pushes both pages up, going back up
 * pushes them down. The switch then reads as travel along one long list instead
 * of a cut, and the motion tells you which way you went. Switches marked
 * `horizontal` sweep sideways instead, for a sub-page that is opened and closed
 * rather than moved between.
 */
export function SweepPane({ pageKey, order, horizontal, scrollRef, className = '', children }: SweepPaneProps) {
  // The page as the previous commit rendered it. Handing that exact element
  // back to React keeps its subtree mounted while it sweeps out — building a
  // fresh one would remount every component of a page we are leaving, re-running
  // their fetch-on-mount effects just to animate it off screen.
  const lastRef = useRef<{ key: string; node: ReactNode }>({ key: pageKey, node: children })
  const [leaving, setLeaving] = useState<LeavingPage | null>(null)
  // Held in refs rather than in state: they must stay put for the whole sweep,
  // because touching the animation class or its delay mid-flight restarts the
  // animation. They therefore change only when a new sweep begins.
  const directionRef = useRef<SweepDirection>('down')
  // Nothing to wait for on the very first page, which has no predecessor to
  // clear the frame first: it appears straight away.
  const delayedRef = useRef(false)
  // Sideways travel pushes a layer past the pane's right edge for a moment. The
  // pane scrolls vertically, which makes its other axis scrollable too, so
  // without this the sweep would flash a horizontal scrollbar. `clip` and not
  // `hidden`: hidden would make this wrapper a scroll container of its own and
  // trap the scrolling that belongs to the pane. Held only for the length of the
  // sweep, so nothing that legitimately overhangs a page gets cut off at rest.
  const [clipX, setClipX] = useState(false)

  // Adjusting state during render, React's own pattern for reacting to a
  // changed prop. An effect would be one commit too late here: React would have
  // unmounted the outgoing page already, leaving nothing to animate.
  const previous = lastRef.current
  if (previous.key !== pageKey && leaving?.key !== previous.key) {
    const back = order(pageKey) < order(previous.key)
    const sideways = horizontal?.(previous.key, pageKey) ?? false
    directionRef.current = sideways ? (back ? 'right' : 'left') : back ? 'up' : 'down'
    setClipX(sideways)
    delayedRef.current = true
    setLeaving({
      key: previous.key,
      node: previous.node,
      // Read before the pane scrolls the incoming page back to its top, so the
      // page we are leaving stays frozen where the eye last saw it.
      offset: scrollRef.current?.scrollTop ?? 0,
      viewport: scrollRef.current?.clientHeight ?? 0,
    })
  }

  useLayoutEffect(() => {
    lastRef.current = { key: pageKey, node: children }
  })

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => setLeaving(null), SWEEP_OUT_MS)
    return () => window.clearTimeout(timer)
  }, [leaving])

  // Keyed on pageKey as well, so a switch landing mid-sweep restarts the hold
  // instead of letting the previous one uncover the page still travelling.
  useEffect(() => {
    if (!clipX) return
    const timer = window.setTimeout(() => setClipX(false), SWEEP_IN_DELAY_MS + SWEEP_IN_MS)
    return () => window.clearTimeout(timer)
  }, [clipX, pageKey])

  const sweep = SWEEP_CLASSES[directionRef.current]
  const layers: ReactNode[] = []

  if (leaving) {
    layers.push(
      <div
        key={leaving.key}
        aria-hidden
        className={`absolute inset-x-0 top-0 overflow-hidden pointer-events-none ${className} ${sweep.out}`}
        // Taken out of the flow, the page would snap back to its own top; the
        // negative margin replays the scroll offset it was read at. The height
        // cap then trims it to one screenful, so a long page on its way out
        // cannot stretch the pane's scrollbar for the length of the sweep.
        style={{
          marginTop: -leaving.offset,
          maxHeight: leaving.viewport ? leaving.offset + leaving.viewport : undefined,
        }}
      >
        {leaving.node}
      </div>,
    )
  }

  layers.push(
    <div
      key={pageKey}
      className={`${className} ${sweep.in}`}
      style={{ animationDelay: delayedRef.current ? `${SWEEP_IN_DELAY_MS}ms` : undefined }}
    >
      {children}
    </div>,
  )

  // Both layers go out as one keyed array: React then recognises the outgoing
  // page as the element already on screen and merely restyles it in place.
  return <div className={`relative ${clipX ? 'overflow-x-clip' : ''}`}>{layers}</div>
}
