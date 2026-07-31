'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Centered modal shell: backdrop click and Escape both close, and the footer is
 * a plain flex row aligned right (give a button `mr-auto` to push it left).
 *
 * Mirrors the desktop app's Modal so the two surfaces feel like one product,
 * with the webapp's light palette.
 */
export function Modal({
  open,
  onClose,
  icon: Icon,
  title,
  tone = 'brand',
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  icon: LucideIcon
  title: string
  /** `danger` tints the header icon red, for destructive flows. */
  tone?: 'brand' | 'danger'
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const { t } = useT()

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

  if (!open) return null

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-modal-content w-full max-w-md rounded-2xl border border-black/5 bg-white shadow-2xl shadow-black/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone === 'danger' ? 'bg-red/10' : 'bg-brand/10'}`}
            >
              <Icon className={`h-4 w-4 ${tone === 'danger' ? 'text-red' : 'text-brand'}`} />
            </span>
            <h3 className="font-display text-base font-bold text-ink">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-lg p-1 text-muted transition-colors hover:bg-black/[0.04] hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5">{children}</div>

        {footer && <div className="flex items-center gap-2 px-5 pb-5 pt-4">{footer}</div>}
      </div>
    </div>
  )
}
