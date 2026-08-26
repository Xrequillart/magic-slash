import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle, Download, RotateCw } from 'lucide-react'
import { useT } from '../i18n'

/** Fixture version for the dev-only simulation below. */
const SIM_VERSION = '1.0.0'

type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string; releaseNotes?: string }
  | { type: 'error'; message: string; phase?: 'check' | 'download' | 'install' }

/**
 * The whole update flow, pinned under the usage card at the bottom of the left
 * sidebar. Check, download and restart all happen without a modal ever taking the
 * screen: the app finds a release at launch, pulls it by itself, and this row is
 * where that is reported and where the one remaining decision — restart now or
 * later — is offered.
 *
 * Four states, one row each: found, transferring, ready (a card with Restart and
 * Later), and a retryable failure. Everything else (checking, nothing found, an
 * install that failed) renders nothing — this row is for what the person can act
 * on, and the install failure has the overlay to itself.
 *
 * Progress is drawn in place rather than in a modal, which is the whole point of
 * the row: the download runs while you keep working.
 */
export function SidebarUpdateButton() {
  const t = useT()
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  // The version "Later" was clicked on. Keyed by version rather than a bare flag,
  // so a second release downloaded in the same session raises the card again — and
  // deliberately component state and nothing more: a relaunch that still has the
  // update pending shows the card too, which is the reminder.
  const [postponedVersion, setPostponedVersion] = useState<string | null>(null)
  // The startup check fires a second after launch and can resolve before this
  // mounts, so the pushed event alone would be missed and the row would never
  // appear. getStatus() covers that gap — but it must lose to anything the stream
  // has already delivered, or a slow reply would overwrite fresher news.
  const streamedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    window.electronAPI.updater.getStatus().then((initial) => {
      if (cancelled || streamedRef.current) return
      setStatus(initial)
    })
    const unsubscribe = window.electronAPI.updater.onStatus((next) => {
      streamedRef.current = true
      setStatus(next)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // ── Dev-only simulation ──────────────────────────────────────────────────
  // The updater short-circuits outside a packaged build, so no real status ever
  // reaches this row in development. The debug menu in UpdateOverlay pins a fake
  // one here, and while it is pinned the row drives a fake transfer instead of the
  // IPC — which is the whole point: what the row looks like as it walks found →
  // transferring → ready is what needs testing, and the real `updater:download`
  // refuses anyway with nothing to fetch.
  const [simulated, setSimulated] = useState<UpdateStatus | null>(null)
  const simTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearSimTimer = () => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current)
    simTimerRef.current = null
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const handler = (event: Event) => {
      clearSimTimer()
      const next = (event as CustomEvent<UpdateStatus | null>).detail
      setSimulated(next)
      setPostponedVersion(null)
      // Pinning the offered state advances by itself, because the row it renders no
      // longer has a button — same as the real thing, where autoDownload starts the
      // transfer without being asked.
      if (next?.type === 'available') simTimerRef.current = setTimeout(simulateDownload, 900)
    }
    window.addEventListener('debug:update-sim', handler)
    return () => {
      window.removeEventListener('debug:update-sim', handler)
      clearSimTimer()
    }
  }, [])

  function simulateDownload() {
    let progress = 0
    setSimulated({ type: 'downloading', progress })
    const tick = () => {
      progress = Math.min(100, progress + 7)
      setSimulated({ type: 'downloading', progress })
      if (progress >= 100) {
        // Held at 100% for a beat, the way a real transfer sits there while
        // electron-updater verifies the signature before emitting 'update-downloaded'.
        simTimerRef.current = setTimeout(() => setSimulated({ type: 'downloaded', version: SIM_VERSION }), 700)
        return
      }
      simTimerRef.current = setTimeout(tick, 180)
    }
    simTimerRef.current = setTimeout(tick, 180)
  }

  // Nothing to restart into, so the row just leaves — which is what a real install
  // looks like from here: the window goes away.
  function simulateInstall() {
    clearSimTimer()
    setSimulated(null)
  }

  const simulating = import.meta.env.DEV && simulated !== null
  const startDownload = () => (simulating ? simulateDownload() : window.electronAPI.updater.download())
  const install = () => (simulating ? simulateInstall() : window.electronAPI.updater.install())

  // A pinned simulation wins over the real status, so the row can be exercised in
  // development without the updater ever having run.
  const shown = simulating ? simulated : status
  if (!shown) return null

  // Reported, not offered: the transfer is already starting on its own, so there is
  // nothing to click here — the progress bar takes this row's place a beat later.
  if (shown.type === 'available') {
    return (
      <Row>
        <div
          title={t('sidebar.update.availableTitle', { version: shown.version })}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-medium truncate">{t('sidebar.update.available')}</span>
          <span className="ml-auto text-[10px] opacity-60 shrink-0">v{shown.version}</span>
        </div>
      </Row>
    )
  }

  if (shown.type === 'downloading') {
    const pct = Math.min(100, Math.max(0, shown.progress))
    return (
      <Row>
        <div className="px-2 py-1.5 rounded-lg bg-surface-subtle border border-line-subtle">
          <div className="flex items-center justify-between mb-1 text-[10px]">
            <span className="text-text-secondary/60">{t('sidebar.update.downloading')}</span>
            <span className="font-semibold text-accent">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Row>
    )
  }

  if (shown.type === 'downloaded') {
    // "Later" does not dismiss the update, it only folds this card back into the
    // one-line restart button — the download is on disk and there has to be a way
    // back to it, since this row is now the only one anywhere in the main window.
    if (postponedVersion === shown.version) {
      return (
        <Row>
          <button
            onClick={install}
            title={t('sidebar.update.restartTitle', { version: shown.version })}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-accent/15 border border-accent/30 text-accent hover:bg-accent/25 hover:border-accent/50 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-medium truncate">{t('sidebar.update.restart')}</span>
            <span className="ml-auto text-[10px] opacity-60 shrink-0">v{shown.version}</span>
          </button>
        </Row>
      )
    }

    return (
      <Row>
        <div className="px-2 py-1.5 rounded-lg bg-surface-subtle border border-line-subtle">
          <div className="flex items-center gap-1.5 mb-1.5 text-[10px]">
            <CheckCircle className="w-3 h-3 text-accent shrink-0" />
            <span className="text-text-secondary/60 truncate">{t('sidebar.update.ready')}</span>
            <span className="ml-auto font-semibold text-accent shrink-0">v{shown.version}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={install}
              title={t('sidebar.update.restartTitle', { version: shown.version })}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-md bg-accent text-on-brand text-[11px] font-medium hover:bg-accent-hover transition-colors"
            >
              <RotateCw className="w-3 h-3 shrink-0" />
              <span className="truncate">{t('sidebar.update.restartNow')}</span>
            </button>
            <button
              onClick={() => setPostponedVersion(shown.version)}
              className="px-2 py-1 rounded-md border border-line-subtle text-text-secondary text-[11px] font-medium hover:text-ink hover:border-line transition-colors shrink-0"
            >
              {t('app.later')}
            </button>
          </div>
        </div>
      </Row>
    )
  }

  // A transfer that failed stays offered: the release is still there, only the
  // download broke. An install failure is the overlay's to report, not this row's.
  if (shown.type === 'error' && shown.phase === 'download') {
    return (
      <Row>
        <button
          onClick={startDownload}
          title={shown.message}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg bg-red/10 border border-red/30 text-red hover:bg-red/20 transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-medium truncate">{t('sidebar.update.retry')}</span>
        </button>
      </Row>
    )
  }

  return null
}

/** Shared gutter, so the row lines up with the usage card sitting above it. */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="mx-2 mb-2">{children}</div>
}
