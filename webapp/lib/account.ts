import { getSupabase } from './supabase'
import { t } from './i18n'
import { DEFAULT_LANGUAGE, type LanguageId } from './i18n/languages'

/**
 * Identity operations, matching the desktop app's account flows one for one so
 * both surfaces behave the same way.
 */

export async function updatePassword(newPassword: string): Promise<void> {
  const { data, error } = await getSupabase().auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)

  /**
   * Record WHEN, because GoTrue does not: `auth.users` has `encrypted_password` and no
   * companion timestamp, and `updated_at` moves on every user update including the
   * email change offered two functions down. The desktop app draws this under its
   * password line, so a password changed HERE has to be stamped here too — otherwise
   * the app would keep saying no change had been recorded.
   *
   * The twin of `desktop/src/main/cloud/password-stamp.ts`, which has the full note.
   * Not shared with it: that module is Electron-side and this bundle cannot import it.
   *
   * IT NEVER THROWS. The password has already changed by this point; a failed stamp
   * costs a line of text, and turning it into a rejection would report a successful
   * change as a failure and invite the user to do it again.
   */
  if (!data.user) return
  try {
    const { error: stampError } = await getSupabase()
      .from('profiles')
      .upsert(
        { user_id: data.user.id, password_changed_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    if (stampError) console.error('could not record the password change:', stampError.message)
  } catch (e) {
    console.error('could not record the password change:', e)
  }
}

/**
 * Step 1 of an email change: Supabase emails a 6-digit code to the new address.
 * The project runs with `double_confirm_changes = false`, so confirming that one
 * code applies the change — the old address is not asked to confirm. Nothing
 * changes until confirmEmailChange verifies the code.
 */
export async function requestEmailChange(newEmail: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ email: newEmail.trim() })
  if (error) throw new Error(error.message)
}

/** Step 2: verify the code sent to the new address, which applies the change. */
export async function confirmEmailChange(
  newEmail: string,
  code: string,
  lang: LanguageId = DEFAULT_LANGUAGE,
): Promise<void> {
  const { data, error } = await getSupabase().auth.verifyOtp({
    email: newEmail.trim(),
    token: code.trim(),
    type: 'email_change',
  })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error(t('cloud.email.noSession', lang))
}

/**
 * Deletes the account via the `delete_account` RPC, then drops the local
 * session. The account is gone either way, so sign-out failures are ignored.
 */
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('delete_account')
  if (error) throw new Error(error.message)
  await supabase.auth.signOut().catch(() => {})
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut()
}
