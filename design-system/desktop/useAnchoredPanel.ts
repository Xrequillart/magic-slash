import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const VIEWPORT_MARGIN = 8

/**
 * Anchors a portalled panel to its trigger and keeps the two together.
 *
 * A dropdown panel here is portalled to <body> and positioned `fixed`, because inline
 * it gets clipped: the settings pane scrolls, every Card has `overflow-hidden` for its
 * rounded corners, and Modal is `max-h-[90vh] overflow-y-auto`. The cost of leaving
 * the DOM is that the panel is no longer a descendant of anything — so it has to be
 * placed by hand, and it has to notice on its own everything that would detach it from
 * the trigger it is supposed to belong to.
 *
 * That is all this hook is: the measuring, and the listeners that close. The trigger
 * and the panel markup stay with the caller, because they are what differs between one
 * panel and the next — `Select` draws a list of options under a control, the review
 * button draws a column of comment threads.
 *
 * IT LIVES HERE NOW, where it was `renderer/components/useAnchoredPanel.ts`. Every
 * picker in the app was built on it, and the picker itself is `Select` in this folder
 * now — a component cannot stand on a hook the app owns, and two copies of this
 * measuring would be the drift the move is undoing. The app's own remaining caller
 * imports it from `@ds/desktop` like everything else.
 *
 * Same shape as `useAnchoredPanel` in `webapp/components/Dropdown.tsx`, deliberately:
 * two builds with no shared module, and a panel that behaves differently on the two
 * surfaces would be a bug on one of them.
 */
export function useAnchoredPanel(open: boolean, close: () => void, width?: number) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  /**
   * The panel's width when the caller names none: the TRIGGER's, measured.
   *
   * A number was the only option while every caller was a picker pinned to a `w-52` or
   * a table column. A settings row's control fills the row instead — the width is a
   * fraction of a panel nobody can read off a class — and a panel narrower or wider
   * than the control it drops from reads as a menu that landed near it by accident.
   *
   * Measured rather than watched: it is read in the same layout pass that places the
   * panel, so a window resized while the panel is open is handled the way it already
   * was — by closing it.
   */
  const [triggerWidth, setTriggerWidth] = useState(0)
  const panelWidth = width ?? triggerWidth

  // Layout effect, so the panel is placed in the same frame it is painted in. Cleared
  // on close, so the next opening measures again instead of flashing at the old spot.
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom
    const box = width ?? rect.width
    setTriggerWidth(rect.width)

    setPosition({
      // Flips above when it would run off the bottom. `panelHeight > 0` guards the
      // first pass, before the panel has been measured at all: without it a tall panel
      // opens downwards, is measured, and jumps.
      top: panelHeight > 0 && spaceBelow < panelHeight + VIEWPORT_MARGIN
        ? rect.top - panelHeight - 4
        : rect.bottom + 4,
      // Right-aligned on the trigger, then pulled back inside the window.
      left: Math.max(
        VIEWPORT_MARGIN,
        Math.min(rect.right - box, window.innerWidth - box - VIEWPORT_MARGIN),
      ),
    })
  }, [open, width])

  useEffect(() => {
    if (!open) return

    // The panel is not a DOM descendant of the trigger, so "did the click land inside"
    // has to be asked of both.
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    /**
     * A scroll anywhere but INSIDE the panel closes it.
     *
     * The listener has to be capture-phase — see below — which means it fires for a scroll
     * in any descendant of the window, the panel's own content included. The panel's own
     * scrolling moves nothing: there is no trigger to re-anchor to and nothing to close,
     * and it is how you reach the entries past a `max-h`, so closing on it would make a
     * long list unusable.
     *
     * This test is the twin's, word for word — `webapp/components/Dropdown.tsx` has always
     * had it — so this is a DIVERGENCE being closed rather than a lesson learned from a new
     * caller, and the parity claimed at the top of this file is what it restores. It was
     * simply invisible here while every caller's panel was a short list that could not emit
     * the event; nothing changes for those pickers.
     *
     * The half the hook cannot supply: a panel that scrolls must also carry
     * `overscroll-contain`, or a wheel at either end of it chains outwards into a scroll
     * this listener correctly reads as outside — and dismisses the panel at the moment the
     * reader reaches the bottom of the list. The twin pairs the two the same way.
     */
    const onScroll = (e: Event) => {
      if (e.target instanceof Node && panelRef.current?.contains(e.target)) return
      close()
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    // capture: a scroll on ANY ancestor moves the trigger and leaves the panel behind,
    // and scroll does not bubble.
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, close])

  /** `visibility` rather than a mount guard: the panel has to be in the DOM to be measured. */
  const style = useCallback(
    (): React.CSSProperties => ({
      position: 'fixed',
      top: position?.top ?? -9999,
      left: position?.left ?? -9999,
      width: panelWidth,
      visibility: position ? 'visible' : 'hidden',
    }),
    [position, panelWidth],
  )

  return { triggerRef, panelRef, style }
}
