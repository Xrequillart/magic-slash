import type { Metadata } from 'next'
import { FeaturesContent } from '@/components/site/features/FeaturesContent'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'

/**
 * magic-slash.io/features — the whole product, in one list.
 *
 * A server component whose only job is the `metadata`, with the page itself in a client
 * component next door: the list needs `useT()` for its copy and a scroll listener for
 * its sidebar, and `metadata` cannot be exported from a `'use client'` module. Same
 * split as `/story`.
 *
 * WHAT IS ON THE PAGE IS NOT DECIDED HERE. `lib/features.ts` is the source of truth —
 * five families, ~30 features — and `FeaturesContent` renders it with a `.map()`. Adding
 * a capability to this page is a row in that module and a pair of catalogue entries;
 * there is deliberately nothing to edit in this file or in the markup.
 *
 * THE ONE THING BESIDE THE LIST IS THE HOMEPAGE'S CLOSING BAND. A reader who scrolled
 * thirty rows to the bottom is the reader the homepage's last ask was written for, so
 * `FinalCtaSection` is reused as it is — same copy, same download button — rather than
 * a second closing block with its own keys. It sits between the list and the footer,
 * and both are on `ink`, so the page ends on one dark sheet.
 *
 * `/features` HAD TO BE ADDED TO `PUBLIC_PATHS` (`lib/hostRouting.ts`). That list
 * enumerates the paths the public site owns, and everything absent from it belongs to
 * the app: without the entry, `magic-slash.io/features` does not 404 on production — it
 * 307s the reader to a login form on `app.magic-slash.io`, which is worse. That is
 * acceptance criterion 1 of #269, and `hostRouting.test.ts` pins it.
 *
 * NOT `app/application/features/page.tsx`, which already exists and is the signed-in
 * product's own Features tab. Different route, different audience, no conflict — but the
 * two are one grep apart, so this note is here to save the next reader the detour.
 */

export const metadata: Metadata = {
  title: 'Features — magic-slash',
  description: 'Every command, every panel, every switch — grouped the way the app groups them.',
}

export default function FeaturesPage() {
  return (
    <>
      <FeaturesContent />
      <FinalCtaSection />
    </>
  )
}
