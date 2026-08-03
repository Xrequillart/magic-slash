'use client'

import { useEffect, useRef } from 'react'

/**
 * The sticky command bar on the Skills page.
 *
 * It appears once the hero has scrolled past, highlights whichever skill section the
 * reader is in, and scrolls to a section on click with the offset the fixed header
 * needs. Ported from the inline script at the end of `docs/skills.html`.
 *
 * The active state is a class toggle rather than React state for the same reason as
 * the landing page's flow section: this runs on every scroll frame, and re-rendering
 * seven links to move one class is work for nothing.
 */

/** Each entry is the id of the section it points at; the label is the command itself. */
const SKILLS = ['start', 'continue', 'commit', 'pr', 'review', 'resolve', 'done']

/** How far above a section to stop, so the fixed header does not cover its heading. */
const SCROLL_OFFSET = 140

/** How far the hero's bottom edge must rise before the bar takes over. */
const REVEAL_AT = 130

export function SkillsNav() {
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    const bar = nav.current
    if (!bar) return

    const hero = document.querySelector('.skills-hero')
    const items = Array.from(bar.querySelectorAll<HTMLAnchorElement>('.skills-nav-item'))
    const sections = items
      .map((item) => ({
        item,
        el: document.getElementById(item.getAttribute('href')!.slice(1)),
      }))
      .filter((entry): entry is { item: HTMLAnchorElement; el: HTMLElement } => !!entry.el)

    const onScroll = () => {
      if (hero) {
        bar.classList.toggle('visible', hero.getBoundingClientRect().bottom < REVEAL_AT)
      }

      // The LAST section whose top has passed the reading line is the one being read.
      const readingLine = window.scrollY + 200
      let current: (typeof sections)[number] | null = null
      for (const entry of sections) {
        if (entry.el.offsetTop <= readingLine) current = entry
      }
      for (const { item } of sections) item.classList.remove('active')
      current?.item.classList.add('active')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const jumpTo = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    const target = document.getElementById(id)
    if (target) window.scrollTo({ top: target.offsetTop - SCROLL_OFFSET, behavior: 'smooth' })
  }

  return (
    <nav className="skills-nav" ref={nav}>
      <div className="skills-nav-inner">
        {SKILLS.map((skill, index) => (
          <a
            key={skill}
            href={`#skill-${skill}`}
            className={`skills-nav-item${index === 0 ? ' active' : ''}`}
            onClick={(event) => jumpTo(event, `skill-${skill}`)}
          >
            /{skill}
          </a>
        ))}
      </div>
    </nav>
  )
}
