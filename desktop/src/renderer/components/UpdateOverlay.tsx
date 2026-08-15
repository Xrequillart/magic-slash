import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, Bug, Download, CheckCircle, Loader2, Play, ScrollText, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { useT } from '../i18n'

type UpdateStatus =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'downloading'; progress: number }
  | { type: 'downloaded'; version: string; releaseNotes?: string }
  | { type: 'error'; message: string; phase?: 'check' | 'download' | 'install' }

const DEBUG_SEQUENCE: UpdateStatus[] = [
  { type: 'checking' },
  { type: 'available', version: '1.0.0' },
  { type: 'downloading', progress: 0 },
  { type: 'downloading', progress: 25 },
  { type: 'downloading', progress: 50 },
  { type: 'downloading', progress: 75 },
  { type: 'downloading', progress: 100 },
  { type: 'downloaded', version: '1.0.0', releaseNotes: '<h3>🚀 New Features</h3><ul><li><strong>What\'s New modal</strong> — See release notes after each update</li><li>Improved terminal performance</li></ul><h3>🐛 Bug Fixes</h3><ul><li>Fixed sidebar toggle on small screens</li><li>Resolved config sync issue</li></ul>' },
]

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
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [visible, setVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [debugRunning, setDebugRunning] = useState(false)
  const [debugMenuOpen, setDebugMenuOpen] = useState(false)
  const [emptyStatePinned, setEmptyStatePinned] = useState(false)
  const debugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
  useEffect(() => {
    if (!showConfetti || !confettiRef.current) return
    return launchConfetti(confettiRef.current)
  }, [showConfetti])

  function startDebugSequence() {
    if (debugRunning) return
    setDebugMenuOpen(false)
    setDebugRunning(true)
    setShowConfetti(false)
    let i = 0
    const next = () => {
      if (i >= DEBUG_SEQUENCE.length) {
        debugTimerRef.current = setTimeout(() => {
          setVisible(false)
          setStatus(null)
          setDebugRunning(false)
          setShowConfetti(false)
        }, 2500)
        return
      }
      const s = DEBUG_SEQUENCE[i]
      setStatus(s)
      setVisible(true)
      // Trigger confetti when reaching "downloaded" (end of download)
      if (s.type === 'downloaded') {
        triggerConfetti()
      }
      i++
      debugTimerRef.current = setTimeout(next, s.type === 'downloading' ? 600 : 1200)
    }
    next()
  }

  useEffect(() => {
    return () => {
      if (debugTimerRef.current) clearTimeout(debugTimerRef.current)
    }
  }, [])

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

  // The REAL update flow. startDebugSequence() below simulates the same statuses,
  // and the two have to stay in step — the confetti used to be fired from the
  // simulation only, so it played on every dev test and never once after an actual
  // update.
  useEffect(() => {
    const unsubscribe = window.electronAPI.updater.onStatus((newStatus) => {
      // Only the TRANSITION into 'downloaded' celebrates. A manual re-check while an
      // update is already downloaded makes electron-updater re-emit the event, and
      // that is not a download finishing.
      const isFirstDownloaded = newStatus.type === 'downloaded' && lastStatusTypeRef.current !== 'downloaded'
      lastStatusTypeRef.current = newStatus.type

      setStatus(newStatus)
      if (isFirstDownloaded) triggerConfetti()

      // Show overlay for active states
      if (
        newStatus.type === 'checking' ||
        newStatus.type === 'available' ||
        newStatus.type === 'downloading' ||
        newStatus.type === 'downloaded'
      ) {
        setVisible(true)
      }

      // Hide overlay for terminal states
      if (newStatus.type === 'not-available') {
        // Small delay before hiding
        setTimeout(() => setVisible(false), 500)
      }

      if (newStatus.type === 'error') {
        // Install errors stay visible (user needs to restart manually)
        // Other errors auto-hide after 3 seconds
        if (newStatus.phase !== 'install') {
          setTimeout(() => setVisible(false), 3000)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [triggerConfetti])

  if (!visible || !status) {
    return (
      <>
        {/* Dev-only debug menu. Its button labels are deliberately NOT in the
            catalogue: `import.meta.env.DEV` strips the whole block from a
            production build, so no user ever reads them. The toasts it fires ARE
            translated — those are the real ones, simulated. */}
        {import.meta.env.DEV && (
          <div ref={debugMenuRef} className="fixed bottom-3 right-3 z-[200]">
            {debugMenuOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-52 py-1 rounded-lg bg-bg-secondary border border-border/50 shadow-xl animate-fade-in">
                <button
                  onClick={startDebugSequence}
                  disabled={debugRunning}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors disabled:opacity-40"
                >
                  <Play className="w-3.5 h-3.5" />
                  Auto update steps
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

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] animate-fade-in">
      {showConfetti && (
        <canvas ref={confettiRef} className="absolute inset-0 w-full h-full pointer-events-none z-[101]" />
      )}
      <div className={`bg-bg-secondary/90 border border-border/50 rounded-2xl shadow-2xl w-80 py-10 flex items-center justify-center ${showConfetti ? 'animate-tada' : ''}`}>
        <div className="flex flex-col items-center gap-5 px-10">
          {/* Icon */}
          <div className="w-16 h-16 flex items-center justify-center">
            {status.type === 'checking' && (
              <Loader2 className="w-12 h-12 text-[#393BFF] animate-spin" />
            )}
            {(status.type === 'available' || status.type === 'downloading') && (
              <Download className="w-12 h-12 text-[#393BFF]" />
            )}
            {status.type === 'downloaded' && (
              <CheckCircle className="w-12 h-12 text-[#393BFF]" />
            )}
          </div>

          {/* Status Text */}
          <div className="text-center">
            {status.type === 'checking' && (
              <p className="text-text-secondary text-lg">{t('update.checking')}</p>
            )}
            {status.type === 'available' && (
              <p className="text-ink text-lg">
                Update available: <span className="text-[#393BFF] font-semibold">v{status.version}</span>
              </p>
            )}
            {status.type === 'downloading' && (
              <>
                <p className="text-ink text-lg mb-4">{t('update.downloading')}</p>
                {/* Progress bar */}
                <div className="w-64 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#393BFF] transition-all duration-300 ease-out"
                    style={{ width: `${status.progress}%` }}
                  />
                </div>
                <p className="text-text-secondary text-sm mt-2">{Math.round(status.progress)}%</p>
              </>
            )}
            {status.type === 'downloaded' && (
              <>
                <p className="text-[#393BFF] text-lg mb-4">{t('update.ready')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setVisible(false)
                      setShowConfetti(false)
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-ink border border-border/50 hover:border-border transition-colors"
                  >
                    {t('app.later')}
                  </button>
                  <button
                    onClick={() => window.electronAPI.updater.install()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink bg-[#393BFF] hover:bg-[#393BFF]/80 transition-colors"
                  >
                    {t('update.restartNow')}
                  </button>
                </div>
              </>
            )}
            {status.type === 'error' && (
              <p className="text-red text-sm">
                {status.phase === 'install'
                  ? 'Update downloaded but restart failed. Please quit and reopen the app.'
                  : t('update.checkFailed')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
