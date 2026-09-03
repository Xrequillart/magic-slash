'use client'

import { Circle, CheckCircle2 } from 'lucide-react'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The visual inside the `/magic:done` card: the five things the skill actually closes
 * out, ticking off one after another.
 *
 * EVERY LINE IS CHECKED AGAINST `skills/magic-done/SKILL.md`, because this card is the
 * one on the page that could most easily promise a cleanup the tool does not do:
 *
 *   • the merge is CONFIRMED first — the skill's flow is "verify merge → update tracker
 *     → update desktop → clean up → report", and nothing below happens without it;
 *   • the branch goes locally (§5.5.3) and on the remote (§5.5.4, best-effort);
 *   • the worktree is removed with `git worktree remove --force` (§5.5.1), then pruned;
 *   • the ticket gets a final comment (§Step 3, unless `issues.commentOnPR` is false).
 *
 * THE FIFTH LINE IS NOT "AGENT DELETED", and that is a correction rather than a choice.
 * The skill does not delete anything in the app: it POSTs `status=PR merged` and a
 * `Done - {TICKET_ID}` title to `/metadata` (§Step 4). The agent stays in the sidebar
 * with its history, which is the point — you can still read what it did. Writing
 * "deleted" here would have been the page claiming a cleanup the product deliberately
 * does not perform.
 *
 * A WHITE CARD, and it sits BESIDE the copy rather than under it, because `/magic:done`
 * is a full-row card — the same treatment `/magic:plan` gets at the other end of the
 * grid. `ToneCard`'s `beside` slot does that; this component knows nothing about it, and
 * its padding is symmetrical so it reads correctly wherever the card puts it.
 *
 * `bg-white` on `tone-mint`, which is the rule every panel here follows: clear your own
 * ground. `mint` runs #E4F6EB to #BCE3CD — pale, but a clear step off white.
 *
 * THE TICK IS LAYERED, NOT CROSSFADED, unlike the CI checks on the PR card. `CheckCircle2`
 * is a circle plus a polyline and `Circle` is that same circle, so the green one covers
 * the muted one exactly and one opacity is enough. The spinner case needed two because a
 * spinner's arc and a tick's stroke do NOT coincide — they show through each other.
 *
 * `aria-hidden`, and the whole panel: it is a drawing, and its words paraphrase the card's
 * own description sitting directly above it.
 */

/**
 * 400ms apart, which on the 5s loop is 8% per step. Each row runs TWO animations on the
 * same beat: `done-N` fills its box, `strike-N` draws the line across its label.
 */
const STEPS: readonly { key: MessageKey; tick: string; strike: string }[] = [
  { key: 'site.doneCard.merged', tick: 'animate-done-1', strike: 'animate-strike-1' },
  { key: 'site.doneCard.branch', tick: 'animate-done-2', strike: 'animate-strike-2' },
  { key: 'site.doneCard.worktree', tick: 'animate-done-3', strike: 'animate-strike-3' },
  { key: 'site.doneCard.ticket', tick: 'animate-done-4', strike: 'animate-strike-4' },
  { key: 'site.doneCard.agent', tick: 'animate-done-5', strike: 'animate-strike-5' },
]

export function DoneChecklistMockup() {
  const { t } = useT()

  return (
    <div aria-hidden className="-mr-14 py-7 pl-7">
      <div className="min-w-96 rounded-xl border border-hairline bg-white p-4">
        <ul className="flex flex-col gap-2.5">
          {STEPS.map((step) => (
            <li key={step.key} className="flex items-center gap-2.5">
              <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                {/* The empty box, always there. The tick lands on top of it. */}
                <Circle className="absolute h-4 w-4 text-ink/20" />
                <CheckCircle2
                  className={`absolute h-4 w-4 text-green ${step.tick} motion-reduce:animate-none`}
                />
              </span>
              {/* The label, with the strike drawn over it. `relative` and `w-fit` so the
                  bar spans the TEXT rather than the row — a line running to the card's
                  edge past the end of a short label reads as a rule, not as a
                  strike-through. `top-1/2` puts it on the x-height's middle.

                  `w-full` on the bar is its resting state, which is what makes
                  `motion-reduce:animate-none` land on a struck line rather than on an
                  undrawn one. */}
              <span className="relative w-fit max-w-full">
                <span className="block truncate text-sm text-ink/70">{t(step.key)}</span>
                <span
                  className={`absolute left-0 top-1/2 h-px w-full bg-ink/40 ${step.strike} motion-reduce:animate-none`}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
