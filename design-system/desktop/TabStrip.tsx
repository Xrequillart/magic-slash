import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * A PILL RAIL WHOSE BACKGROUND SLIDES to the tab you pick — the app's one tab row.
 *
 * It is what the settings modal's header switches pages with, what a repository's
 * configuration is cut into, what the Team page switches organizations with, and what
 * the settings panel beside the quick-settings sheet uses. It lived in
 * `desktop/src/renderer/components/` and moved here unchanged in behaviour, for this
 * folder's one rule: what the desktop draws, the design system owns.
 *
 * WHY THE PILL IS MEASURED and not styled. A background painted on the active button can
 * only cut from one place to another; one absolutely positioned box, moved by transform,
 * travels — which is what makes the movement read as the answer to the click. The cost is
 * the offsets, the ResizeObserver and the first-paint rule below, all of which exist to
 * keep it on the tab it belongs to.
 *
 * AND ITS TWO EDGES LEAVE AT DIFFERENT TIMES. A pill that only translates is at its
 * destination without ever having crossed anything: the eye reads two positions, not a
 * path. So the edge in front goes first and the one behind follows a beat later — on a
 * move from the first tab to the third, the leading edge is around the middle of the tab
 * in between by the time the trailing edge lets go. The pill is longer than a tab for
 * most of the move, which is the whole of the effect: the distance is drawn rather than
 * jumped.
 *
 * THE EDGE BEHIND OVERSHOOTS, on `Switch`'s curve and for the reason that file records:
 * an edge on `ease-out` decelerates into its stop and reads as SLID, one that passes its
 * mark by a hair and settles reads as THROWN. Only the one behind, deliberately. It is
 * the last thing to arrive, so its overshoot happens INSIDE the tab being landed on and
 * nothing can poke out of a rail that clips; the same overshoot on the leading edge would
 * push past the last tab and into the track's 4px of padding.
 *
 * WHICH EDGE LEADS IS THE DIRECTION: rightwards it is the right edge, leftwards the left
 * one. Both are read off `left` and `right`, NOT off a transform and a width — the two
 * have to be independently delayed, and a width can only interpolate straight from one
 * number to the other. It would have to grow past the target and shrink back, which is
 * one property doing two things and not something a transition can express. `left` and
 * `right` are a layout animation rather than a composited one; for one small box on a
 * click, that is the cheaper trade than distorting `rounded-full` with a `scaleX`, which
 * is the objection `Switch` records about scaling a pill.
 *
 * THEME-AWARE THROUGHOUT: the rail, the pill and the labels are theme tokens
 * (`surface-*`, `ink`, `text-secondary`). The marketing site paints the same
 * two shapes with a solid light rail and a translucent black pill, which it can afford —
 * its pages have one appearance. Transplanted here they would be a pill that disappears
 * the moment the window is dark, so every colour goes through a token instead.
 *
 * THE SITE KEEPS ITS OWN COPY, and that is deliberate rather than a migration left half
 * done: `webapp/components/TabStrip.tsx` renders a `<Link>` per tab because its tabs are
 * ROUTES. Every tab here is view state and the desktop has no router. Two components that
 * agree on a drawing and disagree on what a tab IS are two components.
 */

export interface TabStripItem {
  /** Stable identity, and what `onSelect` reports back. */
  key: string
  label: string
  /** The mark before the word. From `@ds/desktop/icons`. */
  icon?: IconComponent
  /**
   * A PERSON in front of the word instead of a glyph. Wins over `icon`.
   *
   * NO CALL SITE TODAY: the page overlay's settings tab wore the signed-in account's
   * photo, and that tab is the repositories now — the account moved to the title bar.
   * The prop stays because it costs one branch and the shape it answers keeps coming
   * back; a roster of people as tabs is the obvious next one.
   *
   * DATA AND NOT A NODE, which is the whole reason it can exist here, and it is
   * `Label`'s `avatar` to the letter: `{ src, alt }` is what this hands to `Avatar`,
   * where a `ReactNode` would be a slot and the end of this component being simple.
   * It took a node while it lived in the app — the account's own avatar component,
   * passed in — and a design system that receives its children instead of importing
   * them is a design system one call site can redraw.
   *
   * `alt` is required for `Avatar`'s reason: a strip cannot invent alternative text.
   * The empty string is the right answer HERE, and the one the app passes — the label
   * beside the photo already names the person, and a reader hearing "Account photo
   * Xavier, Xavier" is hearing the decoration read out loud.
   *
   * Always the BARE glyph when there is no photo: the account button this replaced drew
   * a naked `CircleUserRound`, and a badge appearing behind it would be a visible change
   * for everyone who never uploads a picture.
   */
  avatar?: { src: string | null; alt: string }
}

/**
 * The pill, as the two distances that pin it to the track: from its left edge to the
 * track's, and from its right edge to the track's. `left + width + right` is the track,
 * always, so the two insets ARE the two edges — which is what lets each one be delayed
 * and eased on its own.
 *
 * Both are measured in the same coordinate space as `offsetLeft`, the track's padding
 * box, so a strip scrolled sideways keeps them consistent with each other. `right` goes
 * negative for a tab scrolled off the end, which is correct rather than a bug: the box is
 * simply past the visible edge, and the pill goes with it.
 */
interface PillInsets {
  left: number
  right: number
}

/** How long an edge takes, once it has started. */
const TRAVEL_MS = 260

/**
 * How long the edge behind waits before it follows.
 *
 * 100ms of 260, and the number comes from the drawing rather than from taste: the edge in
 * front is on a symmetric curve, so at 38% of the time it has covered about 38% of the
 * ground — which on a move across one tab to the next-but-one is the middle of the tab in
 * between, the point the pill was asked to hold until. A move is therefore 360ms end to
 * end, the last 100 of them being the trailing edge alone.
 */
const TRAIL_DELAY_MS = 100

/** The edge in front. Symmetric, so its progress reads as even and lands without drama. */
const LEAD_EASE = 'cubic-bezier(.4, 0, .2, 1)'

/** The edge behind. `Switch`'s curve — it passes its mark by a hair and settles. */
const TRAIL_EASE = 'cubic-bezier(.32, 1.4, .55, 1)'

/**
 * Where a tab sits, as the pair of insets that pin the pill to it.
 *
 * `offsetLeft` is measured from the track's padding box and `clientWidth` spans it, so
 * the two subtract cleanly — and both keep meaning the same thing when the rail scrolls,
 * which is why the right edge is stored as an inset rather than as a width.
 */
function insetsFor(tab: HTMLElement, track: HTMLElement): PillInsets {
  return {
    left: tab.offsetLeft,
    right: track.clientWidth - (tab.offsetLeft + tab.offsetWidth),
  }
}

/**
 * The transition for a move, with the delay on whichever edge is behind.
 *
 * `'right'` means the pill is travelling RIGHTWARDS, so the right edge leads and the left
 * one is late. Written as one shorthand rather than as four longhand properties because
 * the pairing is the point: each edge carries its own duration, curve and delay, and
 * splitting them across `transitionDelay` and `transitionTimingFunction` lists puts the
 * two halves of one decision in two places.
 */
function pillTransition(leading: 'left' | 'right'): string {
  const lead = `${leading} ${TRAVEL_MS}ms ${LEAD_EASE}`
  const trail = `${leading === 'right' ? 'left' : 'right'} ${TRAVEL_MS}ms ${TRAIL_EASE} ${TRAIL_DELAY_MS}ms`
  return `${lead}, ${trail}`
}

export interface TabStripProps {
  items: TabStripItem[]
  /** The tab in force. CONTROLLED: which page is open is what decides what the caller
   *  draws under the rail, so the caller holds it. */
  activeKey: string | undefined
  onSelect?: (key: string) => void
  /** Names the set for a screen reader — "Settings pages". Translated. */
  ariaLabel: string
  /** Margins and placement. Not the ground, the radius or the type. */
  className?: string
}

export function TabStrip({ items, activeKey, onSelect, ariaLabel, className = '' }: TabStripProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  /** Null until the active tab has been measured — the pill is not drawn before. */
  const [pill, setPill] = useState<PillInsets | null>(null)
  /** Which edge goes first, i.e. which way the last move was headed. */
  const [leading, setLeading] = useState<'left' | 'right'>('right')
  /**
   * Whether the pill may animate. False for its first appearance: a pill that slides in
   * from the left edge every time the page opens reads as a glitch, where the same
   * movement between two tabs reads as the answer to a click.
   */
  const [animate, setAnimate] = useState(false)

  // Falls back to the first tab rather than to none: every strip here always has an
  // active tab, and an unmatched key is a caller bug that should still render.
  const activeIndex = Math.max(0, items.findIndex((item) => item.key === activeKey))

  // READ BY EFFECTS THAT MUST NOT RE-RUN ON A TAB CHANGE. The observer below is one: it
  // fires the moment it observes, so re-creating it mid-move would snap both edges onto
  // the target and eat the move whole.
  const activeIndexRef = useRef(activeIndex)
  activeIndexRef.current = activeIndex
  // The pill as it is painted right now, which is where a move STARTS FROM. A ref and not
  // the state value: the effect that begins a move needs the previous position while the
  // state it is about to set is still in flight.
  const pillRef = useRef<PillInsets | null>(pill)
  pillRef.current = pill
  const prevIndexRef = useRef(activeIndex)

  const labels = items.map((item) => item.label).join(' ')

  /**
   * Put the pill on the active tab, and say which way it is going.
   *
   * Layout effect, so the pill is placed in the same frame the tab is painted in. The
   * labels are a dependency because they change width — a translation, or a different set
   * of organizations — and that case is a re-placement rather than a move: the pill did
   * not go anywhere, the text under it did.
   *
   * ONE STATE CHANGE AND THE TRANSITION DOES THE REST. There is no timer sequencing the
   * two edges: they are two properties with two delays, so the browser owns the timing
   * and an interrupted move — a second tab clicked mid-flight — resumes from wherever
   * each edge happens to be rather than from a phase this component thought it was in.
   */
  useLayoutEffect(() => {
    const el = itemRefs.current[activeIndex]
    const track = listRef.current
    if (!el || !track) return
    const target = insetsFor(el, track)

    const from = pillRef.current
    const moved = prevIndexRef.current !== activeIndex
    prevIndexRef.current = activeIndex

    // Rightwards when the left edge is further right than it was. Read off the pill
    // rather than off the index, because the index says nothing about the drawing: a
    // strip whose items were reordered can move the pill left while the index rises.
    if (from && moved) setLeading(target.left > from.left ? 'right' : 'left')
    setPill(target)

    // THE ACTIVE TAB IS KEPT IN VIEW when the row is wider than its box — a narrow window,
    // eight repository tabs, the seventh one lit — or the strip would highlight a tab the
    // reader cannot see. The TRACK is scrolled, never `scrollIntoView`, which would also
    // scroll every ancestor, the page included. Centred, so the neighbours either side
    // say there is more.
    if (track.scrollWidth > track.clientWidth) {
      const outside = el.offsetLeft < track.scrollLeft
        || el.offsetLeft + el.offsetWidth > track.scrollLeft + track.clientWidth
      if (outside) track.scrollLeft = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2
    }
  }, [activeIndex, labels])

  /**
   * Keep the pill on its tab when the row moves under it — Cera Pro lands after first
   * paint and widens every label, which would otherwise leave the pill measured against
   * text that no longer exists.
   *
   * Deliberately NOT keyed on `activeIndex`: a re-created observer reports immediately,
   * which during a move would place both edges on the target before either had crossed
   * anything. It reads the live index off the ref instead, and leaves `leading` alone —
   * a resize is not a move, so it must not decide which edge goes first.
   */
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const place = () => {
      const el = itemRefs.current[activeIndexRef.current]
      const track = listRef.current
      if (el && track) setPill(insetsFor(el, track))
    }
    const observer = new ResizeObserver(place)
    if (listRef.current) observer.observe(listRef.current)
    for (const el of itemRefs.current) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [labels, items.length])

  // One frame after the pill exists, so the transition applies to MOVES and not to the
  // initial placement.
  useEffect(() => {
    if (!pill || animate) return
    const id = requestAnimationFrame(() => setAnimate(true))
    return () => cancelAnimationFrame(id)
  }, [pill, animate])

  return (
    <nav aria-label={ariaLabel} className={className}>
      {/* NO BORDER ON THE TRACK. There was a `border border-line-subtle`, and it went the
          way the modal frame's did: the track already reads as a track from its ground
          — `bg-surface-subtle`, a tint the rows either side of it do not have — and a
          hairline around a tinted pill is a second answer to where the control ends. It
          also mattered most where the strip is now drawn: centred in a modal header that
          has no rule of its own, a rounded outline was the one hard edge left on a band
          whose whole point is to be quiet. */}
      <div
        ref={listRef}
        className="relative inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface-subtle p-1"
      >
        {/* The moving background. `aria-hidden` because the active tab already says it is
            active — to a screen reader this is decoration. */}
        {pill && (
          <span
            aria-hidden
            className="absolute bottom-1 top-1 rounded-full bg-surface-strong motion-reduce:transition-none"
            style={{
              left: pill.left,
              right: pill.right,
              // Absent for the first placement, so the pill appears on its tab instead of
              // sliding in from the left edge of the rail.
              transition: animate ? pillTransition(leading) : undefined,
            }}
          />
        )}

        {items.map((item, index) => {
          const active = index === activeIndex
          return (
            <button
              key={item.key}
              type="button"
              ref={(el) => {
                itemRefs.current[index] = el
              }}
              onClick={() => onSelect?.(item.key)}
              // `aria-current` is for the current PAGE; a view-state tab is a pressed
              // control instead, and the two are read out differently.
              aria-pressed={active}
              className={`relative z-10 flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5
                border-none bg-transparent cursor-pointer transition-colors ${
                active ? 'text-ink' : 'text-text-secondary hover:text-ink'
              }`}
            >
              {item.avatar ? (
                <Avatar src={item.avatar.src} alt={item.avatar.alt} size="xs" fallback="glyph" />
              ) : (
                item.icon && <Icon glyph={item.icon} size="sm" tone="inherit" className="shrink-0" />
              )}
              <Text size="xs" weight="medium" tone="inherit" className="whitespace-nowrap">
                {item.label}
              </Text>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
