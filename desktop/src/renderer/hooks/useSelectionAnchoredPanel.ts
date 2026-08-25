import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useClickOutside } from './useClickOutside'

/** How close to the window edge the panel may sit. */
const VIEWPORT_MARGIN = 8

/** The gap between the anchor and the panel, so the two read as attached but distinct. */
const ANCHOR_GAP = 6

/**
 * Anchors a portalled panel to a RECTANGLE the caller can recompute, and keeps the two
 * together while the page scrolls under them.
 *
 * The sibling of `components/useAnchoredPanel`, and it exists rather than a flag on that
 * one because the two differ on the point that matters most about a panel:
 *
 * - `useAnchoredPanel` is anchored to a `<button>` it holds a ref to, and CLOSES on any
 *   scroll. That is right for a dropdown: the trigger has scrolled away, and there is
 *   nothing to lose by dismissing a menu the reader can reopen with one click.
 * - This one is anchored to `anchorRect()`, and REPOSITIONS. A comment composer holds
 *   text the reader is in the middle of writing, and a panel that vanished because the
 *   trackpad twitched would throw it away. Its anchor is also not a button — it is a row
 *   of a diff, resolved from the comment's own line numbers on every call, which is what
 *   lets it survive shiki's HTML being swapped out from under it.
 *
 * `anchorRect` is a function rather than a ref or a captured `DOMRect` for exactly that
 * reason: a rect is in viewport coordinates and is stale one scroll event later, and a
 * node reference is stale as soon as the file is re-read. Asking again is the only way to
 * get an answer that is still true. Returning `null` from it hides the panel — the anchor
 * is not currently rendered — instead of leaving it stranded at the last place it was.
 *
 * No `open` flag either, which is the third difference: `useAnchoredPanel`'s callers keep
 * a trigger mounted and call it either way, while CodeView mounts and unmounts these
 * panels outright. A flag no caller could pass `false` would only invite one to keep a
 * hidden panel mounted — and with it a capture-phase scroll listener that never stops.
 */
export function useSelectionAnchoredPanel(
  close: () => void,
  width: number,
  anchorRect: () => DOMRect | null,
) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  const place = useCallback(() => {
    const rect = anchorRect()
    // Hidden when the anchor has scrolled clean out of the window, not pinned to the edge
    // it went past: a card stuck to the top of the viewport while the lines it is about are
    // two thousand pixels above says something false about where those lines are. Answered
    // through the same `null` the missing-anchor case uses, so it is the `visibility`
    // mechanism below rather than an unmount — the panel still has to be measurable, and
    // scrolling the anchor back into view brings it back with its draft intact.
    if (!rect || rect.bottom <= 0 || rect.top >= window.innerHeight) {
      setPosition(null)
      return
    }
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom
    // Flips above when it would run off the bottom. `panelHeight > 0` guards the first
    // pass, before the panel has been laid out at all — see the second pass below.
    const preferred = panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN
      ? rect.top - panelHeight - ANCHOR_GAP
      : rect.bottom + ANCHOR_GAP
    // Clamped on BOTH branches: a row can be half out of the window at either end, and
    // either way the panel belongs inside it rather than over the app's own chrome. The
    // floor is applied last so it wins on a window shorter than the panel — the top of a
    // card is the half worth keeping, since that is where its heading and its text are.
    const top = Math.max(
      VIEWPORT_MARGIN,
      Math.min(preferred, window.innerHeight - panelHeight - VIEWPORT_MARGIN),
    )
    // LEFT-aligned on the anchor, not right-aligned like a dropdown on its trigger: the
    // anchor here is a line of code, and a panel hung off the right-hand end of it would
    // sit wherever that line happened to stop.
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN))

    // Compared before it is stored, which is not an optimisation: `place` is rebuilt
    // whenever the caller's `anchorRect` is, so a fresh object here would re-render the
    // caller, rebuild `anchorRect`, rebuild `place`, and run the layout effect below
    // again — a loop, on a hook whose whole job is to run on every scroll event. It also
    // means a scroll that did not move the anchor costs no render at all.
    setPosition(prev => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
  }, [anchorRect, width])

  useLayoutEffect(() => {
    place()
    // A second pass one frame later, because the first runs before the panel has been
    // laid out: its height is zero, so the flip-above test cannot fire and a tall
    // composer opened near the bottom of the window would hang off the end of it.
    const frame = requestAnimationFrame(place)
    return () => cancelAnimationFrame(frame)
  }, [place])

  // Outside-click and Escape are the one half of "how a popover dismisses itself" that
  // does NOT diverge from `useAnchoredPanel`, so it is the shared helper rather than a
  // third copy. It takes a single ref, which is all there is here: no trigger to ask
  // about, unlike `useAnchoredPanel` — the thing that opened this panel was a selection
  // or a click on a gutter, neither of which is an element that survives the opening.
  useClickOutside(panelRef, true, close)

  useEffect(() => {
    // rAF-throttled, because a capture-phase scroll listener fires for every scroll event
    // of every scroller in the app and each call reads layout. Coalescing to one
    // measurement per frame is what keeps this off the critical path of a review that is
    // already re-rendering its ruler on the same events.
    let frame: number | null = null
    const reposition = () => {
      if (frame !== null) return
      frame = requestAnimationFrame(() => {
        frame = null
        place()
      })
    }

    window.addEventListener('resize', reposition)
    // capture: a scroll on ANY ancestor moves the anchor, and scroll does not bubble.
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [place])

  /** `visibility` rather than a mount guard: the panel has to be in the DOM to be measured. */
  const style = useCallback(
    (): React.CSSProperties => ({
      position: 'fixed',
      top: position?.top ?? -9999,
      left: position?.left ?? -9999,
      width,
      visibility: position ? 'visible' : 'hidden',
    }),
    [position, width],
  )

  return { panelRef, style }
}
