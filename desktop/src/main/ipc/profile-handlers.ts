import { ipcMain } from 'electron'
import { readProfile, writeProfile } from '../config/profile'
import { getStore } from '../store/Store'
import type { UserProfile } from '../../types'

export function setupProfileHandlers(): void {
  // Cloud is the source of truth. Read it and mirror to profile.md so the skills
  // stay in sync; if the cloud is empty but a local file exists, migrate it up.
  ipcMain.handle('profile:get', async (): Promise<UserProfile | null> => {
    const remote = await getStore().loadProfile()
    if (remote) {
      writeProfile(remote)
      return remote
    }
    const local = readProfile()
    if (local) {
      await getStore().saveProfile(local).catch(() => {})
    }
    return local
  })

  ipcMain.handle('profile:save', async (_event, data: UserProfile) => {
    if (!data?.name || !data?.role || !data?.technical_level) return
    // Persist to the cloud (source of truth) AND mirror to profile.md for skills.
    await getStore().saveProfile(data)
    writeProfile(data)
  })
}
