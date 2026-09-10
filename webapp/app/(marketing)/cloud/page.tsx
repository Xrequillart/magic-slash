import type { Metadata } from 'next'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'
import { PlaceholderContent } from '@/components/site/PlaceholderContent'
import { PLACEHOLDER_PAGES } from '@/lib/siteNav'

/**
 * magic-slash.io/cloud — the account side of the product. NOT WRITTEN YET.
 *
 * The `metadata`-only server component, with the copy in a client component next door:
 * the same split every page in this group makes, and `PLACEHOLDER_PAGES` in
 * `lib/siteNav.ts` owns the path and the two keys.
 *
 * WHAT IT OWES: that the configuration lives in Supabase and not in a file on one
 * machine (the project's own CLAUDE.md is emphatic about it), what an organization shares
 * — repositories, invitations, usage — and what the dashboard on `app.magic-slash.io`
 * shows that the desktop window does not. `site.features.groupCloudTitle`'s family in
 * `lib/features.ts` is the inventory this page would set out properly.
 */

export const metadata: Metadata = {
  title: 'Cloud — magic-slash',
  description:
    'Your configuration, your team and your usage, shared across every machine you sign in on.',
}

export default function CloudPage() {
  const page = PLACEHOLDER_PAGES.cloud

  return (
    <>
      <PlaceholderContent title={page.title} lead={page.lead} />
      <FinalCtaSection />
    </>
  )
}
