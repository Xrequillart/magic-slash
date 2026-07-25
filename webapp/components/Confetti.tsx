'use client'

import { useEffect, useRef } from 'react'

/**
 * A one-shot confetti burst on a full-screen canvas. Bumping `fireKey` fires it;
 * the animation stops on its own once every piece has fallen past the fold, so
 * there is no idle render loop between bursts.
 *
 * Hand-rolled rather than pulled from a package: the webapp keeps a very small
 * dependency list, and a burst is a couple of dozen lines of physics.
 */

const COLORS = ['#393BFF', '#6366f1', '#a855f7', '#22c55e', '#eab308']
const COUNT = 90
const GRAVITY = 0.32
const DRAG = 0.988

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rot: number
  vr: number
  color: string
}

export function Confetti({ fireKey }: { fireKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    // fireKey starts at 0 — nothing has been completed yet.
    if (fireKey <= 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const width = window.innerWidth
    const height = window.innerHeight
    const dpr = window.devicePixelRatio || 1
    // Assigning width/height resets the transform, so scale after, exactly once.
    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const originX = width / 2
    const originY = height * 0.34

    const pieces: Piece[] = Array.from({ length: COUNT }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 7
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        // Biased upward so the burst rises before gravity takes over.
        vy: Math.sin(angle) * speed - 4,
        w: 6 + Math.random() * 5,
        h: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      }
    })

    const tick = () => {
      ctx.clearRect(0, 0, width, height)
      let onScreen = 0

      for (const p of pieces) {
        p.vx *= DRAG
        p.vy = p.vy * DRAG + GRAVITY
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr

        if (p.y > height + 20) continue
        onScreen++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }

      frameRef.current = onScreen > 0 ? requestAnimationFrame(tick) : null
    }

    frameRef.current = requestAnimationFrame(tick)

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
      ctx.clearRect(0, 0, width, height)
    }
  }, [fireKey])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />
}
