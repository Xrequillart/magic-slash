import type { Metadata } from 'next'
import { ChangelogContent } from '@/components/site/changelog/ChangelogContent'
import { loadChangelog } from '@/lib/changelog'

/**
 * magic-slash.io/changelog — every release, newest first.
 *
 * A PAGE OF ITS OWN NOW, and it used to be the last section of `/documentation`. Three
 * things were wrong with living down there, and only the third is about appearance:
 *   • It was unlinkable in practice. `/documentation#changelog` is the bottom of a
 *     16-section manual, so a link to "what changed in 0.88" landed a reader at the top
 *     of a page about installing the app.
 *   • It was on the wrong chrome. `(docs)` is the one route group on this site with a
 *     dark theme and a full-height sidebar in place of the header and footer — right for
 *     a manual, wrong for a page people arrive at from a release note.
 *   • It was the last thing on the public site still dressed by `marketing.css`, the old
 *     static site's ~5,000-line stylesheet. Under `(marketing)` it is on the design
 *     system instead, and `homepageStylesheet.test.ts` keeps it there.
 *
 * A SERVER COMPONENT, which is the point of the split: `loadChangelog()` reads
 * `CHANGELOG.md` off the disk at BUILD time (`lib/changelog.ts` explains at length why
 * that replaced a runtime fetch of `raw.githubusercontent.com`), and the parsed versions
 * are handed to the client tree next door — which needs `useT()` for its copy and
 * `useState` for its pagination, and therefore cannot export `metadata`. Same split as
 * `/features` and `/story`.
 *
 * The trade-off `lib/changelog.ts` names still holds and is worth restating where the
 * route is: an entry appears on this page only once the webapp is redeployed. A release
 * that updates the changelog is a release that redeploys.
 *
 * `/changelog` HAD TO BE ADDED TO `PUBLIC_PATHS` (`lib/hostRouting.ts`). That list
 * enumerates the paths the public site owns; everything absent from it belongs to the
 * app, so without the entry `magic-slash.io/changelog` would not 404 on production — it
 * would 307 the reader to a login form on `app.magic-slash.io`, which is worse.
 * `hostRouting.test.ts` pins it.
 *
 * NO CLOSING CTA, unlike `/features`. That page ends on `FinalCtaSection` because a
 * reader who scrolled thirty rows of capabilities is being sold to. This one is a
 * reference: somebody is here to find out whether the bug they hit is fixed, and asking
 * them to download something at the bottom of that answer is the wrong ask.
 */

export const metadata: Metadata = {
  title: 'Changelog — magic-slash',
  description: 'Every release of magic-slash — what was added, what changed, what was fixed.',
}

export default function ChangelogPage() {
  return <ChangelogContent versions={loadChangelog()} />
}
