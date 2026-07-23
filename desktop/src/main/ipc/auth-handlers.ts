import { ipcMain, type BrowserWindow } from 'electron'
import type { AuthStatus } from '../../types'
import { signIn, signUp, signOut, getStatus } from '../cloud/auth'

interface LoginArgs { email: string; password: string }
interface SignUpArgs { email: string; password: string; orgName?: string; invitationToken?: string }

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
    emit(status)
    return status
  })
}
