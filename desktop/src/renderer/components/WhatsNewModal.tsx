import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Modal } from './Modal'

export function WhatsNewModal() {
  const [data, setData] = useState<{ version: string; releaseNotes: string } | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  // Production: read from main process file on mount
  useEffect(() => {
    if (import.meta.env.DEV) return

    window.electronAPI.updater.getPendingWhatsNew().then((pending) => {
      if (!pending) return

      window.electronAPI.updater.getVersion().then((currentVersion) => {
        if (currentVersion === pending.version) {
          setData(pending)
          setIsOpen(true)
        } else {
          // Stale data (version mismatch) — clean up
          window.electronAPI.updater.clearPendingWhatsNew()
        }
      })
    })
  }, [])

  // Dev: listen for debug trigger from UpdateOverlay
  useEffect(() => {
    if (!import.meta.env.DEV) return

    function handleDebug(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.version && detail?.releaseNotes) {
        setData(detail)
        setIsOpen(true)
      }
    }

    window.addEventListener('debug:whats-new', handleDebug)
    return () => window.removeEventListener('debug:whats-new', handleDebug)
  }, [])

  function handleClose() {
    setIsOpen(false)
    setData(null)
    if (!import.meta.env.DEV) {
      window.electronAPI.updater.clearPendingWhatsNew()
    }
  }

  if (!isOpen || !data) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`What's New in v${data.version}`}
      maxWidth="max-w-lg"
      footer={
        <button
          onClick={handleClose}
          className="px-4 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
        >
          Got it
        </button>
      }
    >
      <div className="flex items-center gap-2 mb-3 text-accent">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wide">Release Notes</span>
      </div>
      <div
        className="whats-new-content text-sm text-text-secondary leading-relaxed"
        dangerouslySetInnerHTML={{ __html: data.releaseNotes }}
      />
    </Modal>
  )
}
