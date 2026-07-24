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
import { resetHydration } from '../store/hydrate'

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
    // Clear cached config/agents/history so the next user starts clean.
    resetHydration()
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
  })

  ipcMain.handle('auth:confirmEmailChange', async (_event, { newEmail, code }: ConfirmEmailChangeArgs): Promise<AuthStatus> => {
    const status = await confirmEmailChange(newEmail, code)
    emit(status)
    return status
  })

  // Account deletion (GDPR) — signs the user out; emit the logged-out transition.
  ipcMain.handle('auth:deleteAccount', async (): Promise<AuthStatus> => {
    const status = await deleteAccount()
    resetHydration()
    emit(status)
    return status
  })
}
