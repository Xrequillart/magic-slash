import type { Metadata } from 'next'
import { DesktopContent } from '@/components/site/desktop/DesktopContent'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'

/**
 * magic-slash.io/desktop — the native macOS app, shown.
 *
 * IT WAS A PLACEHOLDER FOR ONE COMMIT. What fills it is the homepage's own app band,
 * moved here whole by the product owner: the headline, the two lines under it, the
 * window at up to 0.85 scale and the four highlights that close it. The homepage kept a
 * heading, a paragraph and the same window at two-fifths the size, with a button that
 * opens this page — `components/site/home/AppSection.tsx`.
 *
 * A SERVER COMPONENT whose only job is the `metadata`, with the page in a client
 * component next door: the copy needs `useT()`, and `metadata` cannot be exported from a
 * `'use client'` module. The same split `/features`, `/faq`, `/story`, `/changelog` and
 * `/workflow` make.
 *
 * `/desktop` AND NOT `/application`, though the header's row says "Application": the
 * product already owns `/application/*` on `app.magic-slash.io` — its own settings
 * section, under `app/application/` — and two route branches resolving one path is a
 * build question rather than a naming one. `DESKTOP_PATH` in `lib/siteNav.ts` owns the
 * path and says the same thing at greater length.
 *
 * WHAT THE PAGE OWED, once it was a page rather than a promise of one — what the split
 * view is for, how the app keeps several agents apart, the info sidebar, the checks the
 * first launch makes — is paid by the five bands `DesktopContent` composes under the
 * hero, every one of them borrowing `components/site/features/*`'s drawings rather than
 * inventing its own. `DesktopContent.tsx` argues the order; `lib/desktopPage.ts` holds
 * the data and `lib/desktopPage.test.ts` pins it.
 *
 * IT CLOSES ON THE HOMEPAGE'S LAST BAND, like `/features`, `/faq` and `/workflow` and
 * unlike `/changelog`: a reader who has just been shown the app is deciding, so
 * `FinalCtaSection` is the right thing to meet them. Both it and the aura'd band above
 * are on their own grounds, so the page ends on one dark sheet.
 */

export const metadata: Metadata = {
  title: 'Application — magic-slash',
  description:
    'The native macOS app: several Claude Code agents at once, in one window that knows who is working on what.',
}

export default function DesktopPage() {
  return (
    <>
      <DesktopContent />
      <FinalCtaSection />
    </>
  )
}
