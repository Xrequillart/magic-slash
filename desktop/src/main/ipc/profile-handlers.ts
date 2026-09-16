import fs from 'fs'
import { ipcMain } from 'electron'
import { readProfile, writeProfile } from '../config/profile'
import { getStore } from '../store/Store'
import { validateAvatarFile, type AvatarSourceResult } from '../../avatar'
import { validateUsername, type UsernameCheckResult, type UsernameSaveResult } from '../../username'
import { openImageFileDialog } from './skills-handlers'
import type { AccountSettings, UserProfile } from '../../types'

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

  // ─── Handle ───────────────────────────────────────────────────────────────
  //
  // The two writes below are the trust boundary, not the modal: `raw` is renderer
  // input whatever produced it, so the SHAPE is judged here with the shared rules in
  // desktop/src/username.ts — the same module the form greys its button with, and the
  // same rule the column states in SQL. Three copies, one spelling; see that module's
  // header for why the third cannot be imported.
  //
  // Nothing here goes near writeProfile: a handle is an account field, not one of the
  // things ~/.config/magic-slash/profile.md carries for the /magic:* skills to read.

  /**
   * What the account card reads on mount: the handle, when the password last changed,
   * and when the account was created.
   *
   * ONE CHANNEL FOR THE THREE, because the first two are two columns of one row. Never
   * throws — every field is separately nullable and each null is a state the card
   * already draws, so a failure costs one line rather than the tab.
   */
  ipcMain.handle('profile:getAccountSettings', async (): Promise<AccountSettings> => {
    try {
      return await getStore().getAccountSettings()
    } catch (error) {
      console.error('[profile] getAccountSettings failed:', error)
      return { username: null, passwordChangedAt: null, accountCreatedAt: null, avatarUpdatedAt: null }
    }
  })

  /**
   * Is this handle free? Asked while the user is still typing, so it is cheap and it
   * never throws.
   *
   * THE SHAPE IS JUDGED FIRST AND WITHOUT A ROUND TRIP. A field holding two characters
   * is not a question for the server — it is already refused — and short-circuiting
   * here is what stops every keystroke of `x`, `xa`, `xav` from becoming a request.
   *
   * ADVISORY, and the caller must not treat a `true` as a reservation: it describes
   * the instant it ran, and the unique index is what decides at the write. A lookup
   * that FAILS answers available (see `CloudStore.isUsernameAvailable`) — this gates a
   * hint, and a network hiccup must not tell someone their own free handle is taken.
   */
  ipcMain.handle('profile:checkUsername', async (_event, raw: string): Promise<UsernameCheckResult> => {
    const verdict = validateUsername(String(raw ?? ''))
    if (!verdict.ok) return verdict

    try {
      return { ok: true, available: await getStore().isUsernameAvailable(verdict.username) }
    } catch (error) {
      console.error('[profile] checkUsername failed:', error)
      return { ok: true, available: true }
    }
  })

  /**
   * Claim a handle.
   *
   * Reports every outcome as a VALUE, the way setAvatar and setup:provisionMcp do, so
   * the modal can put the reason next to the field instead of surfacing an unhandled
   * IPC error. `taken` is the outcome that matters and it is established HERE and not
   * by the check above: two people claiming one handle at the same instant is exactly
   * what a pre-flight read cannot decide, and the unique index can.
   *
   * `invalid` from the store means the column's check constraint fired although
   * `validateUsername` had passed the string — a drift between the TypeScript rule and
   * the SQL one. It is folded into `bad_characters` rather than given a code of its
   * own: to the person typing it is the same message, and the drift belongs in the
   * console for whoever has to go and fix the migration.
   */
  ipcMain.handle('profile:setUsername', async (_event, raw: string): Promise<UsernameSaveResult> => {
    const verdict = validateUsername(String(raw ?? ''))
    if (!verdict.ok) return verdict

    try {
      const outcome = await getStore().setUsername(verdict.username)
      if (outcome.ok) return { ok: true, username: verdict.username }
      if (outcome.reason === 'invalid') {
        console.error('[profile] the database refused a handle that validateUsername accepted:', verdict.username)
        return { ok: false, reason: 'bad_characters' }
      }
      return { ok: false, reason: outcome.reason }
    } catch (error) {
      console.error('[profile] setUsername failed:', error)
      return { ok: false, reason: 'error' }
    }
  })

  // ─── Profile photo ────────────────────────────────────────────────────────
  //
  // Three of these four channels are a thin skin over CloudStore; the fourth
  // (pickAvatarSource) is the only one that does real work here, and it is not
  // optional. See its own note. Nothing in this block goes near writeProfile: an
  // avatar has no business in ~/.config/magic-slash/profile.md, which is a text
  // file the /magic:* skills read.

  /**
   * Open the picker, read what the user chose, hand back a data URL — one channel,
   * no arguments.
   *
   * WHY THE RENDERER DOES NOT PASS A PATH
   * -----------------------------------------------------------------------
   * It used to: the renderer called `dialog:openFile` and then passed the returned
   * path back down to be read. That is a channel which reads ANY file the app can
   * reach and returns its bytes, and it stays that channel however carefully the
   * one caller in the tree happens to behave — a path parameter cannot be tied to
   * the picker result that produced it. Filtering the path would have meant
   * inventing an allow-list of directories the user may pick a photo from, which
   * is both wrong (photos live everywhere) and beside the point.
   *
   * So the picker and the read are ONE operation, here, and the renderer neither
   * supplies a path nor learns one. The only thing it can ask for is "the file the
   * user just chose in the dialog you opened", which is exactly the capability the
   * feature needs and nothing else. `openImageFileDialog` is the same dialog
   * `dialog:openFile` still shows — shared, not copied, so the two cannot drift.
   *
   * WHY THE VALIDATION IS HERE AND IN THIS ORDER
   * -----------------------------------------------------------------------
   * This is the only point at which the ORIGINAL file's size exists. The renderer
   * receives a data URL, crops it and hands back a 256 px WebP; a 50 MB photo
   * arrives at setAvatar as ~20 KB, so a size check there would measure our own
   * output and pass everything. `statSync` and the extension verdict therefore
   * both come BEFORE `readFileSync`, so a 4 GB video is refused without being
   * loaded into memory first.
   *
   * The mime comes back FROM the verdict rather than from a second lookup here:
   * `desktop/src/avatar.ts` owns the one list of accepted formats and their names,
   * so the data URL below cannot announce a format the validation did not allow.
   * That list has no `svg+xml` entry, deliberately — the shared picker offers SVG
   * and this is where it is refused again, because an `image/svg+xml` data URL
   * rendered in a renderer window is executable content. It is narrower than the
   * IMAGE_EXTS/MIME_MAP pair in config-handlers.ts, which serves the file PREVIEW
   * and is allowed more formats because it never crops or uploads them.
   *
   * A refusal comes back as a reason CODE — the renderer owns the translation. So
   * does `cancelled`, which is not a refusal at all: dismissing the dialog must
   * not surface as an error, and putting it in the same union is what makes the
   * caller say so explicitly.
   */
  ipcMain.handle('profile:pickAvatarSource', async (): Promise<AvatarSourceResult> => {
    const filePath = await openImageFileDialog()
    if (!filePath) return { reason: 'cancelled' }

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
  })

  /** The stored photo as a data URL, or null. Never throws: no photo is a normal state. */
  ipcMain.handle('profile:getAvatar', async (): Promise<string | null> => {
    try {
      return await getStore().getAvatarDataUrl()
    } catch (error) {
      console.error('[profile] getAvatar failed:', error)
      return null
    }
  })

  /**
   * What a failed photo write hands back: the reason, and where the photo actually
   * stands now.
   *
   * `avatar` is OPTIONAL and its absence means something different from `null`.
   * Both writes are two operations — a blob in the bucket, then a pointer on the
   * row — and a failure of the second happens with the first already done: the new
   * bytes have replaced the old ones, or the object is already gone, while the
   * renderer is still showing what it was showing before. So a failure re-reads the
   * authoritative state and sends it along, and the renderer adopts it. Where the
   * re-read ALSO fails we send no `avatar` at all rather than a `null` we invented,
   * because "there is no photo" and "we could not find out" are not the same claim
   * and the renderer can go and ask again.
   *
   * The successful paths do not re-read, on purpose: setAvatar already holds the
   * exact bytes it uploaded and removeAvatar knows the answer is nothing, so a
   * round trip could only confirm what the caller already has.
   */
  type AvatarWriteResult = { ok: boolean; error?: string; avatar?: string | null }

  /** The stored photo, or nothing at all when even reading it fails. */
  async function authoritativeAvatar(): Promise<{ avatar?: string | null }> {
    try {
      return { avatar: await getStore().getAvatarDataUrl() }
    } catch (error) {
      console.error('[profile] could not re-read the avatar after a failed write:', error)
      return {}
    }
  }

  // The two writes report failure as a value rather than as a rejection, so the
  // Account tab can show the reason next to the button instead of an unhandled
  // IPC error. Same contract as setup:provisionMcp and friends.
  ipcMain.handle('profile:setAvatar', async (_event, dataUrl: string): Promise<AvatarWriteResult> => {
    try {
      await getStore().setAvatar(dataUrl)
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        ...(await authoritativeAvatar()),
      }
    }
  })

  ipcMain.handle('profile:removeAvatar', async (): Promise<AvatarWriteResult> => {
    try {
      await getStore().removeAvatar()
      return { ok: true }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        ...(await authoritativeAvatar()),
      }
    }
  })
}
