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
 * picker and the next — RoleSelect pins its trigger to the width of a table column,
 * LanguageSelect fills the width of a settings row.
 *
 * Same shape as `useAnchoredPanel` in `webapp/components/Dropdown.tsx`, deliberately:
 * two builds with no shared module, and a panel that behaves differently on the two
 * surfaces would be a bug on one of them.
 */
export function useAnchoredPanel(open: boolean, close: () => void, width: number) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

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
        Math.min(rect.right - width, window.innerWidth - width - VIEWPORT_MARGIN),
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

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    // capture: a scroll on ANY ancestor moves the trigger and leaves the panel behind,
    // and scroll does not bubble.
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, close])

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

  return { triggerRef, panelRef, style }
}
