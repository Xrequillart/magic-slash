import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type TransitionEvent } from 'react'
import { createPortal } from 'react-dom'
import { Text } from './Text'

/**
 * THE MENU THAT COMES DOWN FROM THE TITLE BAR — macOS's Control Center, at this folder's
 * scale: a column of controls that slides down from under the bar, hugs the right edge
 * where the button that opened it sits, and goes back up the same way.
 *
 * THE SHEET IS TRANSPARENT AND THE BLUR IS THE APP'S. The sheet carries nothing of its
 * own — no tint, no shadow, no `backdrop-filter` — because in this window that property
 * is a dead end: measured in four window configurations, an opaque window blurs a 16px
 * radius into fog and a `transparent` or vibrancy window — the app's — renders a blur so
 * slight the text under it stays legible whatever radius is asked for. So while the sheet
 * is down it sets `data-control-center="open"` on `<html>`, and the APP blurs its own body
 * under that attribute with a plain `filter: blur()` — the one blur Chromium renders fully
 * here — in its stylesheet, where the app's layout is known. This folder cannot name that
 * region and does not try; the marketing site sees the attribute and does nothing with it.
 *
 * It is the whole window that frosts, not the ground under the controls alone — the
 * product owner's choice among three, made knowing it: the other two were a frost cut from
 * a screenshot, and giving up the window's transparency.
 *
 * IT FADES IN AND ITS CONTROLS POP. There was a slide from under the bar, and it went
 * when the sheet stopped being a curtain: a transparent thing has no edge to watch
 * arrive. The column fades over 320ms and each control pops in its turn; leaving is the
 * fade alone, faster — a thing you dismissed should get out of the way, not be watched
 * leaving. It stays mounted while the exit plays: the caller flips `open` and this
 * component decides when the DOM can go.
 *
 * WHAT IT DOES NOT DECIDE is what is on it. The tiles, the stepper, the pickers, the
 * card are the app's — grouped with `ControlCenterGroup`, which is the one bit of layout
 * this file offers — and the marketing site's drawing of the menu hands it a different
 * set. `Modal` takes the same position for the same reason.
 *
 * A PORTAL, like `Modal` and for `Modal`'s reason: a sheet rendered where the title bar
 * sits in the tree inherits that bar's `overflow` and stacking, and a fixed box has to
 * mean the WINDOW. `portalTo` is the theme-scoping escape hatch the other two portalled
 * components carry — the app's variables are on `:root`, a drawing of the app puts them
 * on one element and points this at it.
 */

/** Enter and exit, in ms. The exit is the stylesheet's own duration and the backstop below. */
const ENTER_MS = 320
const EXIT_MS = 200

export interface ControlCenterProps {
  open: boolean
  /** Escape, a click off the controls, or anything the caller wires to it. */
  onClose: () => void
  /**
   * Where the sheet begins, in pixels from the window's top. The app passes
   * `TITLE_BAR_HEIGHT`: the sheet starts UNDER the bar rather than over it, so the
   * button that opened the menu is still there to close it and the window is still
   * draggable by its bar while the menu is down.
   */
  top?: number
  /** Names the menu for a screen reader — "Quick settings". Translated. */
  label: string
  /** The controls, grouped. `ControlCenterGroup` is the shape they come in. */
  children: ReactNode
  /**
   * A PANEL IN THE MIDDLE OF THE WINDOW, out only while `asideOpen`.
   *
   * The sheet answers the settings that fit in a circle; everything else is a page, and
   * a page does not go in a 40px grid. So the caller may hang one panel off the menu —
   * the app hangs all the settings the tiles cannot say — and it opens from inside the
   * sheet rather than replacing it: the tiles stay under your hand while you read it,
   * which is the whole difference between this and a modal.
   *
   * THE MIDDLE OF THE WINDOW AND NOT THE SIDE OF THE SHEET. It sat immediately left of
   * the column first, which tied a page-sized thing to the edge the menu happens to
   * hug: on a wide window it opened far off to the right with the whole app empty
   * beside it. Centred, it is where the eye already is, and it is the same place
   * whatever the sheet is holding. The sheet still paints over it where the two meet —
   * the menu is what you are in, the panel is what it opened.
   *
   * IT IS NOT MODAL. No veil, no focus trap: the layer under it is the same
   * click-to-dismiss layer the sheet has always had, so a click beside the panel closes
   * the whole menu rather than just the panel.
   *
   * A SLOT, like `children`, and for `children`'s reason: what is ON it is the app's and
   * this folder cannot import it. What this component owns is WHERE it sits, how tall it
   * may be, that a click inside it does not dismiss the menu, and that it fades with the
   * rest.
   */
  aside?: ReactNode
  /** Whether that panel is out. The CALLER's state — it owns the control that opens it. */
  asideOpen?: boolean
  /**
   * How wide the sheet may be, in pixels. It is as wide as its controls and hugs the
   * right edge under the button that opened it; this is the cap for a caller whose
   * controls would otherwise run on.
   */
  width?: number
  /** Where to portal. `document.body` unless the theme is scoped — see the note above. */
  portalTo?: HTMLElement | null
  /** Layout INSIDE the column. Not the motion. */
  className?: string
}

export function ControlCenter({
  open,
  onClose,
  top = 0,
  label,
  children,
  aside,
  asideOpen = false,
  width = 440,
  portalTo,
  className = '',
}: ControlCenterProps) {
  /**
   * Two flags and not one, which is what an exit animation costs.
   *
   * `mounted` is whether the DOM exists; `shown` is whether it is in its resting place.
   * Opening sets the first, then the second a frame later, so the browser has painted
   * the sheet OFF-SCREEN before it is asked to move it on — set together, there is no
   * "from" and the transition never runs. Closing clears `shown` and leaves `mounted`
   * for `transitionend` to clear, with a timer behind it for the frames that never
   * come: an element hidden mid-flight, a stylesheet that collapsed the duration.
   */
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const frame = useRef<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    if (timer.current) clearTimeout(timer.current)
    frame.current = null
    timer.current = null
  }

  useEffect(() => {
    clear()
    if (open) {
      setMounted(true)
      frame.current = requestAnimationFrame(() => {
        frame.current = requestAnimationFrame(() => setShown(true))
      })
    } else {
      setShown(false)
      timer.current = setTimeout(() => setMounted(false), EXIT_MS + 100)
    }
    return clear
  }, [open])

  // Escape closes, and only while the sheet is up: a listener left mounted would
  // swallow the key from every other overlay in the app.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  /**
   * THE ASK FOR THE BLUR — see the note at the top. `open` while the sheet is down and
   * `closing` while it leaves, so the app's own transition can run the blur out in step
   * with the sheet sliding up; gone with the DOM.
   */
  useEffect(() => {
    if (!mounted || typeof document === 'undefined') return
    const root = document.documentElement
    root.setAttribute('data-control-center', open ? 'open' : 'closing')
    return () => root.removeAttribute('data-control-center')
  }, [mounted, open])

  /**
   * THE BUBBLES. Every control on the sheet pops in — « les boutons pop comme des
   * bulles » — from a fifth of its size with an overshoot past 1 and back, which is the
   * curve that makes a pop, one after another in reading order within each group. A
   * stylesheet scoped to this instance and not classes on the controls, because the
   * controls are the CALLER's and know nothing of the sheet; the sheet reaches them as
   * the children of a `ControlCenterGroup`'s items box, whatever they are — a tile, a
   * picker, a card of theme swatches. Delays apply on the way IN only: a dismissed menu
   * leaves as one piece, with the column's own fade.
   */
  const scope = `ms-cc-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const items = `.${scope} [data-cc-items] > *`
  const bubbles = `
${items} {
  transition: background-color 200ms, color 200ms, opacity 160ms ease-out,
    transform 460ms cubic-bezier(.34, 1.56, .64, 1);
}
.${scope}[data-shown="false"] [data-cc-items] > * { transform: scale(.2); opacity: 0; }
${Array.from({ length: 16 }, (_, i) => `.${scope}[data-shown="true"] [data-cc-items] > :nth-child(${i + 1}) { transition-delay: ${i * 40}ms; }`).join('\n')}
`

  const onTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      // Only the column's own fade ends the wait: transition events bubble, and a tile
      // changing colour inside it would otherwise unmount the menu mid-exit.
      if (e.target !== e.currentTarget || e.propertyName !== 'opacity') return
      if (!open) {
        clear()
        setMounted(false)
      }
    },
    [open],
  )

  if (!mounted) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    // THE LAYER: from `top` to the bottom of the window, catching the click that closes.
    // Transparent, like the sheet: a veil over the whole app is exactly the "there is a
    // window on top of me" feeling this component exists not to give.
    <div
      role="presentation"
      className="fixed inset-x-0 bottom-0 z-[55]"
      style={{ top }}
      onClick={onClose}
    >
      {/* THE PANEL, centred on the WINDOW — `fixed inset-0` rather than a box inside the
          layer, because the layer starts under the title bar and centring in it would
          leave the panel sitting half a bar low. `pointer-events-none` on the centring
          box and back on for the panel itself: the empty space around it is the layer's
          again, so a click there dismisses the menu the way a click anywhere else does.

          `max-h-[80vh]` and `min-h-0` are the pair that keeps it INSIDE the window: the
          panel's own body is the scroller (see the caller), and a flex child will not go
          shorter than its content without `min-h-0`. 80 and not 100 so a full-height
          panel still clears the bar at the top, which the centring alone does not
          guarantee. It is a CAP and not a height — how tall the panel actually stands is
          the panel's own business, and the app's stands at a fixed 608px so that turning
          to a page with one row on it does not resize the card under the pointer.

          It fades on the sheet's own flag, one beat faster: a panel that lingered after
          the sheet had gone would read as a window of its own. */}
      {aside && asideOpen && (
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center p-6">
          <div
            onClick={(e) => e.stopPropagation()}
            className={`pointer-events-auto flex min-h-0 max-h-[80vh] transition-opacity duration-200 ${
              shown ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {aside}
          </div>
        </div>
      )}

      {/* THE ROW: the sheet, hard against the right edge, 12px in from the bar and from
          the window's edge — where it has always stood. It keeps the row it was given
          when the panel was its neighbour; the panel has moved out, and the row is one
          line of layout rather than two spellings of the same inset. */}
      <div className="flex h-full items-start justify-end p-3">
        {/* THE SHEET: as wide as its controls, standing 12px in from the bar and from the
            window's right edge under the button that opened it. Fully transparent and
            still: the controls stand on their own plates over the blurred app, and the
            motion is theirs — a fade for the whole, a pop for each. */}
        <div
          role="dialog"
          aria-modal="false"
          aria-label={label}
          className="relative w-fit rounded-2xl"
          style={{ maxWidth: width }}
        >
          {/* THE COLUMN: the controls, and the ONE thing a click may land on without
              closing the menu — everything else on the layer is "outside". It fades as a
              whole while its controls pop one by one. */}
          <style dangerouslySetInnerHTML={{ __html: bubbles }} />
          <div
            onClick={(e) => e.stopPropagation()}
            onTransitionEnd={onTransitionEnd}
            data-shown={shown ? 'true' : 'false'}
            className={`${scope} relative flex flex-col gap-5 px-5 pt-4 pb-6 transition-opacity ${
              shown ? 'opacity-100' : 'opacity-0'
            } ${className}`}
            style={{ transitionDuration: `${shown ? ENTER_MS : EXIT_MS}ms` }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    portalTo ?? document.body,
  )
}

/**
 * THE GRID EVERY SECTION IS LAID ON: four columns of one tile's width — `ButtonIcon`'s
 * `2xl`, 40px — and one gap both ways, so a control spanning three columns is exactly
 * three tiles and two gaps wide and a card spanning four is the row. The grid decides
 * every width; no section and no control spells one. It is the group's, not a class the
 * app passes, because a section that was not on it would be a section whose controls
 * did not line up with the next section's.
 */
export const CONTROL_CENTER_GRID = 'grid grid-cols-[repeat(4,2.5rem)] gap-3 justify-items-center'

export interface ControlCenterGroupProps {
  /** The heading over a run of controls — "Features", "Appearance". Translated. */
  label: string
  /** The controls, each a direct child: a tile is one point, a picker three, a card four. */
  children: ReactNode
  /** Margins and placement of the items box. Not the grid — that is the group's. */
  className?: string
}

/**
 * A HEADED RUN OF CONTROLS on the sheet, laid on `CONTROL_CENTER_GRID`.
 *
 * The heading is small, quiet and tracked out — the way the platform labels a
 * cluster of tiles — because it is a signpost and not a title: the tiles are what the
 * eye lands on, the word above them says which cluster this is once the eye has landed.
 */
export function ControlCenterGroup({ label, children, className = '' }: ControlCenterGroupProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <Text size="2xs" weight="bold" tone="secondary" className="uppercase tracking-[0.12em] px-0.5">
        {label}
      </Text>
      {/* `data-cc-items` is what the sheet's bubble stylesheet reaches for: each direct
          child of this box pops in its turn. */}
      <div data-cc-items="" className={`${CONTROL_CENTER_GRID} ${className}`}>{children}</div>
    </section>
  )
}
