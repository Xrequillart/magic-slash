/**
 * The external URLs the app links to, in one place.
 *
 * WHY A MODULE FOR FOUR STRINGS
 * ---------------------------------------------------------------------------
 * Because four copies of a URL is four chances to be wrong, and they already were:
 * when GitHub Pages was retired, three of these still pointed at
 * `xrequillart.github.io/magic-slash` while the tray had moved to `magic-slash.io`,
 * and the tray's "Documentation" item opened the landing page rather than the
 * documentation. Nobody chose any of that — it is what a literal repeated across
 * `Sidebar.tsx`, `Config/index.tsx` and `tray-manager.ts` decays into.
 *
 * Sits next to `types.ts` because both processes need it: the tray runs in main, the
 * sidebar and settings in the renderer.
 *
 * NOT fetched at runtime, deliberately — see the version constant in the webapp for
 * the same reasoning. A value we own belongs in the build, not behind a request that
 * can fail.
 */

/** The public site. Served by `webapp/` on the apex domain. */
export const SITE_URL = 'https://magic-slash.io'

/**
 * The reference.
 *
 * Reachable from the app only: the site's header and footer no longer link to it
 * while it is being reworked, so these links are how a user gets there.
 */
export const DOCUMENTATION_URL = `${SITE_URL}/documentation`

/** The changelog section of the documentation. */
export const CHANGELOG_URL = `${DOCUMENTATION_URL}#changelog`

export const GITHUB_URL = 'https://github.com/xrequillart/magic-slash'
