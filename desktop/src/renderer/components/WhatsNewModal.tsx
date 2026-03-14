import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import whatsNewHero from '../assets/whats-new-hero.png'

function filterReleaseNotes(html: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const body = doc.body

  const stopPatterns = /installation|full changelog/i
  let removing = false

  for (const node of Array.from(body.childNodes)) {
    if (removing) {
      node.remove()
      continue
    }
    if (node instanceof HTMLElement && /^H[23]$/.test(node.tagName) && stopPatterns.test(node.textContent || '')) {
      removing = true
      node.remove()
    }
  }

  return body.innerHTML
}

export function WhatsNewModal() {
  const [data, setData] = useState<{ version: string; releaseNotes: string } | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const manualOpen = useRef(false)

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

  // Listen for manual trigger (from Settings or debug menu)
  useEffect(() => {
    function handleShow(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.version && detail?.releaseNotes) {
        manualOpen.current = true
        setData(detail)
        setIsOpen(true)
      }
    }

    window.addEventListener('show:whats-new', handleShow)
    return () => window.removeEventListener('show:whats-new', handleShow)
  }, [])

  function handleClose() {
    setIsOpen(false)
    setData(null)
    if (!manualOpen.current && !import.meta.env.DEV) {
      window.electronAPI.updater.clearPendingWhatsNew()
    }
    manualOpen.current = false
  }

  if (!isOpen || !data) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`What's New in v${data.version}`}
      maxWidth="max-w-lg"
      hero={
        <div className="relative">
          <img
            src={whatsNewHero}
            alt=""
            className="w-full rounded-t-xl object-cover max-h-40"
          />
        </div>
      }
      footer={
        <button
          onClick={handleClose}
          className="px-4 py-1.5 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-colors"
        >
          Got it
        </button>
      }
    >
      <div
        className="whats-new-content text-sm text-text-secondary leading-relaxed"
        dangerouslySetInnerHTML={{ __html: filterReleaseNotes(data.releaseNotes) }}
      />
    </Modal>
  )
}
