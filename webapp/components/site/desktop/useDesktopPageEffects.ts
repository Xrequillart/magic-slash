'use client'

import { useEffect } from 'react'

/**
 * The two behaviours the Desktop App page adds on top of its markup, ported from the
 * inline script at the end of `docs/desktop.html`.
 *
 * 1. Each feature section gets `visible` while it is on screen and loses it again when
 *    it leaves — the stylesheet animates its mockup in from that class. Note it is a
 *    toggle, not a one-shot: the animation replays every time you scroll back.
 * 2. The Quick Launch section types a command into its fake Spotlight bar, loops, and
 *    only runs while that section is actually visible.
 */

/** What the fake command palette types. */
const SPOTLIGHT_TEXT = '/magic:start PROJ-123'

/** Sections whose mockups animate in. Order is the page's. */
const ANIMATED_SECTIONS = [
  '.dsk-split',
  '.dsk-tracking',
  '.dsk-context',
  '.dsk-runner',
  '.dsk-quicklaunch',
  '.dsk-keyboard',
  '.dsk-notifs',
  '.dsk-budget',
  '.dsk-history',
  '.dsk-updates',
]

export function useDesktopPageEffects() {
  useEffect(() => {
    const observers: IntersectionObserver[] = []

    for (const selector of ANIMATED_SECTIONS) {
      const section = document.querySelector(selector)
      if (!section) continue
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) entry.target.classList.toggle('visible', entry.isIntersecting)
        },
        { threshold: 0.3 },
      )
      observer.observe(section)
      observers.push(observer)
    }

    return () => observers.forEach((observer) => observer.disconnect())
  }, [])

  useEffect(() => {
    const target = document.getElementById('spotlight-typed')
    const section = document.querySelector('.dsk-quicklaunch')
    if (!target || !section) return

    const hint = section.querySelector('.dsk-spotlight-hint')
    let index = 0
    let typeTimer: ReturnType<typeof setTimeout> | null = null
    let pauseTimer: ReturnType<typeof setTimeout> | null = null

    const type = () => {
      if (index <= SPOTLIGHT_TEXT.length) {
        target.textContent = SPOTLIGHT_TEXT.slice(0, index)
        if (index === 1) hint?.classList.add('visible')
        index += 1
        // Jittered so it reads as typing rather than as a marquee.
        typeTimer = setTimeout(type, 60 + Math.random() * 60)
      } else {
        pauseTimer = setTimeout(reset, 2400)
      }
    }

    const reset = () => {
      index = 0
      target.textContent = ''
      hint?.classList.remove('visible')
      pauseTimer = setTimeout(type, 800)
    }

    const stop = () => {
      if (typeTimer) clearTimeout(typeTimer)
      if (pauseTimer) clearTimeout(pauseTimer)
      typeTimer = null
      pauseTimer = null
      index = 0
      target.textContent = ''
      hint?.classList.remove('visible')
    }

    // Only type while the section is on screen: off screen it is invisible work, and
    // restarting on re-entry means it is always caught from the beginning.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          stop()
          if (entry.isIntersecting) pauseTimer = setTimeout(type, 500)
        }
      },
      { threshold: 0.3 },
    )
    observer.observe(section)

    return () => {
      observer.disconnect()
      stop()
    }
  }, [])
}
