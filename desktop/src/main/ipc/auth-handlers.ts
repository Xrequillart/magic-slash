import { ipcMain, type BrowserWindow } from 'electron'
import type { AuthStatus } from '../../types'
import {
  signIn,
  signUp,
  signOut,
  getStatus,
  requestPasswordReset,
  confirmPasswordReset,
  updatePassword,
  requestEmailChange,
  confirmEmailChange,
  deleteAccount,
} from '../cloud/auth'
import {
  resumeEmailChangeWatch,
  startEmailChangeWatch,
  stopEmailChangeWatch,
} from '../cloud/email-change-watcher'
import { resetHydration } from '../store/hydrate'
import { refreshConnectivity } from './connectivity-handlers'
import { teardownAgentSessions } from './terminal-handlers'

interface LoginArgs { email: string; password: string }
interface SignUpArgs { email: string; password: string; orgName?: string; invitationToken?: string }
interface RequestPasswordResetArgs { email: string }
interface ConfirmPasswordResetArgs { email: string; code: string; newPassword: string }
interface UpdatePasswordArgs { newPassword: string }
interface RequestEmailChangeArgs { newEmail: string }
interface ConfirmEmailChangeArgs { newEmail: string; code: string }

export function setupAuthHandlers(getMainWindow: () => BrowserWindow | null): void {
  const emit = (status: AuthStatus) => {
    getMainWindow()?.webContents.send('auth:statusChanged', status)
  }

  /**
   * Everything that must happen when the app loses its session from the inside
   * (sign-out, account deletion). Ordered on purpose:
   *  1. drop the cached config/agents/history so nothing of this user is left,
   *  2. kill the running agent sessions — they belong to the account,
   *  3. re-probe the gate so the renderer swaps to the login wall IMMEDIATELY
   *     instead of at the next 20s poll. That probe also resets the restore
   *     guard and tears the realtime channel down.
   */
  const teardownSession = async (): Promise<void> => {
    resetHydration()
    teardownAgentSessions()
    await refreshConnectivity()
  }

  ipcMain.handle('auth:status', async (): Promise<AuthStatus> => getStatus())

  ipcMain.handle('auth:login', async (_event, { email, password }: LoginArgs): Promise<AuthStatus> => {
    const status = await signIn(email, password)
    emit(status)
    return status
  })

  ipcMain.handle('auth:signup', async (_event, { email, password, orgName, invitationToken }: SignUpArgs): Promise<AuthStatus> => {
    const status = await signUp(email, password, { orgName, invitationToken })
    emit(status)
    return status
  })

  ipcMain.handle('auth:logout', async (): Promise<AuthStatus> => {
    const status = await signOut()
    // A watch belongs to the session that started it. Left running, it would keep
    // asking with a cleared session and, worse, could report the previous account's
    // address as a change to whoever signs in next.
    stopEmailChangeWatch()
    await teardownSession()
    emit(status)
    return status
  })

  // Password reset (OTP recovery) — the user is logged out during this flow, so
  // no statusChanged transition is emitted here.
  ipcMain.handle('auth:requestPasswordReset', async (_event, { email }: RequestPasswordResetArgs): Promise<void> => {
    await requestPasswordReset(email)
  })

  ipcMain.handle('auth:confirmPasswordReset', async (_event, { email, code, newPassword }: ConfirmPasswordResetArgs): Promise<void> => {
    await confirmPasswordReset(email, code, newPassword)
  })

  // Account settings (signed in).
  ipcMain.handle('auth:updatePassword', async (_event, { newPassword }: UpdatePasswordArgs): Promise<void> => {
    await updatePassword(newPassword)
  })

  ipcMain.handle('auth:requestEmailChange', async (_event, { newEmail }: RequestEmailChangeArgs): Promise<void> => {
    await requestEmailChange(newEmail)
    // The confirmation happens in a browser, on a machine this process knows nothing
    // about, and nothing pushes the result back. So from here on we ask — see
    // `email-change-watcher`. Started only after the request SUCCEEDED: a refused
    // address has nothing in flight to watch for.
    startEmailChangeWatch(emit)
  })

  ipcMain.handle('auth:confirmEmailChange', async (_event, { newEmail, code }: ConfirmEmailChangeArgs): Promise<AuthStatus> => {
    const status = await confirmEmailChange(newEmail, code)
    // Typed here, so there is nothing left for the watcher to discover. Kept for the
    // day a code comes back — see the note on `cloud.email.linkHelp`.
    stopEmailChangeWatch()
    emit(status)
    return status
  })

  // Account deletion (GDPR) — signs the user out; emit the logged-out transition.
  ipcMain.handle('auth:deleteAccount', async (): Promise<AuthStatus> => {
    const status = await deleteAccount()
    // Nothing to watch for on an account that no longer exists, and the poller would
    // otherwise keep asking a dead session for its email every fifteen seconds.
    stopEmailChangeWatch()
    await teardownSession()
    emit(status)
    return status
  })

  /**
   * A change confirmed while the app was CLOSED — which is the ordinary case, since the
   * link is clicked in a browser and there is no reason the app was running.
   *
   * Asked once at startup rather than trusted to the stored session, and it resumes the
   * watch if the server says one is still in flight. Not awaited: the window must not
   * wait on a network call to open, and the answer arrives as a `statusChanged` like
   * every other.
   *
   * `.catch()` AND NOT `void`, which is what it was. `void` on a promise nobody awaits
   * turns any rejection into an unhandled one — and in Electron's main process that is
   * a process-level event, raised while the app is still opening its window, for a
   * background read whose entire purpose is to be optional. Nothing here is worth
   * failing a launch over: the address is re-read at the next tick, or the next start.
   */
  resumeEmailChangeWatch(emit).catch((error) => {
    console.error('[auth] could not resume the email-change watch:', error)
  })
}
