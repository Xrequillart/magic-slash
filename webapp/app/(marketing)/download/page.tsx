import type { Metadata } from 'next'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'
import { PlaceholderContent } from '@/components/site/PlaceholderContent'
import { PLACEHOLDER_PAGES } from '@/lib/siteNav'

/**
 * magic-slash.io/download — the way to get the app. NOT WRITTEN YET.
 *
 * The `metadata`-only server component, with the copy in a client component next door:
 * the same split every page in this group makes, and `PLACEHOLDER_PAGES` in
 * `lib/siteNav.ts` owns the path and the two keys.
 *
 * A PAGE AND NOT A LINK STRAIGHT TO THE `.dmg`, which is what the footer's Download row
 * still is (`DESKTOP_DOWNLOAD_URL`) and what the header's row could have been. The
 * difference is what surrounds the button: Apple Silicon, the three prerequisites the
 * first launch checks (`site.faq.*` already answers that one), what the installer puts
 * in `~/.claude/skills/`, and which release you are getting. A menu row that starts a
 * download with none of that said is the ask arriving before the answer.
 *
 * `lib/desktopRelease.ts` owns the version and the file URL — derived from
 * `desktop/package.json` and pinned by `desktopRelease.test.ts` — so this page must
 * build its button from those rather than spelling either by hand.
 */

export const metadata: Metadata = {
  title: 'Download — magic-slash',
  description:
    'Download Magic Slash for macOS: the installer, what it needs, and what the first launch sets up.',
}

export default function DownloadPage() {
  const page = PLACEHOLDER_PAGES.download

  return (
    <>
      <PlaceholderContent title={page.title} lead={page.lead} />
      <FinalCtaSection />
    </>
  )
}
