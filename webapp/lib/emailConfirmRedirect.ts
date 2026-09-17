/**
 * Is this URL fragment Supabase telling us an email change was just confirmed?
 *
 * SPLIT OUT OF THE COMPONENT so it can be tested without a browser, which is the rule
 * `authStorage.ts` states for itself and the one the root vitest suite enforces: it runs
 * on the root `node_modules`, so anything it touches must import nothing from `webapp/`.
 * This imports nothing at all.
 *
 * THE FRAGMENT IS THE ONLY EVIDENCE THERE IS. Supabase's verify endpoint answers a
 * confirmation link with a 303 to `{site_url}#access_token=…&type=email_change` —
 * verified against the running server — and a fragment never reaches a server, so no
 * middleware or route handler can decide this. Only a mounted client can.
 */
export function isEmailChangeRedirect(hash: string): boolean {
  /**
   * PARSED, NOT MATCHED. `hash.includes('type=email_change')` is the obvious spelling
   * and it is wrong in both directions: it fires on a hypothetical
   * `type=email_change_pending`, and on any value that merely contains the phrase —
   * `error_description=email_change%20failed` among them, which is the one case where
   * celebrating would be actively misleading.
   */
  return new URLSearchParams(hash.replace(/^#/, '')).get('type') === 'email_change'
}
