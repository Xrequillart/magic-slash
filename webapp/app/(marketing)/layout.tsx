import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'

/**
 * The public site's shell — the header and footer every public page shares: `/`,
 * `/features`, `/changelog`, `/faq`, `/workflow`, `/desktop`, `/download`, `/privacy`
 * and `/terms`.
 *
 * `marketing.css` IS NO LONGER IMPORTED HERE, and as of the Documentation page's
 * removal it is no longer imported ANYWHERE. It was the old static site's stylesheet,
 * ~5,000 lines of it, and every page under this layout is off it: all of them are built
 * on the design system (`components/ui.tsx` over the tokens in `tailwind.config.ts`).
 * `/story` was the last page with a stylesheet of its own, `story.css`, and both are
 * deleted by request — the path 308s to the homepage (see `RETIRED_PATHS` in
 * `lib/hostRouting.ts`). `app/(docs)/layout.tsx` was `marketing.css`'s last importer;
 * `/documentation` is deleted and `/faq` stands in its place. The file itself STAYS on disk, and the reason has changed: it
 * used to be held here by the ~86 `mk-*` classes `components/site/home/AppMockup.tsx`
 * was written against, and #270 deleted that component rather than porting it (see
 * `page.tsx`). Those rules are now stranded — nothing references them — so what keeps the
 * file is `app/(docs)/layout.tsx` and `lib/marketingCss.test.ts`, which still reads it.
 * Pruning the dead block is a follow-up.
 *
 * Nothing global takes its place. The background is painted by whichever page owns it
 * — `bg-canvas` on the homepage's own root, `bg-white` on `/features`'s — rather than
 * here, because the pages do not agree on what colour the page is.
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
    // `data-site` is the hook `app/globals.css` uses to cut every CSS animation on the
    // public site below `lg` — see `lib/stillness.ts` for the JavaScript half of that
    // rule. A `div` and not a fragment for that one attribute; it carries no styles.
    <div data-site>
      <SiteHeader />
      {children}
      {/* The year is read on the server so the first paint has one, then corrected in
          the browser — see the comment in SiteFooter. */}
      <SiteFooter serverYear={new Date().getFullYear()} />
    </div>
  )
}
