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
 * The two LEGAL documents, which live in the repository rather than on this site.
 *
 * There is no `/terms`, no `/privacy` and no `/license` route: the public site owns
 * exactly the paths `PUBLIC_PATHS` in `lib/hostRouting.ts` enumerates, and anything else
 * on a production host 307s to `app.magic-slash.io`. So these named the files themselves
 * until story #273 gives them pages — a link that leaves for GitHub is honest, where a
 * link that bounces a reader into a login form is not.
 *
 * NOTHING LINKS TO EITHER OF THEM RIGHT NOW. The footer's Legal column was removed by
 * request (see `SiteFooter.tsx`), and these two rows went with it — the third,
 * `NEW_ISSUE_URL`, moved into Resources and is still used. They are kept rather than
 * deleted because the URLs are still the right ones and #273 is still the story that
 * needs them: a constant with a note explaining why it is unused costs nothing, where
 * re-deriving `blob/main` paths from memory later costs a wrong link.
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
