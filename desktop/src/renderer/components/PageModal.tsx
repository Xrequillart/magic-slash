import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useModalExit } from '../hooks/useModalExit'

interface PageModalProps {
  title: string
  onClose: () => void
  /** Optional content pinned to the right of the title bar (e.g. a live indicator). */
  headerRight?: ReactNode
  children: ReactNode
}

/**
 * Full-height centered overlay hosting what used to be a page. Agents is the only
 * real page left: Settings, Skills, History and Team all render through here.
 *
 * Small confirmation dialogs belong in components/Modal.tsx instead — this one is
 * sized for page-scale content.
 */
export function PageModal({ title, onClose, headerRight, children }: PageModalProps) {
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

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6 ${
        closing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop'
      }`}
      onClick={requestClose}
    >
      <div
        onAnimationEnd={onExitAnimationEnd}
        className={`relative bg-bg-secondary border border-line rounded-2xl w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl flex flex-col ${
          closing ? 'animate-modal-content-out' : 'animate-modal-content'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-line shrink-0">
          <span className="text-sm font-semibold">{title}</span>
          <div className="flex items-center gap-3">
            {headerRight}
            <button
              onClick={requestClose}
              className="p-1.5 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
              title="Close (Esc)"
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
