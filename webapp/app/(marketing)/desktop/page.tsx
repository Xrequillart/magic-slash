import type { Metadata } from 'next'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'
import { PlaceholderContent } from '@/components/site/PlaceholderContent'
import { PLACEHOLDER_PAGES } from '@/lib/siteNav'

/**
 * magic-slash.io/desktop — the native macOS app. NOT WRITTEN YET.
 *
 * A SERVER COMPONENT whose only job is the `metadata`, with the page in a client
 * component next door: the copy needs `useT()`, and `metadata` cannot be exported from a
 * `'use client'` module. The same split `/features`, `/faq`, `/story`, `/changelog` and
 * `/workflow` make.
 *
 * `/desktop` AND NOT `/application`, though the header's row says "Application": the
 * product already owns `/application/*` on `app.magic-slash.io` — its own settings
 * section, under `app/application/` — and two route branches resolving one path is a
 * build question rather than a naming one. See `PLACEHOLDER_PAGES` in `lib/siteNav.ts`,
 * which owns the path, the label and the two keys below.
 *
 * WHAT THIS PAGE OWES, when its turn comes: the window itself (the split view, the
 * agents rail, the info sidebar), several agents at once and how the app keeps them
 * apart, and the prerequisites the first launch checks. `components/site/home/*` already
 * draws most of that chrome for the homepage's bands.
 *
 * IT CLOSES ON THE HOMEPAGE'S LAST BAND, like `/features`, `/faq` and `/workflow` and
 * unlike `/changelog`: a reader here is still deciding, so `FinalCtaSection` is the right
 * thing to meet them. Both it and the band above are on `ink`, so the page ends on one
 * dark sheet — which is also what keeps a placeholder from being a screen and a half of
 * nothing.
 */

export const metadata: Metadata = {
  title: 'Application — magic-slash',
  description:
    'The native macOS app: several Claude Code agents at once, in one window that knows who is working on what.',
}

export default function DesktopPage() {
  const page = PLACEHOLDER_PAGES.desktop

  return (
    <>
      <PlaceholderContent title={page.title} lead={page.lead} />
      <FinalCtaSection />
    </>
  )
}
