'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, Loader2 } from 'lucide-react'
import { MAGIC_COMMANDS, type MagicCommandId } from '@/lib/commands'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import type { WorkflowStepId } from '@/lib/workflow'
import { ART_COPY } from '@/lib/workflowPage'
import { PullRequestCard } from '../features/PullRequestCardMockup'
import { REST_MS, TYPE_MS, took, useCueRun } from '../home/terminalRun'

/**
 * ONE TERMINAL FOR FOUR STEPS: a Claude Code session running the step's command(s), a
 * loader on every line while the tool works, a tick and a duration when it finishes, and a
 * card at the end showing the artefact the step produced. Whole, on its plate, at the
 * product owner's ask: "le terminal en entier, pas de cropé", with "des loader à chaque
 * étape", ending on the card that step is about.
 *
 * WHY ONE COMPONENT AND FOUR SCRIPTS. The four steps after the plan are all the same
 * gesture (type a command, watch it work, get a thing), and four terminals written out
 * separately would have been four typing recipes, four loader rows and four rest beats
 * that drift the day one is tuned. So the terminal is the engine and each step is a
 * SCRIPT: a list of segments, each a command, a task, a block of lines or a card, and the
 * engine turns the list into cues and the cues into what is on screen.
 *
 * THE CLOCK IS `useCueRun`, the homepage's: gated on the panel being in view, restarting
 * from the top each time it is, and never starting under `prefers-reduced-motion`, where
 * the resting state (`cursor === null`) is the finished transcript with its card. A
 * segment is PENDING before its cue, RUNNING on it, DONE after it. The start script ends on
 * a task that never finishes on purpose ("Implementation under way", held, then the loop
 * wraps): the owner wanted the story to stop at the implementation and begin again.
 *
 * WHAT IS LANGUAGE AND WHAT IS NOT. The transcript is what Claude Code and the skills
 * print, and they print English, so every line is a literal in both languages, the rule
 * `SkillsRunTerminal` and `ResolveRunTerminal` follow. The two cards that carry a sentence
 * of OURS, the approved card and the cleanup checklist, go through the catalogues: the
 * first through `ART_COPY`, the second through `site.doneCard.*`, which `/features` owns
 * and audits against the skill.
 *
 * `aria-hidden` on the panel: a drawing, whose lines paraphrase the copy beside it.
 */

type Segment =
  | { kind: 'command'; id: MagicCommandId; arg?: string }
  | { kind: 'task'; doing: string; text: string; secs?: number; hold?: number }
  /**
   * A block of lines shown while its cue runs. `after` is what stands in its place once the
   * story has moved on: the plan and its question give way to one line saying the plan was
   * approved, so the transcript reads as a record rather than a menu left open.
   */
  | { kind: 'lines'; lines: readonly React.ReactNode[]; hold: number; after?: string }
  | { kind: 'card'; node: React.ReactNode }

const COMMAND = Object.fromEntries(MAGIC_COMMANDS.map((c) => [c.id, c.command])) as Record<
  MagicCommandId,
  string
>

/** How long a task shows its loader: floored so a sub-second step still reads as a step. */
const running = (secs?: number, hold?: number) =>
  hold ?? (secs === undefined ? 500 : Math.round(Math.min(1400, Math.max(500, 300 + secs * 60))))

const typing = (segment: Extract<Segment, { kind: 'command' }>) =>
  (COMMAND[segment.id].length + (segment.arg ? segment.arg.length + 1 : 0)) * TYPE_MS + 350

/** The cue durations, one per segment; the card's is the rest before the loop wraps. */
function cuesOf(script: readonly Segment[]): number[] {
  return script.map((segment) => {
    switch (segment.kind) {
      case 'command':
        return typing(segment)
      case 'task':
        return running(segment.secs, segment.hold)
      case 'lines':
        return segment.hold
      case 'card':
        return REST_MS + 1500
    }
  })
}

/** The repository and ticket every script runs against: the app's own placeholder. */
const CONTEXT = '~/dev/magic-pay-318 · PAY-318'
const PR = 318

/** The plan and the question under it, shown together, then replaced by the approval. */
const PLAN_LINES = [
  <span key="h" className="font-semibold text-white">Plan</span>,
  '1. Add an offline queue to the editor, replayed on reconnect',
  '2. Persist every keystroke in IndexedDB before the network',
  '3. Reconcile the queue against the server copy on return',
  <span key="q" className="mt-1.5 block text-white">Would you like to proceed?</span>,
  <span key="1" className="-mx-2 block rounded bg-white/10 px-2 text-white">
    <span className="text-accent">❯</span> 1. Yes, start implementing
  </span>,
  <span key="2" className="block px-2">&nbsp; 2. No, review the plan</span>,
]

const SCRIPTS: Record<Exclude<WorkflowStepId, 'plan'>, readonly Segment[]> = {
  start: [
    { kind: 'command', id: 'start', arg: 'PAY-318' },
    { kind: 'task', doing: 'Reading the ticket', text: 'Ticket read, repository resolved', secs: 0.8 },
    { kind: 'task', doing: 'Creating the worktree', text: 'Worktree created on feature/PAY-318', secs: 1.2 },
    { kind: 'task', doing: 'Installing dependencies', text: 'Dependencies installed', secs: 14.2 },
    { kind: 'task', doing: 'Drafting the plan', text: 'Implementation plan drafted', secs: 22.5 },
    { kind: 'lines', lines: PLAN_LINES, hold: 3600, after: 'Plan approved' },
    { kind: 'task', doing: 'Implementation under way', text: 'Implementation under way', hold: 4000 },
  ],
  commit: [
    { kind: 'command', id: 'commit' },
    { kind: 'task', doing: 'Reading the working tree', text: 'Working tree read, 9 files changed', secs: 0.4 },
    { kind: 'task', doing: 'Splitting the changes', text: 'Split into 3 atomic commits', secs: 1.8 },
    { kind: 'task', doing: 'Writing the messages', text: 'Conventional messages written', secs: 2.1 },
    { kind: 'command', id: 'pr' },
    { kind: 'task', doing: 'Pushing the branch', text: 'Branch pushed to origin', secs: 2.6 },
    { kind: 'task', doing: 'Describing the pull request', text: 'Pull request described from the diff', secs: 4.3 },
    { kind: 'task', doing: 'Updating the ticket', text: 'Ticket linked, moved to In review', secs: 0.9 },
    { kind: 'card', node: <PullRequestCard passed={0} review="none" comments={0} number={PR} /> },
  ],
  review: [
    { kind: 'command', id: 'review', arg: `#${PR}` },
    { kind: 'task', doing: 'Reading the diff', text: 'Diff read against the project conventions', secs: 6.4 },
    { kind: 'task', doing: 'Posting the findings', text: '3 findings posted on their lines', secs: 1.1 },
    { kind: 'command', id: 'resolve' },
    { kind: 'task', doing: 'Reading the threads', text: '3 threads read', secs: 0.7 },
    { kind: 'task', doing: 'Applying the fixes', text: 'Fixes applied in one commit', secs: 12.8 },
    { kind: 'task', doing: 'Replying', text: 'A reply posted in every thread', secs: 1.4 },
    { kind: 'task', doing: 'Re-requesting the review', text: 'Review re-requested', secs: 0.5 },
    { kind: 'card', node: <ApprovedCard /> },
  ],
  done: [
    { kind: 'command', id: 'done' },
    { kind: 'task', doing: 'Checking the merge on GitHub', text: 'Merge confirmed on GitHub', secs: 0.6 },
    { kind: 'task', doing: 'Closing the ticket', text: 'Ticket commented and closed', secs: 1.1 },
    { kind: 'task', doing: 'Updating magic-slash', text: 'Agent marked done in magic-slash', secs: 0.2 },
    { kind: 'task', doing: 'Deleting the branch', text: 'Branch deleted, locally and on the remote', secs: 0.8 },
    { kind: 'task', doing: 'Removing the worktree', text: 'Worktree removed', secs: 0.4 },
    { kind: 'card', node: <CleanupCard /> },
  ],
}

export function StepTerminal({ step }: { step: Exclude<WorkflowStepId, 'plan'> }) {
  const script = SCRIPTS[step]
  const cues = useRef(cuesOf(script)).current
  const viewport = useRef<HTMLDivElement>(null)
  const column = useRef<HTMLDivElement>(null)
  const cursor = useCueRun(cues, viewport)
  const scroll = useScrollToBottom(viewport, column, cursor)

  const state = (index: number): 'pending' | 'running' | 'done' =>
    cursor === null || cursor > index ? 'done' : cursor === index ? 'running' : 'pending'

  return (
    // A FIXED HEIGHT AND A SCROLL, not a panel that grows: the plate beside the copy has to
    // keep its size while the transcript lengthens, so the column slides up as lines land,
    // the way a terminal does, and the newest line is always the one at the bottom.
    <div
      ref={viewport}
      aria-hidden
      className="h-[24rem] overflow-hidden rounded-xl bg-ink shadow-lift ring-1 ring-inset ring-white/10"
    >
      <div
        ref={column}
        className="p-4 font-mono text-[11px] leading-5 transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translateY(-${scroll}px)` }}
      >
        <div className="truncate text-onink-faint">{CONTEXT}</div>

        <div className="mt-1.5 flex flex-col gap-0.5">
        {script.map((segment, index) => {
          const at = state(index)
          if (at === 'pending') return null

          switch (segment.kind) {
            case 'command':
              return <CommandLine key={index} segment={segment} typing={at === 'running'} />
            case 'task':
              return <TaskLine key={index} segment={segment} done={at === 'done'} />
            case 'lines':
              if (at === 'done' && segment.after) {
                return (
                  <TaskLine
                    key={index}
                    segment={{ kind: 'task', doing: segment.after, text: segment.after }}
                    done
                  />
                )
              }
              return (
                <div key={index} className="mt-1.5 text-onink-body animate-reveal-a motion-reduce:animate-none">
                  {segment.lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              )
            case 'card':
              return (
                <div key={index} className="mt-3 animate-reveal-a motion-reduce:animate-none">
                  {segment.node}
                </div>
              )
          }
        })}
        </div>
      </div>
    </div>
  )
}

/**
 * How far the column has to slide so its last line sits at the frame's bottom edge, with
 * the frame's own padding under it. Re-measured on every cue, because every cue can add a
 * line, and on resize, because a narrower frame is a taller column. Zero while the column
 * fits, so a short transcript stays anchored at the top like any terminal that has not
 * filled its window yet.
 */
function useScrollToBottom(
  viewport: React.RefObject<HTMLDivElement>,
  column: React.RefObject<HTMLDivElement>,
  cursor: number | null,
) {
  const [scroll, setScroll] = useState(0)

  useEffect(() => {
    const view = viewport.current
    const col = column.current
    if (!view || !col) return
    const measure = () => setScroll(Math.max(0, col.scrollHeight - view.clientHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(col)
    return () => observer.disconnect()
  }, [viewport, column, cursor])

  return scroll
}

/**
 * The typed command. `max-width` in `ch` over a monospace face is a per-character reveal
 * and `steps()` makes it read as typing; the duration is zero once the line is past, so a
 * typed command does not retype when a later cue re-renders the tree.
 */
function CommandLine({
  segment,
  typing: isTyping,
}: {
  segment: Extract<Segment, { kind: 'command' }>
  typing: boolean
}) {
  const text = segment.arg ? `${COMMAND[segment.id]} ${segment.arg}` : COMMAND[segment.id]
  // The prompt and its space come before the text, plus one of slack: `❯` is U+276F,
  // whose advance width is the font's business rather than a guaranteed `1ch`.
  const chars = text.length + 3

  return (
    <div
      className={`mt-1.5 overflow-hidden whitespace-nowrap ${isTyping ? 'animate-type-in motion-reduce:animate-none' : ''}`}
      style={{
        maxWidth: `${chars}ch`,
        ['--type-chars' as string]: `${chars}ch`,
        animationDuration: isTyping ? `${text.length * TYPE_MS}ms` : undefined,
        animationTimingFunction: isTyping ? `steps(${text.length}, end)` : undefined,
      }}
    >
      <span className="text-accent">❯</span> <span className="text-white">{text}</span>
    </div>
  )
}

function TaskLine({ segment, done }: { segment: Extract<Segment, { kind: 'task' }>; done: boolean }) {
  return (
    <div className="flex items-center gap-2 animate-reveal-a motion-reduce:animate-none">
      {done ? (
        <Check className="h-2.5 w-2.5 shrink-0 text-green" />
      ) : (
        <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-accent motion-reduce:animate-none" />
      )}
      <span className={`min-w-0 truncate ${done ? 'text-onink-body' : 'text-white'}`}>
        {done ? segment.text : segment.doing}
      </span>
      {segment.secs !== undefined && done ? (
        <span className="ml-auto shrink-0 pl-2 text-onink-faint">{took(segment.secs)}</span>
      ) : null}
    </div>
  )
}

/** The review terminal's ending: GitHub's approved state, as a card. */
function ApprovedCard() {
  const { t } = useT()
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-green/30 bg-green/15 px-3 py-2.5">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-green" />
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-green">{t(ART_COPY.approved)}</span>
      <span className="shrink-0 text-[10px] text-onink-faint">#{PR}</span>
    </div>
  )
}

/**
 * The done terminal's ending: the five things the skill closes out, ticked, on a white
 * card. The rows are `site.doneCard.*`, the ones `/features` audits against the skill line
 * by line, so this card cannot promise a cleanup the tool does not perform.
 */
const CLEANUP: readonly MessageKey[] = [
  'site.doneCard.merged',
  'site.doneCard.branch',
  'site.doneCard.worktree',
  'site.doneCard.ticket',
  'site.doneCard.agent',
]

function CleanupCard() {
  const { t } = useT()
  return (
    <ul className="flex flex-col gap-1.5 rounded-lg border border-hairline bg-white px-3 py-2.5 font-sans">
      {CLEANUP.map((key) => (
        <li key={key} className="flex items-center gap-2 text-xs text-ink/70">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green" />
          <span className="min-w-0 truncate">{t(key)}</span>
        </li>
      ))}
    </ul>
  )
}
