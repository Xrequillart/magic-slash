import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bot, Bug, Download, FileText, PartyPopper, ScrollText, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { useT } from '../i18n'

type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string; releaseNotes?: string }
  | { type: 'error'; message: string; phase?: 'check' | 'download' | 'install' }

/**
 * Id of the fake agent the debug menu pins into the list. Prefixed like the other
 * non-pty ids so it is recognisable in the store, but NOT `sidebar-`/`script-`:
 * those two are filtered out of the agent list, and the point here is to appear in it.
 */
const DEBUG_PLANNING_AGENT_ID = 'debug-planning-agent'

const CONFETTI_COLORS = ['#393BFF', '#6366f1', '#22c55e', '#eab308', '#ef4444', '#a855f7', '#3b82f6', '#f97316']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  rotation: number
  rotationSpeed: number
  opacity: number
  shape: 'rect' | 'circle'
}

function launchConfetti(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  const particles: Particle[] = []
  const cx = canvas.width / 2
  const cy = canvas.height / 2

  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 4 + Math.random() * 8
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    })
  }

  let frame: number
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.2
      p.vx *= 0.99
      p.rotation += p.rotationSpeed
      p.opacity -= 0.008
      if (p.opacity <= 0) continue
      alive = true
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = p.opacity
      ctx.fillStyle = p.color
      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      } else {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (alive) {
      frame = requestAnimationFrame(animate)
    }
  }
  frame = requestAnimationFrame(animate)
  return () => cancelAnimationFrame(frame)
}

export function UpdateOverlay() {
  const t = useT()
  const activeTerminalId = useStore((s) => s.activeTerminalId)
  // The one thing left that is worth interrupting for: the download is on disk, the
  // restart was asked for, and it did not happen. Everything else the updater has to
  // say is reported by the sidebar row instead.
  const [installError, setInstallError] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [debugMenuOpen, setDebugMenuOpen] = useState(false)
  const [emptyStatePinned, setEmptyStatePinned] = useState(false)
  const [planningAgentPinned, setPlanningAgentPinned] = useState(false)
  const [updateRowPinned, setUpdateRowPinned] = useState(false)
  const debugMenuRef = useRef<HTMLDivElement>(null)
  const confettiRef = useRef<HTMLCanvasElement>(null)
  const lastStatusTypeRef = useRef<UpdateStatus['type'] | null>(null)

  function floodTerminal() {
    if (!activeTerminalId) return
    setDebugMenuOpen(false)
    const prompt = 'Print exactly 200 lines of lorem ipsum text, each line numbered. Do not ask questions, just print.\n'
    window.electronAPI.terminal.write(activeTerminalId, prompt)
  }

  // Toggle rather than fire-and-forget: the agents page keeps showing its empty
  // state until this is switched back off, so it can be styled with sessions
  // still running underneath.
  function toggleEmptyState() {
    const next = !emptyStatePinned
    setEmptyStatePinned(next)
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('debug:empty-state', { detail: next }))
  }

  /**
   * Hands the sidebar update row a fake status to hold. It is the only way to see
   * that row in development: checkForUpdatesOnStartup() returns early under the dev
   * server, so no real status ever reaches it.
   *
   * A toggle rather than a scripted playback, because the point is to CLICK it —
   * the row simulates its own download and restart while pinned, so the whole
   * offered → transferring → ready path is walked by hand.
   */
  function toggleUpdateRow() {
    const next = !updateRowPinned
    setUpdateRowPinned(next)
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('debug:update-sim', {
      detail: next ? { type: 'available', version: '1.0.0' } : null,
    }))
  }

  /** Jumps the pinned row straight to a failed download, so retry can be clicked. */
  function pinUpdateRowError() {
    setUpdateRowPinned(true)
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('debug:update-sim', {
      detail: { type: 'error', message: 'net::ERR_CONNECTION_RESET (simulated)', phase: 'download' },
    }))
  }

  /**
   * Pins a fake `planning` agent into the list, so the spec panel can be seen without
   * running a real `/magic:plan` session. A toggle, like the empty state above: the
   * point is to switch into it, resize the sidebar, expand the spec, then switch back.
   *
   * It exists only in the renderer store — no pty is spawned, so its terminal pane is
   * blank and writing to it is a no-op. `specPath` points at the first configured
   * repository's CHANGELOG.md purely because it is long, real markdown that is certain
   * to be there; with no repository configured the path stays absent and the panel
   * shows its "drafting the spec" empty state instead, which is worth seeing too.
   *
   * That path is NOT spec-shaped, so the /metadata route would reject it — this works
   * only because the fixture writes the renderer store directly, which is the whole
   * point of a debug fixture and no reason to relax the route's guard.
   */
  function togglePlanningAgent() {
    setDebugMenuOpen(false)
    const next = !planningAgentPinned
    setPlanningAgentPinned(next)

    if (!next) {
      useStore.getState().removeTerminal(DEBUG_PLANNING_AGENT_ID)
      return
    }

    const repoPath = Object.values(useStore.getState().config?.repositories ?? {})[0]?.path
    useStore.getState().addTerminal({
      id: DEBUG_PLANNING_AGENT_ID,
      name: 'Fake planning agent',
      state: 'working',
      repositories: repoPath ? [repoPath] : [],
      metadata: {
        title: 'Fake planning agent',
        description: 'Simulated /magic:plan session (debug menu)',
        type: 'planner',
        status: 'planning',
        specPath: repoPath ? `${repoPath}/CHANGELOG.md` : undefined,
      },
    })
  }

  function showWhatsNew() {
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('show:whats-new', {
      detail: {
        version: '1.0.0',
        releaseNotes: '<h3>🚀 New Features</h3><ul><li><strong>What\'s New modal</strong> — See release notes after each update</li><li>Improved terminal performance</li></ul><h3>🐛 Bug Fixes</h3><ul><li>Fixed sidebar toggle on small screens</li><li>Resolved config sync issue</li></ul>',
      },
    }))
  }

  const triggerConfetti = useCallback(() => setShowConfetti(true), [])

  // Driven by an effect rather than by the rAF that used to follow setShowConfetti:
  // the canvas only exists once React has committed `showConfetti`, and an effect is
  // the one place that is guaranteed to run after that commit AND after layout — so
  // `canvas.offsetWidth` is the real width rather than 0. Returning launchConfetti's
  // canceller also stops the animation loop if the overlay unmounts mid-burst, which
  // the discarded return value never did.
  // The canvas also unmounts itself once the particles have fallen: it now floats
  // over the live app rather than over a modal that was about to close, so leaving it
  // mounted would leave a full-window element on top of the UI forever.
  useEffect(() => {
    if (!showConfetti || !confettiRef.current) return
    const cancel = launchConfetti(confettiRef.current)
    const done = setTimeout(() => setShowConfetti(false), 4000)
    return () => {
      cancel?.()
      clearTimeout(done)
    }
  }, [showConfetti])

  /** Pins the install-failure overlay — the one state that still takes the screen. */
  function toggleInstallFailure() {
    setDebugMenuOpen(false)
    setInstallError((current) => (current ? null : 'quitAndInstall failed (simulated)'))
  }

  // Close debug menu on click outside
  useEffect(() => {
    if (!debugMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (debugMenuRef.current && !debugMenuRef.current.contains(e.target as Node)) {
        setDebugMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [debugMenuOpen])

  // The real update flow, and all that is left of it here. The whole sequence —
  // check, download, restart — is reported and driven by the sidebar update row now:
  // nothing about an update in progress blacks out the app, not the automatic startup
  // check, not the transfer, and not the finished download either (its Restart and
  // Later sit in that row, next to the progress bar that preceded them).
  //
  // Two things still belong to this component: the burst of confetti when a download
  // lands, and the overlay for a restart that failed.
  useEffect(() => {
    const unsubscribe = window.electronAPI.updater.onStatus((newStatus) => {
      // Only the TRANSITION into 'downloaded' celebrates. A manual re-check while an
      // update is already downloaded makes electron-updater re-emit the event, and
      // that is not a download finishing.
      const isFirstDownloaded = newStatus.type === 'downloaded' && lastStatusTypeRef.current !== 'downloaded'
      lastStatusTypeRef.current = newStatus.type

      if (isFirstDownloaded) triggerConfetti()

      if (newStatus.type === 'error' && newStatus.phase === 'install') {
        setInstallError(newStatus.message)
      }

      // A fresh check is someone trying again, so a failure from last time stops
      // being the truth on screen.
      if (newStatus.type === 'checking') {
        setInstallError(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [triggerConfetti])

  return (
    <>
      {/* Over the live app, never blocking it: the update is ready, and clicking
          straight through the celebration to keep working is the point. */}
      {showConfetti && (
        <canvas ref={confettiRef} className="fixed inset-0 w-full h-full pointer-events-none z-[101]" />
      )}

      {/* The restart did not happen and the terminals are already gone, so this one
          does hold the screen — quitting and reopening is the only way out. */}
      {installError && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] animate-fade-in">
          <div className="bg-bg-secondary/90 border border-border/50 rounded-2xl shadow-2xl w-80 px-10 py-10 flex flex-col items-center gap-5">
            <AlertTriangle className="w-12 h-12 text-red" />
            <p className="text-center text-sm text-text-secondary">{t('update.installFailed')}</p>
          </div>
        </div>
      )}

      {/* Dev-only debug menu. Its button labels are deliberately NOT in the
          catalogue: `import.meta.env.DEV` strips the whole block from a
          production build, so no user ever reads them. The toasts it fires ARE
          translated — those are the real ones, simulated. */}
      {import.meta.env.DEV && (
        <div ref={debugMenuRef} className="fixed bottom-3 right-3 z-[200]">
          {debugMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-52 py-1 rounded-lg bg-bg-secondary border border-border/50 shadow-xl animate-fade-in">
              <button
                onClick={() => {
                  setDebugMenuOpen(false)
                  triggerConfetti()
                }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors"
              >
                <PartyPopper className="w-3.5 h-3.5" />
                Download-ready confetti
              </button>
              <button
                onClick={toggleInstallFailure}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  installError ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Install failure overlay
                {installError && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={toggleUpdateRow}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  updateRowPinned ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Sidebar update row
                {updateRowPinned && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={pinUpdateRowError}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Update row: failed
              </button>
              <button
                onClick={toggleEmptyState}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  emptyStatePinned ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                Empty agents state
                {emptyStatePinned && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={togglePlanningAgent}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  planningAgentPinned ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Fake planning agent
                {planningAgentPinned && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={showWhatsNew}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                What&apos;s New modal
              </button>
              <button
                onClick={floodTerminal}
                disabled={!activeTerminalId}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors disabled:opacity-40"
              >
                <ScrollText className="w-3.5 h-3.5" />
                Flood terminal
              </button>
            </div>
          )}
          <button
            onClick={() => setDebugMenuOpen((o) => !o)}
            className={`p-2 rounded-lg border transition-colors ${
              debugMenuOpen
                ? 'bg-red border-red text-on-brand'
                : 'bg-red/80 border-red/60 text-on-brand hover:bg-red'
            }`}
            title={t('update.debugMenu')}
          >
            <Bug className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
