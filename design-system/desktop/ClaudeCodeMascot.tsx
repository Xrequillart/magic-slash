import { useEffect, useId, useInsertionEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { CLAUDE_CORAL } from './brand'

/**
 * CLAUDE CODE'S PIXEL ROBOT, ALIVE: the empty chat's mark, which every few seconds waves,
 * hops, dances, says hello or dozes off in a pixel speech bubble, picked at random.
 *
 * The same drawing as `brand.tsx`'s `ClaudeCode`, on the same 16-unit grid, but with its
 * arms drawn apart from the body so they can be raised. Kept a separate component rather
 * than a prop on the mark, because the mark is an `IconComponent` drawn in rows of icons,
 * and none of them should start moving.
 *
 * MOTION IS ITS WHOLE POINT, so under `prefers-reduced-motion` it is simply the mark: no
 * timer is scheduled and nothing moves.
 *
 * WHAT IT DOES NOT KNOW: the language. The hello bubble's word arrives translated; the
 * snore is the same in every language.
 */

export interface ClaudeCodeMascotProps {
  /** What the bubble says when the robot says hello: "Hello!", "Bonjour !". */
  greeting: string
  className?: string
  style?: CSSProperties
}

type Move = 'wave' | 'hop' | 'hello' | 'dance' | 'sleep'

const MOVES: Move[] = ['wave', 'hop', 'hello', 'dance', 'sleep']

/** How long each move runs, so the next one never starts on top of it. */
const MOVE_MS: Record<Move, number> = { wave: 1600, hop: 900, hello: 2600, dance: 2000, sleep: 3600 }

/** Time between two moves. */
const EVERY_MS = 5000

const SNORE = 'zZzZzz'

const STYLE_ID = 'ds-claude-code-mascot-styles'

/**
 * The keyframes, put in the document once: `UpdateSplash`'s arrangement, for its reasons.
 * The wave, the dance and the bubbles step from frame to frame instead of easing, as
 * pixels do; the hop and the sleeping breath ease, because a jump that teleports reads as
 * a glitch.
 */
const MASCOT_CSS = `
@keyframes ds-ccm-hop {
  0%   { transform: none }
  18%  { transform: scale(1.12, .84) }
  50%  { transform: translateY(-28%) scale(.94, 1.08) }
  80%  { transform: scale(1.1, .88) }
  100% { transform: none }
}
@keyframes ds-ccm-dance {
  0%   { transform: translate(-7%, 0) }
  25%  { transform: translate(0, -7%) }
  50%  { transform: translate(7%, 0) }
  75%  { transform: translate(0, -7%) }
}
@keyframes ds-ccm-breathe {
  0%, 100% { transform: none }
  50% { transform: scale(1.03, .95) }
}
@keyframes ds-ccm-first-half {
  0% { opacity: 1 }
  50%, 100% { opacity: 0 }
}
@keyframes ds-ccm-second-half {
  0% { opacity: 0 }
  50%, 100% { opacity: 1 }
}
@keyframes ds-ccm-blink {
  0%, 40%, 60%, 100% { transform: none }
  50% { transform: scaleY(.15) }
}
@keyframes ds-ccm-bubble {
  0%   { opacity: 0; transform: scale(.4) }
  8%   { opacity: 1; transform: scale(1.1) }
  14%, 88% { opacity: 1; transform: none }
  100% { opacity: 0; transform: none }
}
@keyframes ds-ccm-type {
  from { width: 0 }
  to   { width: ${SNORE.length}ch }
}
.ds-ccm-body { transform-origin: 50% 100% }
.ds-ccm-up { display: none }
.ds-ccm-eye { transform-box: fill-box; transform-origin: 50% 50% }
.ds-ccm-bubble { transform-origin: 0% 100% }

.ds-ccm[data-move="hop"] .ds-ccm-body { animation: ds-ccm-hop .9s cubic-bezier(.3, 0, .2, 1) both }

.ds-ccm[data-move="wave"] .ds-ccm-r-rest,
.ds-ccm[data-move="hello"] .ds-ccm-r-rest { display: none }
.ds-ccm[data-move="wave"] .ds-ccm-r-a, .ds-ccm[data-move="wave"] .ds-ccm-r-b,
.ds-ccm[data-move="hello"] .ds-ccm-r-a, .ds-ccm[data-move="hello"] .ds-ccm-r-b { display: inline }
.ds-ccm[data-move="wave"] .ds-ccm-r-a { animation: ds-ccm-first-half .4s steps(1) 4 both }
.ds-ccm[data-move="wave"] .ds-ccm-r-b { animation: ds-ccm-second-half .4s steps(1) 4 both }
.ds-ccm[data-move="hello"] .ds-ccm-r-a { animation: ds-ccm-first-half .4s steps(1) 6 both }
.ds-ccm[data-move="hello"] .ds-ccm-r-b { animation: ds-ccm-second-half .4s steps(1) 6 both }
.ds-ccm[data-move="hello"] .ds-ccm-eye { animation: ds-ccm-blink .5s steps(1) .9s both }
.ds-ccm[data-move="hello"] .ds-ccm-bubble { animation: ds-ccm-bubble 2.6s steps(12) both }

.ds-ccm[data-move="dance"] .ds-ccm-body { animation: ds-ccm-dance .5s steps(1) 4 }
.ds-ccm[data-move="dance"] .ds-ccm-r-a, .ds-ccm[data-move="dance"] .ds-ccm-l-a { display: inline }
.ds-ccm[data-move="dance"] .ds-ccm-r-a,
.ds-ccm[data-move="dance"] .ds-ccm-l-rest { animation: ds-ccm-first-half .5s steps(1) 4 both }
.ds-ccm[data-move="dance"] .ds-ccm-l-a,
.ds-ccm[data-move="dance"] .ds-ccm-r-rest { animation: ds-ccm-second-half .5s steps(1) 4 both }

.ds-ccm[data-move="sleep"] .ds-ccm-body { animation: ds-ccm-breathe 1.2s ease-in-out 3 }
.ds-ccm[data-move="sleep"] .ds-ccm-eye { transform: scaleY(.15) }
.ds-ccm[data-move="sleep"] .ds-ccm-bubble { animation: ds-ccm-bubble 3.6s steps(16) both }
.ds-ccm[data-move="sleep"] .ds-ccm-snore { animation: ds-ccm-type 1.6s steps(${SNORE.length}) 2 both }
`

function useMascotStyles() {
  useInsertionEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = MASCOT_CSS
    document.head.appendChild(style)
  }, [])
}

/**
 * The move playing now, or `null` between two. A new one every `EVERY_MS`, never the same
 * twice in a row, so a handful of moves still read as random rather than as a loop.
 */
function useMove(): Move | null {
  const [move, setMove] = useState<Move | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let last: Move | null = null
    let clear: ReturnType<typeof setTimeout> | undefined
    const tick = setInterval(() => {
      const choices = MOVES.filter((m) => m !== last)
      const next = choices[Math.floor(Math.random() * choices.length)]
      last = next
      setMove(next)
      clear = setTimeout(() => setMove(null), MOVE_MS[next])
    }, EVERY_MS)
    return () => {
      clearInterval(tick)
      clearTimeout(clear)
    }
  }, [])

  return move
}

/** A pixel speech bubble, up and to the right of the robot, with a two-pixel tail. */
function Bubble({ children }: { children: ReactNode }) {
  return (
    <div className="ds-ccm-bubble absolute bottom-[82%] left-[88%] whitespace-nowrap">
      <div
        className="bg-bg-secondary px-2 py-1 font-mono text-xs font-bold leading-none text-ink"
        style={{ boxShadow: `0 -2px 0 0 ${CLAUDE_CORAL}, 0 2px 0 0 ${CLAUDE_CORAL}, -2px 0 0 0 ${CLAUDE_CORAL}, 2px 0 0 0 ${CLAUDE_CORAL}` }}
      >
        {children}
      </div>
      <div className="ml-1 mt-[2px] h-[4px] w-[4px]" style={{ background: CLAUDE_CORAL }} />
      <div className="h-[4px] w-[4px]" style={{ background: CLAUDE_CORAL }} />
    </div>
  )
}

export function ClaudeCodeMascot({ greeting, className, style }: ClaudeCodeMascotProps) {
  useMascotStyles()
  const move = useMove()
  const maskId = useId()

  return (
    <div className={`ds-ccm relative ${className ?? ''}`} style={{ color: CLAUDE_CORAL, ...style }} data-move={move ?? undefined}>
      <svg viewBox="0 0 16 16" className="ds-ccm-body h-full w-full overflow-visible" shapeRendering="crispEdges" aria-hidden="true">
        <mask id={maskId}>
          <g fill="#fff">
            <rect x="2" y="3.25" width="12" height="8" />
            <rect x="3" y="11.25" width="1" height="2" />
            <rect x="5" y="11.25" width="1" height="2" />
            <rect x="10" y="11.25" width="1" height="2" />
            <rect x="12" y="11.25" width="1" height="2" />
          </g>
          <g fill="#000">
            <rect className="ds-ccm-eye" x="4" y="5.4" width="1" height="1.9" />
            <rect className="ds-ccm-eye" x="11" y="5.4" width="1" height="1.9" />
          </g>
        </mask>
        <rect width="16" height="16" fill="currentColor" mask={`url(#${maskId})`} />
        <g fill="currentColor">
          {/* Each arm at rest, where the mark has them. */}
          <rect className="ds-ccm-l-rest" x="0" y="7.25" width="2" height="2" />
          <rect className="ds-ccm-r-rest" x="14" y="7.25" width="2" height="2" />
          {/* Raised, hand up. The right one has a second frame, hand out, for the wave. */}
          <g className="ds-ccm-up ds-ccm-l-a">
            <rect x="0" y="5.25" width="2" height="2" />
            <rect x="0" y="2.25" width="1" height="3" />
          </g>
          <g className="ds-ccm-up ds-ccm-r-a">
            <rect x="14" y="5.25" width="2" height="2" />
            <rect x="15" y="2.25" width="1" height="3" />
          </g>
          <g className="ds-ccm-up ds-ccm-r-b">
            <rect x="14" y="5.25" width="2" height="2" />
            <rect x="16" y="3.25" width="1" height="2" />
          </g>
        </g>
      </svg>

      {move === 'hello' && <Bubble>{greeting}</Bubble>}
      {/* Typed out letter by letter, so the snore grows like one. Its width is reserved
          up front, so the bubble does not grow with it. */}
      {move === 'sleep' && (
        <Bubble>
          <span className="inline-block" style={{ width: `${SNORE.length}ch` }}>
            <span className="ds-ccm-snore inline-block overflow-hidden align-bottom">{SNORE}</span>
          </span>
        </Bubble>
      )}
    </div>
  )
}
