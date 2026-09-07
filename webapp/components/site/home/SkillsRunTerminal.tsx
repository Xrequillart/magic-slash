'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { MAGIC_COMMANDS, type MagicCommandId } from '@/lib/commands'
import { JiraMark } from '../features/TicketCardMockup'

/**
 * The drawing beside the skills band: a Claude Code session carrying ONE STORY from an
 * idea to a merged pull request, seven commands deep, printing what each step took — and
 * scrolling itself as it goes, the way the terminal on your own machine does. It ends on a
 * green card with the total.
 *
 * WHY IT IS THIS AND NOT ANOTHER DIAGRAM. The band's claim is that eight skills carry a
 * ticket end to end and barely stop to ask you anything, and every other way of drawing
 * that is a diagram SOMEBODY MADE: a ring, a rail, five cards. A transcript is the only
 * one that is also the thing itself — what you would see on your screen — and the argument
 * the band is making is precisely that this is what the work looks like now.
 * `SkillsTimeline` (the rail on the pillars card) and `WorkflowArt` (the five cards'
 * drawings) both say the loop is a sequence; only this says it is a SESSION.
 *
 * IT IS THE ANIMATION THE SITE USED TO HAVE, brought back and then taken further.
 * `home/terminalAnimation.ts` and `home/DesktopMockup.tsx` played six phases with a typed
 * command each and loaders resolving into checks, and both were deleted when the landing
 * page was repositioned (`98587f3f`). What came back is the CHOREOGRAPHY and not the code:
 * that version was ~560 lines of imperative timers ported verbatim out of `docs/script.js`,
 * mutating ~30 elements through class changes, and its markup was dressed entirely by
 * `marketing.css` — the stylesheet the `(marketing)` layout deliberately no longer imports
 * (`lib/homepageStylesheet.test.ts` fails the build on that import coming back).
 *
 * ── WHY THIS IS DRIVEN BY JAVASCRIPT, HAVING SHIPPED ON CSS ───────────────────────
 *
 * It shipped as fifteen CSS keyframes on one 24-second `infinite` loop: seven typed
 * commands, seven single result lines, one resting prompt, every arrival time baked into
 * its own keyframe because a delay on an `infinite` animation applies to the first
 * iteration only (`statusIn`'s note in `tailwind.config.ts` holds that argument, and it is
 * still true). That was the right tool for one line per command. It is the wrong tool for
 * what the product owner asked for next, and the reasons are specific rather than a matter
 * of taste:
 *
 *   • THE SCROLL CANNOT BE WRITTEN DOWN. Keeping the newest line near the bottom edge
 *     means translating the column by the CUMULATIVE HEIGHT of everything above it, and a
 *     stylesheet cannot compute that — it would have to be thirty-odd hand-measured pixel
 *     stops in a keyframe, wrong again the first time a line was reworded, and wrong
 *     SILENTLY. A script reads `getBoundingClientRect()` and is right by construction.
 *   • TWENTY-ONE STEPS, THREE CARDS AND SEVEN COMMANDS is 32 arrival times. As keyframes
 *     that is 32 blocks in the config whose percentages have to be recomputed by hand
 *     whenever a step is added — and each step now has TWO states (running, then finished
 *     with its duration), which a single keyframe cannot express without a second one.
 *   • THE DURATIONS ARE DATA. `beat()` below derives each step's screen time from the
 *     seconds the tool actually takes, so a duration and its pacing move together. In a
 *     stylesheet the two would be a number in a keyframe and a string in the markup, with
 *     nothing tying them.
 *
 * WHAT THE LOOP KEPT: it still loops, which is the behaviour the owner picked over
 * play-once-with-a-replay-button. What it lost is CSS's two real advantages — no mount
 * cost, and keeping time while the tab is backgrounded. The second is why the run is gated
 * on an `IntersectionObserver`: the timer only runs while the panel is actually on screen,
 * and entering the viewport restarts the run from the top, so a reader who scrolls to this
 * band sees the session BEGIN rather than joining it halfway.
 *
 * THE RESTING STATE IS EVERYTHING VISIBLE, and that is not a detail. `cursor` starts at
 * `null` — which is what the server renders, what the first client render agrees on, and
 * what a reader who asked for reduced motion keeps — and `null` means every line is shown,
 * untranslated, with no inline `max-width`. So with JavaScript unavailable, blocked or
 * still downloading, the panel is the finished transcript rather than an empty black
 * rectangle. `components/site/Reveal.tsx` sets out at length why that discipline is worth
 * the hydration blink it costs, and this follows it exactly.
 *
 * ── SEVEN COMMANDS, AND THE EIGHTH IS NOT MISSING ─────────────────────────────────
 *
 * `/magic:continue` is absent and that is a decision rather than a gap. It is not a stage
 * of a ticket's life — it is how you re-enter one you left, a fact about a working DAY —
 * which is the same reasoning `lib/workflow.ts` sets out for having five steps where there
 * are eight commands, and `workflow.test.ts` pins that gap from the other side. A
 * transcript that ran `continue` between `start` and `commit` would be showing a session
 * being resumed inside a session that had never stopped.
 *
 * The band's copy says EIGHT, and it is right to: eight is what ships. Seven is the path
 * one ticket takes through them, which is what a transcript can show.
 *
 * ── HOW IT ENDS ───────────────────────────────────────────────────────────────────
 *
 * ON A GREEN CARD saying the ticket is done, with the total the twenty-one steps add up
 * to. It ended on an empty prompt and a blinking caret for one round; the reasoning for
 * the swap is on the card itself, along with the fact that this is the ending the
 * animation this replaces already had.
 *
 * ── THE THREE TICKET CARDS ────────────────────────────────────────────────────────
 *
 * `/magic:plan` is the one phase that produces OBJECTS rather than lines, and it now draws
 * them: an epic and its two stories, arriving one at a time under the step that opened
 * them, as cards rather than as a sentence claiming they exist. The owner's brief — "sur
 * le plan on est 3 card (1 epic et 2 stories) qui s'affiche à l'étape de création de
 * ticket. en mode card de ticket quoi !"
 *
 * THE RECIPE IS BORROWED, not invented: `features/TicketCardMockup.tsx` already draws a
 * ticket inside a `bg-ink` window — `rounded-xl bg-white/[0.06]`, the key beside `JiraMark`
 * in `font-semibold text-white`, a `rounded-full` pill in its own tint — and this is that
 * card at the transcript's smaller scale. `JiraMark` is imported from it rather than
 * redrawn, so there is one Jira glyph on the site and not two.
 *
 * THE TWO STORIES ARE INDENTED UNDER THE EPIC, which is the only thing in the panel that
 * says which of the three is the parent. A flat stack of three cards would have needed the
 * reader to take "1 epic and 2 stories" on trust from the pills.
 *
 * ── THE SCROLL ────────────────────────────────────────────────────────────────────
 *
 * EVERY ROW RESERVES ITS SPACE FROM THE FIRST FRAME — hidden rows are transparent, not
 * absent — and the column is then translated so that the NEWEST revealed row sits `PAD`
 * above the viewport's bottom edge. That is the rule the old animation's `scrollToEl` used,
 * and it has three properties worth naming:
 *
 *   • the viewport is ALWAYS FULL. The previous version reserved the same space and never
 *     scrolled, so the panel spent the first third of every cycle as mostly empty black —
 *     the one real complaint against it, recorded here because it is the reason the scroll
 *     is not merely decorative.
 *   • it is MONOTONE by construction. Row bottoms increase down the column, so the
 *     translate only ever grows; nothing can jump backwards mid-run.
 *   • THE PLAN SCROLLS AWAY ON ITS OWN. By the time `/magic:start` has printed its five
 *     steps the epic and its stories have left the top of the frame, which is what the
 *     owner asked for ("une fois qu'on passe au start on scroll pour cacher le plan et les
 *     ticket") without a special case anywhere: they are simply the oldest thing in a
 *     terminal that has kept printing.
 *
 * The offsets are MEASURED, once after mount and again whenever the panel's width changes,
 * from `data-cue` markers on the rows themselves. So adding a step or rewording one needs
 * no number adjusted anywhere — which is the whole point of not writing this in keyframes.
 *
 * ── THE STRINGS ───────────────────────────────────────────────────────────────────
 *
 * THE COMMANDS ARE SPELLED FROM `MAGIC_COMMANDS`, never typed here. That module is the
 * canonical list and the template-literal type on `command` is what makes it safe:
 * `/magic:pln` does not compile, where a literal in the markup below would have rendered a
 * command the product does not have. Same arrangement as `WorkflowArt.tsx`, which
 * documents it at length.
 *
 * EVERYTHING ELSE IS AN ENGLISH LITERAL IN BOTH LANGUAGES and none of it is a catalogue
 * key. Every line in a terminal is a string the TOOL prints — a branch name, a commit
 * subject, a ticket transition, a pull request number, an elapsed time — in the
 * repository's own language, and this repository commits in English (CLAUDE.md's
 * conventions, enforced by commitlint). Translating them would show output the product does
 * not produce. That is the rule `WorkflowArt.tsx` states and every drawing on the site
 * follows; `StartTerminal` is the one panel that does use keys, and its five lines are
 * CAPTIONS of a run rather than the run's own output.
 *
 * WHICH IS WHY THIS FILE NEEDS NO `lib/` MODULE beside it, unlike the band it sits in.
 * `lib/skillsBand.ts` exists because the band's copy is prose in two languages and a
 * missing key renders as an empty element in silence; there is no such risk here.
 *
 * `aria-hidden`, at the outermost node. It is a drawing of a terminal; every line in it
 * paraphrases the band's own copy beside it, and announced it would say the same thing
 * twice — the second time as fifty fragments of a fake session read out loud.
 *
 * NO WINDOW CHROME. It is a black card and not a drawn window — the reasoning, and what
 * was removed to get there, is on the card itself below.
 */

/** The commands, by id → what you type. See the header: never spelled here. */
const COMMAND = Object.fromEntries(MAGIC_COMMANDS.map((c) => [c.id, c.command])) as Record<
  MagicCommandId,
  string
>

type Step = {
  /**
   * What the line says WHILE IT IS RUNNING — present progressive, beside a spinner.
   *
   * A SECOND STRING PER STEP, and it is the fix for the thing that gave the panel away.
   * Every line used to carry its finished wording from the moment it appeared, so the
   * first frame of the run read "Idea explored, spec written" next to a spinner: a step
   * announcing in the past tense that it had done the thing it was still doing. Nothing
   * else in the drawing was as obviously written rather than recorded.
   *
   * NO ELLIPSIS ON ANY OF THEM. The spinner already says it is going; a trailing "…"
   * beside a spinner is the same word twice.
   */
  doing: string
  /** What it says once it has finished — past tense, beside a check. */
  text: string
  /**
   * How long the tool takes, in seconds. Formatted by `took()` rather than written out, so
   * the number that PACES the animation and the number on screen can never disagree — see
   * `beat()`.
   *
   * ABSENT WHERE NOTHING WAS TIMED, and there are exactly three such lines. Two are
   * artefacts rather than work (the commit subjects); the third is the approval, which is
   * YOU clicking, and putting a duration on a human decision would be the drawing claiming
   * to have measured the reader.
   */
  secs?: number
  /**
   * Milliseconds to hold this step as running, overriding `beat()`.
   *
   * ONE STEP USES IT: "Waiting for your approval". It has no `secs` — a human decision is
   * not a measurement — so `beat()` would give it the floor, and the floor is the beat a
   * sub-second step gets. That is the one moment in twenty-three seconds where the product
   * stops and asks the reader for something, which is the band's own third claim standing
   * right beside it, and it cannot go past faster than "Pushed to origin".
   */
  hold?: number
}

type Ticket = {
  key: string
  /** `Epic` or `Story`, in Jira's own words. */
  kind: string
  /** The pill's tint pair, from the declared palette. */
  tint: string
  title: string
}

type Phase = {
  id: MagicCommandId
  /** The argument the command actually takes, if it takes one. */
  arg?: string
  steps: readonly Step[]
  /** `/magic:plan` only: the epic and its stories. */
  tickets?: readonly Ticket[]
}

/**
 * THE RUN: one story, seven commands, twenty-one steps and three tickets.
 *
 * MORE THAN ONE LINE PER COMMAND, which is what this pass is about. It shipped with
 * exactly one result line each and the product owner called it: "il y a qu'une seul ligne
 * par skill. ce n'est pas trop réel." A real `/magic:start` reads the ticket, cuts the
 * worktree, installs, plans and implements — five distinct waits, four of them long enough
 * that you go and do something else — and a single "worktree and agent ready" was hiding
 * the part of the product that does the most work.
 *
 * AND TWO WORDINGS PER STEP, which is the other half of the same complaint: what a step
 * says while it is RUNNING and what it says once it is DONE are different sentences. See
 * `doing` on `Step` for the frame that made that obvious.
 *
 * THE STEPS ARE THE SKILLS' OWN, not invented: they were read off `skills/magic-<name>/SKILL.md`
 * phase by phase. `plan` explores, writes a reviewable spec, STOPS for approval, then opens
 * the epic and its stories. `start` reads the tracker, creates the worktree on a new branch,
 * installs dependencies, drafts a plan for review, then implements. `commit` splits the
 * working tree into atomic conventional commits. `pr` pushes, opens the pull request and
 * moves the ticket. `review` reads the diff and posts comments. `resolve` answers each one
 * and force-pushes. `done` confirms the merge, cleans both ends and closes the ticket.
 *
 * ONE TICKET, AND IT IS THE STORY RATHER THAN THE EPIC. `/magic:plan` opens `PROJ-142` and
 * two children; the run then starts `PROJ-143`, the first story, and every later line names
 * that one. Getting this wrong is the easiest way to make a transcript read as fiction — a
 * session that plans an epic and then starts the epic is not how anybody works, and the
 * three cards sitting right above it make the mismatch visible.
 *
 * THE DURATIONS ARE PLAUSIBLE RATHER THAN MEASURED, and they are the point of the pass all
 * the same: dependencies take 8.4 seconds, a drafted plan takes twelve, an implementation
 * takes four minutes, a review of two hundred changed lines takes eleven seconds and
 * answering two comments takes a minute and a half. Those are the shapes of the real waits.
 * A panel where every step resolves in the same beat says the work is free, which is both
 * untrue and less impressive than the truth.
 */
const RUN: readonly Phase[] = [
  {
    id: 'plan',
    steps: [
      {
        doing: 'Exploring the idea, writing the spec',
        text: 'Idea explored, spec written',
        secs: 38,
      },
      // THE ONE HUMAN BEAT IN THE RUN, and the only step whose running wording is about
      // the READER rather than the tool. `/magic:plan` writes a spec and STOPS; nothing is
      // opened on the tracker until you say yes. The band's third claim beside this panel
      // is "you approve the plan, the rest runs itself", and this is that sentence drawn.
      { doing: 'Waiting for your approval', text: 'Spec approved', hold: 900 },
      {
        doing: 'Opening the epic and its stories',
        text: 'Epic and 2 stories opened on Jira',
        secs: 1.6,
      },
    ],
    tickets: [
      {
        key: 'PROJ-142',
        kind: 'Epic',
        tint: 'bg-purple/20 text-purple',
        title: 'JWT authentication',
      },
      {
        key: 'PROJ-143',
        kind: 'Story',
        tint: 'bg-green/20 text-green',
        title: 'Sign and verify the tokens',
      },
      {
        key: 'PROJ-144',
        kind: 'Story',
        tint: 'bg-green/20 text-green',
        title: 'Refresh them silently',
      },
    ],
  },
  {
    id: 'start',
    arg: 'PROJ-143',
    steps: [
      { doing: 'Reading PROJ-143 from Jira', text: 'PROJ-143 read from Jira', secs: 0.9 },
      {
        doing: 'Creating the worktree and branch',
        text: 'Worktree and branch created',
        secs: 1.4,
      },
      { doing: 'Installing dependencies', text: 'Dependencies installed', secs: 8.4 },
      { doing: 'Drafting the plan', text: 'Plan drafted and approved', secs: 12.2 },
      { doing: 'Implementing', text: 'Implemented, 4 files changed', secs: 252 },
    ],
  },
  {
    id: 'commit',
    steps: [
      {
        doing: 'Splitting the working tree',
        text: 'Working tree split into 2 commits',
        secs: 2.6,
      },
      // The two subjects the split produced. Their running wording is the same on both,
      // because from the outside it is: the tool is committing, twice.
      { doing: 'Committing', text: 'feat(auth): add JWT middleware' },
      { doing: 'Committing', text: 'test(auth): cover the refresh path' },
    ],
  },
  {
    id: 'pr',
    steps: [
      { doing: 'Pushing to origin', text: 'Pushed to origin', secs: 2.1 },
      { doing: 'Opening the pull request', text: 'Pull request #87 opened', secs: 1.3 },
      { doing: 'Moving PROJ-143 on Jira', text: 'PROJ-143 → In review', secs: 0.8 },
    ],
  },
  {
    id: 'review',
    arg: '87',
    steps: [
      { doing: 'Reading the diff', text: 'Diff read: 4 files, +214 −18', secs: 11.4 },
      { doing: 'Posting the comments', text: '2 comments posted on the PR', secs: 1.7 },
    ],
  },
  {
    id: 'resolve',
    steps: [
      { doing: 'Addressing both comments', text: 'Both comments addressed', secs: 98 },
      { doing: 'Force-pushing', text: 'Force-pushed to #87', secs: 2.3 },
    ],
  },
  {
    id: 'done',
    steps: [
      { doing: 'Confirming the merge', text: 'Merge confirmed on GitHub', secs: 0.7 },
      { doing: 'Cleaning both ends up', text: 'Branch and worktree removed', secs: 1.5 },
      { doing: 'Closing PROJ-143', text: 'PROJ-143 → Done', secs: 0.9 },
    ],
  },
]

/** Milliseconds a character takes to type. ~17 a second — somebody typing a command they know. */
const TYPE_MS = 60

/** How long a ticket card takes to land. */
const CARD_MS = 220

/** The beat between one phase finishing and the next command starting to type. */
const PHASE_MS = 400

/** How long the finished transcript holds before the run starts over. */
const REST_MS = 3000

/**
 * How long a step stays on screen as RUNNING, from the seconds it actually takes.
 *
 * NOT A CONSTANT AND NOT PROPORTIONAL, and the middle ground is the whole design. Every
 * step taking the same beat says the work is free; playing the real durations to scale
 * would spend four of the loop's twenty-three seconds on one implementation and flash the
 * sub-second steps past unread. So a long step reads as longer than a short one, inside a
 * floor and a ceiling that keep all of it legible: 260ms of fixed cost, 45ms a second on
 * top, clamped to [360, 900].
 *
 * Which puts 0.9s at the floor, 8.4s at ~640ms, 12.2s at ~810ms, and everything from ~14s
 * up at the ceiling. A step with no duration at all — an artefact, or your own approval —
 * takes the floor.
 */
const beat = (step: Step) =>
  step.hold ??
  (step.secs === undefined
    ? 360
    : Math.round(Math.min(900, Math.max(360, 260 + step.secs * 45))))

/**
 * The seconds a step took, as the tool prints them: one decimal under a minute, minutes
 * and seconds over it.
 *
 * FORMATTED AND NOT WRITTEN OUT, so `beat()` above and the string on screen are the same
 * number. A hand-typed "4m 12s" beside a `secs: 252` is two places to edit and one of them
 * will be forgotten.
 */
const took = (secs: number) =>
  secs < 60 ? `${secs.toFixed(1)}s` : `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`

type Cued<T> = T & { cue: number }

type Built = {
  id: MagicCommandId
  /** The whole prompt line, `❯` included — what gets typed. */
  line: string
  /** The width the line opens to, in `ch`. See below for the slack. */
  chars: number
  typeMs: number
  cue: number
  steps: Cued<Step>[]
  tickets: Cued<Ticket>[]
}

/**
 * THE TIMELINE, built once at module load: a flat list of how long each cue holds, and
 * every element in the transcript carrying the index of its own cue.
 *
 * ONE COUNTER AND NOT TWO, which is the point of building it rather than writing the
 * indices down. The markup below reads `cue` off these objects, so the order the run is
 * declared in IS the order it plays in — there is no second list of numbers to keep in
 * step, and adding a step shifts everything after it for free.
 *
 * THE PHASE BEAT IS FOLDED INTO THE LAST CUE OF EACH PHASE rather than being a cue of its
 * own. A cue that revealed nothing would break the one invariant this model rests on: cue
 * `n` is element `n`, so `cursor` alone decides what is on screen AND where the column has
 * scrolled to.
 */
const { phases, cues, restCue } = (() => {
  const cues: number[] = []
  const push = (ms: number) => cues.push(ms) - 1

  const phases: Built[] = RUN.map((phase) => {
    const line = `❯ ${COMMAND[phase.id]}${phase.arg ? ` ${phase.arg}` : ''}`
    const typeMs = line.length * TYPE_MS
    const built: Built = {
      id: phase.id,
      line,
      // ONE CHARACTER OF SLACK. `❯` is U+276F and not ASCII, so its advance width is a
      // font's business rather than a guaranteed `1ch`, and a line that opened to exactly
      // its own count would clip its last character wherever the glyph runs wide. The
      // slack costs one step of the reveal, in which nothing appears.
      chars: line.length + 1,
      typeMs,
      cue: push(typeMs),
      steps: [],
      tickets: [],
    }
    built.steps = phase.steps.map((step) => ({ ...step, cue: push(beat(step)) }))
    built.tickets = (phase.tickets ?? []).map((ticket) => ({ ...ticket, cue: push(CARD_MS) }))
    cues[cues.length - 1] += PHASE_MS
    return built
  })

  return { phases, cues, restCue: push(REST_MS) }
})()

/**
 * WHAT THE WHOLE TICKET TOOK, on the closing card — the sum of every step's own seconds.
 *
 * DERIVED AND NOT TYPED, for `took()`'s reason and more sharply: it is the one number in
 * the panel a reader could actually check against the twenty-one above it, so a hand-typed
 * total would be the one thing in the drawing that is provably wrong the first time a step
 * is retimed. Steps with no duration — the approval, the two commit subjects — contribute
 * nothing, which is right: a total of the WAITS is what "how long did this take" means
 * here, and the approval's length is the reader's own business.
 */
const TOTAL = RUN.flatMap((phase) => phase.steps).reduce((sum, step) => sum + (step.secs ?? 0), 0)

/**
 * How much clear space is kept under the newest revealed row.
 *
 * It is the column's own bottom padding, which is what makes the panel look like a terminal
 * that has just printed rather than one cut off mid-line.
 */
const PAD = 20

export function SkillsRunTerminal() {
  /**
   * Which cue is CURRENT. `null` is the resting state — what the server renders, what the
   * first client render agrees on, and where "the run has not started" and "somebody asked
   * for less motion" are deliberately the same thing: everything shown, nothing translated.
   * See the header.
   */
  const [cursor, setCursor] = useState<number | null>(null)

  /**
   * The measured geometry: the bottom of every cue's row, relative to the column's own top,
   * and the viewport's height. `null` until the first measurement, which is also the state a
   * server render is in — so the transform is simply absent until there is a real number to
   * put in it.
   */
  const [box, setBox] = useState<{ bottoms: number[]; view: number } | null>(null)

  const viewport = useRef<HTMLDivElement>(null)
  const column = useRef<HTMLDivElement>(null)

  // MEASURE, rather than compute. Row heights come out of the type scale, the gaps and
  // whatever the cards' copy wraps to, and the only thing that knows all three is the
  // browser. Re-measured on any width change, because a narrower panel is a taller card.
  useEffect(() => {
    const view = viewport.current
    const col = column.current
    if (!view || !col) return

    const measure = () => {
      // Both rects move together under the transform, so a bottom measured against the
      // column's own top is transform-invariant — which matters because this can run
      // mid-scroll.
      const top = col.getBoundingClientRect().top
      const bottoms: number[] = []
      col.querySelectorAll<HTMLElement>('[data-cue]').forEach((el) => {
        bottoms[Number(el.dataset.cue)] = el.getBoundingClientRect().bottom - top
      })
      setBox({ bottoms, view: view.clientHeight })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(view)
    return () => observer.disconnect()
  }, [])

  // THE RUN. Gated on visibility rather than started on mount: the timer costs nothing
  // while the panel is off screen, and entering the viewport restarts from the top so a
  // reader arrives at the beginning of the session instead of the middle of it.
  useEffect(() => {
    const view = viewport.current
    if (!view) return
    // Reduced motion keeps the resting state, which is already the finished transcript —
    // nothing to sit through, and nothing that has to arrive for the panel to be readable.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    let timer: number | undefined
    const stop = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = undefined
    }
    const play = (at: number) => {
      setCursor(at)
      timer = window.setTimeout(() => play(at + 1 >= cues.length ? 0 : at + 1), cues[at])
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        stop()
        if (entry.isIntersecting) play(0)
      },
      // The same threshold the animation this replaces used, so the run still begins where
      // the visitor can actually see it.
      { threshold: 0.3 },
    )
    observer.observe(view)
    return () => {
      observer.disconnect()
      stop()
    }
  }, [])

  // THE SCROLL: put the newest revealed row `PAD` above the bottom edge, and never above
  // the top of the column. Monotone for free, since row bottoms increase down the column.
  const scroll =
    cursor === null || box === null
      ? 0
      : Math.max(0, (box.bottoms[Math.min(cursor, box.bottoms.length - 1)] ?? 0) - box.view + PAD)

  return (
    // THE PLATE. `rose`, and it is the first thing on the site to ask for that ground.
    // `tailwind.config.ts` declares it "a surface the palette offers" with no page naming
    // it yet, which is exactly what it is for — the alternative being a gradient pasted at
    // this call site that nobody could find again.
    //
    // WHY NOT A DARK PLATE, which is what the reference has. A terminal is `bg-ink` on
    // every machine, and `StartTerminal`'s own header states the rule this rests on: the
    // contrast against a pale ground is what makes a dark panel read as a window ON the
    // plate rather than as a hole IN it. Tried on `midnight` — ink into a deepened brand —
    // and the card's top edge simply disappeared.
    //
    // WHY NOT `sky`, which would have been the obvious pale choice: the two bands directly
    // above this one already carry it (the pillars card `StartTerminal` cannot leave, and
    // the workflow band's plan card), and a third within one screen turns a tone into the
    // page's default. `rose` is also warm, which is the one thing the plate can say about
    // whose agent this is — Anthropic's own colour is not in the blue family either.
    <div aria-hidden className="rounded-2xl bg-tone-rose p-5 sm:p-7 lg:p-8">
      {/* THE CARD. NO WINDOW CHROME AT ALL — no titlebar, no traffic lights, no window
          title — by the product owner's call: "retire la titlebar et les trois bouton mac
          dans la mock stp. je veux juste un card noir".

          IT HAD ALL THREE and the argument for them was that a drawn window reads as a
          real thing photographed. The argument against is better and it is the one
          `StartTerminal` already makes in its own header ("a window whose top-left corner
          is a traffic light is a window someone drew"): the transcript is the subject, and
          36px of grey chrome above it is the only part of the drawing a reader has to look
          past to reach it. The band directly below this one shows the app's window WITH its
          titlebar, faithfully, because there the window IS the subject — so the page
          carries exactly one set of traffic lights and they are on the picture of the
          actual product.

          `shadow-lift`, the top rung of the declared elevation scale and the same one
          `StartTerminal` and `AppWindowMockup` sit on: a dark panel on a pale ground with
          no shadow looks cut into the plate, and with the lift it looks placed on it.

          `h-[22rem]` — 352px — IS THE VIEWPORT, and it is the number the whole scroll is
          measured against. It is chosen so the plan phase and its three cards fit at once,
          because that is the one moment in the run the reader is meant to see whole; every
          later phase is shorter, so the frame then stays full of the two or three most
          recent things that happened. `sm:h-[26rem]` gives the copy column beside it
          something to be level with once there is room for both.

          `overflow-hidden` is what the scroll scrolls inside, and it clips the transcript
          to the card's radius while it is at it. */}
      <div
        ref={viewport}
        className="h-[22rem] overflow-hidden rounded-xl bg-ink shadow-lift sm:h-[26rem]"
      >
        {/* THE COLUMN. The padding is HERE and not on the viewport, so the top gutter
            scrolls away with the banner exactly as it would in a real terminal, and the
            bottom one is the `PAD` the newest line keeps under it.

            `will-change-transform` because this element is translated on a 600ms transition
            some thirty times a cycle, and without it the whole transcript is re-rasterised
            on each one. */}
        <div
          ref={column}
          className="p-5 font-mono text-[11px] leading-5 transition-transform duration-[600ms] ease-out will-change-transform motion-reduce:transition-none"
          style={{ transform: `translateY(-${scroll}px)` }}
        >
          {/* THE SESSION BANNER, and it is the one block here that never animates. Claude
              Code prints its own banner on start, so this is the honest first two lines of
              the run — and it is where the repository is named, now that there is no
              titlebar to name it in. `stellar-api` is a placeholder, like `PROJ-142`:
              recognisably not this repository, so a reader who has never seen the product
              does not take it for a real path. */}
          <div className="text-onink-faint">
            <div className="truncate">
              <span className="text-accent">✳</span> Welcome to Claude Code
            </div>
            <div className="truncate">~/dev/stellar-api · 8 magic-slash skills</div>
          </div>

          {phases.map((phase) => (
            // `mt-4` between phases and nothing inside one: a command and everything it
            // printed are one beat, and the air belongs between the beats.
            <div key={phase.id} className="mt-4">
              {/* THE COMMAND LINE. `max-width` in `ch` units over a monospace face is a
                  per-character reveal, and `steps()` on the TRANSITION is what makes it
                  read as typing rather than as a box growing.

                  A TRANSITION AND NOT AN ANIMATION, which is the opposite of what
                  `components/site/Reveal.tsx` concluded for the page entrance — and the
                  difference is that its from-state and to-state were two adjacent React
                  commits, which the browser is free to collapse into a single mutation.
                  Here the from-state (`0ch`) has been on screen for whole seconds before
                  this phase's turn comes round, so there is nothing to race: the flip to
                  the full width is a resolved style changing, which is what a transition is
                  for.

                  The duration is zero once the phase is past, so a command already typed
                  does not retype itself when a later cue re-renders the tree — and the wrap
                  back to `cursor === 0` snaps every line shut rather than un-typing seven
                  of them at once. */}
              <div
                data-cue={phase.cue}
                className="overflow-hidden whitespace-nowrap motion-reduce:transition-none"
                style={
                  cursor === null
                    ? undefined
                    : {
                        maxWidth: cursor < phase.cue ? '0ch' : `${phase.chars}ch`,
                        transitionProperty: 'max-width',
                        transitionDuration: cursor === phase.cue ? `${phase.typeMs}ms` : '0ms',
                        transitionTimingFunction: `steps(${phase.chars}, end)`,
                      }
                }
              >
                <span className="text-accent">❯</span>{' '}
                <span className="text-white">{phase.line.slice(2)}</span>
              </div>

              {phase.steps.map((step) => {
                // THREE STATES AND NOT TWO, which is the other half of what "more real"
                // meant: a step is pending before it is done, and the duration it reports
                // is how long it spent pending. A panel where a line simply appears with a
                // green check beside it has skipped the part where the work happened.
                const running = cursor === step.cue
                const done = cursor === null || cursor > step.cue

                return (
                  <div
                    key={step.doing + step.text}
                    data-cue={step.cue}
                    className={`flex items-center gap-2 transition-all duration-200 ease-out motion-reduce:transition-none ${
                      running || done ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                    }`}
                  >
                    {done ? (
                      // `green`, the declared status token, meaning here exactly what it
                      // means everywhere else in the product: a step that finished.
                      <Check className="h-3 w-3 shrink-0 text-green" />
                    ) : (
                      <Loader2 className="h-3 w-3 shrink-0 animate-spin text-accent motion-reduce:animate-none" />
                    )}
                    {/* The running step is the one to read, so it keeps the full white the
                        finished ones give up. `min-w-0 truncate` rather than letting the
                        card's own crop do it: a line that ends in an ellipsis reads as a
                        window too narrow for its output, where one sliced by the card's
                        edge reads as a rendering bug. */}
                    <span className={`min-w-0 truncate ${done ? 'text-onink-body' : 'text-white'}`}>
                      {done ? step.text : step.doing}
                    </span>
                    {/* THE ELAPSED TIME, right-aligned into a column of its own. Beside its
                        sentence it would sit at a different place on every row; in a column
                        the eye can run down the durations on their own, which is the whole
                        reason they are worth printing. It arrives only when the step
                        FINISHES — a duration on a step still running would be a measurement
                        of something that has not happened yet. */}
                    {step.secs !== undefined && done ? (
                      <span className="ml-auto shrink-0 pl-3 text-onink-faint">
                        {took(step.secs)}
                      </span>
                    ) : null}
                  </div>
                )
              })}

              {phase.tickets.length > 0 ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  {phase.tickets.map((ticket, index) => (
                    <div
                      key={ticket.key}
                      data-cue={ticket.cue}
                      // THE STORIES SIT IN FROM THE EPIC — the only thing in the panel that
                      // says which of the three is the parent. See the header.
                      className={`rounded-lg bg-white/[0.06] px-2.5 py-1.5 transition-all duration-300 ease-out motion-reduce:transition-none ${
                        index > 0 ? 'ml-4' : ''
                      } ${
                        cursor === null || cursor >= ticket.cue
                          ? 'translate-y-0 opacity-100'
                          : 'translate-y-1 opacity-0'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <JiraMark className="h-3 w-3 shrink-0" />
                        <span className="font-semibold text-white">{ticket.key}</span>
                        <span
                          className={`ml-auto shrink-0 rounded-full px-1.5 text-[10px] font-medium ${ticket.tint}`}
                        >
                          {ticket.kind}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-onink-body">{ticket.title}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {/* WHAT THE RUN COMES TO REST ON: a green card saying the ticket is done, by the
              product owner's call — "à la fin mettre un card vert avec un check avec un
              message tâche fini ! plutôt que d'avoir un chevron input".

              IT IS THE OLD ANIMATION'S OWN ENDING, coming back. `DesktopMockup.tsx` closed
              its six phases on a `cli-success-banner` — a check and the words "Task
              complete!" — and the wording here is that one, minus the exclamation mark the
              rest of this site does not use.

              WHAT IT REPLACED, and why the swap is right rather than merely asked for: an
              empty `❯` with a blinking caret. That said the SHELL was idle, which is true
              and is not the point — a reader who has just watched twenty-one steps go by
              wants to be told the TICKET landed, and a prompt waiting for input is an
              invitation to type rather than a conclusion. It also left the panel's last
              frame as its emptiest, which is a strange note to end a loop on.

              THE CARD SHAPE IS THE TICKET CARDS' — two rows, `rounded-lg`, a right-hand
              column — so the thing that closes the run is visibly the same kind of object
              as the three the run opened with. Only the ground changes: `green/10` under
              `green` ink, the status token that means "finished" everywhere else in this
              product.

              NOTHING BLINKS IN THE PANEL ANY MORE, which is why the note about seven
              carets is gone with the caret: the run now ends on something static, and the
              only thing that still moves at rest is nothing at all. */}
          <div
            data-cue={restCue}
            className={`mt-4 rounded-lg bg-green/10 px-2.5 py-1.5 transition-all duration-300 ease-out motion-reduce:transition-none ${
              cursor === null || cursor >= restCue
                ? 'translate-y-0 opacity-100'
                : 'translate-y-1 opacity-0'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {/* A FILLED check rather than the stroked one the steps carry. Those mark a
                  step that finished; this marks the whole thing finishing, and a disc is
                  the one shape in the transcript that reads as a full stop. `text-ink` on
                  it, because the ground it sits on is the green. */}
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-green">
                <Check className="h-2.5 w-2.5 text-ink" strokeWidth={3.5} />
              </span>
              <span className="font-semibold text-green">Task complete</span>
              {/* The total, which is the one number here a reader can add up themselves —
                  see `TOTAL`. */}
              <span className="ml-auto shrink-0 pl-3 text-onink-faint">{took(TOTAL)}</span>
            </div>
            {/* It names the ticket the run STARTED, which is what closes the loop: the
                panel opened on three cards and ends by saying what became of one of them. */}
            <div className="mt-0.5 truncate text-onink-body">PROJ-143 merged and closed</div>
          </div>
        </div>
      </div>
    </div>
  )
}
