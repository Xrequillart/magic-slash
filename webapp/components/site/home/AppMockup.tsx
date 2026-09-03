'use client'

import { useEffect, useRef } from 'react'
import {
  AlertTriangle,
  Bot,
  Check,
  GitBranch,
  GitPullRequest,
  PanelLeft,
  Play,
  RotateCw,
  Sparkles,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'
import { mountMockup } from './mockupAnimation'
import { MkLoader } from './MkLoader'

/**
 * NOTHING RENDERS THIS TODAY, AND THAT IS DELIBERATE. Do not delete it.
 *
 * The homepage rebuild (#268) replaced the hero's animated window with a static one:
 * six bands of Tailwind over the design system, and a visual that has to hold up with
 * no timeline behind it. Twelve components went with the old page; these three did not.
 * This file, plus `MkLoader.tsx` and `mockupAnimation.ts` — which it is the only
 * importer of — are kept for **issue #270**, which converts the scene from
 * TIME-DRIVEN to SCROLL-PROGRESS-DRIVEN and reuses all three. Two reviews in a row
 * have read them as three files someone forgot to remove, hence this note.
 *
 * WHERE IT GOES BACK IN: `HeroVisual` in `HeroSection.tsx`, which is the static window
 * standing in for it.
 *
 * AND THE TRAP #270 HAS TO PLAN FOR. The markup below references ~81 distinct `mk-*`
 * class names, and every one of them is defined ONLY in
 * `app/(marketing)/marketing.css` — which the `(marketing)` layout no longer imports
 * (that is acceptance criterion 3 of #268, and `lib/homepageStylesheet.test.ts` guards
 * it). So dropping this component back into the hero renders it completely UNSTYLED.
 * #270 has to bring the styling with it: ported to Tailwind over the tokens in
 * `tailwind.config.ts`, or scoped into a stylesheet of its own the way `/story` keeps
 * `story.css`. Re-adding the global import is not an option.
 */

/**
 * The animated app window in the hero — sidebar, terminal, info panel.
 *
 * Two lineages meet here. The LOOK is the app's real "midnight" theme, measured off a
 * screenshot of the running app (palette in `marketing.css`), replacing the flat-black
 * marketing mockup that used to sit in the hero. The RUN is the six-skill sequence the
 * old `terminalAnimation.ts` played — start, commit, pr, review, resolve, done — with
 * the same beats and the same side effects in the panels.
 *
 * Two of the eight skills are deliberately absent, for the same reason: they do not
 * demonstrate LINEARLY. `/magic:continue` was already out — resuming a task looks
 * identical to starting one unless you already know a previous session existed — and
 * `/magic:plan` joins it, because its whole shape is a conversation that pauses on a
 * spec and waits for a human to approve it, which is the one beat a timeline that
 * cannot be answered has nothing to show. So this stays a six-phase run: `PHASES`
 * here, `CONTEXT_BY_PHASE` and the `switch (index)` in `mockupAnimation.ts` are all
 * indexed by the same six positions, and shifting them buys nothing.
 *
 * WHY HTML AND NOT A VIDEO OR A LOTTIE: the text stays real text, so it is translatable
 * through the catalogues, selectable, and readable by a screen reader; it is crisp at any
 * DPI and any width; and it costs a few KB rather than megabytes.
 *
 * The subtree is STATIC — rendered once, never re-rendered — which is what makes it safe
 * for `mountMockup` to drive it by toggling classes from an effect. Everything the
 * animation needs to SAY is handed to it through `data-` attributes, so the strings stay
 * in the catalogues rather than leaking into the timeline module. If this ever needs
 * reactive state, the animation has to move with it.
 */

/**
 * The run, as data. Each phase is a typed command and the status lines it produces;
 * `result` is the chip that lands on the right of a line once it completes. A phase may
 * also close with a `banner` — the green card that ends the whole run.
 *
 * These lines are NOT translated, on purpose: they are the log the real product prints,
 * and it prints English. The chrome around them is translated — see the `t()` calls.
 */
const PHASES: {
  cmd: string
  runs: { label: string; result?: string }[]
  banner?: string
}[] = [
  {
    cmd: '/magic:start PROJ-142',
    runs: [
      { label: 'Fetching Jira ticket PROJ-142' },
      { label: 'Analysing the ticket', result: 'BACKEND' },
      { label: 'Creating the worktree', result: 'feature/PROJ-142' },
      { label: 'Ready — starting work' },
    ],
  },
  {
    cmd: '/magic:commit',
    runs: [
      { label: 'Staging changes', result: '3 files' },
      { label: 'Writing the commit message' },
      { label: 'feat(auth): add JWT middleware', result: 'created' },
    ],
  },
  {
    cmd: '/magic:pr',
    runs: [
      { label: 'Pushing to remote', result: 'origin/feature/PROJ-142' },
      { label: 'Opening the pull request', result: 'PR #87' },
      { label: 'Moving the ticket', result: 'To be reviewed' },
    ],
  },
  {
    cmd: '/magic:review 87',
    runs: [
      { label: 'Fetching PR #87', result: '3 files, +10 −1' },
      { label: 'Reviewing against your conventions', result: '2 comments' },
      { label: 'Approved with suggestions' },
    ],
  },
  {
    cmd: '/magic:resolve',
    runs: [
      { label: 'Reading the review comments', result: '2 comments' },
      { label: 'Applying the fixes', result: '2 files' },
      { label: 'Force-pushing', result: 'all resolved' },
    ],
  },
  {
    cmd: '/magic:done',
    runs: [
      { label: 'Merging PR #87', result: 'merged' },
      { label: 'Cleaning up the branch', result: 'deleted' },
      { label: 'Moving the ticket', result: 'Done' },
    ],
    // The last beat of the run, and the only line that gets a card of its own.
    banner: 'Task complete!',
  },
]

/** The files that land in the info panel during `/magic:start`. */
const FILES = [
  { name: 'src/middleware/auth.ts', added: 4, removed: 0 },
  { name: 'src/middleware/refresh.ts', added: 4, removed: 0 },
  { name: 'src/routes/index.ts', added: 2, removed: 1 },
]

export function AppMockup() {
  const { t } = useT()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!root.current) return
    return mountMockup(root.current)
  }, [])

  const I = 15

  return (
    <div className="mk" ref={root}>
      {/* Decorative light. Three blurred blooms rather than one gradient, because the
          real canvas has a violet cast at the edges and a teal one in the middle. */}
      <span className="mk-glow mk-glow--teal" aria-hidden="true" />
      <span className="mk-glow mk-glow--violet-a" aria-hidden="true" />
      <span className="mk-glow mk-glow--violet-b" aria-hidden="true" />

      <div className="mk-titlebar">
        <span className="mk-lights"><i /><i /><i /></span>
        <span className="mk-panel-btn"><PanelLeft size={14} /></span>
        <span className="mk-title">
          <span className="mk-title-dot" />
          PROJ-142 — JWT auth middleware
        </span>
        <span className="mk-panel-btn mk-panel-btn--right"><PanelLeft size={14} /></span>
      </div>

      <div className="mk-body">
        {/* ── Sidebar ── */}
        <aside className="mk-sidebar">
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
            <b data-mk="attention-count">2</b>
          </span>

          {/* An agent row, laid out as the app lays it out: the name takes the width, then
              a dot per matching repository, then ONE status icon on the right — nothing
              while idle, a spinner while it works, a green check once it is done. There is
              no icon on the left and never two states at once, which is why the check sits
              on top of the spinner in the same slot rather than beside it.

              The active row walks that whole path: empty until the first command is
              submitted, spinning through the run, checked on `/magic:done`. */}
          <span className="mk-agent is-active">
            <em>auth-middleware</em>
            <span className="mk-agent-meta">
              <span className="mk-dot mk-dot--teal" />
              <span className="mk-agent-state">
                <MkLoader className="is-out" data-mk="agent-loader" />
                <Check size={13} className="mk-agent-check" data-mk="agent-check" />
              </span>
            </span>
          </span>
          <span className="mk-agent">
            <em>pricing-copy</em>
            <span className="mk-agent-meta">
              <span className="mk-dot mk-dot--teal" />
              <span className="mk-agent-state">
                <Check size={13} className="mk-agent-check is-in" />
              </span>
            </span>
          </span>

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

        {/* ── Terminal: the six-skill run ── */}
        <div className="mk-term">
          <div className="mk-convo" data-mk="convo">
            {PHASES.map((phase) => (
              <div className="mk-phase" data-mk="phase" key={phase.cmd}>
                {/* The command, rendered here so the served HTML reads correctly before
                    hydration. The animation clears it and re-types it in the composer. */}
                <div className="mk-line mk-line--cmd" data-mk="prompt">
                  <span>&gt;</span>
                  <em data-mk="cmd" data-text={phase.cmd}>{phase.cmd}</em>
                </div>
                {phase.runs.map((run) => (
                  <div className="mk-run" data-mk="run" key={run.label}>
                    <span className="mk-run-mark">
                      <span className="mk-spin" />
                      <Check size={12} className="mk-run-check" />
                    </span>
                    <em>{run.label}</em>
                    {run.result ? <b className="mk-result">{run.result}</b> : null}
                  </div>
                ))}
                {phase.banner ? (
                  <div className="mk-banner" data-mk="banner">
                    <Check size={15} strokeWidth={3} />
                    <em>{phase.banner}</em>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <span className="mk-grow" />

          {/* Where each command is typed before it is submitted into the transcript. */}
          <div className="mk-composer">
            <span>&gt;</span>
            <em data-mk="composer-cmd" />
            <span className="mk-caret" data-mk="composer-caret" />
          </div>

          <div className="mk-status">
            <span className="mk-pill mk-pill--pwd">pwd:stellar-api</span>
            <span className="mk-pill mk-pill--branch">feature/PROJ-142</span>
            <span className="mk-pill mk-pill--grey">Opus 5 (1M context)</span>
            <span className="mk-pill mk-pill--grey">auth:Team</span>
            <span className="mk-pill mk-pill--cost">$53.90</span>
          </div>
          <div className="mk-mode">
            <Play size={9} /> <em>{t('site.mockup.autoMode')}</em>
            <i>·</i> <b>PROJ-142</b>
          </div>

          <button type="button" className="mk-replay" data-mk="replay">
            <RotateCw size={13} /> {t('site.mockup.replay')}
          </button>
        </div>

        {/* ── Info panel ── */}
        <aside className="mk-info">
          <span className="mk-info-head">
            <span className="mk-info-badge" /> <em>Claude 1 Info</em> <X size={13} />
          </span>

          {/* The panel starts EMPTY — a header and the dashed add-repo box, which is what
              a fresh agent actually shows — and each card lands when the run earns it: the
              session as the first command is submitted, the ticket once it has been
              fetched, the repository once the worktree exists. `display` rather than
              opacity, so a card that has not arrived yet takes up no height. */}
          <span className="mk-card mk-card--reveal" data-mk="card-session">
            <span className="mk-card-row">
              <em className="mk-label">{t('site.mockup.session')}</em>
              <i>7min ago</i>
              <span className="mk-grow" />
              <b className="mk-pill mk-pill--model">Opus 5 (1M context)</b>
            </span>
            <span className="mk-card-row">
              <em className="mk-strong">{t('site.mockup.context')}</em>
              <span className="mk-grow" />
              <b className="mk-ctx-pct" data-mk="ctx-pct">14%</b>
            </span>
            <span className="mk-track mk-track--ctx">
              <span className="mk-fill mk-fill--ctx" data-mk="ctx-bar" style={{ width: '14%' }} />
            </span>
            <span className="mk-card-row">
              <i className="mk-mono" data-mk="ctx-tokens">139.7k / 1.00M tokens</i>
            </span>
          </span>

          <span className="mk-card mk-card--reveal" data-mk="card-ticket">
            <span className="mk-card-row">
              <b className="mk-pill mk-pill--ticket">PROJ-142</b>
              <span className="mk-grow" />
              {/* The status pill, one label and one colour per step the run takes the
                  ticket through: in progress -> in review on `/magic:pr` -> reviewed once
                  the review comes back -> done on `/magic:done`. Rendered in its FINAL
                  state, like the rest of the mockup, so the served HTML reads correctly
                  before the animation takes over. */}
              <b
                className="mk-pill mk-pill--state is-done"
                data-mk="state-pill"
                data-progress={t('site.mockup.inProgress')}
                data-review={t('site.mockup.ticketInReview')}
                data-reviewed={t('site.mockup.ticketReviewed')}
                data-done={t('site.mockup.ticketDone')}
              >
                {t('site.mockup.ticketDone')}
              </b>
            </span>
            <span className="mk-card-row">
              <em className="mk-strong">Add JWT auth middleware</em>
            </span>
            {/* The ticket body, as the panel shows it — clamped, because a real
                description is longer than the room this card has for it. */}
            <span className="mk-desc">
              Protect the private API routes behind a JWT check, and refresh the token when
              it is close to expiring.
            </span>
          </span>

          <span className="mk-card mk-card--reveal" data-mk="card-repo">
            <span className="mk-card-row">
              <em className="mk-strong">stellar-api</em>
              <span className="mk-grow" />
              <i>{t('site.mockup.scripts')}</i>
              <b className="mk-open">{t('site.mockup.open')}</b>
            </span>
            <span className="mk-branches">
              <GitBranch size={12} /> <i className="mk-mono">develop</i>
              <span className="mk-arrow">→</span>
              <b className="mk-mono">feature/PROJ-142</b>
            </span>

            {/* Uncommitted work. Appears as `/magic:start` writes files, and goes away
                for good once `/magic:commit` turns them into a commit — the two blocks
                are never on screen together, which is what the real panel does.

                Both use `display` rather than opacity to hide: an invisible-but-present
                row still reserves its height, and three of them left a void in the card
                with the gauge stranded underneath. */}
            <span className="mk-block" data-mk="changes">
              {/* The gauge sits beside the count it summarises, not under the list: it is
                  a reading of those numbers, so it belongs on the same line as them. */}
              <span className="mk-card-row">
                <em className="mk-strong">{t('site.mockup.uncommitted')}</em>
                <span className="mk-grow" />
                <i
                  data-mk="files-count"
                  data-one={t('site.mockup.oneFile')}
                  data-many={t('site.mockup.manyFiles')}
                />
                <span className="mk-gauge" data-mk="gauge">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <i className="mk-gauge-slot" key={i} />
                  ))}
                </span>
              </span>
              {FILES.map((f) => (
                <span className="mk-file" data-mk="file" key={f.name}>
                  <em>{f.name}</em>
                  <span className="mk-grow" />
                  {f.added ? <b className="mk-add">+{f.added}</b> : null}
                  {f.removed ? <b className="mk-del">−{f.removed}</b> : null}
                </span>
              ))}
            </span>

            {/* Commits. Appears once `/magic:commit` lands. */}
            <span className="mk-block" data-mk="commits">
              <span className="mk-card-row">
                <em className="mk-strong">{t('site.mockup.commits')}</em>
                <span className="mk-grow" />
                <i data-mk="ahead" data-text={t('site.mockup.aheadOfMain')} />
              </span>
              <span className="mk-commit">
                <em>feat(auth): add JWT middleware</em>
                <span className="mk-grow" />
                <i>now</i>
                <b className="mk-hash">a3f9c2d</b>
              </span>
            </span>

            {/* The pull request row appears on `/magic:pr`. */}
            <span className="mk-pr" data-mk="pr">
              <GitPullRequest size={12} />
              <b className="mk-mono">#87</b>
              <em>Add JWT auth middleware</em>
              <span className="mk-grow" />
              <i className="mk-pr-state" data-mk="pr-state" data-review={t('site.mockup.inReview')} data-merged={t('site.mockup.merged')}>
                {t('site.mockup.inReview')}
              </i>
            </span>
          </span>

          <span className="mk-grow" />
          <span className="mk-add-repo">{t('site.mockup.addRepo')}</span>
        </aside>
      </div>
    </div>
  )
}
