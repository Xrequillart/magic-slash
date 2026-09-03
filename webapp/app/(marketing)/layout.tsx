import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

/**
 * The public site's shell — the header and footer `/`, `/features` and `/story` share.
 *
 * `marketing.css` IS NO LONGER IMPORTED HERE. It was the old static site's stylesheet,
 * ~5,000 lines of it, and every page under this layout is off it: the homepage and
 * `/features` are built on the design system (`components/ui.tsx` over the tokens in
 * `tailwind.config.ts`), and `/story` keeps its own `story.css`, which now carries the
 * handful of closing-CTA rules it used to borrow. The file itself STAYS on disk —
 * `app/(docs)/layout.tsx` still imports it for the Documentation page's typography, and
 * `lib/marketingCss.test.ts` reads it from disk.
 *
 * Nothing global takes its place. The background is painted by whichever page owns it
 * (`bg-canvas` on the homepage's and `/features`'s own roots, `html body` in
 * `story.css`) rather than here, because the pages do not agree on what colour the page
 * is.
 *
 * `/` resolves to this group's `page.tsx`. On `app.magic-slash.io` the root is rewritten
 * to `/login` by `middleware.ts`, so the product keeps its front door.
 */

export const metadata: Metadata = {
  title: 'magic-slash',
  description: 'From ticket to merge — without the busywork.',
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {children}
      {/* The year is read on the server so the first paint has one, then corrected in
          the browser — see the comment in SiteFooter. */}
      <SiteFooter serverYear={new Date().getFullYear()} />
    </>
  )
}
