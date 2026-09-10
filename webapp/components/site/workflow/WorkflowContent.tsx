'use client'

import { WORKFLOW_STEPS } from '@/lib/workflow'
import { ControlBand } from './ControlBand'
import { DayBand } from './DayBand'
import { StepBand } from './StepBand'
import { WorkflowHero } from './WorkflowHero'

/**
 * magic-slash.io/workflow — the loop, sold.
 *
 * THIS PAGE WAS A REFERENCE AND IT IS A PITCH NOW. It shipped as the honest minimum the
 * homepage band's button needed on the day the band did: five numbered rows, a sentence
 * each, the commands under them in monospace, on one narrow column. Its own header listed
 * what a full version would add, in the order the value was: the drawings, a worked example,
 * a paragraph for the one command with no step. This is that version, built out of the
 * blocks the homepage and `/desktop` already use rather than new ones, at the product
 * owner's ask ("en utilisant les différents styles de block qu'on a déjà").
 *
 * THE ORDER IS A SALES ARGUMENT, and it runs from the promise to the proof to the
 * objection:
 *
 *   • `WorkflowHero` — THE PROMISE, and the loop in one line: the homepage hero's own claim
 *     said where the page delivers on it, two ways on, and a rail of the five steps that is
 *     also the page's table of contents.
 *   • `StepBand` × 5 — THE PROOF, one step per band in cycle order, the side alternating:
 *     what you type, what you get (the step's own sentence), three things the skill does,
 *     and the artefact it produces on a plate in the step's colour. The same five steps the
 *     homepage draws as cards (`lib/workflow.ts`), at the depth cards have no room for.
 *   • `DayBand` — THE REST OF THE DAY, on the dark sheet: several tickets at once, picking
 *     one back up, the context in the app, the app calling you. `/magic:continue` lives
 *     here, because it is not a step (`lib/workflow.ts` on why).
 *   • `ControlBand` — THE OBJECTION, answered: where the loop stops for you, and the one
 *     thing it never does, which is press merge. Then the way on to `/features`.
 *
 * `FinalCtaSection` follows in `app/(marketing)/workflow/page.tsx`, so the page ends on the
 * ask, on the same dark sheet `DayBand` changed to.
 *
 * WHAT IS ON THE PAGE IS STILL NOT DECIDED HERE. `lib/workflow.ts` owns the five steps and
 * `lib/workflowPage.ts` owns everything this page says around them; both are pinned from
 * the root suite. This file is the order and nothing else.
 *
 * WHITE, not `canvas`, like `/faq`, `/features` and `/changelog`: the `(marketing)` layout
 * paints no ground, so whichever page owns one paints its own.
 */
export function WorkflowContent() {
  return (
    <div className="bg-white">
      <WorkflowHero />
      {WORKFLOW_STEPS.map((step, index) => (
        <StepBand key={step.id} step={step} index={index} />
      ))}
      <DayBand />
      <ControlBand />
    </div>
  )
}
