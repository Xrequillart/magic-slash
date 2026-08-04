'use client'

import { useEffect, useRef } from 'react'
import { ArrowLeft, ChevronDown, Lock, Plus } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { usePointerTilt } from './usePointerTilt'

/**
 * The illustration for section ⑤ — one repository's settings page, leaning back.
 *
 * The claim is "set your conventions once per project", so what has to be on screen is the
 * FORM: labelled rows, each with its help line and its control, grouped into sections. It
 * reproduces `desktop/src/renderer/pages/Config/RepoPage.tsx` — the same row shape (label
 * and help on the left, control on the right, hairline between), the same section headers,
 * the same commit preview at the end of the COMMIT group.
 *
 * Two things move it, and they answer to different inputs:
 *
 *  - the LEAN follows the cursor, through the shared `usePointerTilt`. It leans +20°, the
 *    mirror of the sidebar in ④, because this illustration sits on the other side of its
 *    text and both should face the words they belong to.
 *  - the CONTENT walks itself, starting once the middle of the section reaches the middle
 *    of the screen. A settings page is too long to show at once and cropping it would hide
 *    the point, so the panel pages through its own groups on a timer and loops.
 *
 * Labels come from the catalogues, copied from the app's `repo.*` keys. Values are literals
 * here, like the terminal's log lines — they are what one particular project is set to.
 */

/**
 * A settings row. Most are a label, a help line and a control side by side, but two shapes
 * on the real page are not: SCOPE leads with a pill instead of a label, and WORKTREE stacks
 * its control under the labels because a chip list plus an add field will not fit beside
 * them. Both are carried here rather than hand-built, so every row still goes through the
 * same renderer.
 */
type Row = {
  label?: string
  badge?: React.ReactNode
  help: string
  control: React.ReactNode
  stack?: boolean
}

/** The `bg-accent`-filled pill from the app, on for `checked`. */
function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`rs-toggle${on ? ' is-on' : ''}`}>
      <i />
    </span>
  )
}

function Select({ value }: { value: string }) {
  return (
    <span className="rs-select">
      {value}
      <ChevronDown size={14} />
    </span>
  )
}

export function RepoSettings() {
  const { t } = useT()
  const root = useRef<HTMLDivElement>(null)
  const pane = useRef<HTMLDivElement>(null)

  usePointerTilt(root, 7, 4)

  /**
   * Walks the settings on its own, section by section, once the reader has got here.
   *
   * It STOPS on each group rather than crawling at a constant speed: a uniform scroll
   * never lets you finish reading a row, whereas gliding and pausing is what a person
   * does. The stops come off the `.rs-group` elements, so adding a section to the markup
   * adds a stop with no change here, and they are re-measured every cycle, which is also
   * what makes the run survive a resize.
   *
   * The first stop is the top rather than the first group, so the header — the one line
   * that says which repository this is — is on screen before anything moves.
   *
   * `scrollTop` on an `overflow: hidden` pane rather than a transform, so the pane clips
   * natively and no scrollbar ever appears. This is not something the visitor is meant to
   * grab; it is the panel reading itself out.
   */
  useEffect(() => {
    const el = root.current
    const body = pane.current
    if (!el || !body) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    // Long enough to take a group in, short enough that the panel never looks parked. The
    // point of the section is that there is a LOT to set, so the run has to keep moving —
    // at 2600 the pauses dominated and it read as stalled between steps.
    const DWELL = 1400
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

    /** Timed by DISTANCE, so every move happens at about the same speed. On a fixed
     *  duration the rewind at the end of a cycle covers the whole list in the time a step
     *  between two neighbouring groups takes, and reads as a different gesture entirely. */
    const glide = (px: number) => Math.min(1100, Math.max(380, Math.abs(px) * 1.8))

    let raf = 0
    let timer = 0
    let step = 0

    /**
     * Scroll offset of each group, with the top of the pane prepended.
     *
     * Groups closer together than MIN_STEP are dropped: a one-row group sits barely a
     * screenful from the next one, so stopping on both shows the same thing twice and the
     * run stalls. What survives is a list of positions that each look different.
     */
    const MIN_STEP = 140
    const stops = () => {
      const max = body.scrollHeight - body.clientHeight
      const base = body.getBoundingClientRect().top - body.scrollTop
      const groups = Array.from(body.querySelectorAll<HTMLElement>('.rs-group'))
      const out = [0]
      for (const g of groups.slice(1)) {
        const at = Math.min(max, Math.max(0, g.getBoundingClientRect().top - base - 8))
        if (at - out[out.length - 1] >= MIN_STEP) out.push(at)
      }
      return out
    }

    const run = () => {
      const list = stops()
      const to = list[step % list.length]
      const from = body.scrollTop
      const span = glide(to - from)
      const t0 = performance.now()
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / span)
        body.scrollTop = from + (to - from) * ease(k)
        if (k < 1) {
          raf = requestAnimationFrame(tick)
          return
        }
        step += 1
        timer = window.setTimeout(run, DWELL)
      }
      raf = requestAnimationFrame(tick)
    }

    // Starts when the middle of the section reaches the middle of the screen. The panel is
    // centred in its section, so its own centre is what that comes down to.
    let started = false
    const check = () => {
      if (started) return
      const box = el.getBoundingClientRect()
      if (box.top + box.height / 2 > window.innerHeight / 2) return
      started = true
      window.removeEventListener('scroll', check)
      run()
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => {
      window.removeEventListener('scroll', check)
      if (raf) cancelAnimationFrame(raf)
      if (timer) clearTimeout(timer)
    }
  }, [])

  const SECTIONS: { title: string; rows: Row[]; preview?: string; danger?: boolean }[] = [
    {
      title: t('site.repoCfg.scope'),
      rows: [
        {
          badge: (
            <span className="rs-badge">
              <Lock size={12} /> {t('site.repoCfg.personal')}
            </span>
          ),
          help: t('site.repoCfg.personalHelp'),
          control: <span className="rs-ghost-btn">{t('site.repoCfg.scope')}…</span>,
        },
      ],
    },
    {
      title: t('site.repoCfg.general'),
      rows: [
        {
          label: t('site.repoCfg.name'),
          help: t('site.repoCfg.nameHelp'),
          control: <span className="rs-input">magic-slash</span>,
        },
        {
          label: t('site.repoCfg.keywords'),
          help: t('site.repoCfg.keywordsHelp'),
          control: (
            <span className="rs-chips">
              <i>magic-slash</i>
              <i>webapp</i>
            </span>
          ),
        },
        {
          label: t('site.repoCfg.discussionLang'),
          help: t('site.repoCfg.discussionLangHelp'),
          control: <Select value="Français" />,
        },
        {
          label: t('site.repoCfg.color'),
          help: t('site.repoCfg.colorHelp'),
          control: (
            <span className="rs-swatches">
              {['#06B6D4', '#818CF8', '#34D399', '#FBBF24', '#F87171', '#C084FC'].map((c, i) => (
                <i key={c} className={i === 0 ? 'is-on' : undefined} style={{ background: c }} />
              ))}
            </span>
          ),
        },
      ],
    },
    {
      title: t('site.repoCfg.branches'),
      rows: [
        {
          label: t('site.repoCfg.development'),
          help: t('site.repoCfg.developmentHelp'),
          control: <Select value="main" />,
        },
      ],
    },
    {
      title: t('site.repoCfg.worktree'),
      rows: [
        {
          label: t('site.repoCfg.files'),
          help: t('site.repoCfg.filesHelp'),
          stack: true,
          control: (
            <span className="rs-files">
              <i>desktop/.env.local</i>
              <i>webapp/.env.local</i>
              <span className="rs-file-add">
                <em>.env</em>
                <b><Plus size={11} /> {t('site.repoCfg.add')}</b>
              </span>
            </span>
          ),
        },
      ],
    },
    {
      title: t('site.repoCfg.commit'),
      rows: [
        {
          label: t('site.repoCfg.language'),
          help: t('site.repoCfg.commitLangHelp'),
          control: <Select value="English" />,
        },
        {
          label: t('site.repoCfg.style'),
          help: t('site.repoCfg.styleHelp'),
          control: <Select value={t('site.repoCfg.styleSingle')} />,
        },
        {
          label: t('site.repoCfg.format'),
          help: t('site.repoCfg.formatHelp'),
          control: <Select value={t('site.repoCfg.formatAngular')} />,
        },
        {
          label: t('site.repoCfg.coAuthor'),
          help: t('site.repoCfg.coAuthorHelp'),
          control: <Toggle on={false} />,
        },
        {
          label: t('site.repoCfg.ticketId'),
          help: t('site.repoCfg.ticketIdHelp'),
          control: <Toggle on />,
        },
      ],
      // What those five settings add up to, which is the app's own way of showing it.
      preview: 'feat(auth): add JWT middleware\n\n[PROJ-142]',
    },
    {
      title: t('site.repoCfg.resolve'),
      rows: [
        {
          label: t('site.repoCfg.commitMode'),
          help: t('site.repoCfg.commitModeHelp'),
          control: <Select value={t('site.repoCfg.modeNew')} />,
        },
        {
          label: t('site.repoCfg.commitFormat'),
          help: t('site.repoCfg.commitFormatHelp'),
          control: <Select value={t('site.repoCfg.useCommitConfig')} />,
        },
      ],
    },
    {
      title: t('site.repoCfg.pr'),
      rows: [
        {
          label: t('site.repoCfg.language'),
          help: t('site.repoCfg.prLangHelp'),
          control: <Select value="English" />,
        },
        {
          label: t('site.repoCfg.autoLink'),
          help: t('site.repoCfg.autoLinkHelp'),
          control: <Toggle on />,
        },
        {
          label: t('site.repoCfg.watchCI'),
          help: t('site.repoCfg.watchCIHelp'),
          control: <Toggle on />,
        },
      ],
    },
    {
      title: t('site.repoCfg.issues'),
      rows: [
        {
          label: t('site.repoCfg.commentLang'),
          help: t('site.repoCfg.commentLangHelp'),
          control: <Select value="English" />,
        },
        {
          label: t('site.repoCfg.commentOnPR'),
          help: t('site.repoCfg.commentOnPRHelp'),
          control: <Toggle on />,
        },
        {
          label: t('site.repoCfg.jiraUrl'),
          help: t('site.repoCfg.jiraUrlHelp'),
          control: <span className="rs-input rs-input--url">company.atlassian.net/browse/</span>,
        },
      ],
    },
    {
      title: t('site.repoCfg.danger'),
      danger: true,
      rows: [
        {
          label: t('site.repoCfg.delete'),
          help: t('site.repoCfg.deleteHelp'),
          control: <span className="rs-danger-btn">{t('site.repoCfg.deleteAction')}</span>,
        },
      ],
    },
  ]

  return (
    <div className="rs" ref={root} aria-hidden="true">
      {/* Backdrop, the counterpart to ④'s blob: a triangle rather than a blob so the two
          sections do not repeat the same shape. Stays put while the panel leans, so the two
          read as separate depths.

          Rotated so all THREE corners clear the panel. Upright, with the apex at top centre,
          the panel is taller than the triangle and swallows it — only the two base corners
          showed. Its vertices are equally spaced on a circle at 40°, 160° and 280°, which
          puts one above the panel, one past its bottom-right and one out to its left. See
          `.rs-shape` for the sizing that keeps them clear. */}
      <svg className="rs-shape" viewBox="0 0 640 612" xmlns="http://www.w3.org/2000/svg">
        <path d="M424.1 41.2 L616.8 570.7 Q627.1 598.9 597.6 593.7 L42.5 495.8 Q13 490.6 32.3 467.6 L394.5 36 Q413.8 13 424.1 41.2 Z" />
      </svg>

      <div className="rs-tilt">
        {/* The slab's edge, so the panel reads as an object rather than a sheet. */}
        <span className="mk-slab" />
        <div className="rs-window">
          <div className="rs-pane" ref={pane}>
            <div className="rs-head">
              <span className="rs-back"><ArrowLeft size={15} /></span>
              <b>magic-slash</b>
              <em>{t('site.repoCfg.subtitle')}</em>
            </div>

            {SECTIONS.map((section) => (
              <div className="rs-group" key={section.title}>
                <span className={`rs-group-title${section.danger ? ' is-danger' : ''}`}>
                  {section.title}
                </span>
                <div className={`rs-card${section.danger ? ' is-danger' : ''}`}>
                  {section.rows.map((row) => (
                    <div
                      className={`rs-row${row.stack ? ' is-stacked' : ''}`}
                      key={row.label ?? section.title}
                    >
                      <span className="rs-labels">
                        {row.badge ?? <b>{row.label}</b>}
                        <em>{row.help}</em>
                      </span>
                      {row.control}
                    </div>
                  ))}
                  {section.preview ? (
                    <div className="rs-preview">
                      <span className="rs-preview-label">{t('site.repoCfg.example')}</span>
                      <pre>{section.preview}</pre>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
