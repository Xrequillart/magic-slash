import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { useModalExit } from '../hooks/useModalExit'
import { useStore } from '../store'
import { useT } from '../i18n'

interface PageModalProps {
  title: string
  onClose: () => void
  /** Optional content pinned to the right of the title bar (e.g. a live indicator). */
  headerRight?: ReactNode
  children: ReactNode
}

/**
 * Full-height centered overlay hosting what used to be a page. Agents is the only
 * real page left: Settings, Skills, Plans and Tasks all render through here.
 *
 * Small confirmation dialogs belong in components/Modal.tsx instead — this one is
 * sized for page-scale content.
 *
 * FULL SCREEN IS A PROPERTY OF THE WINDOW, NOT OF THIS COMPONENT'S CALLER. There is no
 * prop for it and the four call sites are unchanged: the flag lives in the store
 * (`pageModalFullScreen`), is shared by all four modals, and is persisted, so the size a
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
export function PageModal({ title, onClose, headerRight, children }: PageModalProps) {
  const t = useT()
  const fullScreen = useStore((s) => s.pageModalFullScreen)
  const toggleFullScreen = useStore((s) => s.togglePageModalFullScreen)
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
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 ${
        fullScreen ? '' : 'p-6'
      } ${closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'}`}
      onClick={requestClose}
    >
      {/* `flex flex-col` with a `flex-1 overflow-hidden` body is the contract every page
          in here is built on — each one is its own scroller and relies on being handed a
          bounded height. Both sizes keep it; only the box changes. The radius and the
          border go with the inset: a rounded panel flush against the window edges reads
          as a rendering glitch, not as a choice. */}
      <div
        onAnimationEnd={onExitAnimationEnd}
        className={`relative bg-bg-secondary border border-line overflow-hidden shadow-2xl flex flex-col ${
          fullScreen ? 'w-full h-full max-w-none rounded-none' : 'rounded-2xl w-full max-w-6xl h-[85vh]'
        } ${closing ? 'animate-modal-content-out' : 'animate-modal-content'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-line shrink-0">
          <span className="text-sm font-semibold">{title}</span>
          <div className="flex items-center gap-3">
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
