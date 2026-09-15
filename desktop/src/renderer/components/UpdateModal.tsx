import { useEffect, useRef, useState } from 'react'
import { UpdateDialog, type UpdateStage } from '@ds/desktop'
import { useT } from '../i18n'

/** Fixture version for the dev-only simulation below. */
const SIM_VERSION = '1.0.0'

/**
 * How long the finished download waits before relaunching the app.
 *
 * Five seconds, and the only reason it is not zero: the restart tears down every
 * terminal in the window (`cleanupAllTerminals` runs before `quitAndInstall`), so an
 * agent halfway through a `/magic:pr` would be lost with no way to say otherwise.
 * Short enough that doing nothing is still the normal path, long enough to read the
 * sentence and press Later.
 */
const RESTART_COUNTDOWN_SECONDS = 5

type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string; releaseNotes?: string }
  | { type: 'error'; message: string; phase?: 'check' | 'download' | 'install' }

/**
 * The whole update flow, as one dialog that holds the screen.
 *
 * The app checks for a release at launch, pulls it by itself and relaunches into it;
 * this is where all three are reported. Found → transferring → ready, then the window
 * goes away and comes back newer. Nothing here starts any of it — `autoDownload` is on
 * in main/updater.ts and the countdown is the only decision left.
 *
 * IT USED TO BE A ROW IN THE LEFT SIDEBAR, and everything that made that row a row has
 * gone with it: the download no longer runs quietly beside your work, and the restart
 * is no longer offered — it is announced. That is the deliberate trade. An update that
 * can be ignored is an update half the installs never take.
 *
 * WHAT IS LEFT HERE, and why it is not in the design system: the IPC, the timer and the
 * gap-filling below. `UpdateDialog` draws four stages and knows there is an updater
 * somewhere; this is the part that talks to Electron.
 *
 * THE OVERLAY STILL HAS ONE STATE. An install that FAILED is `UpdateOverlay`'s — by the
 * time it happens the terminals are already gone and quitting is the only way out, so
 * it is a different kind of message from anything this dialog says.
 */
export function UpdateModal() {
  const t = useT()
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  // The version "Later" was pressed on. Keyed by version rather than a bare flag, so a
  // second release downloaded in the same session raises the dialog again — and
  // deliberately component state and nothing more: the download stays on disk and
  // `autoInstallOnAppQuit` puts it in on the next quit, so postponing loses nothing.
  const [postponedVersion, setPostponedVersion] = useState<string | null>(null)
  // The startup check fires a second after launch and can resolve before this mounts,
  // so the pushed event alone would be missed and the dialog would never appear.
  // getStatus() covers that gap — but it must lose to anything the stream has already
  // delivered, or a slow reply would overwrite fresher news.
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
  // reaches this dialog in development. The debug menu in UpdateOverlay pins a fake
  // one here, and while it is pinned the dialog drives a fake transfer instead of the
  // IPC — which is the whole point: what it looks like as it walks found →
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
      // Pinning the offered stage advances by itself, the same as the real thing:
      // autoDownload starts the transfer without being asked.
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

  // Nothing to relaunch into, so the dialog just leaves — which is what a real install
  // looks like from here: the window goes away.
  function simulateInstall() {
    clearSimTimer()
    setSimulated(null)
  }

  const simulating = import.meta.env.DEV && simulated !== null
  const retry = () => (simulating ? simulateDownload() : window.electronAPI.updater.download())

  // A pinned simulation wins over the real status, so the dialog can be exercised in
  // development without the updater ever having run.
  const shown = simulating ? simulated : status

  // ── The countdown ────────────────────────────────────────────────────────
  // Null whenever there is nothing to count: the effect below owns it entirely, so a
  // second release arriving later starts from the top rather than from wherever the
  // last one was interrupted.
  const [remaining, setRemaining] = useState<number | null>(null)
  const readyVersion = shown?.type === 'downloaded' ? shown.version : null
  const counting = readyVersion !== null && readyVersion !== postponedVersion

  useEffect(() => {
    if (!counting) {
      setRemaining(null)
      return
    }
    setRemaining(RESTART_COUNTDOWN_SECONDS)
    const id = window.setInterval(
      () => setRemaining((left) => (left === null ? null : Math.max(0, left - 1))),
      1000,
    )
    return () => window.clearInterval(id)
    // `readyVersion` and not just `counting`: a release downloaded while another one
    // was already counting down is a new countdown, not a continuation.
  }, [counting, readyVersion])

  /**
   * Zero reached: relaunch.
   *
   * Its own effect, and NOT a branch inside the tick above. `setRemaining`'s updater is
   * a function React is free to call twice — it does exactly that in StrictMode — and a
   * `quitAndInstall` fired from inside one would be fired twice. An effect keyed on the
   * value runs once per value, which is what "restart when the countdown ends" means.
   *
   * It stays at zero rather than re-firing: the interval keeps ticking, `Math.max` pins
   * the value, and an unchanged state is not a re-render.
   */
  useEffect(() => {
    if (!counting || remaining !== 0) return
    if (simulating) simulateInstall()
    else window.electronAPI.updater.install()
  }, [counting, remaining, simulating])

  const stage = toStage(shown, postponedVersion, remaining)
  if (!stage) return null

  return (
    <UpdateDialog
      stage={stage}
      availableLabel={t('update.available')}
      downloadingLabel={t('update.downloading')}
      readyLabel={t('update.ready')}
      failedLabel={t('update.failed')}
      version={'version' in stage ? `v${stage.version}` : undefined}
      countdownLabel={t('update.restartingIn', { seconds: remaining ?? RESTART_COUNTDOWN_SECONDS })}
      postponeLabel={t('app.later')}
      onPostpone={() => readyVersion && setPostponedVersion(readyVersion)}
      retryLabel={t('update.retry')}
      onRetry={retry}
      backdropClassName="animate-modal-backdrop"
      className="animate-modal-content"
    />
  )
}

/**
 * The updater's six states onto the four the dialog draws — and, just as importantly,
 * onto the nothing it draws for the rest.
 *
 * SILENCE IS THE COMMON CASE. Checking, finding nothing, a check that failed and an
 * install that failed all render no dialog: the first three are the app minding its own
 * business at launch, and the fourth belongs to `UpdateOverlay`. A dialog that took the
 * screen to say "no update" would be the worst thing in the app.
 */
function toStage(
  status: UpdateStatus | null,
  postponedVersion: string | null,
  remaining: number | null,
): UpdateStage | null {
  if (!status) return null

  switch (status.type) {
    case 'available':
      return { type: 'available', version: status.version }
    case 'downloading':
      return { type: 'downloading', percent: status.progress }
    case 'downloaded':
      // Postponed: the dialog leaves and stays gone for this version. The download is
      // on disk and `autoInstallOnAppQuit` installs it on the next quit, so there is
      // nothing left to offer and nothing lost by dropping it.
      if (status.version === postponedVersion) return null
      return {
        // `?? RESTART_COUNTDOWN_SECONDS` rather than waiting for the effect: the first
        // render after 'downloaded' arrives still has the countdown unstarted, and
        // drawing nothing for that one frame would blink the dialog out between the
        // progress bar and the countdown.
        type: 'ready',
        version: status.version,
        remaining: remaining ?? RESTART_COUNTDOWN_SECONDS,
        total: RESTART_COUNTDOWN_SECONDS,
      }
    // A transfer that failed stays offered: the release is still there, only the
    // download broke. Every other failure is somebody else's to report.
    case 'error':
      return status.phase === 'download' ? { type: 'failed' } : null
    default:
      return null
  }
}
