/**
 * Building and reading invitation links.
 *
 * Imports NOTHING, and sits apart from `invitations.ts` for a mechanical reason: that
 * module reaches the Supabase client, and the test suite runs on the root
 * `node_modules` without the webapp's own — so a test importing it fails to RESOLVE
 * rather than to assert (see vitest.config.ts). Same split as `hostRouting.ts`.
 *
 * Duplicated from `desktop/src/urls.ts` on purpose: the two builds cannot import each
 * other, and both surfaces create invitations. The pair must stay in step — a desktop
 * that sends short links and a webapp that cannot read them is a broken join flow.
 */

/** Where an invitation is accepted. Serves `/<token>` directly — no `/invite/` segment. */
export const INVITE_URL = 'https://invite.magic-slash.io'

/**
 * The link to hand someone you invited.
 *
 * `currentOrigin` is what the caller is being served from. On a production host the
 * answer is always the short link, whichever host the admin happens to be on — this
 * used to be `${window.location.origin}/invite/${token}` unconditionally, so an admin
 * working in the back-office handed the invitee `admin.magic-slash.io`, a hostname
 * they have no business seeing, and a developer copied a `localhost` link.
 *
 * Off production — localhost, Vercel previews — the short host does not resolve, so
 * the long form on the current origin is the only link that works.
 */
export function inviteLink(token: string, currentOrigin: string): string {
  if (!/^https?:\/\/([^/]+\.)?magic-slash\.io(\/|$)/.test(currentOrigin)) {
    return `${currentOrigin}/invite/${token}`
  }
  return `${INVITE_URL}/${token}`
}

/**
 * The token out of whatever someone pasted.
 *
 * The webapp's join field had no extraction at all — it sent the raw input straight to
 * `acceptInvitation`, so pasting the link from the invitation email simply failed. The
 * desktop was forgiving; this side was not.
 *
 * Three shapes work:
 *
 *  - a raw token;
 *  - the long form on any host (`app.magic-slash.io/invite/<token>`, the apex, a
 *    preview, `localhost:3000`) — every invitation sent before the short host existed;
 *  - the short form, `invite.magic-slash.io/<token>`, which has no `/invite/` segment
 *    to anchor on.
 *
 * The short form is anchored on a host whose first label is `invite`, deliberately
 * narrow: a generic "last path segment" rule would read `dashboard` out of an app URL
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
