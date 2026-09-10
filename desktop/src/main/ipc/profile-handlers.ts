import fs from 'fs'
import { ipcMain } from 'electron'
import { readProfile, writeProfile } from '../config/profile'
import { getStore } from '../store/Store'
import { validateAvatarFile, type AvatarSourceResult } from '../../avatar'
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

  // ─── Profile photo ────────────────────────────────────────────────────────
  //
  // Three of these four channels are a thin skin over CloudStore; the fourth
  // (readAvatarSource) is the only one that does real work here, and it is not
  // optional. See its own note. Nothing in this block goes near writeProfile: an
  // avatar has no business in ~/.config/magic-slash/profile.md, which is a text
  // file the /magic:* skills read.

  /**
   * Read a file the user picked in the OS dialog, as a data URL, after checking
   * that we are willing to.
   *
   * WHY THE RENDERER CANNOT DO THIS AND WHY THE CHECK IS HERE
   * -----------------------------------------------------------------------
   * This is the only point at which the ORIGINAL file's size exists. The
   * renderer receives a data URL, crops it and hands back a 256 px WebP; a 50 MB
   * photo arrives at setAvatar as ~20 KB, so a size check there would measure our
   * own output and pass everything. Validating before `readFileSync` also means a
   * 4 GB video is refused without being loaded into memory first.
   *
   * The path comes from `dialog:openFile`, i.e. from the OS picker, so there is
   * no untrusted path to defend against and none of the traversal machinery the
   * file-preview handler needs. A refusal comes back as a reason CODE — the
   * renderer owns the translation.
   *
   * The mime comes back FROM the verdict rather than from a second lookup here:
   * `desktop/src/avatar.ts` owns the one list of accepted formats and their names,
   * so the data URL below cannot announce a format the validation did not allow.
   * That list has no `svg+xml` entry, deliberately — an `image/svg+xml` data URL
   * rendered in a renderer window is executable content. It is narrower than the
   * IMAGE_EXTS/MIME_MAP pair in config-handlers.ts, which serves the file PREVIEW
   * and is allowed more formats because it never crops or uploads them.
   */
  ipcMain.handle(
    'profile:readAvatarSource',
    async (_event, filePath: string): Promise<AvatarSourceResult> => {
      let size = 0
      try {
        size = fs.statSync(filePath).size
      } catch {
        return { reason: 'unreadable' }
      }

      const verdict = validateAvatarFile({ path: filePath, size })
      if (!verdict.ok) return { reason: verdict.reason }

      try {
        const data = fs.readFileSync(filePath)
        return { dataUrl: `data:${verdict.mime};base64,${data.toString('base64')}` }
      } catch {
        return { reason: 'unreadable' }
      }
    },
  )

  /** The stored photo as a data URL, or null. Never throws: no photo is a normal state. */
  ipcMain.handle('profile:getAvatar', async (): Promise<string | null> => {
    try {
      return await getStore().getAvatarDataUrl()
    } catch (error) {
      console.error('[profile] getAvatar failed:', error)
      return null
    }
  })

  // The two writes report failure as a value rather than as a rejection, so the
  // Account tab can show the reason next to the button instead of an unhandled
  // IPC error. Same contract as setup:provisionMcp and friends.
  ipcMain.handle('profile:setAvatar', async (_event, dataUrl: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      await getStore().setAvatar(dataUrl)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('profile:removeAvatar', async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      await getStore().removeAvatar()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
