'use client'

import { useEffect, useState } from 'react'

/**
 * THE MACHINERY BEHIND A PLAYED-BACK TERMINAL SESSION: what a step is, how long it holds,
 * and the loop that walks the cues while the panel is on screen.
 *
 * EXTRACTED FROM `SkillsRunTerminal`, which owned all of this alone until the workflow
 * band's review card asked for the same thing at a fifth the size
 * (`ResolveRunTerminal.tsx`). What is here is what the two share exactly: the shape of a
 * step, the typing speed, the pacing function, the duration format, and the visibility-
 * gated run. What is NOT here is what differs — the skills panel builds phases with
 * ticket cards and scrolls itself by measured row bottoms; the resolve panel is one phase
 * that fits in its frame and never scrolls.
 *
 * WHY A MODULE AND NOT A COPY. `beat()` and `took()` are the two functions in that file
 * with a documented argument behind every number, and a second copy would be the one that
 * drifts — two terminals on one page typing at different speeds, or reporting a duration
 * in two formats, is the kind of difference a reader notices without being able to name
 * it. `useCueRun` is the harder half: it is 30 lines of observer, timer and cleanup that
 * has to be right about a reader who scrolls away mid-run and a reader who asked for less
 * motion, and getting that right twice is worse than getting it right once.
 *
 * IT IS A CLIENT MODULE. `useCueRun` reads `matchMedia` and holds a timer, so it can only
 * run in a browser — hence `'use client'` at the top, like every component that uses it.
 * Nothing in `lib/` may import it; nothing here imports React components, so it costs a
 * caller no markup.
 */

/**
 * One line of a played-back session: what it says while it runs, what it says when it is
 * done, and how long the tool actually took.
 *
 * TWO WORDINGS, WHICH IS THE THING THAT MAKES A TRANSCRIPT LOOK RECORDED. A line that
 * carries its finished wording from the moment it appears reads, on its first frame, as a
 * step announcing in the past tense that it has done the thing it is still doing — and
 * that was the single tell in the panel this came from. Present progressive beside a
 * spinner, past tense beside a check.
 *
 * NO ELLIPSIS ON A `doing`. The spinner already says it is going; a trailing "…" beside a
 * spinner is the same word twice.
 */
export type TerminalStep = {
  doing: string
  text: string
  /**
   * How long the tool takes, in seconds. Formatted by `took()` rather than written out, so
   * the number that PACES the animation and the number on screen cannot disagree.
   *
   * Left out where nothing was timed — an artefact rather than a wait, or a decision the
   * READER makes, which the drawing has no business claiming to have measured.
   */
  secs?: number
  /**
   * Milliseconds to hold this step as running, overriding `beat()`. For the step that is a
   * human beat rather than a measurement: `beat()` gives an untimed step the floor, and
   * the floor is what a sub-second step gets.
   */
  hold?: number
}

/** Milliseconds a character takes to type. ~17 a second — somebody typing a command they know. */
export const TYPE_MS = 60

/** The beat between one phase finishing and the next command starting to type. */
export const PHASE_MS = 400

/** How long a finished transcript holds before the run starts over. */
export const REST_MS = 3000

/**
 * How long a step stays on screen as RUNNING, from the seconds it actually takes.
 *
 * NOT A CONSTANT AND NOT PROPORTIONAL, and the middle ground is the whole design. Every
 * step taking the same beat says the work is free; playing the real durations to scale
 * would spend four seconds of a loop on one implementation and flash the sub-second steps
 * past unread. So a long step reads as longer than a short one, inside a floor and a
 * ceiling that keep all of it legible: 260ms of fixed cost, 45ms a second on top, clamped
 * to [360, 900].
 *
 * Which puts 0.9s at the floor, 8.4s at ~640ms, 12.2s at ~810ms, and everything from ~14s
 * up at the ceiling. A step with no duration at all takes the floor.
 */
export const beat = (step: TerminalStep) =>
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
export const took = (secs: number) =>
  secs < 60 ? `${secs.toFixed(1)}s` : `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`

/**
 * WALKS THE CUES WHILE THE PANEL IS ON SCREEN, and returns which one is current.
 *
 * `null` IS THE RESTING STATE, and that is not a loading state — it is what the server
 * renders, what the first client render agrees on, and what a reader who asked for reduced
 * motion keeps. Every caller must read `null` as "show everything, finished, untranslated",
 * so that with JavaScript unavailable, blocked or still downloading the panel is the
 * completed transcript rather than an empty black rectangle. `components/site/Reveal.tsx`
 * sets out at length why that discipline is worth the hydration blink it costs.
 *
 * GATED ON VISIBILITY rather than started on mount: the timer costs nothing while the
 * panel is off screen, and entering the viewport RESTARTS the run from the top, so a
 * reader who scrolls to the band sees the session begin instead of joining it halfway.
 * The 0.3 threshold is the one the CSS animation this replaced used.
 *
 * `cues` IS READ ONCE, at mount — it is a module-scope constant at both call sites, built
 * from data that cannot change at runtime, and putting it in the dependency list would
 * only invite a caller to pass a fresh array every render and restart the run on each one.
 * The eslint exhaustive-deps rule is not on for this package; the invariant is the note.
 */
export function useCueRun(
  cues: readonly number[],
  target: React.RefObject<HTMLElement>,
): number | null {
  const [cursor, setCursor] = useState<number | null>(null)

  useEffect(() => {
    const element = target.current
    if (!element) return
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
      { threshold: 0.3 },
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      stop()
    }
  }, [cues, target])

  return cursor
}
