import { useEffect, useRef, useState } from 'react'
import { UpdateSplash, type UpdateStage } from '@ds/desktop'
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
  | { type: 'checking'; manual?: boolean }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string; releaseNotes?: string }
  | { type: 'error'; message: string; phase?: 'check' | 'download' | 'install' }

/** What the splash is drawing: the stage, its line, and its one button if it has one. */
interface SplashView {
  stage: UpdateStage
  label: string
  action?: { label: string; onClick: () => void }
}

/**
 * The whole update flow, on the launch splash's white ground.
 *
 * A check somebody asked for, the release found, the transfer, the countdown, then the
 * window goes away and comes back newer. Nothing here starts any of it: `autoDownload`
 * is on in main/updater.ts and the countdown is the only decision left.
 *
 * IT USED TO BE A DIALOG OVER THE APP, and before that a row in the left sidebar. The
 * restart is still announced rather than offered; what changed is that the app is no
 * longer drawn behind it. An update that can be ignored is an update half the installs
 * never take.
 *
 * WHAT IS LEFT HERE, and why it is not in the design system: the IPC, the timer, the
 * version carried from 'available' to the progress events that do not repeat it, and the
 * exit. `UpdateSplash` draws stages and knows there is an updater somewhere; this is the
 * part that talks to Electron.
 *
 * THE OVERLAY STILL HAS ONE STATE. An install that FAILED is `UpdateOverlay`'s: by the
 * time it happens the terminals are already gone and quitting is the only way out, so
 * it is a different kind of message from anything this splash says.
 */
export function UpdateModal() {
  const t = useT()
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  // The version "Later" was pressed on. Keyed by version rather than a bare flag, so a
  // second release downloaded in the same session raises the splash again — and
  // deliberately component state and nothing more: the download stays on disk and
  // `autoInstallOnAppQuit` puts it in on the next quit, so postponing loses nothing.
  const [postponedVersion, setPostponedVersion] = useState<string | null>(null)
  // The startup check fires a second after launch and can resolve before this mounts,
  // so the pushed event alone would be missed and the splash would never appear.
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
      // Somebody asked, so a release they postponed is worth offering again.
      if (next.type === 'checking' && next.manual) setPostponedVersion(null)
      setStatus(next)
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // ── Dev-only simulation ──────────────────────────────────────────────────
  // The updater short-circuits outside a packaged build, so no real status ever
  // reaches this splash in development. The debug menu in UpdateOverlay pins a fake
  // one here, and while it is pinned the splash drives a fake transfer instead of the
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
      // Pinning a check or a release advances by itself, the same as the real thing:
      // the feed answers, and autoDownload starts the transfer without being asked.
      if (next?.type === 'checking') {
        simTimerRef.current = setTimeout(() => {
          setSimulated({ type: 'available', version: SIM_VERSION })
          simTimerRef.current = setTimeout(simulateDownload, 900)
        }, 1400)
      }
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

  // Nothing to relaunch into, so the splash just leaves. A real install never gets that
  // far: the window goes away.
  function simulateInstall() {
    clearSimTimer()
    setSimulated(null)
  }

  const simulating = import.meta.env.DEV && simulated !== null
  const retry = () => (simulating ? simulateDownload() : window.electronAPI.updater.download())

  // A pinned simulation wins over the real status, so the splash can be exercised in
  // development without the updater ever having run.
  const shown = simulating ? simulated : status

  // Progress events do not repeat the version, so the one 'available' named is held
  // for them. A ref and not state: it is read in the same render that learns it.
  const versionRef = useRef<string | null>(null)
  if (shown && 'version' in shown) versionRef.current = shown.version

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

  const live = toView(shown, postponedVersion, {
    checking: t('update.checking'),
    downloading: versionRef.current
      ? t('update.downloadingVersion', { version: versionRef.current })
      : t('update.downloading'),
    restarting: t('update.restartingIn', { seconds: remaining ?? RESTART_COUNTDOWN_SECONDS }),
    failed: t('update.failed'),
    later: { label: t('app.later'), onClick: () => readyVersion && setPostponedVersion(readyVersion) },
    retry: { label: t('update.retry'), onClick: retry },
  })

  // ── The exit ─────────────────────────────────────────────────────────────
  // When there is nothing left to draw (Later, a check that found nothing), the splash
  // is not simply unmounted: the rabbit dashes off and the ground fades, the way the
  // launch splash leaves. The last view is held until `onLeft` says it is gone.
  const lastViewRef = useRef<SplashView | null>(null)
  if (live) lastViewRef.current = live
  const [leavingView, setLeavingView] = useState<SplashView | null>(null)
  const liveKey = live?.stage.type ?? null
  const prevKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (liveKey !== null) setLeavingView(null)
    else if (prevKeyRef.current !== null) setLeavingView(lastViewRef.current)
    prevKeyRef.current = liveKey
  }, [liveKey])

  const view = live ?? leavingView
  if (!view) return null

  return (
    <UpdateSplash
      stage={view.stage}
      label={view.label}
      action={view.action}
      leaving={!live}
      onLeft={() => setLeavingView(null)}
    />
  )
}

/**
 * The updater's six states onto the four the splash draws, and onto the nothing it
 * draws for the rest.
 *
 * SILENCE IS STILL THE COMMON CASE. The startup check, finding nothing, a check that
 * failed and an install that failed all render no splash: the first three are the app
 * minding its own business at launch, and the fourth belongs to `UpdateOverlay`. Only a
 * check somebody ASKED for is drawn, because they are waiting on its answer.
 *
 * 'available' IS DRAWN AS A DOWNLOAD AT 0%, not a stage of its own: autoDownload starts
 * the transfer the moment it is emitted, and the hop that greets it is the "found".
 */
function toView(
  status: UpdateStatus | null,
  postponedVersion: string | null,
  words: {
    checking: string
    downloading: string
    restarting: string
    failed: string
    later: SplashView['action']
    retry: SplashView['action']
  },
): SplashView | null {
  if (!status) return null

  switch (status.type) {
    case 'checking':
      return status.manual ? { stage: { type: 'checking' }, label: words.checking } : null
    case 'available':
      return { stage: { type: 'downloading', percent: 0 }, label: words.downloading }
    case 'downloading':
      return { stage: { type: 'downloading', percent: status.progress }, label: words.downloading }
    case 'downloaded':
      // Postponed: the splash leaves and stays gone for this version. The download is
      // on disk and `autoInstallOnAppQuit` installs it on the next quit, so there is
      // nothing left to offer and nothing lost by dropping it.
      if (status.version === postponedVersion) return null
      return { stage: { type: 'ready' }, label: words.restarting, action: words.later }
    // A transfer that failed stays offered: the release is still there, only the
    // download broke. Every other failure is somebody else's to report.
    case 'error':
      return status.phase === 'download' ? { stage: { type: 'failed' }, label: words.failed, action: words.retry } : null
    default:
      return null
  }
}
