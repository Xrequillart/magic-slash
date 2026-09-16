import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PageModal as PageModalGround, type ModalHeaderProps } from '@ds/desktop'
import type { IconComponent } from '@ds/desktop/types'
import { useModalExit } from '../hooks/useModalExit'
import { useStore } from '../store'
import { useT } from '../i18n'

/**
 * THE DRAWING IS `PageModal` IN `@ds/desktop` NOW, and what is left here is the wiring:
 * the store, the translator, the exit animation, Escape and ⌘⇧F. The same split
 * `TitleBar` makes with `AppTitleBar` and `ControlCenterMenu` with `ControlCenter`.
 *
 * What crossed over is the geometry — the dimmed ground, the 24px inset, the two sizes
 * and the travel between them, the header band. What stayed is every fact about the app.
 *
 * ONE OVERLAY, FOUR PAGES. Agents is the only real page left: Plans, Tasks, Skills and
 * the repositories window all render through here, sharing a single instance and
 * switching by `tabs` — see the call site in `App.tsx` for why that has to be one mounted
 * element rather than four conditional ones.
 *
 * Small confirmation dialogs belong in `components/Modal.tsx` instead; this one is sized
 * for page-scale content. Both wear the same header now.
 *
 * FULL SCREEN IS A PROPERTY OF THE WINDOW, NOT OF THIS COMPONENT'S CALLER. There is no
 * prop for it and no call site passes one: the flag lives in the store
 * (`pageModalFullScreen`), is shared by every overlay, and is persisted, so the size a
 * reader last chose is the size every overlay opens at, including after a relaunch. A
 * plan's spec is a long document and a task's body is prose with code in it — a person
 * who has decided those deserve the whole window has decided it once.
 *
 * ESCAPE ARBITRATION, stated here because four things could plausibly claim the key and
 * only two may:
 *
 *  1. a detail SUB-PAGE goes back to its list. `Tasks/TaskDetailPage` and
 *     `Plans/PlanDetailPage` listen in the CAPTURE phase and call
 *     `stopImmediatePropagation`, which is what beats the listener below — both are on
 *     `window`, and only the "immediate" form stops a sibling on the same target.
 *  2. otherwise, the TOPMOST overlay closes. That is this listener, and "topmost" is
 *     load-bearing: two of these can be up at once — open Skills, then reach the quick
 *     settings and press All settings, and the settings dialog lands over it. Without
 *     the stack below, one Escape would close both and the reader would find themselves
 *     back at the agents with no idea what happened to the page they were reading.
 *  3. Escape NEVER leaves full screen. A third contender for an already contested key
 *     would make the outcome depend on which page happens to be open, and the reader
 *     would learn that Escape sometimes shrinks the window instead of closing it. ⌘⇧F
 *     toggles it, both ways, and the button in the header says so.
 */

/**
 * WHICH OVERLAYS ARE UP, innermost last — the one thing two instances of this have to
 * agree about.
 *
 * A module-level array and not context, for the reason the blur refcount in
 * `ControlCenter` is a module-level map: the two overlays share no ancestor that is not
 * the app root, and a provider at the root to arbitrate a keystroke between two siblings
 * is a lot of ceremony for a list of three. Keyed by the instance's own symbol, so an
 * overlay that unmounts mid-flight takes exactly its own entry.
 */
const overlays: symbol[] = []

/** Whether `id` is the innermost overlay, and therefore the one Escape and ⌘⇧F act on. */
function isTopmost(id: symbol): boolean {
  return overlays[overlays.length - 1] === id
}

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
   * AN `IconComponent` AND NOT A NODE, which it used to be: the header draws it now, at
   * the rung and in the tone every other mark in the app's chrome wears, so a caller
   * cannot hand over a glyph two sizes out. Nothing needed the node — every call site
   * was rendering a lucide glyph with the same three classes on it.
   */
  titleIcon?: IconComponent
  onClose: () => void
  /**
   * The pages this overlay switches between, when it hosts more than one.
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
  tabs?: ModalHeaderProps['tabs']
  /** Optional content pinned to the right of the title bar (e.g. a live indicator). */
  headerRight?: ReactNode
  children: ReactNode
}

export function PageModal({ title, titleIcon, onClose, tabs, headerRight, children }: PageModalProps) {
  const t = useT()
  const fullScreen = useStore((s) => s.pageModalFullScreen)
  const toggleFullScreen = useStore((s) => s.togglePageModalFullScreen)

  /**
   * The parent renders this conditionally, so calling onClose straight away would
   * unmount it mid-animation. Closing is requested here instead: the overlay plays its
   * exit, and only then does onClose let the parent drop it.
   */
  const [open, setOpen] = useState(true)
  const requestClose = useCallback(() => setOpen(false), [])
  const { mounted, closing, onExitAnimationEnd } = useModalExit(open, onClose)

  // Registered for as long as the DOM is there, the exit animation included: an overlay
  // that is still on screen is still the one a keystroke belongs to.
  const [id] = useState(() => Symbol('page-modal'))
  useEffect(() => {
    overlays.push(id)
    return () => {
      const at = overlays.indexOf(id)
      if (at !== -1) overlays.splice(at, 1)
    }
  }, [id])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (!isTopmost(id)) return
      e.preventDefault()
      requestClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestClose, id])

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
      // The flag is shared by every overlay, so two listeners would toggle it twice and
      // nothing would move. Same arbitration as Escape, and for a plainer reason.
      if (!isTopmost(id)) return
      e.preventDefault()
      toggleFullScreen()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggleFullScreen, id])

  if (!mounted) return null

  return (
    <PageModalGround
      fullScreen={fullScreen}
      header={{
        title,
        icon: titleIcon,
        tabs,
        right: headerRight,
        fullScreen: {
          expanded: fullScreen,
          onToggle: toggleFullScreen,
          expandTitle: t('modal.fullScreen'),
          collapseTitle: t('modal.exitFullScreen'),
        },
        onClose: requestClose,
        closeTitle: t('modal.closeEsc'),
      }}
      // The app's keyframes, which is the one thing the design system cannot supply:
      // they live in `index.css` and that folder cannot reach them.
      // A click on the 24px of dimmed app around the panel closes it, the same way the
      // confirmation dialogs have always closed. Only when the press STARTED there —
      // see the prop, and the selection it exists to protect.
      onBackdropClick={requestClose}
      backdropClassName={closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}
      panelClassName={closing ? 'animate-modal-content-out' : 'animate-modal-content'}
      onAnimationEnd={onExitAnimationEnd}
    >
      {children}
    </PageModalGround>
  )
}
