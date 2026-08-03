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
