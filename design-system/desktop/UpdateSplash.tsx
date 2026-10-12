import { useEffect, useInsertionEffect, useRef, useState } from 'react'
import type { AnimationEvent } from 'react'
import { MagicSlash } from './brand'

/**
 * THE APP TELLING YOU IT IS ABOUT TO BECOME A NEWER APP, on the launch splash's ground.
 *
 * The same white window and the same rabbit as the very first frame (`index.html`'s
 * `#splash`), because an update is the app going away and coming back, and that is what
 * the launch already looks like. The rabbit slashes in from the lower left, hops when a
 * release is found, hops again when it is on disk, and dashes off to the upper right if
 * the screen is handed back.
 *
 * IT REPLACED A DIALOG, which had replaced a row in the left sidebar. The dialog held the
 * screen too, but over the app; this takes the window outright. Nothing underneath is
 * worth looking at while the app replaces itself, and a card over it suggested otherwise.
 *
 * COLOURS ARE THE LAUNCH SPLASH'S LITERALS, not the theme's tokens, and on purpose: that
 * splash paints before any theme has loaded, so it is white and black whatever the theme
 * is, and this one has to be the same screen. A dark theme's `text-secondary` on this
 * ground would be unreadable, and its progress track invisible. Which is also why the bar
 * is drawn here rather than borrowed from `ProgressBar`: every colour it has is a token.
 *
 * WHAT IT DOES NOT KNOW: that there is an updater at all. Every line arrives worded and
 * the countdown arrives counted. It knows the stages, and that two of them are worth a hop.
 */

/** Where the update has got to. One per thing the splash can be looking at. */
export type UpdateStage =
  /** Somebody asked; the feed has not answered yet. A spinner and a line. */
  | { type: 'checking' }
  /** It is coming down. `percent` is 0 to 100, clamped here. */
  | { type: 'downloading'; percent: number }
  /** On disk, and the relaunch is counting down. The line carries the count. */
  | { type: 'ready' }
  /** The transfer broke. The release is still there, so this one is retryable. */
  | { type: 'failed' }

export interface UpdateSplashProps {
  stage: UpdateStage
  /**
   * The one line under the rabbit, translated and filled in: "Checking for updates…",
   * "Downloading Magic Slash v0.105.5", "Magic Slash will restart in 4…". The caller's,
   * because every one of them carries a version or a count and a translator's word order.
   */
  label: string
  /**
   * The one button, under the line: Later while the countdown runs, Try again after a
   * failed transfer. Absent at every other stage, where nobody has anything to decide.
   */
  action?: { label: string; onClick: () => void }
  /**
   * The screen is being handed back: the line fades, the rabbit dashes off to the upper
   * right, the ground fades. `onLeft` fires once it is gone, and the caller unmounts.
   */
  leaving?: boolean
  onLeft?: () => void
  /**
   * Fill the nearest positioned ancestor instead of the window. For a drawing of the app
   * inside a page; the app itself never passes it.
   */
  contained?: boolean
}

/** The launch splash's own colours. See the note at the top on why they are literals. */
const ACCENT = '#007afc'
const MUTED = '#8a8a93'

/** How long the entrance takes, so a hop asked for during it waits for the landing. */
const ENTER_MS = 700

const STYLE_ID = 'ds-update-splash-styles'

/**
 * The keyframes, put in the document once — `Loader`'s arrangement, for `Loader`'s
 * reasons: this folder has no CSS file, and a component that carries its own needs no
 * wiring in either app. `splash-hop` and `splash-dash` are `index.html`'s, copied
 * rather than shared because that file paints before any of this code exists.
 */
const SPLASH_CSS = `
@keyframes ds-update-splash-ground {
  from { opacity: 0 }
}
@keyframes ds-update-splash-slash {
  from { transform: translate(-70vw, 60vh) rotate(14deg) scale(.7); filter: blur(4px); opacity: 0 }
  60%  { filter: blur(0); opacity: 1 }
  82%  { transform: translate(2%, -2%) rotate(-3deg) scale(1.04, .94) }
  to   { transform: none; filter: blur(0); opacity: 1 }
}
@keyframes ds-update-splash-hop {
  0%   { transform: none }
  22%  { transform: scale(1.1, .82) }
  55%  { transform: translateY(-26%) scale(.94, 1.08) rotate(-4deg) }
  84%  { transform: scale(1.12, .84) }
  100% { transform: none }
}
@keyframes ds-update-splash-dash {
  0%   { transform: none; filter: blur(0) }
  18%  { transform: translateX(-4%) scale(1.06, .9); filter: blur(0) }
  100% { transform: translate(75vw, -45vh) scale(1.15, .9) rotate(-8deg); filter: blur(3px) }
}
@keyframes ds-update-splash-fade {
  to { opacity: 0 }
}
@keyframes ds-update-splash-spin {
  to { transform: rotate(360deg) }
}
.ds-update-splash { animation: ds-update-splash-ground .25s ease both }
.ds-update-splash .ds-us-enter {
  transform-origin: 50% 100%;
  animation: ds-update-splash-slash ${ENTER_MS}ms cubic-bezier(.2, .8, .25, 1) both;
}
.ds-update-splash .ds-us-hop { transform-origin: 50% 100% }
.ds-update-splash .ds-us-hop[data-hop] { animation: ds-update-splash-hop .95s cubic-bezier(.3, 0, .2, 1) both }
.ds-update-splash .ds-us-spinner { animation: ds-update-splash-spin .8s linear infinite }
.ds-update-splash .ds-us-status { animation: ds-update-splash-ground .3s ease both }
.ds-update-splash[data-leaving] .ds-us-status { animation: ds-update-splash-fade .25s ease forwards }
.ds-update-splash[data-leaving] .ds-us-hop { animation: ds-update-splash-dash .55s .25s cubic-bezier(.5, 0, .75, 0) forwards }
.ds-update-splash[data-leaving] { animation: ds-update-splash-fade .35s .55s ease forwards }
@media (prefers-reduced-motion: reduce) {
  .ds-update-splash .ds-us-enter,
  .ds-update-splash .ds-us-hop[data-hop],
  .ds-update-splash[data-leaving] .ds-us-hop { animation: none }
  .ds-update-splash .ds-us-spinner { animation-duration: 2.4s }
}
`

function useSplashStyles() {
  useInsertionEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = SPLASH_CSS
    document.head.appendChild(style)
  }, [])
}

export function UpdateSplash({ stage, label, action, leaving = false, onLeft, contained = false }: UpdateSplashProps) {
  useSplashStyles()
  const hop = useHop(stage.type)

  // The ground's own fade is the last thing to end, so it is what "gone" means. The
  // rabbit's and the line's animations bubble up here too and are not it.
  const handleAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (leaving && event.target === event.currentTarget) onLeft?.()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label={label}
      data-leaving={leaving || undefined}
      onAnimationEnd={handleAnimationEnd}
      className={`ds-update-splash ${contained ? 'absolute' : 'fixed'} inset-0 z-[150] grid place-items-center overflow-hidden`}
      style={{ background: '#ffffff' }}
    >
      <div className="relative grid justify-items-center">
        <div className="ds-us-enter">
          {/* Keyed on the hop count, so each hop is a fresh element and its animation
              starts over: the same class on the same node would not play twice. */}
          <div
            key={hop.count}
            data-hop={hop.count > 0 || undefined}
            className="ds-us-hop"
            // Not while leaving: an inline delay would beat the dash's own.
            style={leaving ? undefined : { animationDelay: `${hop.delay}ms` }}
          >
            <MagicSlash className="block w-[min(380px,34vw)] h-auto overflow-visible" style={{ color: '#000000' }} />
          </div>
        </div>

        {/* Out of the flow, so the rabbit stays dead centre whatever is under it. */}
        <div className="absolute top-[calc(100%+40px)] flex flex-col items-center gap-3 whitespace-nowrap">
          {/* Keyed on the stage, so each new stage fades in instead of swapping. */}
          <div key={stage.type} className="ds-us-status flex flex-col items-center gap-3">
            {stage.type === 'checking' && <Spinner />}

            <p className="m-0 text-[13px] tabular-nums" style={{ color: MUTED }}>
              {label}
            </p>

            {stage.type === 'downloading' && <Progress percent={stage.percent} label={label} />}

            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="mt-1 px-3 py-1.5 rounded-lg border text-xs transition-colors hover:bg-black/5"
                style={{ borderColor: 'rgba(0, 0, 0, 0.12)', color: '#3a3a40' }}
              >
                {action.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Counts the hops: one each time the splash ENTERS a stage worth celebrating — a release
 * found (the transfer starts) and a release on disk (the countdown starts). Entering, not
 * being in: a download reports its progress fifty times and is one hop.
 *
 * A hop asked for while the rabbit is still slashing in waits for it to land, which is
 * the startup case: the splash appears on a release already found.
 */
function useHop(type: UpdateStage['type']) {
  const mountedAt = useRef(Date.now())
  const lastType = useRef<UpdateStage['type'] | null>(null)
  const [hop, setHop] = useState({ count: 0, delay: 0 })

  useEffect(() => {
    const previous = lastType.current
    lastType.current = type
    if (type === previous || (type !== 'downloading' && type !== 'ready')) return
    const delay = Math.max(0, ENTER_MS - (Date.now() - mountedAt.current))
    setHop((h) => ({ count: h.count + 1, delay }))
  }, [type])

  return hop
}

/** `index.html`'s ring, the same 26px in the same blue. */
function Spinner() {
  return (
    <div
      className="ds-us-spinner w-[26px] h-[26px] rounded-full"
      style={{ border: `3px solid rgba(0, 122, 252, 0.18)`, borderTopColor: ACCENT }}
    />
  )
}

/**
 * The bar with its percentage to its right. The fill eases between readings, which
 * electron-updater sends a few times a second: fast enough to read as motion, slow
 * enough that a bar jumping between them would look like a glitch.
 */
function Progress({ percent, label }: { percent: number; label: string }) {
  const pct = Math.min(100, Math.max(0, percent))
  return (
    // The percentage hangs off the bar's right end, out of the flow, so the bar itself
    // is centred under the line the same way the rabbit is centred above it.
    <div className="relative flex items-center">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="w-[min(260px,40vw)] h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(0, 122, 252, 0.14)' }}
      >
        <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${pct}%`, background: ACCENT }} />
      </div>
      <span className="absolute left-full ml-3 text-xs font-bold tabular-nums" style={{ color: ACCENT }}>
        {`${Math.round(pct)}%`}
      </span>
    </div>
  )
}
