'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Bot,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Cpu,
  DollarSign,
  Edit2,
  Gauge,
  GitBranch,
  GitMerge,
  GitPullRequest,
  Loader2,
  MessagesSquare,
  Minus,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { usePointerTilt } from './usePointerTilt'

/**
 * The illustration for section ⑥ — the app's agent info panel, on its own, leaning back.
 *
 * It reproduces the desktop app's RIGHT sidebar (`desktop/src/renderer/components/
 * AgentInfoSidebar.tsx` and the cards under `agent-info-sidebar/`), in the same order the
 * app stacks them: the session card, the ticket, then the repository with its branches,
 * its commits and its pull request. One component of the app, on its own, for the same
 * reason ④ draws only the agent list — the section's claim IS this panel.
 *
 * It shares ④'s geometry: the same `perspective` / `rotateY` construction, the same
 * `.mk-slab` for the panel's thickness, the same `usePointerTilt`, and every row-level
 * `.mk-*` rule it can reuse (`marketing.css`). There is one real panel, so the two
 * illustrations must not be able to drift into showing it differently.
 *
 * ── What moves ──
 * The panel WALKS THE WORKFLOW: PR opened → CI green → changes requested → review
 * addressed → merged. Each step rewrites the ticket's status pill, the pull request's
 * verdict badge, the CI counts, the comment count and the commit list, exactly the way a
 * poll of GitHub would. That IS the section's argument — you can see where a job stands
 * without leaving the app — so a still panel would only ever show one moment of it.
 *
 * Under `prefers-reduced-motion` it holds on `changes requested` (see `FROZEN`), which is
 * the step the copy leads with and the one worth showing if only one can be.
 */

/** The marks the app puts next to a ticket ID and a pushed commit, copied from
 *  `desktop/src/renderer/components/icons/TrackerIcons.tsx` and `agent-info-sidebar/
 *  icons.tsx`. Jira keeps its own two blues, as it does in the app: a brand mark
 *  recoloured by the surface stops being the brand mark. */
function JiraMark() {
  return (
    <svg className="ap-mark" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ap-jira-mark" x1="16.53" y1="7.95" x2="12.78" y2="11.7" gradientUnits="userSpaceOnUse">
          <stop offset=".18" stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
      <path fill="#2684FF" d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.35V2.84a.84.84 0 0 0-.84-.84z" />
      <path fill="url(#ap-jira-mark)" d="M6.77 6.8a4.362 4.362 0 0 0 4.34 4.34h1.8v1.72a4.362 4.362 0 0 0 4.34 4.34V7.63a.84.84 0 0 0-.83-.83z" />
      <path fill="#0052CC" d="M2 11.6c0 2.4 1.94 4.34 4.34 4.34h1.8v1.7c.003 2.4 1.95 4.342 4.35 4.35V12.43a.84.84 0 0 0-.84-.83z" />
    </svg>
  )
}

function GithubMark() {
  return (
    <svg className="ap-mark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

/** The app's own VS Code mark, from `agent-info-sidebar/icons.tsx`, flattened to the two
 *  blues that survive at 11px — the three-layer original is mush at this size. */
function VSCodeMark() {
  return (
    <svg className="ap-mark" viewBox="0 0 100 100" aria-hidden="true">
      <path fill="#0065A9" d="M96.5 10.8 75.9.9c-2.4-1.2-5.3-.7-7.1 1.2L1.3 63.6c-1.8 1.6-1.8 4.5 0 6.1l5.5 5c1.5 1.4 3.7 1.5 5.3.3L93.4 13.4c2.7-2.1 6.6-.2 6.6 3.3v-.3c0-2.4-1.4-4.6-3.5-5.6z" />
      <path fill="#007ACC" d="M96.5 89.2 75.9 99.1c-2.4 1.1-5.3.7-7.1-1.2L1.3 36.4c-1.8-1.6-1.8-4.5 0-6.2l5.5-5c1.5-1.3 3.7-1.4 5.3-.2l81.3 61.6c2.7 2.1 6.6.2 6.6-3.3v.3c0 2.4-1.4 4.6-3.5 5.6z" />
      <path fill="#1F9CF0" d="M75.9 99.1c-2.4 1.2-5.3.7-7.1-1.2 2.3 2.3 6.2.7 6.2-2.6V4.7c0-3.3-3.9-4.9-6.2-2.6 1.8-1.9 4.7-2.4 7.1-1.2l20.6 9.9c2.1 1 3.5 3.2 3.5 5.6v67.2c0 2.4-1.4 4.6-3.5 5.6l-20.6 9.9z" />
    </svg>
  )
}

/** A commit as the panel lists it: subject, age, short hash. */
interface Commit {
  subject: string
  when: string
  hash: string
}

const COMMITS: Commit[] = [
  { subject: 'feat(auth): add JWT middleware', when: '2h', hash: 'a3f9c2d' },
  { subject: 'test(auth): cover token refresh', when: '1h', hash: '7b41e08' },
  { subject: 'docs(auth): document the header', when: '52min', hash: 'c19d4af' },
]

/** The commit `/magic:resolve` pushes, which is why it is only in the last two steps. */
const RESOLVE_COMMIT: Commit = {
  subject: 'fix(auth): apply review feedback',
  when: 'now',
  hash: 'f27a9b1',
}

/**
 * One step of the workflow, and everything on the panel that answers to it.
 *
 * `status` and `badge` are catalogue keys, `tone` is the `.ap-tone-*` the app paints that
 * state in (`STATUS_OPTIONS` in the desktop's `TicketHeader`, `REVIEW_BADGE` and
 * `STATE_BADGE` in its `PRWatchCard`) — amber in progress, green on a fresh PR, red for
 * changes requested, teal once handled, purple merged.
 *
 * The session figures climb across the steps because they do: a run that has been through
 * a review has spent more context, more money and more time than one that has not.
 */
interface Stage {
  status: { key: MessageKey; tone: string }
  badge: { key: MessageKey; tone: string }
  merged?: boolean
  checks: { passed: number; total: number; state: 'running' | 'passed' | 'failed' }
  comments: number
  commits: Commit[]
  ctx: number
  tokens: string
  cost: string
  duration: string
  checked: string
}

const STAGES: Stage[] = [
  {
    status: { key: 'site.agentPanel.statusPrCreated', tone: 'green' },
    badge: { key: 'site.agentPanel.reviewPending', tone: 'amber' },
    checks: { passed: 4, total: 12, state: 'running' },
    comments: 0,
    commits: COMMITS,
    ctx: 31,
    tokens: '318.4k / 1.00M',
    cost: '$1.94',
    duration: '24min',
    checked: '1min',
  },
  {
    status: { key: 'site.agentPanel.statusCiGreen', tone: 'indigo' },
    badge: { key: 'site.agentPanel.reviewPending', tone: 'amber' },
    checks: { passed: 12, total: 12, state: 'passed' },
    comments: 0,
    commits: COMMITS,
    ctx: 34,
    tokens: '344.1k / 1.00M',
    cost: '$2.08',
    duration: '31min',
    checked: '2min',
  },
  {
    status: { key: 'site.agentPanel.statusChangesRequested', tone: 'red' },
    badge: { key: 'site.agentPanel.reviewChanges', tone: 'red' },
    checks: { passed: 12, total: 12, state: 'passed' },
    comments: 4,
    commits: COMMITS,
    ctx: 38,
    tokens: '379.6k / 1.00M',
    cost: '$2.31',
    duration: '48min',
    checked: '1min',
  },
  {
    status: { key: 'site.agentPanel.statusReviewAddressed', tone: 'teal' },
    badge: { key: 'site.agentPanel.reviewPending', tone: 'amber' },
    checks: { passed: 6, total: 12, state: 'running' },
    comments: 4,
    commits: [...COMMITS, RESOLVE_COMMIT],
    ctx: 46,
    tokens: '461.2k / 1.00M',
    cost: '$2.87',
    duration: '1h04',
    checked: 'now',
  },
  {
    status: { key: 'site.agentPanel.statusPrMerged', tone: 'purple' },
    badge: { key: 'site.agentPanel.merged', tone: 'purple' },
    merged: true,
    checks: { passed: 12, total: 12, state: 'passed' },
    comments: 4,
    commits: [...COMMITS, RESOLVE_COMMIT],
    ctx: 49,
    tokens: '489.7k / 1.00M',
    cost: '$3.02',
    duration: '1h12',
    checked: 'now',
  },
]

/** Long enough to read one state before it changes, short enough that the panel never
 *  looks parked — the same judgement as `RepoSettings`' DWELL, on a bigger unit of
 *  content. */
const DWELL = 2800

/** Where the run holds under `prefers-reduced-motion`: `changes requested`, which is the
 *  state the section's copy leads with. */
const FROZEN = 2

/** The check icon of the CI line, and the tone the label takes with it. A run that is
 *  9/12 green is not a green PR, so only a finished clean run gets the tick — the
 *  `checksItem` ladder in the app's `PRWatchCard`. */
const CHECK_ICON = {
  running: { Icon: Loader2, tone: 'blue', spin: true, done: false },
  passed: { Icon: CheckCircle2, tone: 'green', spin: false, done: true },
  failed: { Icon: XCircle, tone: 'red', spin: false, done: false },
} as const

export function AgentPanel() {
  const { t } = useT()
  const root = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(FROZEN)

  usePointerTilt(root, 7, 4)

  /**
   * Walks the steps while the panel is on screen, and only then: a timer running against
   * a section nobody has scrolled to yet would have the panel mid-cycle on arrival, and
   * the run is meant to be read from its first state.
   */
  useEffect(() => {
    const el = root.current
    if (!el) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let timer = 0
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !timer) {
          setStep(0)
          timer = window.setInterval(() => setStep((s) => (s + 1) % STAGES.length), DWELL)
          return
        }
        if (!entry.isIntersecting && timer) {
          clearInterval(timer)
          timer = 0
        }
      },
      { threshold: 0.25 },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (timer) clearInterval(timer)
    }
  }, [])

  const stage = STAGES[step]
  const check = CHECK_ICON[stage.checks.state]
  const CheckIcon = check.Icon

  return (
    <div className="ap" ref={root} aria-hidden="true">
      {/* The backdrop, ④'s blob and ⑤'s triangle in a third shape — a ring, so the three
          illustrations never repeat one. It stays put while the panel leans, so the two
          read as separate depths, and it is drawn as one path with a hole rather than a
          stroked circle so it keeps the flat single fill the other two have. */}
      <svg className="ap-shape" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
        <path
          fillRule="evenodd"
          d="M300 0c165.7 0 300 134.3 300 300S465.7 600 300 600 0 465.7 0 300 134.3 0 300 0Zm0 96c-112.7 0-204 91.3-204 204s91.3 204 204 204 204-91.3 204-204S412.7 96 300 96Z"
        />
      </svg>

      <div className="ap-tilt">
        {/* The slab's edge, so the panel reads as an object rather than a sheet. */}
        <span className="mk-slab" />
        <aside className="ap-panel">
          {/* Header. The close-agent button is what the app shows once there is nothing
              left to lose — `canClose` is a merged PR or no status at all — so it takes
              the slot from the plain × on the last step and nowhere else. */}
          <div className="ap-head">
            <Bot size={14} className="ap-head-bot" />
            <b>{t('site.agentPanel.title', { name: 'Claude 3' })}</b>
            <span className="mk-grow" />
            {stage.merged ? (
              <span className="ap-close-btn">
                <X size={11} /> {t('site.agentPanel.closeAgent')} <i>⌘W</i>
              </span>
            ) : (
              <span className="ap-icon-btn"><X size={13} /></span>
            )}
          </div>

          {/* ── Session: context, cost, model ── */}
          <div className="mk-card">
            <div className="mk-card-row">
              <em className="mk-label">{t('site.mockup.session')}</em>
              <i className="ap-stamp"><RefreshCw size={10} /> {t('site.agentPanel.ago', { time: '2min' })}</i>
              <span className="mk-grow" />
              <b className="mk-pill mk-pill--model"><Cpu size={10} /> Opus 5 (1M context)</b>
              <span className="ap-icon-btn"><Minus size={11} /></span>
            </div>
            <div className="mk-card-row">
              <em className="ap-row-label"><Gauge size={12} /> {t('site.mockup.context')}</em>
              <span className="mk-grow" />
              <b className="mk-ctx-pct">{stage.ctx}%</b>
            </div>
            <span className="mk-track mk-track--ctx">
              <span className="mk-fill mk-fill--ctx" style={{ width: `${stage.ctx}%` }} />
            </span>
            <div className="mk-card-row">
              <i className="mk-mono">{t('site.agentPanel.tokens', { used: stage.tokens })}</i>
            </div>
            <div className="mk-card-row">
              <em className="ap-row-label">
                <DollarSign size={12} /> <b className="mk-strong">{stage.cost}</b>
              </em>
              <span className="mk-grow" />
              <em className="ap-row-label"><Clock size={12} /> {stage.duration}</em>
            </div>
          </div>

          {/* ── The ticket, and where it stands ── */}
          <div className="mk-card">
            <div className="mk-card-row">
              <span className="ap-ticket"><JiraMark /> PROJ-142</span>
              <span className="mk-grow" />
              <b className={`ap-pill ap-tone-${stage.status.tone}`}>
                {t(stage.status.key)} <ChevronDown size={10} />
              </b>
            </div>
            <div className="ap-edit-row">
              <em className="mk-strong ap-ticket-title">Add JWT auth middleware</em>
              <Edit2 size={11} className="ap-edit" />
            </div>
            <div className="ap-edit-row">
              <span className="mk-desc">
                Protect the private API routes behind a JWT check, and refresh the token when it
                is close to expiring.
              </span>
              <Edit2 size={10} className="ap-edit" />
            </div>
          </div>

          {/* ── The repository: branches, commits, pull request ── */}
          <div className="mk-card">
            <div className="mk-card-row">
              <em className="mk-strong">stellar-api</em>
              <span className="mk-grow" />
              <i className="ap-chip-btn">{t('site.mockup.scripts')} <ChevronDown size={9} /></i>
              <i className="ap-chip-btn ap-chip-btn--code"><VSCodeMark /> {t('site.mockup.open')}</i>
              <span className="ap-icon-btn"><X size={11} /></span>
            </div>

            <div className="mk-branches">
              <GitBranch size={11} /> <i className="mk-mono">main</i>
              <span className="mk-arrow">→</span>
              <GitBranch size={11} className="ap-branch-mark" />
              <b className="mk-mono ap-branch">feature/PROJ-142</b>
              <span className="mk-grow" />
              <Copy size={11} className="ap-copy" />
            </div>

            <div className="ap-block">
              <div className="mk-card-row">
                <em className="ap-block-title">{t('site.mockup.commits')}</em>
                <span className="mk-grow" />
                <i className="mk-faint">{t('site.mockup.aheadOfMain', { n: stage.commits.length })}</i>
              </div>
              {/* Keyed by hash, so the commit `/magic:resolve` pushes rises in rather than
                  appearing between two frames. */}
              {stage.commits.map((commit) => (
                <div className="mk-commit ap-rise" key={commit.hash}>
                  <em>{commit.subject}</em>
                  <span className="mk-grow" />
                  <i>{commit.when}</i>
                  <b className="mk-hash">{commit.hash} <Copy size={9} /></b>
                  <span className="ap-gh-btn"><GithubMark /></span>
                </div>
              ))}
            </div>

            {/* The pull request card. Its header IS the link to GitHub in the app, which is
                why the verdict badge sits inside it: the badge labels the PR. */}
            <div className="ap-pr">
              <div className="ap-pr-head">
                {stage.merged
                  ? <GitMerge size={14} className="ap-tone-fg-purple" />
                  : <GitPullRequest size={14} className="ap-tone-fg-green" />}
                <span className="ap-pr-id">
                  <b>{t('site.agentPanel.prNumber', { number: 87 })}</b>
                  <i>stellar/api</i>
                </span>
                <span className={`ap-badge ap-tone-${stage.badge.tone}`}>
                  {t(stage.badge.key)}
                </span>
              </div>

              {/* The checklist — everything that has to be true before this PR can ship,
                  one line each, ticked when it is. Same order as the app: the comments
                  first, because they are the line that is about people. */}
              <div className="ap-list">
                <div className="ap-item">
                  <MessagesSquare size={12} className="ap-tone-fg-blue" />
                  <em>{t('site.agentPanel.comments')}</em>
                  <span className="mk-grow" />
                  {stage.comments > 0 && <i className="ap-count">{stage.comments}</i>}
                  <ChevronDown size={11} className="ap-fold" />
                </div>

                <div className="ap-item">
                  <CheckIcon
                    size={12}
                    className={`ap-tone-fg-${check.tone}${check.spin ? ' ap-spin' : ''}`}
                  />
                  <em className={check.done ? undefined : `ap-open ap-tone-fg-${check.tone}`}>
                    {t('site.agentPanel.checks')}
                  </em>
                  <span className="mk-grow" />
                  <i className="ap-count">
                    {t('site.agentPanel.checksPassed', {
                      passed: stage.checks.passed,
                      total: stage.checks.total,
                    })}
                  </i>
                  <ChevronDown size={11} className="ap-fold" />
                </div>

                {/* Mergeability. Dropped once the PR is merged, the way the app drops it:
                    a finished PR has nothing left to merge. */}
                {!stage.merged && (
                  <div className="ap-item">
                    <CheckCircle2 size={12} className="ap-tone-fg-green" />
                    <em>{t('site.agentPanel.noConflicts')}</em>
                  </div>
                )}

                {/* The last box, and the only one with a command attached. */}
                {stage.merged && (
                  <div className="ap-item ap-rise">
                    <CheckCircle2 size={12} className="ap-tone-fg-purple" />
                    <em>{t('site.agentPanel.merged')}</em>
                    <span className="mk-grow" />
                    <span className="ap-done-btn">
                      <CheckCircle size={10} /> {t('site.agentPanel.launchDone')}
                    </span>
                  </div>
                )}
              </div>

              {/* The footer: how old everything above it is, and the button that makes it
                  newer. Reading left, action right. */}
              <div className="ap-pr-foot">
                <i>
                  {t('site.agentPanel.lastChecked', {
                    time: stage.checked === 'now'
                      ? t('site.agentPanel.justNow')
                      : t('site.agentPanel.ago', { time: stage.checked }),
                  })}
                </i>
                <span className="mk-grow" />
                <span className="ap-refresh"><RefreshCw size={10} /> {t('site.agentPanel.refresh')}</span>
              </div>
            </div>
          </div>

          {/* The panel always ends on this, and it sits right under the last repository
              card rather than pinned to the bottom — the app stacks its cards from the
              top of a sidebar as tall as the window, so the room left under them is
              part of the picture. */}
          <span className="mk-add-repo">{t('site.mockup.addRepo')}</span>
        </aside>
      </div>
    </div>
  )
}
