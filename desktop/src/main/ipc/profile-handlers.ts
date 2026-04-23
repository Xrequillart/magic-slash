import { ipcMain } from 'electron'
import { readProfile, writeProfile } from '../config/profile'
import type { UserProfile } from '../../types'

export function setupProfileHandlers(): void {
  ipcMain.handle('profile:get', async () => readProfile())

  ipcMain.handle('profile:save', async (_event, data: UserProfile) => {
    if (!data?.name || !data?.role || !data?.technical_level) return
    await writeProfile(data)
  })
}
