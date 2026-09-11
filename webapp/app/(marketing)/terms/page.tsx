import type { Metadata } from 'next'
import { TermsContent } from '@/components/site/terms/TermsContent'

/**
 * magic-slash.io/terms — what you may do with Magic Slash, and what it does not promise.
 *
 * A SERVER COMPONENT whose only job is the `metadata`, with the page in a client
 * component next door, for the same reason `/privacy` next door splits that way: the copy
 * needs `useT()` and `metadata` cannot leave a `'use client'` module.
 *
 * `/terms` HAD TO BE ADDED TO `PUBLIC_PATHS` (`lib/hostRouting.ts`) with `/privacy`, and
 * the two are linked from the copyright row of the footer, so they are on every public
 * page: a path absent from that list does not 404 there, it 307s to a login form.
 * `hostRouting.test.ts` pins both.
 *
 * SOURCED, LIKE `/privacy`, AND UNDER THE SAME CAVEAT: the rule binds whoever edits the
 * copy next, and nothing here enforces it. Two clauses failed it on the first pass and
 * are corrected in the catalogues, with the reason recorded above each key: the machine
 * clause credited `install/uninstall.sh` with removing a status line it never touches,
 * and the third-party clause said no connected credential is stored while the Atlassian
 * one is written to `~/.config/magic-slash/`.
 *
 * IT IS NOT A EULA AND IT IS NOT THE LICENCE. The code is under PolyForm Shield 1.0.0 and
 * the licence is the
 * `LICENSE` file in the repository, which `LICENSE_URL` in `components/site/links.ts`
 * points at and which this page names rather than restates: a second, prettier copy of a
 * licence is a second copy to keep in sync with the one that actually governs. This page
 * covers the SERVICE — the account, the hosted side, the trackers you connect it to.
 *
 * NO `FinalCtaSection`, like `/privacy`. A download button under a limitation of
 * liability reads as a punchline.
 */

export const metadata: Metadata = {
  title: 'Terms — magic-slash',
  description:
    'The terms the Magic Slash app and the hosted account are provided under, and what they do not promise.',
}

export default function TermsPage() {
  return <TermsContent />
}
