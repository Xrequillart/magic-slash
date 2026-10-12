/**
 * Does this string look like an email address?
 *
 * DELIBERATELY PERMISSIVE, and that is the whole design. The only authority on whether
 * an address exists is the server that accepts mail for it, and every regex that tries
 * to be stricter than "local@domain.tld" ends up refusing addresses that work: plus
 * tags, apostrophes, single-letter domains, the new long TLDs. A form that rejects a
 * valid address is worse than one that lets a typo through, because the typo is caught
 * by the next step and the rejection has no next step at all.
 *
 * SO WHAT IS IT FOR. It catches the mistakes that are mistakes in ANY reading — an empty
 * box, a missing `@`, a domain with no dot, a stray space from a paste — before the app
 * spends a round trip and, in the email-change flow, before the server sends a message
 * to an address nobody can read. It is a gate on obvious nonsense, not a verdict on
 * deliverability.
 *
 * NO i18n, on `username.ts`'s model: a refusal is a boolean here and the caller owns the
 * sentence. There is only one way to fail, so there is no reason code either.
 */

/**
 * The shape, and every part of it earns its place:
 *
 *   `[^\s@]+`   a local part with no spaces and no second `@`
 *   `@`
 *   `[^\s@.]+`  at least one domain label that is not empty and not a dot
 *   `(\.[^\s@.]+)+`  and at least one more after a dot, so `user@localhost` is refused
 *                    — this app sends real mail to real inboxes
 *
 * Case is irrelevant and no anchoring beyond the ends is needed; `test` with `^…$` is
 * the whole check.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

/**
 * True when `raw` is worth sending to the server.
 *
 * IT TRIMS BEFORE JUDGING, for `validateUsername`'s reason: a leading or trailing space
 * survives a paste, is invisible in the field, and would otherwise fail on a character
 * the user cannot see. Callers store `raw.trim()`, which every one of them already did.
 */
export function looksLikeEmail(raw: string): boolean {
  return EMAIL_PATTERN.test(raw.trim())
}
