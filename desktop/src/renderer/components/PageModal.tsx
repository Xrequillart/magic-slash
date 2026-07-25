import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

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
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-modal-backdrop p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-bg-secondary border border-white/10 rounded-2xl w-full max-w-6xl h-[85vh] overflow-hidden animate-modal-content shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-white/10 shrink-0">
          <span className="text-sm font-semibold">{title}</span>
          <div className="flex items-center gap-3">
            {headerRight}
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors"
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
