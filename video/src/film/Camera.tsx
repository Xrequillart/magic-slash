import type { ReactNode } from 'react'
import { Easing, getInputProps, interpolate } from 'remotion'
import { at, type ChapterId } from './timeline'

/** Where the window sits in space at a given frame. Angles in degrees, x/y/z in px. */
interface Shot {
  f: number
  x: number
  y: number
  z: number
  rx: number
  ry: number
  rz: number
  s: number
}

/** A shot `local` frames into a chapter. */
const shot = (id: ChapterId, local: number, s: Omit<Shot, 'f' | 'z' | 'rz'> & { z?: number; rz?: number }): Shot => ({
  f: at(id, local),
  z: 0,
  rz: 0,
  ...s,
})

const BOARD = { x: 0, y: 70, rx: 18, ry: 0, s: 0.86 }
const PANEL = { x: -310, y: 50, rx: 8, ry: -20, s: 1.12 }
const CHAT = { x: 150, y: 30, rx: 8, ry: -8, s: 1.0 }

const SHOTS: Shot[] = [
  // The hook is type on white: the window waits far behind, then flies in.
  shot('hook', 0, { x: 0, y: 40, z: -1600, rx: 30, ry: 0, s: 0.6 }),
  shot('plan', 54, { x: 0, y: 40, z: -1600, rx: 30, ry: 0, s: 0.6 }),
  shot('plan', 96, { x: 0, y: 50, rx: 10, ry: -8, s: 0.84 }),
  // /magic:plan — the idea typed, then the spec written on the right.
  shot('plan', 124, { x: 120, y: 60, rx: 10, ry: -10, s: 0.92 }),
  shot('plan', 140, { ...CHAT, s: 0.96 }),
  shot('plan', 220, PANEL),
  shot('plan', 360, { ...PANEL, ry: -16, s: 1.06 }),
  // The tickets, filed from the chat, then the board.
  shot('tickets', 0, { x: 120, y: 40, rx: 12, ry: 12, rz: -1, s: 0.95 }),
  shot('tickets', 150, { x: 120, y: 30, rx: 10, ry: 10, s: 0.98 }),
  shot('tickets', 190, BOARD),
  shot('start', 48, { ...BOARD, rx: 16, s: 0.88 }),
  // /magic:start — the click, the branch, the plan, the diffs.
  shot('start', 120, { x: 280, y: 150, rx: 10, ry: 10, s: 1.2 }),
  shot('start', 159, { x: 60, y: 60, rx: 12, ry: -14, rz: 1, s: 0.88 }),
  shot('start', 201, PANEL),
  shot('start', 276, { ...CHAT, x: 200, y: 20, s: 1.02 }),
  shot('start', 426, { ...CHAT, x: 200, y: -40, rx: 10, s: 1.05 }),
  // /magic:commit — the commits in the panel.
  shot('commit', 30, { x: 120, y: 40, rx: 12, ry: 10, s: 0.95 }),
  shot('commit', 80, { ...PANEL, ry: -22, s: 1.15 }),
  shot('commit', 176, { ...PANEL, y: 20, ry: -18 }),
  // The workflow editor, followed beat by beat: the chain, the dock, the new cards.
  shot('workflow', 30, { x: 0, y: 60, rx: 18, ry: 0, s: 0.9 }),
  shot('workflow', 70, { x: 40, y: 40, rx: 10, ry: -6, s: 1.15 }),
  shot('workflow', 176, { x: -40, y: -60, rx: 12, ry: 0, s: 1.15 }),
  shot('workflow', 250, { x: -20, y: 0, rx: 10, ry: 4, s: 1.15 }),
  shot('workflow', 330, { x: 0, y: 30, rx: 10, ry: 6, s: 1.2 }),
  shot('workflow', 360, { x: -40, y: -60, rx: 12, ry: 0, s: 1.12 }),
  shot('workflow', 420, { x: -150, y: 70, rx: 10, ry: -8, s: 1.22 }),
  shot('workflow', 474, { x: 0, y: 60, rx: 14, ry: 0, s: 0.95 }),
  // The workflow at work: the chain from commit to PR, then the CI.
  shot('ship', 30, CHAT),
  shot('ship', 160, { ...CHAT, y: 0, s: 1.05 }),
  shot('ship', 240, { ...PANEL, y: -60, rx: 12 }),
  shot('ship', 326, { ...PANEL, y: -80, rx: 10, ry: -16 }),
  // Changes requested: the PR card, then the fix in the chat, then the answered threads.
  shot('resolve', 40, { ...PANEL, y: -90, rx: 10, ry: -18, s: 1.14 }),
  shot('resolve', 140, { ...PANEL, y: -100, rx: 10, ry: -16, s: 1.14 }),
  shot('resolve', 180, CHAT),
  shot('resolve', 300, { ...CHAT, y: -30, s: 1.04 }),
  shot('resolve', 340, { ...PANEL, y: -100, rx: 10, ry: -16, s: 1.14 }),
  shot('resolve', 410, { ...PANEL, y: -100, rx: 10, ry: -16, s: 1.14 }),
  // Merged, done, and the board once more.
  shot('close', 30, { ...PANEL, y: -100, rx: 10, ry: -16, s: 1.14 }),
  shot('close', 120, { x: 140, y: 40, rx: 12, ry: 14, rz: -2, s: 0.95 }),
  shot('close', 200, { x: 60, y: 60, rx: 14, ry: 6, s: 0.9 }),
  shot('close', 232, BOARD),
  shot('outro', 0, BOARD),
  shot('outro', 50, { x: 0, y: -900, z: -800, rx: -40, ry: 0, s: 0.6 }),
]

const KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 's'] as const

/** `--props='{"flat":true}'` pins the window face-on at scale 1, to read coordinates off a still. */
const FLAT = getInputProps().flat === true

export function shotAt(frame: number) {
  if (FLAT) return { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1 }
  const frames = SHOTS.map((s) => s.f)
  const out = {} as Record<(typeof KEYS)[number], number>
  for (const key of KEYS) {
    out[key] = interpolate(frame, frames, SHOTS.map((s) => s[key]), {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.55, 0, 0.25, 1),
    })
  }
  // A slow drift, so the window never sits dead still between two shots.
  out.rx += Math.sin(frame / 55) * 1.2
  out.ry += Math.cos(frame / 70) * 1.6
  return out
}

/**
 * THE 3D STAGE. Everything inside shares one perspective; `preserve-3d` lets a child
 * lifted with translateZ come off the window toward the viewer.
 */
export function Camera({ frame, children }: { frame: number; children: ReactNode }) {
  const { x, y, z, rx, ry, rz, s } = shotAt(frame)
  return (
    <div style={{ position: 'absolute', inset: 0, perspective: 2200, perspectiveOrigin: '50% 40%' }}>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transformStyle: 'preserve-3d',
          transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
