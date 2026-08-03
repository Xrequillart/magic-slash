import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import './marketing.css'

/**
 * The public site's shell — everything magic-slash.io shares across its five pages.
 *
 * `marketing.css` is imported HERE rather than in `app/globals.css` on purpose: it is
 * the old static site's stylesheet, with element selectors (`*`, `html body`, `h1`)
 * that would otherwise reach the signed-in app. Importing it in this layout scopes it
 * to these routes — Next only sends it with the marketing bundle.
 *
 * `/` resolves to this group's `page.tsx`. On `app.magic-slash.io` the root is
 * rewritten to `/login` by `middleware.ts`, so the product keeps its front door.
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
