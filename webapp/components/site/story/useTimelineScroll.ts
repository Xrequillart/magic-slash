'use client'

import { useEffect } from 'react'

/**
 * The Story page's horizontal timeline: scrolling DOWN moves the timeline SIDEWAYS.
 *
 * The trick is that the container is made taller than the viewport by exactly as much
 * as the timeline overflows horizontally, so vertical scroll distance maps 1:1 onto
 * horizontal travel. The container's height therefore has to be recomputed whenever
 * the viewport or the content changes width.
 *
 * Ported from the inline script at the end of `docs/story.html`. Two things it did not
 * have: a `ResizeObserver`, because the original's `load` handler was its only defence
 * against the timeline measuring differently once fonts and images had settled — which
 * is a race — and a teardown, which a component needs and a page script does not.
 */

/** Half the dot's width, so a dot lights up when the bar reaches its CENTRE. */
const DOT_CENTRE_OFFSET = 13

export function useTimelineScroll() {
  useEffect(() => {
    const container = document.querySelector<HTMLElement>('.story-timeline-scroll-container')
    const timeline = document.querySelector<HTMLElement>('.story-timeline')
    if (!container || !timeline) return

    const items = Array.from(timeline.querySelectorAll<HTMLElement>('.story-tl-item'))
    const dots = Array.from(timeline.querySelectorAll<HTMLElement>('.story-tl-dot'))

    const resize = () => {
      const overflow = Math.max(0, timeline.offsetWidth - window.innerWidth)
      container.style.height = `${window.innerHeight + overflow}px`
    }

    const onScroll = () => {
      const overflow = timeline.offsetWidth - window.innerWidth
      if (overflow <= 0) return

      const scrollable = container.offsetHeight - window.innerHeight
      if (scrollable <= 0) return

      const progress = Math.max(0, Math.min(1, -container.getBoundingClientRect().top / scrollable))
      const travelled = progress * overflow
      timeline.style.transform = `translateX(${-travelled}px)`

      // The progress bar's leading edge stays at the middle of the viewport, so it
      // reads as "how far along the story you are" rather than as a scrollbar.
      const barReach = window.innerWidth / 2 + travelled
      timeline.style.setProperty(
        '--tl-bar',
        String(Math.max(0, Math.min(1, barReach / timeline.offsetWidth))),
      )

      items.forEach((item, i) => {
        dots[i]?.classList.toggle('active', item.offsetLeft + DOT_CENTRE_OFFSET <= barReach)
      })
    }

    const update = () => {
      resize()
      onScroll()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    // Fonts and images landing after hydration change the timeline's width, and with
    // it how tall the container must be. Watching it beats guessing when that settles.
    const observer = new ResizeObserver(update)
    observer.observe(timeline)

    update()

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [])
}
