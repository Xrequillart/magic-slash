import { LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'

/**
 * The off-site URLs the public pages link to, in one place.
 *
 * `docs/` repeated these literals across five HTML files — the GitHub URL appeared
 * eleven times, and the release tag embedded the version number by hand, so a release
 * that forgot one left a badge pointing at a tag that no longer existed. Here the tag
 * is DERIVED from `LATEST_DESKTOP_VERSION`, which `desktopRelease.test.ts` already
 * pins to `desktop/package.json` — so the link cannot go stale on its own.
 */

export const GITHUB_REPO_URL = 'https://github.com/xrequillart/magic-slash'

/** The GitHub release the header's version badge opens. */
export const RELEASE_TAG_URL = `${GITHUB_REPO_URL}/releases/tag/v${LATEST_DESKTOP_VERSION}`

/**
 * The two REPOSITORY documents the site has no page for: the licence and the security
 * policy. They live in the repository, and they are read from there.
 *
 * THE SITE HAS `/privacy` AND `/terms` NOW — story #273 wrote them, as ordinary routes
 * under `app/(marketing)`, listed in `PUBLIC_PATHS` and linked from the footer's
 * copyright row. THESE TWO ARE NOT THOSE TWO, which is the whole reason this note still
 * exists: that story added a privacy policy and terms of use, and it added no licence
 * page and no security page. So the argument below is unchanged for the two constants it
 * is actually about.
 *
 * There is no `/license` route and no `/security` route: the public site owns exactly the
 * paths `PUBLIC_PATHS` in `lib/hostRouting.ts` enumerates, and anything else on a
 * production host 307s to `app.magic-slash.io`. A link that leaves for GitHub is honest,
 * where a link that bounces a reader into a login form is not — and for these two
 * documents, leaving is also the right answer on its own terms: the licence IS the file
 * in the repository, and a reader checking it wants the version the code ships with.
 *
 * ONE OF THEM IS LINKED AGAIN. The footer's Legal column was removed by request (see
 * `SiteFooter.tsx`), and its three rows scattered: `NEW_ISSUE_URL` moved into Help and
 * stayed used, `LICENSE_URL` sat idle until `/terms` gave it a footnote to sit in
 * (`TermsContent.tsx`, "Read the MIT licence"), and `SECURITY_URL` is still unused —
 * nothing on the site names a security policy. It is kept anyway, for the reason the
 * other two were kept while idle: a constant with a note explaining why it is unused
 * costs nothing, where re-deriving a `blob/main` path from memory later costs a wrong
 * link.
 *
 * The list is NOT copied here. It was, and #269 adding `/features` to it meant editing
 * this sentence and one in `SiteFooter.tsx` to match a line neither file reads — three
 * copies of one fact, none of them tested, and a stale copy is worse than no copy
 * because the reasoning above is asserted on it.
 *
 * `blob/main` rather than a tag: these are read as the CURRENT policy, not as
 * the policy that shipped with a release, which is the opposite of what
 * `RELEASE_TAG_URL` above wants.
 */
export const LICENSE_URL = `${GITHUB_REPO_URL}/blob/main/LICENSE`
export const SECURITY_URL = `${GITHUB_REPO_URL}/blob/main/SECURITY.md`

/** `new/choose` rather than `new`, so the reporter gets the issue templates. */
export const NEW_ISSUE_URL = `${GITHUB_REPO_URL}/issues/new/choose`
