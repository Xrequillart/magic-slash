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
 * The release history — a PAGE now, not a fragment.
 *
 * This was `${SITE_URL}/documentation#changelog`, derived from a `DOCUMENTATION_URL`
 * constant beside it, and both halves of that are gone. The changelog moved onto a route
 * of its own; `/documentation` was retired after it, replaced by `/faq` for the questions
 * it was really being read for (`webapp/lib/hostRouting.ts` 308s the old URL there). The
 * old link would therefore still have RESOLVED — via a redirect, to a page with no
 * `#changelog` anchor on it, landing the reader at the top of a FAQ instead of at the
 * release they pressed the button to read.
 *
 * `DOCUMENTATION_URL` itself is not replaced. Nothing in the app linked to it — it
 * existed only as the base of this constant, its own note explaining that the site had
 * stopped linking to the page "while it is being reworked". The rework was a deletion.
 */
export const CHANGELOG_URL = `${SITE_URL}/changelog`

export const GITHUB_URL = 'https://github.com/xrequillart/magic-slash'

/** Where an invitation is accepted. Serves `/<token>` directly — no `/invite/` segment. */
export const INVITE_URL = 'https://invite.magic-slash.io'

/**
 * The link to hand someone you invited.
 *
 * `currentOrigin` exists for the webapp, which builds the same link from a browser and
 * must keep working on localhost and on Vercel previews — there, the short host does
 * not resolve, so the long form on the current origin is the only one that works. The
 * desktop passes nothing: it is not served from a host, so production is the only
 * sensible answer.
 */
export function inviteLink(token: string, currentOrigin?: string): string {
  if (currentOrigin && !/^https?:\/\/([^/]+\.)?magic-slash\.io(\/|$)/.test(currentOrigin)) {
    return `${currentOrigin}/invite/${token}`
  }
  return `${INVITE_URL}/${token}`
}

/**
 * The token out of whatever someone pasted.
 *
 * Three shapes have to work, and the third is why this is not a one-liner:
 *
 *  - a raw token, typed or pasted on its own;
 *  - the long form on any host — `app.magic-slash.io/invite/<token>`, the apex, a
 *    preview, `localhost:3000`. Every invitation sent before the short host existed
 *    looks like this, and those links do not expire because we changed a URL;
 *  - the short form, `invite.magic-slash.io/<token>`, which has NO `/invite/` segment
 *    to anchor on. The previous version matched `/\/invite\/([^/?#\s]+)/` and nothing
 *    else, so a short link fell through to the raw-input fallback and the whole URL
 *    was sent as the token — a failed join with a misleading error.
 *
 * The short form is anchored on a host whose first label is `invite`, deliberately
 * narrow: a generic "last path segment" rule would read `/dashboard` out of an app URL
 * and report an invalid token instead of "that is not an invitation link".
 */
export function extractInviteToken(input: string): string {
  const trimmed = input.trim()

  const long = trimmed.match(/\/invite\/([^/?#\s]+)/)
  if (long) return long[1]

  const short = trimmed.match(/^https?:\/\/invite\.[^/?#\s]+\/([^/?#\s]+)/)
  if (short) return short[1]

  return trimmed
}
