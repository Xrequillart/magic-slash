'use client'

import { useEffect, type RefObject } from 'react'

/**
 * Nudges a leaning panel towards the cursor.
 *
 * Shared by the two tilted app illustrations (`ParallelSidebar`, `RepoSettings`) because
 * both want the same behaviour and neither wants to own it. It writes only the two
 * OFFSETS, as `--tilt-ry` / `--tilt-rx`; the resting angle is composed in CSS, so each
 * illustration keeps its own lean — and mirrored ones keep it in opposite directions —
 * without this having to know about any of them.
 *
 * Measured against the viewport rather than against the panel, so it answers to the cursor
 * anywhere on the page instead of only on hover. What smooths the follow is the CSS
 * transition on the panel, not a loop here.
 */
export function usePointerTilt(
  ref: RefObject<HTMLElement | null>,
  swingY: number,
  swingX: number,
) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let visible = false
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { visible = e.isIntersecting }),
      { threshold: 0 },
    )
    observer.observe(el)

    // Coalesced into one frame: the panel's centre moves as the page scrolls, so the rect
    // has to be re-read, and reading it per pointer event would mean a layout on every
    // event, interleaved with a style write.
    let pending: { x: number; y: number } | null = null
    let frame = 0
    const clamp = (v: number) => Math.max(-1, Math.min(1, v))

    const apply = () => {
      frame = 0
      if (!pending) return
      const box = el.getBoundingClientRect()
      const dx = clamp((pending.x - (box.left + box.width / 2)) / (window.innerWidth / 2))
      const dy = clamp((pending.y - (box.top + box.height / 2)) / (window.innerHeight / 2))
      el.style.setProperty('--tilt-ry', `${(dx * swingY).toFixed(2)}deg`)
      el.style.setProperty('--tilt-rx', `${(dy * swingX).toFixed(2)}deg`)
    }

    const onMove = (e: PointerEvent) => {
      if (!visible) return
      pending = { x: e.clientX, y: e.clientY }
      if (!frame) frame = requestAnimationFrame(apply)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref, swingY, swingX])
}
