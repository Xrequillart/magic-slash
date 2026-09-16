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
 * IT HELD A PANEL ONCE — a page-sized card in the middle of the window that slid out
 * with the tiles still lit under your hand. It went with the thing it was built for: the
 * app's "All settings" now CLOSES the sheet and opens an ordinary dialog, because a menu
 * that grows a second window beside itself reads as two windows rather than as a menu.
 * Anything wanting that shape again should read this paragraph first.
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

/**
 * THE CASCADE, in two steps — one between sections, one between the controls inside
 * them. The section step is the larger because a section is the bigger event: the eye
 * should register that a new group has arrived before its tiles start popping.
 *
 * AND TWO CAPS, because the delays are multiplied out into one CSS rule per pair. Six
 * sections and sixteen controls is 96 rules, which is nothing; the app's own sheet
 * holds four sections and a foot. A seventh section or a seventeenth control simply
 * gets no delay and arrives with the last one that had one — degraded, not broken,
 * which is the right failure for an animation.
 */
const SECTION_STEP_MS = 90
const ITEM_STEP_MS = 40
const MAX_SECTIONS = 6
const MAX_ITEMS = 16

/**
 * WHICH SHEETS ARE DOWN, because the attribute they all ask the app to blur under is
 * ONE and `<html>` has room for a single value.
 *
 * There was one sheet and this was a plain set-and-remove. There are two now — the
 * quick settings and the account, both hanging off the same title bar — and handing
 * one sheet the attribute outright loses on the handover: opening the second closes
 * the first, the first spends 200ms leaving, and when it finally unmounts its cleanup
 * removes the attribute out from under the sheet that is still on screen. The app
 * un-blurs behind an open menu.
 *
 * So each instance publishes its own state and the ATTRIBUTE IS DERIVED: present while
 * any sheet is mounted, and `open` if any one of them is open — a sheet leaving must
 * not pull the blur off a sheet arriving. Keyed by the instance's `useId`, so an
 * instance that unmounts mid-flight takes exactly its own entry with it.
 */
const openSheets = new Map<string, 'open' | 'closing'>()

function publishSheetState(id: string, state: 'open' | 'closing' | null): void {
  if (typeof document === 'undefined') return
  if (state === null) openSheets.delete(id)
  else openSheets.set(id, state)

  const root = document.documentElement
  if (openSheets.size === 0) {
    root.removeAttribute('data-control-center')
    return
  }
  let value: 'open' | 'closing' = 'closing'
  for (const sheet of openSheets.values()) if (sheet === 'open') value = 'open'
  root.setAttribute('data-control-center', value)
}

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
  // Declared up here and not beside the stylesheet it also names: the blur's refcount
  // keys on it, and that effect runs first.
  const scope = `ms-cc-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
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
   * with the sheet sliding up; gone with the DOM. Published rather than written, because
   * the app may have two sheets and there is one attribute — see `publishSheetState`.
   */
  useEffect(() => {
    if (!mounted) return
    publishSheetState(scope, open ? 'open' : 'closing')
    return () => publishSheetState(scope, null)
  }, [mounted, open, scope])

  /**
   * THE BUBBLES. Every control on the sheet pops in — « les boutons pop comme des
   * bulles » — from a fifth of its size with an overshoot past 1 and back, which is the
   * curve that makes a pop, one after another in reading order. A stylesheet scoped to
   * this instance and not classes on the controls, because the controls are the
   * CALLER's and know nothing of the sheet; the sheet reaches them as the children of a
   * `ControlCenterGroup`'s items box, whatever they are — a tile, a picker, a card of
   * theme swatches. Delays apply on the way IN only: a dismissed menu leaves as one
   * piece, with the column's own fade.
   *
   * THE SECTIONS CASCADE TOO, and that is the part this got wrong for a while. Every
   * heading arrived at once and only the tiles UNDER them were staggered, so the sheet
   * read as a finished list that was still filling itself in — four headings over four
   * empty grids, then the grids populating. Now the column runs top to bottom: each
   * section rises into place in its turn, and its own controls pop after IT has, so the
   * eye is led down the sheet once rather than told to watch four places at once.
   *
   * THE ARITHMETIC IS IN THE SELECTOR AND NOT IN A VARIABLE. A control's delay is its
   * section's plus its own position, and CSS cannot add two custom properties into a
   * `transition-delay` without `calc()` on a registered property — so the two indices
   * are multiplied out here into one nested rule apiece. The caps below are what keeps
   * that from being a thousand rules.
   */
  const bubbles = `
.${scope} > * {
  transition: opacity 260ms ease-out, transform 380ms cubic-bezier(.22, 1, .36, 1);
}
.${scope}[data-shown="false"] > * { opacity: 0; transform: translateY(-8px); }
${Array.from(
    { length: MAX_SECTIONS },
    (_, section) =>
      `.${scope}[data-shown="true"] > :nth-child(${section + 1}) { transition-delay: ${section * SECTION_STEP_MS}ms; }`,
  ).join('\n')}
.${scope} [data-cc-items] > * {
  transition: background-color 200ms, color 200ms, opacity 160ms ease-out,
    transform 460ms cubic-bezier(.34, 1.56, .64, 1);
}
.${scope}[data-shown="false"] [data-cc-items] > * { transform: scale(.2); opacity: 0; }
${Array.from({ length: MAX_SECTIONS }, (_, section) =>
    Array.from(
      { length: MAX_ITEMS },
      (_, item) =>
        `.${scope}[data-shown="true"] > :nth-child(${section + 1}) [data-cc-items] > :nth-child(${item + 1}) { transition-delay: ${section * SECTION_STEP_MS + item * ITEM_STEP_MS}ms; }`,
    ).join('\n'),
  ).join('\n')}
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

/**
 * THE OTHER TRACK: one card per row, each as wide as the sheet.
 *
 * A sheet is tiles or it is cards, and the two do not mix — which is why this is a
 * choice the GROUP offers rather than a class the app passes. A tile is a yes or a no,
 * and four in a row is a control panel; a card is a fact with a sentence under it, and
 * a fact does not fit in a 40px circle. The account sheet is the second kind whole.
 *
 * It carries no width of its own. The 4×40 grid fixes the tile sheet at 196px by
 * construction; a stack takes whatever the column is given, so a cards sheet sets its
 * width on `ControlCenter`'s `className` and every group on it agrees by inheritance.
 */
export const CONTROL_CENTER_STACK = 'flex flex-col gap-3'

export interface ControlCenterGroupProps {
  /** The heading over a run of controls — "Features", "Appearance". Translated. */
  label: string
  /** The controls, each a direct child: a tile is one point, a picker three, a card four. */
  children: ReactNode
  /**
   * Which track the items are laid on. `tiles` is the 4×40 grid and the default — the
   * quick settings sheet, and the reason `CONTROL_CENTER_GRID` is not a per-section
   * decision. `cards` is a full-width stack; see `CONTROL_CENTER_STACK`.
   */
  layout?: 'tiles' | 'cards'
  /** Margins and placement of the items box. Not the track — that is the group's. */
  className?: string
}

/**
 * A HEADED RUN OF CONTROLS on the sheet, laid on `CONTROL_CENTER_GRID`.
 *
 * The heading is small, quiet and tracked out — the way the platform labels a
 * cluster of tiles — because it is a signpost and not a title: the tiles are what the
 * eye lands on, the word above them says which cluster this is once the eye has landed.
 */
export function ControlCenterGroup({ label, children, layout = 'tiles', className = '' }: ControlCenterGroupProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <Text size="2xs" weight="bold" tone="secondary" className="uppercase tracking-[0.12em] px-0.5">
        {label}
      </Text>
      {/* `data-cc-items` is what the sheet's bubble stylesheet reaches for: each direct
          child of this box pops in its turn. */}
      <div
        data-cc-items=""
        className={`${layout === 'cards' ? CONTROL_CENTER_STACK : CONTROL_CENTER_GRID} ${className}`}
      >
        {children}
      </div>
    </section>
  )
}
