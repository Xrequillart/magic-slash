'use client'

import { useRef } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { MAGIC_COMMANDS } from '@/lib/commands'
import { beat, REST_MS, type TerminalStep, took, TYPE_MS, useCueRun } from './terminalRun'

/**
 * The review card's drawing: a black terminal running `/magic:resolve` and printing what
 * it did, line by line, as it does it.
 *
 * WHAT IT REPLACED — and this is the interesting part of the change. The card carried a
 * REVIEW THREAD: the file and line a comment was anchored to, the comment itself (this
 * repository's own house rule about a `className` racing a recipe), and a reply indented
 * under it on a rail. It was a good drawing of a conversation and it was entirely STATIC,
 * which the file it lived in admitted at length: its one moving part had been cut because
 * a punchline that arrives two seconds into an eleven-second loop is a panel with a hole
 * in it for two seconds out of every eleven.
 *
 * The product owner asked for the terminal instead, in the animation the skills band
 * already runs. Which resolves that whole argument rather than restating it: in a played-
 * back session nothing is a punchline that has not arrived — every line is either running
 * or done, and the resting state (see `useCueRun`) is the finished transcript. There is no
 * frame of this drawing that reads as broken.
 *
 * IT IS `SkillsRunTerminal`'s ANIMATION, SHARED RATHER THAN COPIED. `./terminalRun` holds
 * the step shape, the typing speed, the pacing, the duration format and the visibility-
 * gated loop; that module's header says what is shared and what is not. What this panel
 * does NOT take is the scroll — six lines fit in the frame, so there is nothing to scroll
 * — and the ticket cards, which are the other panel's own element.
 *
 * ── THE CARD IS `indigo`, AND THAT IS THE ONE RISK IN HERE ────────────────────────
 *
 * `WORKFLOW_STEPS` gives this step a dark ground (`lib/workflow.ts`), and a black panel on
 * a dark card is exactly the failure `SkillsRunTerminal` documents from the other
 * direction: it tried its own terminal on `midnight` and "the card's top edge simply
 * disappeared". A terminal is `bg-ink` on every machine and it needs a boundary to read as
 * a window ON the card rather than a hole IN it.
 *
 * So this panel does not use `ART_PANEL`'s `border-hairline` — dark ink at 8%, which on a
 * dark ground is nothing at all. It carries `ring-white/10` INSTEAD, which is the edge
 * `AppWindowMockup` uses for the same reason on the same ground, plus `shadow-lift` under
 * it. Verified on screen rather than reasoned about: the boundary is what makes the four
 * other cards' panels and this one read as the same kind of object.
 *
 * ── WHAT THE SESSION SAYS ─────────────────────────────────────────────────────────
 *
 * NO `ArtHeader`. The other four panels print their command in a header row because their
 * content is a record rather than a session; here the command is the FIRST LINE, typed,
 * which is where a terminal puts it. That also settles what happened to `/magic:review`,
 * which used to head this card: the step's copy still names both commands ("the diff gets
 * read the way a reviewer reads it, then every comment gets a fix, a commit and an
 * answer") and the drawing now shows the second one — the half where the work happens, and
 * the half the card's own title is named after ("Resolve the review").
 *
 * `aria-hidden` on the outermost node, like every drawing in this band: it paraphrases the
 * copy beside it, and announced it would say the same thing twice — the second time as
 * fragments of a fake session read out loud.
 */

/** The command, by id → what you type. Never spelled here; `lib/commands.ts` owns it. */
const RESOLVE = MAGIC_COMMANDS.find((command) => command.id === 'resolve')?.command ?? ''

/**
 * THE FIVE STEPS, read off `skills/magic-resolve/SKILL.md` rather than invented: it
 * retrieves the review comments (step 3), applies a fix per comment (step 5), validates
 * what it changed (step 5.9), commits and pushes (step 6), then replies in each thread it
 * resolved (step 7).
 *
 * IN THAT ORDER, WHICH IS THE ORDER THAT MATTERS. The reply comes LAST, after the push,
 * because a thread answered before the fix is on the branch is a thread answered with a
 * promise. That is the skill's own sequence and the one thing a reader who has done this
 * by hand will check.
 *
 * THE DURATIONS ARE PLAUSIBLE RATHER THAN MEASURED, on the shape of the real waits: reading
 * two threads off the API is seconds, fixing them is a minute and a half of an agent's
 * work, the checks are the test suite, the push and the replies are seconds again. A panel
 * where every step resolves in the same beat says the work is free.
 *
 * THE WORDING IS SHORT ON PURPOSE. This panel is ~240px wide against the skills band's
 * ~460, and a label plus its duration has to fit on one line: a line ending in an ellipsis
 * reads as a window too narrow for its output. Two threads and two files, so the counts
 * agree with each other down the column — and with the `+248 −96` on the commit card to
 * the left, which is the same piece of work travelling through all five drawings.
 */
const STEPS: readonly TerminalStep[] = [
  { doing: 'Reading the threads', text: '2 threads read', secs: 2.4 },
  { doing: 'Applying the fixes', text: '2 files fixed', secs: 88 },
  { doing: 'Running the checks', text: 'Lint and tests green', secs: 18.6 },
  { doing: 'Force-pushing', text: 'Force-pushed to #142', secs: 2.1 },
  { doing: 'Replying in the threads', text: 'Both threads resolved', secs: 1.7 },
]

/** The prompt line, and the width it opens to. See the reveal below for the `ch` slack. */
const LINE = `❯ ${RESOLVE}`
const CHARS = LINE.length + 1
const TYPE_TOTAL = LINE.length * TYPE_MS

/**
 * How long the empty prompt holds before the command starts typing.
 *
 * THIS CUE EXISTS FOR A MECHANICAL REASON, not a rhythmic one, and it is the one thing in
 * this file that `SkillsRunTerminal` did not need. A CSS transition needs a FROM-STATE
 * that has been rendered: over there the second command's line has sat at `0ch` for whole
 * seconds while the first phase played, so flipping it to its full width types it. Here
 * there is one phase, so if the command owned cue 0 its line would go from "not rendered"
 * straight to "full width" and simply appear — the transition having nothing to animate
 * from, on the first play AND on every wrap of the loop.
 *
 * So cue 0 is the prompt with nothing on it, cue 1 is the line typing, and the wrap back
 * to 0 snaps it shut again at `0ms`. 400ms is long enough to be a beat rather than a
 * flicker, and it is `PHASE_MS`'s value by eye rather than by import: that constant is the
 * gap BETWEEN two phases, which is not what this is.
 */
const PROMPT_MS = 400

/**
 * THE TIMELINE: the prompt holds, the command types, each step holds for its own beat,
 * then the whole thing rests before it starts over.
 *
 * BUILT AT MODULE LOAD, one counter, exactly as `SkillsRunTerminal` builds its own — cue
 * `n` is element `n`, so the cursor alone decides what is on screen. Written out here
 * rather than shared because it is six lines and the two panels' shapes differ: that one
 * folds a phase beat into every phase's last cue and carries ticket cards, this one has
 * one phase, no cards, and the empty-prompt cue above.
 */
const CUES: readonly number[] = [PROMPT_MS, TYPE_TOTAL, ...STEPS.map(beat), REST_MS]

/** The cue the command line types on. Cue 0 is the empty prompt — see `PROMPT_MS`. */
const TYPE_CUE = 1

/** The cue each step is revealed on: the two above come first, so step `i` is `i + 2`. */
const stepCue = (index: number) => index + TYPE_CUE + 1

export function ResolveRunTerminal() {
  const viewport = useRef<HTMLDivElement>(null)
  const cursor = useCueRun(CUES, viewport)

  return (
    // THE CROP, and it is the band's own: `-mb-6 -mr-4 pl-7 pt-6` is what the other four
    // drawings use, so this panel sits at the same inset and loses the same bottom strip.
    // The note under ④ in `WorkflowArt.tsx` records what this panel replaced.
    <div aria-hidden className="-mb-6 -mr-4 pl-7 pt-6">
      {/* `h-56` LIKE ITS THREE NARROW NEIGHBOURS, so the five cards' panels are the same
          height whatever is inside them. The content comes to 172px of the 200 that stay
          visible after the crop — six 18px lines, 16px of padding either side — which is
          the one measurement to redo if a sixth step is ever added.

          `bg-ink` because a terminal is `bg-ink` on every machine, `ring-white/10` because
          the card under it is dark and 8% dark ink is not a boundary there, `shadow-lift`
          because a dark panel with no shadow looks cut into its ground. The header above
          has the longer version. */}
      <div
        ref={viewport}
        className="h-56 overflow-hidden rounded-xl bg-ink shadow-lift ring-1 ring-inset ring-white/10"
      >
        {/* `text-[11px] leading-5` IS THE SKILLS PANEL'S OWN TYPE, to the pixel, and it
            was 10px/18 for one pass. Two reasons to match it: the request was that
            drawing's animation, and two terminals a screen apart set at different sizes
            read as two different products. It also FILLS THE FRAME — seven 20px lines
            plus 16px of padding is 172px of the 200 that stay visible after the crop,
            where the smaller type left 68px of empty black at the bottom and made the
            panel look half-rendered. */}
        <div className="p-4 font-mono text-[11px] leading-5">
          {/* THE CONTEXT LINE, which never animates: Claude Code prints where it is
              running, and this is where the repository and the pull request are named now
              that there is no header row to name them in. `magic-pay` is the placeholder
              the app's own window mockup uses, so the two drawings on this page are the
              same fictional repository. */}
          <div className="truncate text-onink-faint">~/dev/magic-pay · PR #142</div>

          {/* THE COMMAND LINE. `max-width` in `ch` over a monospace face is a
              per-character reveal, and `steps()` on the transition is what makes it read
              as typing rather than as a box growing. One character of slack because `❯` is
              U+276F, whose advance width is the font's business rather than a guaranteed
              `1ch`.

              The duration is zero once the line is past, so a command already typed does
              not retype itself when a later cue re-renders the tree, and the wrap back to
              cue 0 snaps it shut rather than un-typing it. */}
          <div
            className="mt-1.5 overflow-hidden whitespace-nowrap motion-reduce:transition-none"
            style={
              cursor === null
                ? undefined
                : {
                    maxWidth: cursor < TYPE_CUE ? '0ch' : `${CHARS}ch`,
                    transitionProperty: 'max-width',
                    transitionDuration: cursor === TYPE_CUE ? `${TYPE_TOTAL}ms` : '0ms',
                    transitionTimingFunction: `steps(${CHARS}, end)`,
                  }
            }
          >
            <span className="text-accent">❯</span>{' '}
            <span className="text-white">{RESOLVE}</span>
          </div>

          <div className="mt-1.5">
            {STEPS.map((step, index) => {
              // THREE STATES AND NOT TWO: a step is pending, then running, then done. A
              // line that simply appears with a green check beside it has skipped the part
              // where the work happened, which is the part this card is about.
              const cue = stepCue(index)
              const running = cursor === cue
              const done = cursor === null || cursor > cue

              return (
                <div
                  key={step.text}
                  className={`flex items-center gap-2 transition-all duration-200 ease-out motion-reduce:transition-none ${
                    running || done ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                  }`}
                >
                  {done ? (
                    // `green`, the declared status token, meaning what it means everywhere
                    // else in the product: a step that finished.
                    <Check className="h-2.5 w-2.5 shrink-0 text-green" />
                  ) : (
                    <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin text-accent motion-reduce:animate-none" />
                  )}
                  {/* The running step is the one to read, so it keeps the full white the
                      finished ones give up. */}
                  <span className={`min-w-0 truncate ${done ? 'text-onink-body' : 'text-white'}`}>
                    {done ? step.text : step.doing}
                  </span>
                  {/* THE ELAPSED TIME, right-aligned into a column of its own, arriving
                      only when the step FINISHES — a duration on a step still running
                      would be a measurement of something that has not happened yet. */}
                  {step.secs !== undefined && done ? (
                    <span className="ml-auto shrink-0 pl-2 text-onink-faint">
                      {took(step.secs)}
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
