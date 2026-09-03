'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

/**
 * One dropdown in the site header: a trigger, and a panel of links under it.
 *
 * Carried over from the menu that lived inline in `SiteHeader` — the outside-click and
 * Escape handling is the same, and for the same reasons. It is a component now because
 * the header grew a second popover (the language picker) and the two behaved
 * identically while sharing nothing; anything the next one needs is fixed here once.
 *
 * WHICH IS WHY THIS FILE EXPORTS MORE THAN A COMPONENT. `LanguageMenu` cannot BE a
 * `NavDropdown` — it is a radio group over a setting, not a list of links, and its aria
 * contract says so — but everything below the markup is the same popover, so the
 * behaviour (`useDismiss`) and the dress (`POPOVER_*`) live here and it imports them.
 * `Reveal.tsx` is the precedent: a hook beside the component that uses it, exported for
 * the second caller that needs the behaviour without the element.
 *
 * WHAT THE PANEL IS. A rendered-then-hidden `<div>`, not a conditional: `hidden`
 * removes it from the accessibility tree and from the tab order while keeping the
 * markup in the document, which is what lets `aria-controls` on the trigger point at
 * something that exists before it is opened.
 *
 * Listening on the DOCUMENT rather than drawing a backdrop, because a backdrop makes
 * the rest of the bar unclickable while the menu is open: with the listener, one click
 * both closes this and follows the link under the cursor.
 */

/**
 * A control in the bar itself — the dropdown's trigger, and the header's plain links.
 *
 * Shared because the drift already happened once: the "How it works" link was written
 * out separately and arrived without the focus ring, so two adjacent controls announced
 * keyboard focus differently. Call sites append only what differs (`sm:block`), which
 * is additive and cannot race the recipe — see the rule in `components/ui.tsx`.
 */
export const NAV_ITEM =
  'rounded-button px-3 py-1.5 font-display text-sm font-medium text-muted transition hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

/**
 * The floating panel, minus the edge it hangs from and how wide it is — those differ
 * per menu and are additive, so they stay at the call site.
 *
 * THE ELEVATION IS `shadow-button-hover`, and it is a rung of OUR scale rather than
 * Tailwind's. For one iteration this wore Tailwind's own `lg` rung instead, on the
 * reasoning that a built-in is not an arbitrary value — but the scale in
 * `tailwind.config.ts` declares FOUR rungs and nothing else, so a fifth weight borrowed
 * from the framework is exactly the drift the scale exists to prevent. It also slipped
 * past `lib/designTokens.test.ts`, which allow-lists Tailwind's built-in `boxShadow`
 * keys: the one shadow in the design system that no guard could see. (Which is also why
 * that rung is not spelled out as a class here — Tailwind extracts candidates from the
 * raw text of a file, comments included, and a mention would emit the very utility this
 * note is about.)
 *
 * `shadow-button-hover` and not `shadow-card`: `card` is deliberately the quietest rung
 * — it lands on ~35 surfaces and is tuned to sit UNDER the button it contains — and a
 * panel floating over the page needs the lifted two-layer weight instead. Nothing new
 * is declared for it, because the brief's rule is "do not invent a new shadow" and a
 * popover is not a new kind of depth, it is the lifted one.
 */
export const POPOVER_PANEL =
  'absolute top-full z-10 mt-2 rounded-2xl border border-hairline bg-white p-2 shadow-button-hover'

/** A row in that panel: the geometry, then its colours at rest. */
export const POPOVER_ROW = 'block rounded-button px-3 py-2 text-sm transition'
export const POPOVER_ROW_REST = 'text-muted hover:bg-black/[0.04] hover:text-ink'

/**
 * Closes a popover on a click outside it or on Escape, and hands focus back to the
 * trigger — while it is OPEN and not otherwise, so a closed menu costs no listeners.
 *
 * The refocus is not a nicety: Escape leaves the keyboard on an element that is now
 * `hidden`, and the next Tab starts from the top of the document. `root` is expected to
 * contain the trigger as its first `<button>`, which is true of both callers.
 *
 * It takes the SETTER rather than a `close` callback so the effect's dependencies are
 * stable: React guarantees `setState` is referentially constant, where an inline
 * `() => setOpen(false)` would be a new function every render and tear the two document
 * listeners down and back up on each one.
 */
export function useDismiss(
  open: boolean,
  setOpen: (open: boolean) => void,
  root: React.RefObject<HTMLElement>,
) {
  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (root.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      root.current?.querySelector('button')?.focus()
    }
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, setOpen, root])
}

export function NavDropdown({
  label,
  items,
}: {
  label: string
  /** In menu order. Every destination is on this site — see the note in `SiteHeader`. */
  items: { href: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useDismiss(open, setOpen, root)

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        className={`flex items-center gap-1 ${NAV_ITEM}`}
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <div
        id={panelId}
        role="menu"
        hidden={!open}
        className={`${POPOVER_PANEL} left-0 w-56`}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            role="menuitem"
            href={item.href}
            className={`${POPOVER_ROW} ${POPOVER_ROW_REST}`}
            onClick={() => setOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
