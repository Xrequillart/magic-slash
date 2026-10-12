import { useEffect, useState, type RefObject } from 'react'
import { continueRender, delayRender } from 'remotion'
import { WINDOW } from '../app/AppWindow'
import { at, progress } from './timeline'

/**
 * WHAT TO LOOK AT. A note dims the window around one element (the spotlight) and hangs a
 * bubble beside it saying what it is. Its target is found in the live DOM every frame,
 * so a note follows its element wherever the layout puts it:
 *  - a CSS selector: `.film-spec`, `.react-flow__node[data-id="pr"]`
 *  - `text:…`, the smallest element whose text contains it
 */
export interface Note {
  from: number
  to: number
  target: string
  text: string
  side: 'left' | 'right' | 'top' | 'bottom'
  /** Dim the rest of the window. On by default. */
  spot?: boolean
}

export const NOTES: Note[] = [
  { from: at('plan', 80), to: at('plan', 126), target: 'textarea', text: 'You type the idea', side: 'top', spot: false },
  { from: at('plan', 226), to: at('plan', 360), target: '.film-spec', text: 'Claude writes the spec. You review it.', side: 'left' },
  { from: at('tickets', 64), to: at('tickets', 150), target: 'text:Create epic PAY-310', text: 'Filed in Jira for you', side: 'bottom' },
  { from: at('tickets', 205), to: at('tickets', 256), target: '.film-board', text: 'Your sprint board, up to date', side: 'bottom', spot: false },
  { from: at('start', 51), to: at('start', 126), target: '.film-card-PAY-312', text: 'Pick a ticket', side: 'right' },
  { from: at('start', 195), to: at('start', 270), target: '.film-branch', text: 'Its own branch and worktree', side: 'left' },
  { from: at('start', 273), to: at('start', 336), target: 'text:Implementation plan', text: 'A plan, risks included', side: 'right', spot: false },
  { from: at('start', 342), to: at('start', 465), target: '.film-changes', text: 'Every change, tracked', side: 'left' },
  { from: at('commit', 82), to: at('commit', 176), target: '.film-commits', text: 'One commit per change, conventional', side: 'left' },
  { from: at('workflow', 60), to: at('workflow', 116), target: '.react-flow__node[data-id="commit"]', text: 'Every skill is a step', side: 'bottom', spot: false },
  { from: at('workflow', 122), to: at('workflow', 170), target: '.react-flow__node[data-id="pr"]', text: 'Blue links chain on their own', side: 'bottom', spot: false },
  { from: at('workflow', 214), to: at('workflow', 244), target: '[role="menu"]', text: 'Your skills, your repository’s, plugins', side: 'right', spot: false },
  { from: at('workflow', 300), to: at('workflow', 346), target: '.react-flow__node[data-id="custom:security"]', text: 'Your own skill, as a step', side: 'bottom', spot: false },
  { from: at('workflow', 424), to: at('workflow', 476), target: '.react-flow__node[data-id="action:slack"]', text: 'Post on Slack when the PR opens', side: 'top', spot: false },
  { from: at('ship', 50), to: at('ship', 112), target: 'text:Your workflow runs', text: 'Chained by your workflow. No command typed.', side: 'bottom', spot: false },
  { from: at('ship', 176), to: at('ship', 236), target: 'text:#dev · PR #128', text: 'Slack, posted for you', side: 'bottom' },
  { from: at('ship', 244), to: at('ship', 326), target: '.film-pr', text: 'CI watched live', side: 'left' },
  { from: at('resolve', 64), to: at('resolve', 146), target: '.film-pr', text: 'Changes requested: every comment, in the app', side: 'left' },
  { from: at('resolve', 240), to: at('resolve', 300), target: 'text:src/api/invoices.ts', text: 'Claude fixes what the review asked', side: 'right', spot: false },
  { from: at('resolve', 344), to: at('resolve', 414), target: '.film-pr', text: 'Threads resolved, review requested', side: 'left' },
  { from: at('close', 40), to: at('close', 122), target: '.film-pr', text: 'Approved, then merged', side: 'left' },
  { from: at('close', 238), to: at('close', 296), target: '.film-card-PAY-312', text: 'Done. Next ticket?', side: 'left', spot: false },
]

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

export function find(root: HTMLElement, target: string): HTMLElement | null {
  // `scope >> text:…` looks for the text inside the first match of `scope` only.
  const scoped = target.split(' >> ')
  if (scoped.length === 2) {
    const scope = root.querySelector<HTMLElement>(scoped[0])
    return scope ? find(scope, scoped[1]) : null
  }
  if (!target.startsWith('text:')) return root.querySelector<HTMLElement>(target)
  const text = target.slice(5)
  let best: HTMLElement | null = null
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    const content = el.textContent ?? ''
    if (!content.includes(text)) return
    if (!best || content.length <= (best.textContent ?? '').length) best = el
  })
  return best
}

/**
 * An element's box in the window's own coordinates, through every 2D transform in
 * between (the board's slide, React Flow's pan and zoom) and every scrolled container,
 * but not the camera's 3D: the window root is where the walk stops.
 */
export function boxIn(root: HTMLElement, el: HTMLElement): Box {
  // Walk every ancestor, not only the offsetParent chain: React Flow pans and zooms a
  // viewport that is not positioned, and its transform has to be applied all the same.
  let m = new DOMMatrix()
  let node: HTMLElement = el
  while (node !== root) {
    const style = getComputedStyle(node)
    if (style.transform !== 'none') {
      const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat)
      m = new DOMMatrix().translate(ox, oy).multiply(new DOMMatrix(style.transform)).translate(-ox, -oy).multiply(m)
    }
    const parent = node.parentElement
    if (!parent) break
    // Both offsets are layout positions; when the parent is not the offsetParent they
    // share one, so their difference is the distance between the two.
    const ownParent = node.offsetParent === parent
    const dx = (ownParent ? node.offsetLeft + parent.clientLeft : node.offsetLeft - parent.offsetLeft) - parent.scrollLeft
    const dy = (ownParent ? node.offsetTop + parent.clientTop : node.offsetTop - parent.offsetTop) - parent.scrollTop
    m = new DOMMatrix().translate(dx, dy).multiply(m)
    node = parent
  }
  const corners = [
    m.transformPoint(new DOMPoint(0, 0)),
    m.transformPoint(new DOMPoint(el.offsetWidth, el.offsetHeight)),
  ]
  return {
    x: Math.min(corners[0].x, corners[1].x),
    y: Math.min(corners[0].y, corners[1].y),
    w: Math.abs(corners[1].x - corners[0].x),
    h: Math.abs(corners[1].y - corners[0].y),
  }
}

/**
 * The notes on screen at `frame`, each with its target's box once measured.
 *
 * Measured after the frame has settled, not in a layout effect: React Flow applies its
 * fit-to-view in an effect of its own, after ours would run, and a box read before it is
 * a box in a viewport nobody sees. So the frame is held (delayRender) for two animation
 * frames, measured, and released once the bubbles have been placed.
 */
export function useNotes(root: RefObject<HTMLElement>, frame: number) {
  const live = NOTES.filter((n) => frame >= n.from && frame < n.to)
  const boxes = useBoxes(root, frame, live.map((n) => n.target))
  return live.map((note) => ({ note, box: boxes[note.target] ?? null }))
}

/**
 * The boxes of `targets` in `root`'s own coordinates, read once the frame has settled.
 * `before` runs first, inside the same hold, for anything that has to happen to the
 * page before it is measured (a click on a menu row).
 */
export function useBoxes(root: RefObject<HTMLElement>, frame: number, targets: string[], before?: () => boolean) {
  const [boxes, setBoxes] = useState<Record<string, Box | null>>({})
  const key = targets.join('|')
  useEffect(() => {
    if (targets.length === 0 && !before) return
    const handle = delayRender('Measuring the noted elements')
    let raf = 0
    const measure = () => {
      const next: Record<string, Box | null> = {}
      if (root.current) {
        for (const target of targets) {
          const el = find(root.current, target)
          next[target] = el ? boxIn(root.current, el) : null
        }
      }
      setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
      return next
    }
    // Measured twice: what is drawn from the first boxes (a menu pinned to a button)
    // can move what the second has to find. Released once the two agree.
    const measureUntilStill = (previous: string, tries: number) => {
      const now = JSON.stringify(measure())
      if (now === previous || tries === 0) {
        raf = requestAnimationFrame(() => continueRender(handle))
        return
      }
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => measureUntilStill(now, tries - 1))
      })
    }
    const settle = (n: number) => {
      raf = requestAnimationFrame(() => {
        // Something changed the page: give it the frames it needs before measuring.
        if (before?.()) return settle(3)
        if (n > 1) return settle(n - 1)
        measureUntilStill('', 3)
      })
    }
    settle(2)
    return () => {
      cancelAnimationFrame(raf)
      continueRender(handle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, key])
  return boxes
}

const fade = (frame: number, note: Note) => progress(frame, note.from, note.from + 10) * (1 - progress(frame, note.to - 10, note.to))

/** Dims the window around the noted element. Lives inside the window, over everything. */
export function Spotlight({ frame, notes }: { frame: number; notes: ReturnType<typeof useNotes> }) {
  return (
    <>
      {notes.map(({ note, box }) => {
        if (!box || note.spot === false) return null
        const o = fade(frame, note)
        const pad = 6
        return (
          <div
            key={note.target + note.from}
            style={{
              position: 'absolute',
              left: box.x - pad,
              top: box.y - pad,
              width: box.w + pad * 2,
              height: box.h + pad * 2,
              borderRadius: 14,
              boxShadow: `0 0 0 4000px rgba(2, 6, 16, ${0.55 * o}), 0 0 0 2px rgba(0, 122, 252, ${0.9 * o}), 0 0 40px rgba(0, 122, 252, ${0.35 * o})`,
              zIndex: 60,
              pointerEvents: 'none',
            }}
          />
        )
      })}
    </>
  )
}

/**
 * The bubbles, in the camera's 3D space just in front of the window (the window clips,
 * which would flatten them), so they keep a little depth whatever the angle.
 */
export function Bubbles({ frame, notes }: { frame: number; notes: ReturnType<typeof useNotes> }) {
  return (
    <>
      {notes.map(({ note, box }) => {
        if (!box) return null
        const o = fade(frame, note)
        const gap = 34
        const cx = box.x + box.w / 2 - WINDOW.width / 2
        const cy = box.y + box.h / 2 - WINDOW.height / 2
        const left = box.x - WINDOW.width / 2
        const top = box.y - WINDOW.height / 2
        const anchor = {
          left: { x: left - gap, y: cy, tx: '-100%', ty: '-50%', dot: { x: left, y: cy } },
          right: { x: left + box.w + gap, y: cy, tx: '0%', ty: '-50%', dot: { x: left + box.w, y: cy } },
          top: { x: cx, y: top - gap, tx: '-50%', ty: '-100%', dot: { x: cx, y: top } },
          bottom: { x: cx, y: top + box.h + gap, tx: '-50%', ty: '0%', dot: { x: cx, y: top + box.h } },
        }[note.side]
        const lift = (1 - o) * 14
        return (
          <div key={note.target + note.from} style={{ position: 'absolute', left: 0, top: 0, transform: 'translateZ(70px)', opacity: o }}>
            {/* The leader, from the bubble to the element. */}
            <svg
              style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
              width={1}
              height={1}
            >
              <line x1={anchor.dot.x} y1={anchor.dot.y} x2={anchor.x} y2={anchor.y} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={anchor.dot.x} cy={anchor.dot.y} r={6} fill="#007AFC" stroke="#fff" strokeWidth={3} />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: anchor.x,
                top: anchor.y,
                transform: `translate(${anchor.tx}, ${anchor.ty}) translateY(${lift}px)`,
                whiteSpace: 'nowrap',
                fontFamily: 'Cera Pro',
                fontSize: 24,
                fontWeight: 700,
                color: '#0A0A0B',
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '12px 20px',
                boxShadow: '0 20px 50px -12px rgba(5, 12, 30, 0.5), 0 0 0 1px rgba(10, 10, 11, 0.06)',
              }}
            >
              {note.text}
            </div>
          </div>
        )
      })}
    </>
  )
}
