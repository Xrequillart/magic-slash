import { useEffect, useCallback, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useModalExit } from '../hooks/useModalExit'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  hero?: ReactNode
  maxWidth?: string
  /**
   * Give the body all the height that is left instead of letting the dialog grow to
   * its content and scroll.
   *
   * For the one kind of child that has to be told how tall it is rather than announce
   * it — a terminal. Sized in rows from its container, a terminal in an auto-height
   * dialog either has to name a height of its own (`h-[60vh]`, which then collides
   * with the dialog's own `max-h` and gets cut halfway through) or collapses. With
   * this, the dialog claims a fixed share of the window, the header and footer keep
   * their natural height, and everything left over goes to the body — which is what
   * `h-full` inside it can finally mean something against.
   */
  fillHeight?: boolean
}

export function Modal({ isOpen, onClose, title, children, footer, hero, maxWidth = 'max-w-md', fillHeight = false }: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Outlives `isOpen` by the length of the exit animation. Every way a caller
  // closes this dialog goes through that prop — the buttons here, but also the
  // parent closing it after a successful save — so all of them animate out.
  const { mounted, closing, onExitAnimationEnd } = useModalExit(isOpen)

  if (!mounted) return null

  // Portalled to the body rather than left where it is called from. `fixed` is
  // measured against the nearest ancestor holding a transform, and several of
  // the panes a modal is opened from keep one after their entrance animation
  // settles (SweepPane's layers, for one). Rendered in place, the backdrop would
  // then cover that pane alone and the dialog would centre on the content column
  // instead of the window.
  return createPortal(
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 ${
        closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        onAnimationEnd={onExitAnimationEnd}
        className={`bg-bg-secondary border border-line rounded-xl w-full ${maxWidth} ${
          fillHeight ? 'h-[85vh] flex flex-col' : 'max-h-[90vh] overflow-y-auto'
        } ${closing ? 'animate-modal-content-out' : 'animate-modal-content'}`}
      >
        {/* Hero */}
        {hero && (
          <div className="relative">
            {hero}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 text-on-brand hover:text-on-brand bg-black/30 hover:bg-black/50 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-4">
          <h3 className="text-base font-semibold">{title}</h3>
          {!hero && (
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        {/* `min-h-0` is what makes `flex-1` a real height here rather than a floor: a
            flex child defaults to its content's minimum size, and without it a terminal
            asking for 100% would push the footer off the bottom instead of fitting. */}
        <div className={`px-5 pb-5 text-sm text-text-secondary ${fillHeight ? 'flex-1 min-h-0' : ''}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 flex gap-2 justify-end px-5 pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
