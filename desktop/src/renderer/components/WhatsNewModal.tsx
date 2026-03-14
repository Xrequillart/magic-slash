import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { Modal } from './Modal'

export function WhatsNewModal() {
  const pendingWhatsNew = useStore((s) => s.pendingWhatsNew)
  const setPendingWhatsNew = useStore((s) => s.setPendingWhatsNew)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!pendingWhatsNew) return

    // In dev mode, skip version check to allow debug testing
    if (import.meta.env.DEV) {
      setIsOpen(true)
      return
    }

    window.electronAPI.updater.getVersion().then((currentVersion) => {
      if (currentVersion === pendingWhatsNew.version) {
        setIsOpen(true)
      } else {
        // Stale data (version mismatch) — clean up
        setPendingWhatsNew(null)
      }
    })
  }, [pendingWhatsNew, setPendingWhatsNew])

  function handleClose() {
    setIsOpen(false)
    setPendingWhatsNew(null)
  }

  if (!isOpen || !pendingWhatsNew) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`What's New in v${pendingWhatsNew.version}`}
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
        dangerouslySetInnerHTML={{ __html: pendingWhatsNew.releaseNotes }}
      />
    </Modal>
  )
}
