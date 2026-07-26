import { useEffect, useCallback, ReactNode } from 'react'
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
}

export function Modal({ isOpen, onClose, title, children, footer, hero, maxWidth = 'max-w-md' }: ModalProps) {
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

  return (
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
        className={`bg-bg-secondary border border-line rounded-xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto ${
          closing ? 'animate-modal-content-out' : 'animate-modal-content'
        }`}
      >
        {/* Hero */}
        {hero && (
          <div className="relative">
            {hero}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 text-on-brand/70 hover:text-on-brand bg-black/30 hover:bg-black/50 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
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
        <div className="px-5 pb-5 text-sm text-text-secondary">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-2 justify-end px-5 pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
