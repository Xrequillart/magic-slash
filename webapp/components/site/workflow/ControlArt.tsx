'use client'

import { Check, GitMerge, Loader2 } from 'lucide-react'
import { MAGIC_COMMANDS } from '@/lib/commands'
import { useT } from '@/lib/i18n/useLanguage'
import { ART_COPY } from '@/lib/workflowPage'
import { useLoopStep } from '../features/useLoopStep'
import { Pointer } from '../Pointer'

/**
 * THE THREE DRAWINGS OF `/workflow`'S CONTROL BAND THAT ARE ITS OWN, each asked for by the
 * product owner in place of a homepage drawing that stood there first:
 *
 *   • `PlanTerminalArt` — a terminal running the start command up to the moment it asks:
 *     the plan on screen, and the choice between building it and reworking it. The
 *     homepage's start card shows the agent AFTER the command; this card is about the stop
 *     before the code, so it has to show the stop.
 *   • `CommitListArt` — a white card listing commits, the branch drawn in yellow down
 *     their left, cropped bottom and right. Only commits: the graph the homepage draws ends
 *     on a pull request, and this card's claim is about the history itself.
 *   • `MergeButtonArt` — GitHub's green button, a cursor that arrives and presses it, a
 *     loader, then the merged state. The claim beside it is that nothing in the loop
 *     presses this; the drawing shows the reader's own hand doing it.
 *
 * EVERY STORYBOARD RUNS ON `useLoopStep`, the clock `/features`' PR card uses: one state
 * change per beat, and under `prefers-reduced-motion` the story rests on its LAST step,
 * which for all three is the state with the most in it.
 *
 * WHAT IS LANGUAGE AND WHAT IS NOT. A terminal prints what the tool prints, and Claude
 * Code prints English, so the transcript is literal in both languages, exactly as
 * `StartTerminal` and `SkillsRunTerminal` argue. Commit subjects are in the repository's
 * commit language, which here is English. GitHub's button says what GitHub's button says.
 * The one word that is ours is the caption on the merged state, and it is a key.
 *
 * `aria-hidden` on every panel: drawings, whose words paraphrase the card's own copy.
 */

const START = MAGIC_COMMANDS.find((command) => command.id === 'start')!.command

/**
 * ── The plan, and the stop ────────────────────────────────────────────────────────
 *
 * Eight beats over eleven seconds: the command typed, two lines of the agent settling in,
 * then the plan's heading and its three steps landing one by one, then the question with
 * the first answer selected. The loop rests on the question for the last three seconds,
 * because the question is the card.
 *
 * `h-80`, taller than the `h-56` the homepage's panels stand at, by request: the plan has
 * to be readable, and a plan is four lines under a transcript of three. `-mb-6 -mr-8` crop
 * it bottom and right the way `StartTerminal` is cropped, so the window reads as one you
 * are seeing part of.
 */
const PLAN_AT = [0, 900, 1700, 2500, 3300, 3900, 4500, 5300] as const
const PLAN_LOOP = 11000

const PLAN_STEPS = [
  'Add an offline mode to the editor: a local queue, replayed on reconnect',
  'Persist every keystroke in IndexedDB before it reaches the network',
  'Reconcile the queue against the server copy when the connection returns',
] as const

export function PlanTerminalArt() {
  const step = useLoopStep(PLAN_AT, PLAN_LOOP)
  const shown = (beat: number) => step >= beat

  return (
    <div aria-hidden className="-mb-6 -mr-8 pl-7 pt-6">
      <div className="h-80 overflow-hidden rounded-tl-2xl bg-ink p-4 font-mono text-xs leading-relaxed shadow-lift">
        <div className="flex items-center gap-1.5 text-white">
          <span className="text-accent">❯</span>
          <span>{START} PROJ-142</span>
        </div>

        <ul className="mt-3 space-y-1 text-onink-body">
          <Line on={shown(1)}>
            <Tick /> Ticket read, repository resolved
          </Line>
          <Line on={shown(2)}>
            <Tick /> Worktree created on <span className="text-white">feature/142</span>
          </Line>
        </ul>

        <div className={`mt-4 transition-opacity duration-300 ${shown(3) ? 'opacity-100' : 'opacity-0'}`}>
          <p className="font-semibold text-white">Plan</p>
          <ol className="mt-1.5 space-y-1 text-onink-body">
            {PLAN_STEPS.map((text, index) => (
              <Line key={text} on={shown(4 + index)}>
                <span className="w-4 shrink-0 text-white/40">{index + 1}.</span>
                <span className="min-w-0 truncate">{text}</span>
              </Line>
            ))}
          </ol>
        </div>

        <div className={`mt-4 transition-opacity duration-300 ${shown(7) ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white">Would you like to proceed?</p>
          <div className="mt-1.5 space-y-0.5">
            <p className="-mx-2 rounded bg-white/10 px-2 py-0.5 text-white">
              <span className="text-accent">❯</span> 1. Yes, start implementing
            </p>
            <p className="px-2 py-0.5 text-onink-body">&nbsp; 2. No, review the plan</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Line({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2 transition-all duration-300 ${
        on ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
      }`}
    >
      {children}
    </li>
  )
}

function Tick() {
  return <Check className="h-3.5 w-3.5 shrink-0 text-green" strokeWidth={2.5} />
}

/**
 * ── The history ───────────────────────────────────────────────────────────────────
 *
 * Six commits on one branch, the branch drawn as a yellow rail down the left with a dot per
 * commit, the subject beside each and its short hash pushed right. The subjects are this
 * repository's own conventional-commit shape, with scopes CLAUDE.md actually lists, the way
 * `CommitsCardMockup` reasons: an invented subject is the one thing a reader could catch.
 *
 * `yellow` is the status token, and it is asked for here because the reference the owner
 * brought is a git client's graph, where a branch's colour is a branch's colour and means
 * nothing else. A white card on the `midnight` ground, `-mb-6 -mr-8` off the bottom and
 * the right edge: the list runs past the frame, which is what a history does.
 */
const COMMITS: readonly { hash: string; subject: string }[] = [
  { hash: 'a3f1c92', subject: 'feat(desktop): queue offline edits in IndexedDB' },
  { hash: '7b40e18', subject: 'feat(desktop): replay the queue on reconnect' },
  { hash: 'c1d8a05', subject: 'refactor(desktop): lift the editor state out of the view' },
  { hash: '5e2f7b3', subject: 'test(desktop): cover the reconcile path' },
  { hash: 'd9c4160', subject: 'fix(desktop): keep the caret through a reload' },
  { hash: '2f8b6ae', subject: 'docs(readme): describe the offline mode' },
]

export function CommitListArt() {
  return (
    <div aria-hidden className="-mb-6 -mr-8 pl-7 pt-6">
      <div className="min-w-96 rounded-tl-xl border border-hairline bg-white p-4 shadow-lift">
        <ul className="relative">
          {/* THE BRANCH: one rail behind the dots, from the first to past the last. */}
          <span className="absolute bottom-0 left-[7px] top-2 w-0.5 rounded-full bg-yellow" />
          {COMMITS.map((commit) => (
            <li key={commit.hash} className="relative flex items-center gap-3 py-1.5 text-xs">
              <span className="relative z-10 h-4 w-4 shrink-0 rounded-full border-[3px] border-yellow bg-white" />
              <span className="min-w-0 flex-1 truncate text-ink/80">{commit.subject}</span>
              <span className="shrink-0 rounded border border-hairline px-1.5 py-0.5 font-mono text-[11px] text-ink/50">
                {commit.hash}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * ── The button ────────────────────────────────────────────────────────────────────
 *
 * GitHub's own control, at a size a reader recognises across the band: green, the merge
 * glyph, "Merge pull request" in the platform's words. Five beats on a seven-second loop:
 * the cursor waits off to the side, glides onto the button, presses (the button dips), the
 * label turns into a spinner, and the button settles on a tick and the one word that is
 * ours. IT STAYS GREEN, by request: it went purple for a round, the colour every git host
 * paints a merged badge, and the owner wanted the button to stay the button it was. What
 * sells the object instead is the darker green hairline round it, the one-shade-down
 * border GitHub's own primary carries: `border-black/20` over the green, which is a darker
 * green without a second green in the palette.
 *
 * THE CURSOR IS THE POINT OF THE DRAWING. The claim beside this card is that the loop
 * never presses this button; a hand arriving from outside the frame to do it is the claim
 * drawn. It leaves once the merge lands, so the still (and the reduced-motion state) is the
 * merged button alone.
 */
const MERGE_AT = [0, 1000, 2000, 2250, 3600] as const
const MERGE_LOOP = 7000

export function MergeButtonArt() {
  const { t } = useT()
  const step = useLoopStep(MERGE_AT, MERGE_LOOP)
  const pressed = step === 2
  const loading = step === 3
  const merged = step >= 4

  return (
    <div aria-hidden className="flex items-center justify-center px-7 py-10">
      {/* `scale-125`: the button is drawn at GitHub's own size and magnified as one object,
          cursor included, so the proportions between the two stay the platform's. */}
      <div className="relative scale-125">
        <span
          className={`inline-flex items-center gap-2.5 rounded-lg border-2 border-black/20 bg-green px-6 py-3.5 font-display text-base font-bold text-white shadow-lift transition-all duration-200 ${
            pressed ? 'scale-95 brightness-90' : ''
          }`}
        >
          {merged ? (
            <>
              <Check className="h-5 w-5" strokeWidth={2.5} />
              {t(ART_COPY.merged)}
            </>
          ) : loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Merging…
            </>
          ) : (
            <>
              <GitMerge className="h-5 w-5" />
              Merge pull request
            </>
          )}
        </span>

        {/* THE CURSOR, positioned from the button's bottom-right corner: off in the plate
            at rest, on the label's last word once it has arrived. `transition-transform`
            draws the glide; the press is the button's, not the cursor's. */}
        <div
          className={`absolute transition-all duration-700 ease-out ${merged ? 'opacity-0' : 'opacity-100'}`}
          style={{
            right: 14,
            bottom: 6,
            transform: step >= 1 ? 'translate(0, 0)' : 'translate(90px, 70px)',
          }}
        >
          <Pointer pressed={pressed} />
        </div>
      </div>
    </div>
  )
}
