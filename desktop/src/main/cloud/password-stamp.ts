import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Record that the password just changed — the one spelling of that write.
 *
 * WHY IT IS ITS OWN MODULE. Three call sites change a password and they sit in two
 * processes: `updatePassword` and `confirmPasswordReset` in `cloud/auth.ts`, and the
 * webapp's own `updatePassword` in `webapp/lib/account.ts`. They cannot share a module
 * across that boundary, but the two in this process can, and a stamp that ran on the
 * ordinary change and not on the recovery flow is the bug this exists to prevent:
 * somebody who resets a forgotten password would be told, afterwards, that no change
 * had been recorded since they created the account.
 *
 * NOT ON CloudStore, although every other `profiles` write is, and that is deliberate
 * rather than sloppy: `CloudStore` imports `getAuthedClient` from `cloud/auth.ts`, so
 * `cloud/auth.ts` reaching back for the store would close a cycle. It takes the client
 * it is handed for the same reason — the recovery path holds a session that is about to
 * be signed out, and asking for "the" authed client there would look up a session that
 * is a moment from being cleared.
 *
 * IT TAKES THE uid RATHER THAN LOOKING IT UP, because the recovery flow's caller is the
 * only one that knows whose session this is: `loadSession()` has not been written yet at
 * that point in the flow.
 *
 * AN UPSERT, for `setAvatar`'s reason: the Account tab is reachable without ever opening
 * the Profile tab, so there may be no `profiles` row at all and an `update` would report
 * success having matched nothing. PostgREST writes only the columns present in the
 * payload, so this cannot touch `name`/`role`/`avatar_url`/`username`.
 *
 * IT NEVER THROWS. The password HAS changed by the time this runs — the only thing that
 * can fail here is a line of text under a button, and turning that into a rejection
 * would report a successful password change as a failure and invite the user to do it
 * again. A failure is logged and swallowed; the column stays NULL, which the UI already
 * has a sentence for.
 */
export async function stampPasswordChange(client: SupabaseClient, uid: string): Promise<void> {
  try {
    const { error } = await client
      .from('profiles')
      .upsert({ user_id: uid, password_changed_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) console.error('[cloud] could not record the password change:', error.message)
  } catch (error) {
    console.error('[cloud] could not record the password change:', error)
  }
}
