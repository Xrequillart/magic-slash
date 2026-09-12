import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2, X } from '@ds/desktop/icons'
import { useModalExit } from '../hooks/useModalExit'
import { useStore } from '../store'
import { TITLE_BAR_H } from './TitleBar'
import { TabStrip, type TabStripItem } from './TabStrip'
import { useT } from '../i18n'

interface PageModalProps {
  /**
   * The overlay's name, on the left of the header. It names the page that is OPEN, which
   * with `tabs` means it names the active one: the strip in the middle is the control,
   * this is the label, and a reader glancing at the bar gets the answer without having
   * to find the pill.
   */
  title: string
  /**
   * A small mark to the left of the title, naming the same page the word does.
   *
   * A NODE and not a `LucideIcon`, for `TabStripItem.leading`'s reason: what belongs
   * there is not always a glyph, and a caller that already holds one should be able to
   * hand it over rather than have it looked up again. It has to size itself — `w-4 h-4
   * shrink-0` beside `text-sm` type — since the header sets no box around it.
   */
  titleIcon?: ReactNode
  onClose: () => void
  /**
   * The pages this overlay switches between, when it hosts more than one: the shared
   * `TabStrip`'s own items, the key of the one on screen, and what to do when another is
   * picked. Omitted by a modal with a single page, which is most of them.
   *
   * THE SHARED `TabStrip` AND NOT A CONTROL OF THIS COMPONENT'S OWN — the same rail a
   * repository's settings are cut into, the Team page switches organizations with, and
   * the webapp draws from its own copy. A modal header that invented its own tabs would
   * be a second tab vocabulary in an app that already has one, and the pill that slides
   * to the tab you picked is the part a reader recognises.
   *
   * SWITCHING TABS MUST NOT REOPEN THE MODAL, which is the whole reason this is a prop
   * here rather than a strip each page draws for itself. The caller keeps ONE
   * `<PageModal>` element mounted across the switch and changes only its children, so
   * the backdrop never fades, the panel never replays its entrance, and the full-screen
   * state survives. A strip inside the body could not do that: the body is what is being
   * replaced.
   *
   * `onSelect` rather than a value this component holds, because the selection does not
   * live here: it is `activeModal` in the store, which the caller already owns, and a
   * copy kept here would be a second answer to "which page is open" that a deep link
   * could not reach.
   */
  tabs?: {
    items: TabStripItem[]
    activeKey: string
    onSelect: (key: string) => void
    ariaLabel: string
  }
  /** Optional content pinned to the right of the title bar (e.g. a live indicator). */
  headerRight?: ReactNode
  children: ReactNode
}

/**
 * Full-height centered overlay hosting what used to be a page. Agents is the only real
 * page left: Plans, Tasks, Skills and Settings all render through here.
 *
 * ONE OVERLAY, FOUR PAGES. All four share a single instance and switch by `tabs` — see
 * the call site in `App.tsx` for why that has to be one mounted element rather than four
 * conditional ones, and for why the four belong in one strip.
 *
 * Small confirmation dialogs belong in components/Modal.tsx instead — this one is
 * sized for page-scale content.
 *
 * FULL SCREEN IS A PROPERTY OF THE WINDOW, NOT OF THIS COMPONENT'S CALLER. There is no
 * prop for it and no call site passes one: the flag lives in the store
 * (`pageModalFullScreen`), is shared by every overlay, and is persisted, so the size a
 * reader last chose is the size every overlay opens at, including after a relaunch. A
 * plan's spec is a long document and a task's body is prose with code in it — a person
 * who has decided those deserve the whole window has decided it once.
 *
 * ESCAPE ARBITRATION, stated here because three things could plausibly claim the key and
 * only two may:
 *
 *  1. a detail SUB-PAGE goes back to its list. `Tasks/TaskDetailPage` and
 *     `Plans/PlanDetailPage` listen in the CAPTURE phase and call
 *     `stopImmediatePropagation`, which is what beats the listener below — both are on
 *     `window`, and only the "immediate" form stops a sibling on the same target.
 *  2. otherwise, the modal closes. That is this listener.
 *  3. Escape NEVER leaves full screen. A third contender for an already contested key
 *     would make the outcome depend on which page happens to be open, and the reader
 *     would learn that Escape sometimes shrinks the window instead of closing it. ⌘⇧F
 *     toggles it, both ways, and the button in the header says so.
 */
export function PageModal({ title, titleIcon, onClose, tabs, headerRight, children }: PageModalProps) {
  const t = useT()
  const fullScreen = useStore((s) => s.pageModalFullScreen)
  const toggleFullScreen = useStore((s) => s.togglePageModalFullScreen)
  /**
   * FULL SCREEN STOPS UNDER THE APP'S OWN TITLE BAR. It is the window minus `TITLE_BAR_H`,
   * never the whole window, and that one decision retires a pile of geometry this
   * component used to carry.
   *
   * The app keeps its chrome: the window stays draggable by its bar, the split toggle and
   * the sidebar button stay reachable, and macOS's traffic lights stay exactly where
   * macOS drew them — on `TitleBar`, in the corner every Mac app keeps them in, with
   * nothing of ours over them. What used to be here instead was a 76px left gutter in the
   * header to get the title out from under those lights, plus a `useIsFullScreen` to drop
   * that gutter again in native fullscreen where they are gone. Neither is needed once
   * the overlay simply does not reach them.
   *
   * It is also the honest shape: an overlay is over the app, not instead of it.
   */
  const headerHeight = 48
  /**
   * The parent renders this conditionally, so calling onClose straight away
   * would unmount it mid-animation. Closing is requested here instead: the
   * overlay plays its exit, and only then does onClose let the parent drop it.
   */
  const [open, setOpen] = useState(true)
  const requestClose = useCallback(() => setOpen(false), [])
  const { mounted, closing, onExitAnimationEnd } = useModalExit(open, onClose)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose])

  /**
   * ⌘⇧F, and only while a modal is up — the listener is mounted with it.
   *
   * Free against both of the app's global shortcuts (⌘B for the sidebar, ⌘/ for the
   * split view, `App.tsx`), and deliberately NOT ⌃⌘F: that is macOS's own window
   * fullscreen, which the title bar already observes through `useIsFullScreen`. Two
   * different fullscreens on one chord would leave the reader unable to ask for either.
   *
   * `e.key` is compared case-insensitively because Shift is part of the chord: the
   * browser reports `F` rather than `f` when it is held.
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || !e.shiftKey) return
      if (e.key.toLowerCase() !== 'f') return
      e.preventDefault()
      toggleFullScreen()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleFullScreen])

  if (!mounted) return null

  return (
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
    // one does. `TitleBar` drags the window by its full-width top `TITLE_BAR_H`, and
    // INSET the backdrop lies across that band with the panel's own header — which is at
    // y=24 — partly inside it, so without this the close and full-screen buttons stop
    // responding and the window drags instead. Nothing is drawn over them, which is what
    // makes the obstacle invisible. In full screen the backdrop starts below the band and
    // this changes nothing; it is the inset case that needs it.
    <div
      className={`fixed inset-x-0 bottom-0 bg-black/70 flex items-center justify-center z-50
        transition-[padding,top] duration-300 ease-out motion-reduce:transition-none ${
        fullScreen ? 'p-0' : 'p-6'
      } ${closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
      style={{ top: fullScreen ? TITLE_BAR_H : 0, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      onClick={requestClose}
    >
      {/* `flex flex-col` with a `flex-1 overflow-hidden` body is the contract every page
          in here is built on — each one is its own scroller and relies on being handed a
          bounded height. Both sizes keep it; only the box changes. The radius goes with
          the inset: a rounded panel flush against the window edges reads as a rendering
          glitch, not as a choice. */}
      <div
        onAnimationEnd={onExitAnimationEnd}
        className={`relative w-full bg-bg-secondary border border-line overflow-hidden shadow-2xl flex flex-col
          transition-[max-width,height,border-radius] duration-300 ease-out motion-reduce:transition-none
          ${closing ? 'animate-modal-content-out' : 'animate-modal-content'}`}
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
        // two separate things happening.
        //
        // VIEWPORT UNITS RATHER THAN `100%` FOR THE FULL-SCREEN END, which is the one
        // choice here that is not obvious. `rem`, `vw` and `vh` all resolve to px at
        // computed-value time, so each pair below is a plain px-to-px interpolation; a
        // percentage stays a percentage and has to be interpolated against a length
        // through `calc`, which is a slower path and a less certain one. They agree at
        // rest: full screen is exactly when the backdrop's padding is zero, so the
        // padded box IS the viewport. Mid-travel the panel is a few pixels wider than
        // that box, and it cannot spill — `overflow-hidden` on the backdrop's own flex
        // box is not needed because the panel is still narrower than the window itself
        // the whole way.
        style={{
          maxWidth: fullScreen ? '100vw' : '72rem',
          // The viewport LESS the title bar the overlay now stops under, which is the
          // whole of what "full screen" means here.
          height: fullScreen ? `calc(100vh - ${TITLE_BAR_H}px)` : '85vh',
          borderRadius: fullScreen ? 0 : '1rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative flex items-center justify-between gap-3 px-4 border-b border-line shrink-0"
          // `height` in a style object rather than `h-12`, so the number is written once
          // next to the note that explains it. The left padding is back to a plain `px-4`:
          // the overlay no longer reaches the traffic lights, so there is nothing to
          // clear.
          style={{ height: headerHeight }}
        >
          {/* The title keeps the left, where every window in the app puts its name, and
              says which of the tabs is open — so the strip in the middle is what you
              CHOOSE with and the heading is what you are ON.

              `truncate` with `min-w-0` is what the traffic-light gutter makes
              load-bearing: the header is a flex row, and a long name that cannot shrink
              would push the buttons at the other end off the panel instead of ellipsing.
              The width cap is what keeps it clear of the centred strip, the same guard
              `TitleBar` puts on its own centred element — these four titles are one word
              each, so it only ever bites on a window narrowed to its minimum.

              `truncate` is on the WORD and not on the row, now that a mark shares it:
              on the row it would apply to a flex container, which ellipses nothing and
              would let the icon be the thing that got cut. */}
          <span className="flex items-center gap-2 text-sm font-semibold min-w-0 max-w-[25%]">
            {titleIcon}
            <span className="truncate">{title}</span>
          </span>

          {/* CENTRED ON THE BAR, not on the space left between the title and the buttons:
              absolutely positioned, so the two groups either side can be any width they
              like and the strip does not drift as a title or a live indicator changes.
              `left-1/2` measures the header's own box, gutter included, so the strip sits
              in the middle of the window rather than in the middle of the content. */}
          {tabs && (
            <div className="absolute left-1/2 -translate-x-1/2">
              <TabStrip
                ariaLabel={tabs.ariaLabel}
                items={tabs.items}
                activeKey={tabs.activeKey}
                onSelect={tabs.onSelect}
              />
            </div>
          )}
          <div className="flex items-center gap-3 flex-shrink-0">
            {headerRight}
            {/* Between the page's own chrome and the close button: it acts on the
                overlay rather than on what is inside it, and closing stays the last
                thing in the row, where every window in the app puts it. */}
            <button
              onClick={toggleFullScreen}
              className="p-1.5 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
              title={t(fullScreen ? 'modal.exitFullScreen' : 'modal.fullScreen')}
            >
              {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={requestClose}
              className="p-1.5 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
              title={t('modal.closeEsc')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
