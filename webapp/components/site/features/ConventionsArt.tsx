'use client'

import {
  CommitCard,
  PullRequestCard,
  SettingsCard,
  Text,
  WorkflowCanvas,
  type WorkflowCanvasLink,
  type WorkflowCanvasNode,
} from '@ds/desktop'
import { Check, Eye, Lock, Pencil, ShieldCheck, ShieldOff, Upload, Zap } from '@ds/desktop/icons'
import type { IconComponent } from '@ds/desktop/types'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { AppGround } from '../AppGround'
import { useLoopStep } from './useLoopStep'

/**
 * THE "YOUR CONVENTIONS" CARDS' DRAWINGS: one per card of the family, each built from the
 * desktop app's own design system (`@ds/desktop`) on its default dark theme, so what a card
 * shows is what the app draws, not a tracing of it.
 *
 * THEY REPLACED THREE FULL SETTINGS WINDOWS. The family used to be rows, three of them
 * carrying the whole Repositories page or a whole repository tab under their sentence:
 * accurate, and a wall of dark forms nobody reads on a page selling the product. As
 * ToneCards, each card now shows the ONE thing its sentence claims, cropped to it: the
 * piece of the workflow, a commit list in four formats, the pull request's body.
 *
 * THREE PLACEMENTS. A dark panel whole in the card's margin (`OnCard`); a dark panel bleeding off the card's right and bottom edges,
 * the way a screenshot is cropped into a frame (`Bleed`); a dark panel inset whole in a
 * full card's margin (`Inset`). All are `inert` and hidden from assistive tech: the card's
 * heading and sentence say what the drawing shows.
 *
 * ANIMATED WHERE THE CLAIM IS A CHOICE: the commit list cycles through its four formats,
 * the push switch turns on and off, the launch modes take turns. `useLoopStep` holds still
 * under reduced motion, on the last step.
 */

/** `inert` as the empty string, for React 18's reason: see `TasksModalMockup`. */
const INERT = { inert: '' } as unknown as { inert?: boolean }

const noop = () => undefined

/**
 * A panel cropped by the card: inset on the left, running off the right and bottom
 * edges. Its content keeps a right margin of its own, so a switch or a badge at the end
 * of a row is never the thing the crop cuts.
 */
function Bleed({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden {...INERT} className="pl-7 pt-2">
      <AppGround className="overflow-hidden rounded-tl-2xl border-l border-t border-white/10 py-4 pl-4 pr-7 shadow-lift">
        {children}
      </AppGround>
    </div>
  )
}

/** A dark panel whole in the card's margin, not cropped: the half cards' quieter placement. */
function OnCard({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden {...INERT} className="px-7 pb-7">
      <AppGround className="rounded-2xl border border-white/10 p-4 shadow-lift">{children}</AppGround>
    </div>
  )
}

/** A panel inside the card's margin, whole: the full-width cards'. */
function Inset({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div aria-hidden {...INERT} className="px-7 pb-7">
      <AppGround className={`overflow-hidden rounded-2xl border border-white/10 shadow-lift ${className}`}>{children}</AppGround>
    </div>
  )
}

// ---------------------------------------------------------------------------
// A workflow per repository: a zoom on the default flow.
// ---------------------------------------------------------------------------

/**
 * Three steps of the default flow, as `desktop/src/workflow/defaultFlow.ts` declares them:
 * the skills, their outcomes, and the links between them. A ZOOM, so three and not six:
 * the canvas fits what it is given, and three cards across a card's width read at the
 * editor's own size. PR hands over to Resolve on its own when the pull request has review
 * comments (the one automatic link, so the one with the pulse); Commit to PR is suggested.
 */
const FLOW_NODES: WorkflowCanvasNode[] = [
  { id: 'commit', label: 'Commit', skill: 'magic-commit', outcomes: ['committed'] },
  { id: 'pr', label: 'PR', skill: 'magic-pr', outcomes: ['pr_created', 'review_comments', 'ci_green'] },
  { id: 'resolve', label: 'Resolve', skill: 'magic-resolve', outcomes: ['resolved'] },
]

const FLOW_LINKS: WorkflowCanvasLink[] = [
  { from: 'commit', to: 'pr', kind: 'suggest' },
  { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
]

export function WorkflowZoomArt() {
  const { t } = useT()
  return (
    <Inset className="h-[300px]">
      <WorkflowCanvas
        nodes={FLOW_NODES}
        links={FLOW_LINKS}
        entry={['commit']}
        labels={{
          canvas: t('site.convArt.workflowCanvas'),
          minimap: t('site.convArt.workflowCanvas'),
          auto: t('site.convArt.workflowAuto'),
          suggest: t('site.convArt.workflowSuggest'),
          anyExit: t('site.convArt.workflowAnyExit'),
        }}
        className="h-full"
        frameless
        scrollPans={false}
        // The minimap is the editor's furniture, not the flow.
        minimap={false}
      />
    </Inset>
  )
}

// ---------------------------------------------------------------------------
// The commit format you use: one change, written four ways.
// ---------------------------------------------------------------------------

/**
 * The same three commits in each of the four formats the Commit tab offers. Commit
 * subjects are code, so they stay in English in both languages, like the app's samples.
 */
const FORMATS: readonly { name: string; shape: string; subjects: [string, string, string] }[] = [
  { name: 'Angular', shape: 'type(scope): description', subjects: ['feat(auth): add JWT refresh', 'fix(session): keep the session on reload', 'docs(auth): explain the token lifetime'] },
  { name: 'Conventional', shape: 'type: description', subjects: ['feat: add JWT refresh', 'fix: keep the session on reload', 'docs: explain the token lifetime'] },
  { name: 'Gitmoji', shape: 'emoji description', subjects: ['✨ add JWT refresh', '🐛 keep the session on reload', '📝 explain the token lifetime'] },
  { name: 'Free form', shape: 'free form', subjects: ['Add JWT refresh', 'Keep the session on reload', 'Explain the token lifetime'] },
]

const HASHES = ['a3f9c21', '7b2e0d4', 'e51c8aa'] as const

/** One format every 2.6s, looping. */
const FORMAT_STEPS = FORMATS.map((_, i) => i * 2600)

export function CommitFormatsArt() {
  const { t } = useT()
  const step = useLoopStep(FORMAT_STEPS, FORMATS.length * 2600)
  const format = FORMATS[Math.max(0, step)]
  return (
    <OnCard>
      <CommitCard
        label={t('site.convArt.commits')}
        summary={`${format.name} · ${format.shape}`}
        commits={format.subjects.map((subject, i) => ({
          hash: HASHES[i],
          shortHash: HASHES[i],
          subject,
          // No date: the subject is what the format changes, and it takes the room.
          relativeDate: '',
          copyLabel: HASHES[i],
        }))}
        onCopyHash={noop}
      />
    </OnCard>
  )
}

// ---------------------------------------------------------------------------
// The pull request, your way: what /magic:pr writes into it.
// ---------------------------------------------------------------------------

/**
 * The body /magic:pr writes from the repository's template: the summary, the ticket it
 * closes, and where the reviewer finds the test accounts. English, the pull request
 * language most repositories set; the card around it is the app's.
 */
const PR_BODY = `## Summary
Checkout in three steps instead of five.

Closes PAY-302

## How to test
Test accounts: docs/test-accounts.md`

export function PrDescriptionArt() {
  const { t } = useT()
  return (
    <Bleed>
      <PullRequestCard
        state="open"
        title="Checkout in three steps"
        subtitle="#214 · feature/PAY-302"
        badge={{ label: t('site.convArt.checksPassed'), tone: 'green' }}
        open={{ label: t('site.convArt.openPr'), onOpen: noop }}
      >
        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-surface-sunken px-3 py-2.5 font-mono text-xs leading-5 text-text-secondary">
          {PR_BODY}
        </pre>
      </PullRequestCard>
    </Bleed>
  )
}

// ---------------------------------------------------------------------------
// Main stays guarded, the push is yours to switch on.
// ---------------------------------------------------------------------------

/** Off for 2.4s, on for 3.2s: the push switch, flipped. */
const PUSH_STEPS = [0, 2400]

export function CommitGuardsArt() {
  const { t } = useT()
  const pushing = useLoopStep(PUSH_STEPS, 5600) === 1
  return (
    <OnCard>
      <SettingsCard
        title={t('site.convArt.branches')}
        rows={[
          {
            id: 'protected',
            icon: Lock,
            label: t('site.convArt.protectedLabel'),
            hint: t('site.convArt.protectedHint'),
            control: { kind: 'switch', checked: false, onChange: noop, label: t('site.convArt.protectedLabel') },
          },
          {
            id: 'push',
            icon: Upload,
            label: t('site.convArt.pushLabel'),
            hint: t(pushing ? 'site.convArt.pushHintOn' : 'site.convArt.pushHintOff'),
            control: { kind: 'switch', checked: pushing, onChange: noop, label: t('site.convArt.pushLabel') },
          },
        ]}
      />
    </OnCard>
  )
}

// ---------------------------------------------------------------------------
// How far an agent may go: the five launch modes, taking turns.
// ---------------------------------------------------------------------------

const MODES: readonly { id: string; icon: IconComponent; name: MessageKey; hint: MessageKey }[] = [
  { id: 'plan', icon: Eye, name: 'site.launchModes.plan', hint: 'site.launchModes.planHelp' },
  { id: 'default', icon: ShieldCheck, name: 'site.launchModes.default', hint: 'site.launchModes.defaultHelp' },
  { id: 'acceptEdits', icon: Pencil, name: 'site.launchModes.acceptEdits', hint: 'site.launchModes.acceptEditsHelp' },
  { id: 'auto', icon: Zap, name: 'site.launchModes.auto', hint: 'site.launchModes.autoHelp' },
  { id: 'bypass', icon: ShieldOff, name: 'site.launchModes.bypass', hint: 'site.launchModes.bypassHelp' },
]

/** A mode every 1.8s. Under reduced motion, the last step: Bypass would be the wrong still, so the list starts at Standard. */
const MODE_STEPS = MODES.map((_, i) => i * 1800)

export function LaunchModesMenuArt() {
  const { t } = useT()
  const step = useLoopStep(MODE_STEPS, MODES.length * 1800)
  const active = step < 0 ? 1 : step
  return (
    <div aria-hidden {...INERT} className="flex min-w-0 flex-1 items-center justify-center p-7 md:pl-0">
      <AppGround className="w-full max-w-md rounded-2xl border border-white/10 p-1.5 shadow-lift">
        {MODES.map((mode, i) => {
          const on = i === active
          return (
            <div
              key={mode.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300 ${on ? 'bg-accent/15' : ''}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-accent text-on-brand' : 'bg-ink/5 text-icon'}`}>
                <mode.icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <Text size="sm" weight="bold">{t(mode.name)}</Text>
                <Text size="2xs" tone="secondary" className="truncate">{t(mode.hint)}</Text>
              </span>
              <Check className={`h-4 w-4 shrink-0 text-accent transition-opacity duration-300 ${on ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          )
        })}
      </AppGround>
    </div>
  )
}
