'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Bot, Check, Clock, Sparkles, UserRound, Users } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The illustration for section ④ — the app's agent list, on its own, leaning back.
 *
 * ONE component of the app is drawn here, the left sidebar, because the section is about
 * the list of jobs and nothing else. No titlebar, no terminal, no info panel: a window
 * would put three columns on screen and the eye would go looking for the terminal.
 *
 * It shares the hero mockup's row classes and palette (`marketing.css`) rather than
 * restating them. There is one real sidebar, so the two illustrations must not be able to
 * drift into showing it differently — only the frame around the rows belongs to this file.
 *
 * The lean is a 3D `rotateY`, not a flat rotation: the panel turns in space, so it keeps
 * its footprint instead of pushing a tall narrow box diagonally out of the layout.
 *
 * The blob behind it is `Ellipse 5.svg` from design, inlined rather than served: it is one
 * path with one flat fill, so a file would cost a request to save nothing. Its colour
 * moves to the stylesheet with the rest of them.
 */

/** What the sidebar reports. `waiting` is the state that needs the person, so it is what
 *  the "needs attention" count counts — the two cannot disagree, see `ATTENTION`. */
const AGENTS: { name: string; state: 'working' | 'waiting' | 'done' }[] = [
  { name: 'auth-middleware', state: 'working' },
  { name: 'pricing-copy', state: 'done' },
  { name: 'fix-webhook-retry', state: 'working' },
  { name: 'onboarding-emails', state: 'waiting' },
  { name: 'refactor-billing', state: 'working' },
  { name: 'search-index', state: 'done' },
  { name: 'ci-cache-warmup', state: 'waiting' },
  { name: 'migrate-legacy-api', state: 'done' },
]

const ATTENTION = AGENTS.filter((a) => a.state === 'waiting').length

/** How far the pointer may push the lean, in degrees. Small on purpose — the panel should
 *  feel like it is tracking you, not like it is being steered. */
const SWING_Y = 7
const SWING_X = 4

export function ParallelSidebar() {
  const { t } = useT()
  const root = useRef<HTMLDivElement>(null)

  /**
   * The pointer nudges the lean, in the direction that turns the panel TOWARDS the cursor.
   * Only the two offsets go out, as custom properties; the resting -30° is composed in
   * CSS, so retuning the base angle never means touching this.
   *
   * Measured against the viewport rather than against the panel, so it answers to the
   * cursor anywhere on the page instead of only on hover. The easing that smooths the
   * follow is the CSS transition, not a loop here.
   */
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let visible = false
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { visible = e.isIntersecting }),
      { threshold: 0 },
    )
    observer.observe(el)

    // Coalesced into one frame: the panel's centre moves as the page scrolls, so the rect
    // has to be re-read, and reading it on every pointer event would mean a layout per
    // event interleaved with a style write.
    let pending: { x: number; y: number } | null = null
    let frame = 0
    const clamp = (v: number) => Math.max(-1, Math.min(1, v))

    const apply = () => {
      frame = 0
      if (!pending) return
      const box = el.getBoundingClientRect()
      const dx = clamp((pending.x - (box.left + box.width / 2)) / (window.innerWidth / 2))
      const dy = clamp((pending.y - (box.top + box.height / 2)) / (window.innerHeight / 2))
      el.style.setProperty('--pj-ry', `${(dx * SWING_Y).toFixed(2)}deg`)
      el.style.setProperty('--pj-rx', `${(dy * SWING_X).toFixed(2)}deg`)
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
  }, [])

  const I = 15

  return (
    <div className="pj" ref={root} aria-hidden="true">
      {/* Stays put while the panel leans, so the two read as separate depths. */}
      <svg className="pj-blob" viewBox="0 0 806 560" xmlns="http://www.w3.org/2000/svg">
        <path d="M805.026 378C805.026 520.49 593.011 501 386.011 557.5C107.011 585.5 -75.4736 319.5 30.5264 161.5C136.526 3.50021 344.421 0 533.026 0C808.526 0 805.026 235.511 805.026 378Z" />
      </svg>

      <div className="pj-tilt">
        <aside className="pj-sidebar">
          <span className="mk-menu-item">
            <Bot size={I} /> <em>{t('site.mockup.menuNewAgent')}</em> <kbd>⌘N</kbd>
          </span>
          <span className="mk-menu-item">
            <Sparkles size={I} /> <em>{t('site.mockup.menuSkills')}</em> <kbd>⌘;</kbd>
          </span>
          <span className="mk-menu-item">
            <Users size={I} /> <em>{t('site.mockup.menuTeam')}</em> <kbd>⌘T</kbd>
          </span>
          <span className="mk-menu-item">
            <UserRound size={I} /> <em>Magic</em> <kbd>⌘,</kbd>
          </span>

          <span className="mk-section">{t('site.mockup.agentsLabel')}</span>

          <span className="mk-attention">
            <AlertTriangle size={13} /> <em>{t('site.mockup.needsAttention')}</em>
            <b>{ATTENTION}</b>
          </span>

          {/* Every row carries its own state in its markup, so nothing has to drive this
              illustration — the spinners just turn. The dots are all one colour because
              the section's copy is about one project in several isolated copies. */}
          {AGENTS.map((agent, i) => (
            <span className={`mk-agent${i === 0 ? ' is-active' : ''}`} key={agent.name}>
              <em>{agent.name}</em>
              <span className="mk-agent-meta">
                <span className="mk-dot mk-dot--teal" />
                <span className="mk-agent-state">
                  {agent.state === 'working' ? <span className="mk-loader" /> : null}
                  {agent.state === 'waiting' ? (
                    <Clock size={13} className="mk-agent-clock" />
                  ) : null}
                  {agent.state === 'done' ? (
                    <Check size={13} className="mk-agent-check is-in" />
                  ) : null}
                </span>
              </span>
            </span>
          ))}

          <span className="mk-grow" />

          <span className="mk-usage">
            <span className="mk-usage-head">
              <UserRound size={12} /> <em>Kiki</em> <b>—</b>
            </span>
            <span className="mk-meter">
              <span className="mk-meter-row">
                <em>{t('site.mockup.usageSession')}</em> <i>3h16</i> <b>12%</b>
              </span>
              <span className="mk-track"><span className="mk-fill" style={{ width: '12%' }} /></span>
            </span>
            <span className="mk-meter">
              <span className="mk-meter-row">
                <em>{t('site.mockup.usageWeekly')}</em> <i>6d</i> <b>5%</b>
              </span>
              <span className="mk-track"><span className="mk-fill" style={{ width: '5%' }} /></span>
            </span>
          </span>

          <span className="mk-foot">
            <em>v0.63.1</em>
            <i /><em>Docs</em>
            <i /><em>Changelog</em>
            <i /><em>GitHub</em>
          </span>
        </aside>
      </div>
    </div>
  )
}
