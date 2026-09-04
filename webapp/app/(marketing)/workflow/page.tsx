import type { Metadata } from 'next'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'
import { WorkflowContent } from '@/components/site/workflow/WorkflowContent'

/**
 * magic-slash.io/workflow — the five steps of the loop, and the commands each one runs.
 *
 * A SERVER COMPONENT whose only job is the `metadata`, with the page in a client
 * component next door: the rows need `useT()` for their copy, and `metadata` cannot be
 * exported from a `'use client'` module. The same split `/features`, `/faq`, `/story` and
 * `/changelog` make.
 *
 * WHAT IS ON THE PAGE IS NOT DECIDED HERE. `lib/workflow.ts` is the source of truth — five
 * steps in the order you run them — and it is the same list the homepage's workflow band
 * draws as cards. A reworded step is a pair of catalogue entries and nothing to edit in
 * either renderer. `WorkflowContent`'s own header says what a fuller version of this page
 * would add and why it does not add it yet.
 *
 * `/workflow` HAD TO BE ADDED TO `PUBLIC_PATHS` (`lib/hostRouting.ts`) IN THE SAME CHANGE
 * AS THE BAND, and this is the sentence that says why it could not wait for the page to
 * be worth a visit. That list enumerates the paths the public site owns; everything absent
 * from it belongs to the app, so a `/workflow` the homepage links to but the list does not
 * know about does not 404 on production — it 307s the reader to a login form on
 * `app.magic-slash.io`. A landing page whose own CTA appears to sign you out is worse than
 * one whose CTA is missing. `workflow.test.ts` pins the path, the entry and the existence
 * of this file together; `hostRouting.test.ts` pins the routing half.
 *
 * IT CLOSES ON THE HOMEPAGE'S LAST BAND, like `/features` and `/faq` and unlike
 * `/changelog`. A reader who has just read what the eight commands do is being sold to —
 * they came here from a landing page and they are still deciding — so `FinalCtaSection` is
 * exactly the right thing to meet them at the bottom. Reused as it is rather than given
 * copy of its own; it sits between the last step and the footer, and both are on `ink`, so
 * the page ends on one dark sheet.
 */

export const metadata: Metadata = {
  title: 'Workflow — magic-slash',
  description:
    'Five commands, one loop: plan the work, start it with Claude Code, commit and open the PR, resolve the review, merge and clean up.',
}

export default function WorkflowPage() {
  return (
    <>
      <WorkflowContent />
      <FinalCtaSection />
    </>
  )
}
