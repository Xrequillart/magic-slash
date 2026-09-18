import { useEffect, useLayoutEffect, useRef, useState, type AnimationEvent, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ModalHeader, type ModalHeaderProps } from './ModalHeader'
import { TITLE_BAR_HEIGHT } from './AppTitleBar'
import { PAGE_MODAL_WIDTH, type PageModalSize } from './modalSizes'

/**
 * THE BIG ONE — a dialog the size of a page, floating on the dimmed app, with a header
 * across the top and the caller's page under it.
 *
 * It was the app's `PageModal` and it is here now for `AppTitleBar`'s reason: the
 * drawing is a drawing, and the app had it tangled with a store, a translator, an
 * Escape listener and a keyboard chord. What crossed over is the geometry — the
 * backdrop, the inset, the two sizes and the travel between them — and what stayed
 * behind is every fact about the app. This component has no state but the frame it is
 * painting.
 *
 * WHAT IT DOES NOT DO, stated plainly because a dialog is expected to: it does not trap
 * focus, it does not listen for Escape, and it does not restore focus to whatever opened
 * it. All three are real obligations and the app carries them.
 *
 * IT DOES CLOSE ON THE BACKDROP, which it did not for a long time — the close button was
 * the only way out short of Escape, and a reader who had gone looking for the corner of
 * the window found nothing there. See `onBackdropClick` for the one thing that makes it
 * safe.
 *
 * FULL SCREEN STOPS UNDER THE APP'S TITLE BAR. It is the window minus
 * `TITLE_BAR_HEIGHT`, never the whole window, and that one decision retires a pile of
 * geometry this used to carry: the window stays draggable by its bar, the sidebar button
 * stays reachable, and macOS's traffic lights stay exactly where macOS drew them, with
 * nothing of ours over them. What used to be here instead was a 76px gutter in the
 * header to get the title out from under those lights, plus a probe to drop that gutter
 * again in native fullscreen where they are gone. Neither is needed once the overlay
 * simply does not reach them. It is also the honest shape: an overlay is over the app,
 * not instead of it.
 *
 * NO BORDER ON THE FRAME. There was a `border border-line`, and it is gone with the rule
 * under the header: a hairline around a panel that is already lifted off a dimmed
 * background by a shadow is a second answer to "where does this window end".
 *
 * ── TWO WIDTHS, AND THE NARROW ONE BRINGS ITS OWN BODY ────────────────────────────
 *
 * See `modalSizes.ts` for why there are two. What matters here is that `column` is the
 * one size where this component lays the content out rather than handing over a box: the
 * panel's width IS the measure plus its gutters, so the measure and the gutters have to
 * be the same two numbers the panel was computed from. Spelled at the call site — a
 * `max-w-3xl px-6` in the app, which is exactly what they were — they are two numbers
 * that agree today and a sliver of empty plate the day either moves.
 *
 * A `page` still gets a bare `overflow-hidden` box and is told nothing else. A page
 * brings its own layout; a column of forms is laid out by the window, because at that
 * width the window IS the column.
 */

export interface PageModalProps {
  /** The band across the top. Every word of it translated by the caller. */
  header: ModalHeaderProps
  /**
   * Whether the panel fills the window (less the title bar) or floats inset in it.
   *
   * THE CALLER'S, and in the app it is not even the caller's — it is the store's, shared
   * by every overlay and persisted, so the size a reader last chose is the size the next
   * overlay opens at. A component that held this would hold it per instance, which is
   * the one shape that decision must not have.
   */
  fullScreen?: boolean
  /**
   * How wide the panel is at rest — see `modalSizes.ts`. `page` unless stated, which is
   * the four overlays that were here first.
   */
  size?: PageModalSize
  /**
   * The page. A `page` is handed a box with `overflow-hidden` and told nothing else; a
   * `column` is scrolled and measured for — see the header.
   *
   * A `column`'s children carry their own padding, `MODAL_COLUMN_PADDING`, and put it on
   * whatever element animates. See the note by the scroller for why it cannot live here.
   */
  children: ReactNode
  /**
   * `column` only: put the scroller back at the top when this changes.
   *
   * THE SCROLLER HOLDS THE OFFSET, and an overlay that switches pages under one header
   * keeps the same scroller across the switch — so a reader coming from the foot of a
   * long tab lands halfway down a short one, on a page they have never seen. Passing the
   * open page's id here puts every page at its top, which is what a settings page should
   * do. Absent, the scroll survives the switch.
   *
   * IT SETS `scrollTop` RATHER THAN REMOUNTING, and the difference matters to what is
   * INSIDE: a `key` here would throw away the whole subtree on every switch, and
   * anything in it that animates the change — the app slides the arriving page in the
   * direction of the tab you picked — would be rebuilt with no memory of what it was
   * switching from, so it would never play. Resetting the offset is the whole of what
   * was wanted; replacing the element was how it happened to be done.
   */
  bodyKey?: string
  /**
   * The caller's enter and exit animation for the dimmed ground, and for the panel.
   *
   * THE ANIMATION IS THE CALLER'S, `Modal`'s rule and for its reason: the app's
   * keyframes live in its own stylesheet and this folder cannot reach them.
   */
  backdropClassName?: string
  panelClassName?: string
  /**
   * Dismiss, from a click on the dimmed ground around the panel.
   *
   * IT ONLY COUNTS WHEN THE PRESS STARTED THERE TOO, which is the whole of what makes
   * this safe on a window this size. A page overlay holds a spec or a task's body —
   * prose people SELECT — and a selection that begins on the last word of a paragraph
   * and ends a few pixels past the panel's edge fires a `click` on their common
   * ancestor, which is the backdrop. Without the guard, dragging to copy a line would
   * throw the page away. Checked on `mousedown` and again on the click, because either
   * one alone is a different bug.
   *
   * Absent, the ground is inert and the header's close button is the only way out.
   */
  onBackdropClick?: () => void
  /** For a caller driving its own exit — see the app's `useModalExit`. */
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Where to portal. `document.body` unless the theme is scoped — see `Modal`. */
  portalTo?: HTMLElement | null
}

export function PageModal({
  header,
  fullScreen = false,
  size = 'page',
  children,
  bodyKey,
  backdropClassName = '',
  panelClassName = '',
  onBackdropClick,
  onAnimationEnd,
  portalTo,
}: PageModalProps) {
  /**
   * The `column` scroller, so `bodyKey` can put it back at the top — see the prop.
   *
   * A LAYOUT EFFECT and not an effect: it runs after the new page is in the DOM and
   * before the frame is painted, so nobody sees the old offset against the new page.
   */
  const scroller = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0
  }, [bodyKey])

  /** Whether the press that is in flight began on the ground — see `onBackdropClick`. */
  const pressedGround = useRef(false)
  const onGroundMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    pressedGround.current = event.target === event.currentTarget
  }
  const onGroundClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!pressedGround.current) return
    if (event.target !== event.currentTarget) return
    onBackdropClick?.()
  }
  /**
   * MOUNTED BEFORE PORTALLED, `Modal`'s rule: `document` does not exist while the
   * marketing site is pre-rendered on the server and `createPortal` would throw there.
   */
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    // The backdrop's `p-6` is what the panel is inset by, so full screen has to drop it
    // rather than fight it with a wider `max-w`: padding left in place would show 24px
    // of dimmed desktop around a panel asked to fill the window.
    //
    // `top` IS WHAT KEEPS THE APP'S TITLE BAR ON SCREEN, and it moves with the padding so
    // the two read as one gesture: the dim itself stops under that bar in full screen,
    // which is what makes the bar usable rather than merely visible through a veil.
    // Inset, the overlay still covers it — there is a 24px margin of dimmed app all round
    // by design, and carving the top out of it would look like a misplaced panel.
    //
    // `no-drag` ON THE BACKDROP, AND IT IS NOT COSMETIC. Electron hands macOS a set of
    // RECTANGLES computed from the DOM, not a hit-test: an element painted over a
    // `-webkit-app-region: drag` region does not reclaim those pixels, only a `no-drag`
    // one does. The app drags its window by a full-width band at the top, and INSET this
    // backdrop lies across that band with the panel's own header — which is at y=24 —
    // partly inside it, so without this the close and full-screen buttons stop responding
    // and the window drags instead. Nothing is drawn over them, which is what makes the
    // obstacle invisible. In full screen the backdrop starts below the band and this
    // changes nothing; it is the inset case that needs it. A browser ignores the property
    // entirely, so a drawing of the app pays nothing for it.
    <div
      className={`fixed inset-x-0 bottom-0 z-50 flex items-center justify-center bg-black/70
        transition-[padding,top] duration-300 ease-out motion-reduce:transition-none
        ${fullScreen ? 'p-0' : 'p-6'} ${backdropClassName}`}
      style={{
        top: fullScreen ? TITLE_BAR_HEIGHT : 0,
        WebkitAppRegion: 'no-drag',
      } as CSSProperties}
      onMouseDown={onGroundMouseDown}
      onClick={onGroundClick}
    >
      {/* The panel. `overflow-hidden` is what keeps a page's own scroller inside the
          rounded corners, and `flex flex-col` is what gives the body the height the
          header does not take. */}
      <div
        onAnimationEnd={onAnimationEnd}
        className={`relative flex w-full flex-col overflow-hidden bg-bg-secondary shadow-2xl
          transition-[max-width,height,border-radius] duration-300 ease-out motion-reduce:transition-none
          ${panelClassName}`}
        // THE THREE THINGS FULL SCREEN CHANGES, AS INLINE VALUES SO THEY CAN TRAVEL.
        //
        // They were Tailwind classes swapped on the flag — `max-w-6xl h-[85vh] rounded-2xl`
        // against `max-w-none h-full rounded-none` — and a class swap cannot be
        // transitioned through `max-w-none`: `none` is not a length, so there is nothing
        // to interpolate towards and the panel simply jumped. Written as two definite
        // values per property, the browser interpolates each (it mixes rem, vh and
        // percentages through `calc`), and the panel grows into the window instead of
        // replacing itself.
        //
        // The backdrop's padding animates over the same 300ms, which is the other half of
        // it: the panel is measured against the padded box, so an instant `p-6` → `p-0`
        // would move the finish line in the first frame and the last 24px would be a jump
        // at the start rather than growth at the end.
        //
        // `border-radius` travels too. It is what says which of the two shapes this is —
        // a rounded panel floating on a dimmed desktop, or the window itself — and a
        // corner that squared off instantly under a box that was still growing read as
        // two separate things happening. 1rem is `rounded-2xl`, the radius the app's
        // dialogs settled on.
        //
        // VIEWPORT UNITS RATHER THAN `100%` FOR THE FULL-SCREEN END. `rem`, `vw` and `vh`
        // all resolve to px at computed-value time, so each pair is a plain px-to-px
        // interpolation; a percentage stays a percentage and has to be interpolated
        // against a length through `calc`, which is a slower path and a less certain one.
        // They agree at rest: full screen is exactly when the backdrop's padding is zero,
        // so the padded box IS the viewport.
        style={{
          maxWidth: fullScreen ? '100vw' : PAGE_MODAL_WIDTH[size],
          height: fullScreen ? `calc(100vh - ${TITLE_BAR_HEIGHT}px)` : '85vh',
          borderRadius: fullScreen ? 0 : '1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader {...header} />
        <div className="flex-1 overflow-hidden">
          {size === 'column' ? (
            // NO PADDING ON EITHER OF THESE, and it is load-bearing rather than tidy: a
            // scrolling box clips at its PADDING BOX, so content inset from the scroller's
            // edge has nowhere to travel — slide it and its leading pixels are cut off for
            // the length of the animation, which is every card in the page arriving with a
            // side missing. The inset belongs to whatever moves, and the caller puts it
            // there with `MODAL_COLUMN_PADDING`. The 24px that leaves the box is then the
            // layer's own empty margin and the content arrives whole.
            //
            // The column is capped even though the panel is exactly this wide, because
            // FULL SCREEN is where the two part: the panel becomes the window, and without
            // the cap the forms would stretch across all of it, label at one end and
            // control at the other.
            <div ref={scroller} className="h-full overflow-y-auto">
              <div className="mx-auto w-full" style={{ maxWidth: PAGE_MODAL_WIDTH.column }}>
                {children}
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>,
    portalTo ?? document.body,
  )
}
