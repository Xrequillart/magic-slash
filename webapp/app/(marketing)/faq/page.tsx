import type { Metadata } from 'next'
import { FaqContent } from '@/components/site/faq/FaqContent'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'

/**
 * magic-slash.io/faq — the eleven questions people actually ask.
 *
 * A SERVER COMPONENT whose only job is the `metadata`, with the page in a client
 * component next door: the rows need `useT()` for their copy and `useState` for their
 * open state, and `metadata` cannot be exported from a `'use client'` module. The same
 * split `/features`, `/story` and `/changelog` make.
 *
 * WHAT IS ON THE PAGE IS NOT DECIDED HERE. `lib/faq.ts` is the source of truth — eleven
 * rows in reading order — and `FaqContent` renders it with a `.map()`. A new question is
 * a row in that module and a pair of catalogue entries; there is deliberately nothing to
 * edit in this file or in the markup.
 *
 * THIS IS WHAT `/documentation` BECAME, and it is a fraction of the size on purpose —
 * that page was a 16-section manual on its own route group with its own dark theme, its
 * own sidebar and 675 catalogue keys, and by the end nothing on the site linked to it.
 * `FaqContent`'s own header has the long version.
 *
 * `/documentation` STILL RESOLVES. It 308s here, from `RETIRED_PATHS` in
 * `lib/hostRouting.ts`: the URL is in the wild — in the README, in release notes, in
 * whatever anyone bookmarked — and dropping it from `PUBLIC_PATHS` would not 404 those
 * readers, it would 307 them to a login form on `app.magic-slash.io`, which is worse
 * than either. `hostRouting.test.ts` pins both halves.
 *
 * `/faq` HAD TO BE ADDED TO `PUBLIC_PATHS` for the same reason, and that is the entry
 * the footer's new row depends on — see the note at the top of `SiteFooter.tsx`.
 *
 * IT CLOSES ON THE HOMEPAGE'S LAST BAND, which is the one thing `/changelog` deliberately
 * does not do. That page is a reference: somebody is there to find out whether the bug
 * they hit is fixed, and asking them to download something at the bottom of that answer
 * is the wrong ask. A FAQ is the opposite — every row of it is a reason not to buy,
 * answered — so the reader who reaches the bottom has just had their last objection
 * handled, and `FinalCtaSection` is exactly the right thing to meet them there. Reused
 * as it is rather than given copy of its own; it sits between the list and the footer,
 * and both are on `ink`, so the page ends on one dark sheet.
 */

export const metadata: Metadata = {
  title: 'FAQ — magic-slash',
  description:
    'Installing Magic Slash, configuring it, and living with it — the questions people actually ask.',
}

export default function FaqPage() {
  return (
    <>
      <FaqContent />
      <FinalCtaSection />
    </>
  )
}
