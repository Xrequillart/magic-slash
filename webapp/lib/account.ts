import { getSupabase } from './supabase'

/**
 * Identity operations, matching the desktop app's account flows one for one so
 * both surfaces behave the same way.
 */

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await getSupabase().auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
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
export async function confirmEmailChange(newEmail: string, code: string): Promise<void> {
  const { data, error } = await getSupabase().auth.verifyOtp({
    email: newEmail.trim(),
    token: code.trim(),
    type: 'email_change',
  })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('Email change did not return a session')
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
