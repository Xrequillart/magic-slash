import { useState, useCallback, useEffect, useRef } from 'react'
import { AccountCard, Button, Input } from '@ds/desktop'
import { Cloud, LogOut, LogIn, UserPlus, Loader2, KeyRound, AtSign, Trash2, AlertTriangle, ImageOff, Pencil, Check } from '@ds/desktop/icons'
import { useAuth } from '../../hooks/useAuth'
import { useAvatar, publishAvatar, avatarSession } from '../../hooks/useAvatar'
import { useOrg } from '../../hooks/useOrg'
import { LoginScreen } from '../../components/LoginScreen'
import { Modal } from '../../components/Modal'
import { AvatarCropModal, type AvatarCropView } from '../../components/AvatarCropModal'
import { AvatarPickerModal } from '../../components/AvatarPickerModal'
import { InvitationOnboardingWizard } from '../../components/InvitationOnboardingWizard'
import { showToast } from '../../components/Toast'
import { useT, useLocale, type MessageKey } from '../../i18n'
import { formatSize } from '../../utils/formatSize'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPE, AVATAR_SIZE, type AvatarRejection } from '../../../avatar'
import { sourceRectFor } from '../../../avatarCrop'
import { looksLikeEmail } from '../../../email'
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  sameUsername,
  validateUsername,
  type UsernameRejection,
} from '../../../username'

/** WebP at 0.85 is visually lossless at 256 px and a fraction of the PNG bytes. */
const AVATAR_QUALITY = 0.85

/**
 * One message per rejection code. The main process answers with a CODE and never a
 * sentence — it has no notion of the window's language — so the mapping has to live
 * here, and every code needs its own key: "that file is 12 MB" and "that file is a
 * PDF" are two different things to go and fix.
 */
const REJECTION_MESSAGE: Record<AvatarRejection, MessageKey> = {
  too_large: 'toast.avatarTooLarge',
  bad_extension: 'toast.avatarBadFormat',
  unreadable: 'toast.avatarUnreadable',
  // Only reachable from the UPLOAD side (main refuses bytes that are not a WebP
  // container), never from the picker — but the record is total on purpose, so a
  // new code cannot be added without someone deciding what the user is told.
  not_webp: 'toast.avatarNotWebp',
}

/**
 * The size ceiling as the message quotes it, derived rather than typed into the
 * catalogue: the copy cannot drift from the constant the main process enforces.
 * Rendered by the app's own byte formatter, so a refused avatar and a too-large
 * file preview quote a size the same way. Passed to every rejection message; `t`
 * ignores a placeholder a message never uses.
 */
const AVATAR_LIMIT_LABEL = formatSize(AVATAR_MAX_BYTES)

/**
 * One message per shape refusal, the twin of `REJECTION_MESSAGE` above and for its
 * reason: the rules live in `desktop/src/username.ts` so main, this form and the SQL
 * check constraint cannot drift, and that module answers in CODES because it has no
 * idea what language anyone is reading in.
 *
 * `taken` is deliberately absent. Every code here is decidable from the string alone,
 * on every keystroke, offline; whether somebody else holds the handle is a question
 * for the server with a different answer every second, and it is mapped where that
 * answer arrives rather than in a table of shape verdicts.
 */
const USERNAME_MESSAGE: Record<UsernameRejection, MessageKey> = {
  too_short: 'cloud.username.tooShort',
  too_long: 'cloud.username.tooLong',
  bad_characters: 'cloud.username.badCharacters',
}

/**
 * How long the field waits after the last keystroke before asking the server.
 *
 * The shape check is free and runs on every character; this delays the ROUND TRIP, so
 * `xa`, `xav`, `xavi`, `xavie`, `xavier` typed at speed is one question rather than
 * five. 350 ms sits above the interval between two keystrokes of anyone touch-typing
 * and below the pause a person notices while still writing.
 */
const USERNAME_CHECK_DELAY_MS = 350

/**
 * What the password column shows, which is deliberately not a password.
 *
 * A FIXED WIDTH AND NOT THE REAL LENGTH: eight bullets whatever the password is. A mask
 * that tracked the length would publish the length, which is the one thing about a
 * password worth keeping to yourself in a row that is otherwise all public facts.
 *
 * THE SPACING IS IN THE STRING, and that is a decision about where this belongs rather
 * than a shortcut around CSS. Set flush, eight bullets are a grey bar rather than eight
 * marks — the same reason `Input` spaces the ones you type. But `AccountCard` draws a
 * `value`, and it has no idea this one stands in for a password; teaching it would be
 * leaking the one concept the card is better off not knowing. What the stand-in LOOKS
 * like is the app's choice, and a string is exactly how the app states it.
 *
 * U+2009 THIN SPACE rather than a plain one, which at this size would read as eight
 * separate marks with nothing holding them together. Not a translation: a bullet is
 * punctuation, and it is the same bullet in every language this app speaks.
 */
const PASSWORD_MASK = Array(8).fill('•').join('\u2009')

/**
 * An ISO timestamp as a date a person reads, or null when there is nothing to read.
 *
 * NULL RATHER THAN A PLACEHOLDER, which is the opposite of `skillHours`'s own
 * formatter and right for a different reason: that one fills a cell in a table, where a
 * row with a blank would look broken, so it prints a dash for "never". This feeds an
 * optional line under a label, so "no date" has a better answer than a dash — draw no
 * line at all. An unparseable string takes the same path as a missing one: whatever it
 * is, it is not a date to show.
 *
 * `dateStyle: 'long'` — the month written out. The line is prose ("Last changed on
 * …"), and 12/06/2026 inside a sentence is read twice by anyone whose locale puts the
 * day second.
 */
function formatDay(iso: string | null, locale: string): string | null {
  if (!iso) return null
  const at = new Date(iso).getTime()
  if (Number.isNaN(at)) return null
  return new Date(at).toLocaleDateString(locale, { dateStyle: 'long' })
}

/**
 * What the line under the field says, and what the save button is allowed to do.
 *
 * `idle` covers two situations that look the same on screen and mean the same thing to
 * the person typing: the field is empty, and the field holds the handle they already
 * have. Neither is a question worth asking the server and neither is something to save.
 *
 * `available` IS THE ONLY STATE THAT ENABLES THE SAVE, and it is still not a promise —
 * the unique index is what decides, so a save can come back `taken` from a state that
 * said available a moment earlier. That is not a race to design out; it is the race,
 * and the write is what reports it.
 */
type UsernameCheck =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'invalid'; reason: UsernameRejection }

/**
 * Source image plus the framing a human dialled in → the exact 256×256 WebP data
 * URL the account photo is stored as.
 *
 * WHICH pixels is not decided here either. `view` is the zoom and the pan
 * `AvatarCropModal` was drawing at the moment the user confirmed, and the
 * rectangle below is `sourceRectFor` — the same function the dialog previewed
 * through — applied to it, so the pixels encoded are the pixels that were inside
 * the round mask, on any aspect ratio. What this function does own is the encode:
 * `drawImage`'s nine-argument form does the crop and the downscale in one pass, so
 * there is no intermediate canvas to lose a generation of quality to.
 *
 * A framing rather than a rectangle crosses the boundary on purpose. A rectangle
 * would arrive already measured against dimensions read somewhere else, and this
 * function would have to take on faith that it still fits the bitmap it is about
 * to draw from — a rect that had escaped the containment invariant does not throw,
 * it makes `drawImage` read outside the bitmap and paint a transparent strip
 * inside the round mask. A zoom and a pan cannot escape anything: `sourceRectFor`
 * clamps them here, against this decode's own `naturalWidth`/`naturalHeight`.
 *
 * The image is decoded a second time here rather than the element being passed
 * across from the dialog, so this stays a function of the same STRING the picker
 * produced rather than of a live object owned by a component that has closed. The
 * cost is one decode of an at-most-5 MB file, once, on a path that then encodes a
 * WebP and uploads it — both of which dominate it. It is `new Image()` on both
 * sides deliberately: that is the decoder that honours a JPEG's EXIF orientation
 * (see `AvatarCropModal`'s header), so the framing chosen there lands on exactly
 * the same pixels here.
 *
 * It runs in the renderer rather than the main process because that is where a
 * `<canvas>` and an image decoder exist at all — Electron's main process has neither.
 * Throwing here means the bytes could not be decoded or encoded, which the caller
 * reports as an unreadable file.
 */
async function toAvatarDataUrl(sourceDataUrl: string, view: AvatarCropView): Promise<string> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('avatar: could not decode the source image'))
    image.src = sourceDataUrl
  })

  const rect = sourceRectFor({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    ...view,
  })
  // Zero only for a decode with no pixels at all, which `centerCropBox` answers
  // with a zero box. `drawImage` reads that as "draw nothing" and would upload a
  // fully transparent avatar, so it is reported the way any other file this
  // function cannot make an image of is.
  if (rect.sSize <= 0) throw new Error('avatar: the decoded image has no pixels to crop')

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('avatar: no 2d context')
  ctx.drawImage(image, rect.sx, rect.sy, rect.sSize, rect.sSize, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, AVATAR_MIME_TYPE, AVATAR_QUALITY)
  })
  if (!blob) throw new Error('avatar: could not encode WebP')

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('avatar: could not read the encoded blob'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Cloud identity block of the Account tab: the account photo, sign in / out,
 * change password, change email, delete account. Extracted from OrgPage so the
 * Organization tab stays about the org itself while identity lives under Account.
 *
 * It owns its own auth modals — nothing else needs to know they exist.
 *
 * The avatar is no longer held here. It used to be local state, and the note in this
 * place used to justify that by saying this card was the only surface showing the
 * photo and that a bus with one subscriber goes stale the first time someone forgets
 * to publish on it. That condition has expired: the sidebar account button and the
 * settings rail footer draw the same face now, and "removing the photo updates both
 * without a restart" is an acceptance criterion rather than a nicety. So the value
 * lives in `hooks/useAvatar`, read here with `useAvatar()` and written with
 * `publishAvatar()`.
 *
 * The bus is a RENDERER store and not a `profile:changed` IPC broadcast, though: all
 * three surfaces are in this same window and this card is the only writer, so a
 * main→renderer event would leave the process and come back to tell the sender's
 * neighbours what the sender already knows. The store's own header says what would
 * change that.
 *
 * The write behaviour is exactly what it was. The photo is written through from the
 * value we just uploaded — no re-read on success, since the bytes on screen are the
 * bytes that were stored — and a FAILED write is the one case that does re-read: see
 * `resyncAvatar`. What used to be `setAvatar(x)` is now `publishAvatar(x, forSession)`.
 * The initial fetch is gone from here because the store does it at init, for every
 * surface at once and before any of them mounts.
 *
 * `forSession` is the one thing the move to a shared store made necessary. Local
 * state died with its component, so an upload that outlived a sign-out could only
 * ever write into a card nobody was looking at; a module-level store outlives every
 * account, so the same late result would now paint the previous user's face onto the
 * new one's row. Each handler stamps its epoch before its first await, and the store
 * drops what no longer matches.
 */
export function CloudAccountSection() {
  const { status, loading: authLoading, logout, updatePassword, requestEmailChange, deleteAccount } = useAuth()
  const { refresh } = useOrg()
  const t = useT()
  const locale = useLocale()

  const [showLogin, setShowLogin] = useState(false)
  const [showInvitationWizard, setShowInvitationWizard] = useState(false)

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)
  /**
   * The address the account moved TO, once the server confirms it did.
   *
   * Non-null IS "show the confirmation dialog". The change is confirmed in a browser,
   * so there is no moment in this app to celebrate it at — main watches for it and the
   * effect below turns that into a dialog, which is the only acknowledgement the user
   * gets on this side.
   */
  const [changedEmail, setChangedEmail] = useState<string | null>(null)

  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleting, setDeleting] = useState(false)

  /**
   * The handle, and the modal that changes it.
   *
   * LOCAL STATE and not a store next to `useAvatar`, which is a difference worth
   * stating because the two look alike. The photo is drawn on three surfaces in this
   * window — this card, the sidebar account button, the settings rail footer — and
   * removing it has to blank all three at once; that is what made a module-level bus
   * the right shape there. The handle is drawn HERE and nowhere else, so a store would
   * be a bus with one subscriber, which is the arrangement that goes stale the first
   * time someone forgets to publish on it. The day the sidebar shows the handle too,
   * `hooks/useAvatar` is the pattern to copy, not to extend.
   */
  const [username, setUsername] = useState<string | null>(null)
  /**
   * When the password last changed, and when the account was created — read together
   * with the handle because the first two are two columns of one row.
   *
   * `passwordChangedAt` NULL IS NOT "never changed". The column postdates most
   * accounts, so a password changed last year reads as null forever and will never
   * stop doing so. The line below says exactly that and no more; see
   * `cloud.password.notRecorded`.
   */
  const [passwordChangedAt, setPasswordChangedAt] = useState<string | null>(null)
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null)
  /**
   * When the photo was last written — Storage's own `updated_at` on the object, not a
   * date this app records. See `AccountSettings`.
   */
  const [avatarUpdatedAt, setAvatarUpdatedAt] = useState<string | null>(null)
  const [showChangeUsername, setShowChangeUsername] = useState(false)
  const [usernameDraft, setUsernameDraft] = useState('')
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck>({ kind: 'idle' })
  const [savingUsername, setSavingUsername] = useState(false)

  // Shared with the sidebar and the settings rail footer. The store also owns the
  // initial read and the sign-in/sign-out transitions this component used to key an
  // effect on — see `hooks/useAvatar`.
  const avatar = useAvatar()
  const [avatarBusy, setAvatarBusy] = useState(false)
  /**
   * The grid of drawn portraits, and now the FIRST thing the Edit button opens.
   *
   * It used to open the native file dialog directly, which made "change my avatar" and
   * "upload a photograph" one and the same act — and left everyone without a square
   * photo of themselves on the generic mark. The photo route is still exactly the route
   * it was; it is reached from inside this dialog rather than instead of it.
   */
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  /**
   * The picked file, waiting to be framed. Non-null IS "the crop dialog is open",
   * and it is the only thing the picker produces: nothing reaches Storage, and the
   * photo on screen does not change, until the user confirms a square.
   */
  const [cropSource, setCropSource] = useState<string | null>(null)

  /**
   * Put the photo back on server truth after a write that failed.
   *
   * A write is two operations — the blob, then the pointer — and the blob goes
   * first deliberately (an orphan is harmless; a pointer at nothing 404s on every
   * mount). So a failure of the SECOND leaves what is on screen stale in the one
   * direction that matters: the new bytes have already replaced the old photo, or
   * the object is already gone, while this component is still rendering what it
   * was rendering before. Showing a toast and keeping that image is telling the
   * user nothing happened when something did.
   *
   * `result.avatar` is what main re-read after the failure, and an ABSENT field
   * means even that re-read failed — so we go and ask, rather than treat a missing
   * value as "no photo" and blank a face that is still there. If the refetch fails
   * too we are offline and the stale image is the least of it.
   */
  const resyncAvatar = useCallback(async (result: { avatar?: string | null }, forSession: number) => {
    if (result.avatar !== undefined) {
      publishAvatar(result.avatar, forSession)
      return
    }
    try {
      publishAvatar(await window.electronAPI.profile.getAvatar(), forSession)
    } catch {
      /* Nothing to correct it with; the toast has already told the user. */
    }
  }, [])

  /**
   * WRITE THESE BYTES AS THE ACCOUNT'S FACE — the one path to Storage, whatever chose
   * them.
   *
   * Extracted the day a second thing could choose an avatar. A framed photograph and a
   * drawn portrait differ in exactly one respect — where the 256px WebP came from — and
   * every line below is about what happens AFTER that: the epoch the result belongs to,
   * the resync when Storage refuses, the write-through to the store, the date in the
   * value column, the one toast. Two copies of that would be two places for the
   * sign-out-mid-upload guard to be got subtly right.
   *
   * `forSession` IS THE CALLER'S, taken before ITS first await and not read here: the
   * account a face was chosen for is decided when the choosing started, and by the time
   * this function runs an encode has already happened. Reading `avatarSession()` inside
   * would stamp the result with whoever is signed in by now, which is precisely the
   * value that cannot detect the switch.
   *
   * Neither the busy flag nor the dialogs are touched here. Both callers raise and clear
   * `avatarBusy` around their own whole act — the encode included — so moving it in
   * would leave the encode outside the spinner it exists for.
   */
  const uploadAvatar = useCallback(async (encoded: string, forSession: number) => {
    try {
      const result = await window.electronAPI.profile.setAvatar(encoded)
      if (!result.ok) {
        // `result.error` is a transport or Storage message in English; it goes to the
        // console for whoever is debugging, not into a toast the user has to decode.
        if (result.error) console.error('avatar upload failed:', result.error)
        await resyncAvatar(result, forSession)
        showToast(t('toast.avatarSaveFailed'), 'error')
        return
      }

      publishAvatar(encoded, forSession)
      // Write-through for the value column, on the SUCCESS path only: a failed upload
      // must not leave the row claiming a photo was written today. The epoch guard is
      // `publishAvatar`'s, restated because this state is local and has none of its
      // own — a result belonging to an account that has since been signed out of would
      // otherwise date the NEXT user's photo.
      if (avatarSession() === forSession) setAvatarUpdatedAt(new Date().toISOString())
    } catch (e) {
      // An IPC rejection: no result to read a resynced value out of, so ask.
      console.error('avatar upload failed:', e)
      await resyncAvatar({}, forSession)
      showToast(t('toast.avatarSaveFailed'), 'error')
    }
  }, [resyncAvatar, t])

  /**
   * Pick a file — and stop there. On any REFUSAL, change nothing.
   *
   * Every refusal return here leaves `avatar` exactly as it was, which is the
   * point of C4: a 20 MB TIFF must not blank out the photo that is already
   * working, and a file we would not even read never reached Storage, so there is
   * nothing to resync.
   *
   * The picker is `pickAvatarSource()`, not `dialog.openFile()` followed by a
   * read: main opens the dialog and reads the file in one operation, so no path
   * ever travels through this process. `'cancelled'` is therefore a normal
   * outcome and shows nothing at all.
   *
   * Where this used to crop and upload in one go, it now hands the bytes to
   * `AvatarCropModal` and returns. NOTHING has been written when it does: the
   * upload is `handleCropConfirm`, and dismissing the dialog leaves the account
   * exactly as this function found it. There is no session epoch to take here
   * either — the account that matters is the one signed in when the user confirms,
   * which may be minutes later, so it is taken there.
   *
   * `avatarBusy` covers the picker itself and is dropped as soon as the dialog is
   * on screen; `cropSource` is what keeps the button disabled from then on, so a
   * second click cannot stack a second native picker behind the crop dialog.
   */
  const handleChoosePhoto = useCallback(async () => {
    if (avatarBusy || cropSource !== null) return

    setAvatarBusy(true)
    try {
      const source = await window.electronAPI.profile.pickAvatarSource()
      if ('reason' in source) {
        // Dismissing the dialog is not a failure and must not toast.
        if (source.reason === 'cancelled') return
        showToast(t(REJECTION_MESSAGE[source.reason], { limit: AVATAR_LIMIT_LABEL }), 'error')
        return
      }
      setCropSource(source.dataUrl)
    } catch (e) {
      // An IPC rejection. Nothing was written, so there is nothing to resync — the
      // file simply never became readable bytes, which is what the user is told.
      console.error('avatar picker failed:', e)
      showToast(t('toast.avatarUnreadable'), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }, [avatarBusy, cropSource, t])

  /**
   * Open the grid. The guard is `handleChoosePhoto`'s, kept because this is now the
   * button that used to be it: a dialog opened over a crop already in progress would
   * offer to replace bytes that are mid-flight.
   */
  const openAvatarPicker = useCallback(() => {
    if (avatarBusy || cropSource !== null) return
    setShowAvatarPicker(true)
  }, [avatarBusy, cropSource])

  /**
   * A portrait was confirmed. It is ALREADY the payload — see `avatars/portraits.ts` —
   * so there is no encode between here and Storage, which is the whole difference
   * between this handler and the crop one.
   *
   * Closed before the first await, for `handleCropConfirm`'s reason: leaving the grid
   * up during the upload lets a second confirm fire the whole thing twice.
   */
  const handleChoosePortrait = useCallback(async (dataUrl: string) => {
    setShowAvatarPicker(false)
    setAvatarBusy(true)
    // Taken before the first await: the account this face was chosen FOR. Same guard
    // the photo path takes, and it is needed here for the same reason — signing out
    // mid-upload must not drop this face onto whoever signs in next.
    const forSession = avatarSession()
    try {
      await uploadAvatar(dataUrl, forSession)
    } finally {
      setAvatarBusy(false)
    }
  }, [uploadAvatar])

  /**
   * "Use a photo instead": the grid steps aside and the file dialog takes over.
   *
   * The two dialogs are never open together — this one closes before the picker is
   * asked for — because the native dialog is modal to the window, and a grid still
   * mounted behind it would come back into view between the file being picked and the
   * crop dialog appearing.
   */
  const handleUploadInstead = useCallback(() => {
    setShowAvatarPicker(false)
    void handleChoosePhoto()
  }, [handleChoosePhoto])

  /**
   * The user confirmed a square: encode it and upload it.
   *
   * This is the half of the old `handleChoosePhoto` that WRITES, unchanged in
   * every respect but where the crop comes from — the dialog hands over the zoom
   * and the pan it was previewing at, and `toAvatarDataUrl` turns them into a
   * rectangle with the same function that preview went through, so the pixels
   * encoded below are the pixels that were inside the mask.
   *
   * `avatarBusy` is re-armed here because the picker's own busy span ended when the
   * dialog opened, and the encode plus the upload is the part worth showing a
   * spinner for.
   */
  const handleCropConfirm = useCallback(async (view: AvatarCropView) => {
    const source = cropSource
    // No `avatarBusy` term: every path that raises it clears it in a `finally`
    // before this dialog can be on screen, and a second confirm is already
    // impossible — `setCropSource(null)` runs below before the first await.
    if (!source) return

    // Closed before the first await: the dialog has done its job, and leaving it up
    // during the upload would let a second confirm fire the whole thing twice.
    setCropSource(null)
    setAvatarBusy(true)
    // Taken before the first await: this is the account the photo is being chosen
    // FOR, and everything below publishes under it or not at all. Signing out mid
    // upload must not drop this face onto whoever signs in next.
    const forSession = avatarSession()
    try {
      let encoded: string
      try {
        encoded = await toAvatarDataUrl(source, view)
      } catch {
        // The picker accepted it and the bytes arrived, but nothing here can decode
        // them — same thing to the user as a file that was never an image.
        showToast(t('toast.avatarUnreadable'), 'error')
        return
      }

      await uploadAvatar(encoded, forSession)
    } finally {
      setAvatarBusy(false)
    }
  }, [cropSource, uploadAvatar, t])

  /** Dismissed. The bytes are dropped and the photo already on the account stays. */
  const handleCropCancel = useCallback(() => setCropSource(null), [])

  /**
   * The dialog could not decode what the picker handed it.
   *
   * Same outcome the encode failure has always produced — the file passed the
   * extension and size checks in main but is not an image — reported here rather
   * than at the encode, because now nothing gets as far as the encode.
   */
  const handleCropUnreadable = useCallback(() => {
    setCropSource(null)
    showToast(t('toast.avatarUnreadable'), 'error')
  }, [t])

  const handleRemovePhoto = useCallback(async () => {
    if (avatarBusy) return
    setAvatarBusy(true)
    // Same reason as the upload: a removal that lands after a sign-out would blank
    // the NEXT account's photo, which is the same bug wearing the other sign.
    const forSession = avatarSession()
    try {
      const result = await window.electronAPI.profile.removeAvatar()
      if (!result.ok) {
        if (result.error) console.error('avatar removal failed:', result.error)
        // The blob may already be gone with only the pointer left — the photo the
        // user just asked to delete must not stay on screen as though it were fine.
        await resyncAvatar(result, forSession)
        showToast(t('toast.avatarRemoveFailed'), 'error')
        return
      }
      publishAvatar(null, forSession)
      // No photo, no date. Same epoch guard, same reason.
      if (avatarSession() === forSession) setAvatarUpdatedAt(null)
    } catch (e) {
      console.error('avatar removal failed:', e)
      await resyncAvatar({}, forSession)
      showToast(t('toast.avatarRemoveFailed'), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }, [avatarBusy, resyncAvatar, t])

  // ─── The handle ───────────────────────────────────────────────────────────

  /**
   * WHOSE handle is on screen, as the id rather than the whole status object: the
   * effect below must re-run when the PERSON changes and not when an email
   * confirmation rewrites the same person's address. Same distinction `useAvatar`
   * draws with its `accountKey`, and for the same reason.
   */
  const userId = status.loggedIn ? (status.user?.id ?? null) : null

  /**
   * Read the handle for whoever is signed in, and drop it when nobody is.
   *
   * `alive` is not defensive noise: signing out while the read is in the air would
   * otherwise paint the previous account's handle above the next one's email. It is
   * the local-state form of the epoch `useAvatar` keeps — cheaper here because the
   * state dies with the component, so only an in-flight read can be wrong.
   *
   * A failure leaves the handle at null, which draws the email in the header: the
   * fallback is already the correct thing to show for a user who has not picked one,
   * and a card that cannot say who you are is worse than a card naming your address.
   */
  useEffect(() => {
    if (!userId) {
      setUsername(null)
      setPasswordChangedAt(null)
      setAccountCreatedAt(null)
      setAvatarUpdatedAt(null)
      return
    }
    let alive = true
    window.electronAPI.profile
      .getAccountSettings()
      .then((settings) => {
        if (!alive) return
        setUsername(settings.username)
        setPasswordChangedAt(settings.passwordChangedAt)
        setAccountCreatedAt(settings.accountCreatedAt)
        setAvatarUpdatedAt(settings.avatarUpdatedAt)
      })
      .catch((e) => { console.error('account settings read failed:', e) })
    return () => { alive = false }
  }, [userId])

  /**
   * Judge what is in the field, and ask the server when the string alone cannot say.
   *
   * THREE ANSWERS COST NOTHING AND COME FIRST — empty, the wrong shape, and the
   * handle you already hold — so the common case of opening the modal and looking at
   * your own handle makes no request at all.
   *
   * ONLY THE CAPITALISATION CHANGED is the fourth, and it is short-circuited to
   * `available` rather than to `idle`: `Xavier` over `xavier` is a real save (the
   * column stores what its owner typed) but it cannot collide, because the unique
   * index is on `lower(username)` and the row it would clash with is the caller's own.
   * `username_available` excludes that row too, so the round trip would answer the
   * same thing more slowly.
   *
   * A LOOKUP THAT FAILS ANSWERS AVAILABLE, matching main and the store beneath it:
   * this gates a hint and a button, and a network hiccup must not tell someone their
   * own free handle is taken and leave them unable to press anything. The write is
   * where the truth is.
   */
  useEffect(() => {
    if (!showChangeUsername) return

    const raw = usernameDraft.trim()
    if (raw === '') {
      setUsernameCheck({ kind: 'idle' })
      return
    }
    const verdict = validateUsername(raw)
    if (!verdict.ok) {
      setUsernameCheck({ kind: 'invalid', reason: verdict.reason })
      return
    }
    if (verdict.username === username) {
      setUsernameCheck({ kind: 'idle' })
      return
    }
    if (sameUsername(verdict.username, username)) {
      setUsernameCheck({ kind: 'available' })
      return
    }

    setUsernameCheck({ kind: 'checking' })
    let alive = true
    const timer = window.setTimeout(() => {
      window.electronAPI.profile
        .checkUsername(verdict.username)
        .then((result) => {
          if (!alive) return
          if (!result.ok) {
            setUsernameCheck({ kind: 'invalid', reason: result.reason })
            return
          }
          setUsernameCheck({ kind: result.available ? 'available' : 'taken' })
        })
        .catch((e) => {
          console.error('username check failed:', e)
          if (alive) setUsernameCheck({ kind: 'available' })
        })
    }, USERNAME_CHECK_DELAY_MS)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [showChangeUsername, usernameDraft, username])

  /** Opens on what you already have, so changing one letter is one keystroke. */
  const openUsernameModal = useCallback(() => {
    setUsernameDraft(username ?? '')
    setUsernameCheck({ kind: 'idle' })
    setShowChangeUsername(true)
  }, [username])

  const resetUsernameModal = useCallback(() => {
    setShowChangeUsername(false)
    setUsernameDraft('')
    setUsernameCheck({ kind: 'idle' })
  }, [])

  /**
   * Claim it.
   *
   * THE SHAPE IS RE-JUDGED HERE although the effect above has already done it, and
   * that is not belt and braces: Enter fires this before the debounce has settled, so
   * the check state can still be `checking` on a string that was never valid.
   *
   * `taken` REOPENS THE FIELD RATHER THAN CLOSING THE MODAL. It is the one outcome the
   * pre-flight check could not have prevented — between the check and the write, the
   * handle became someone else's — so the user is left exactly where they can fix it,
   * with the message under the field they were typing in. Everything the user cannot
   * fix by typing (no session, a transport failure) is a toast instead.
   */
  const handleChangeUsername = useCallback(async () => {
    if (savingUsername) return

    const verdict = validateUsername(usernameDraft)
    if (!verdict.ok) {
      setUsernameCheck({ kind: 'invalid', reason: verdict.reason })
      return
    }
    // Byte-identical to what is stored: there is nothing to write, so close.
    if (verdict.username === username) {
      resetUsernameModal()
      return
    }

    setSavingUsername(true)
    try {
      const result = await window.electronAPI.profile.setUsername(verdict.username)
      if (result.ok) {
        // Write-through from the value that was stored, not a re-read: main hands back
        // the exact string it wrote, so asking the server again could only confirm it.
        setUsername(result.username)
        showToast(t('toast.usernameUpdated'), 'success')
        resetUsernameModal()
        return
      }
      if (result.reason === 'taken') {
        setUsernameCheck({ kind: 'taken' })
        return
      }
      if (result.reason === 'offline') {
        showToast(t('toast.usernameOffline'), 'error')
        return
      }
      if (result.reason === 'error') {
        showToast(t('toast.usernameSaveFailed'), 'error')
        return
      }
      setUsernameCheck({ kind: 'invalid', reason: result.reason })
    } catch (e) {
      // An IPC rejection. Nothing was stored, so the handle on screen is still true.
      console.error('username save failed:', e)
      showToast(t('toast.usernameSaveFailed'), 'error')
    } finally {
      setSavingUsername(false)
    }
  }, [savingUsername, usernameDraft, username, resetUsernameModal, t])

  const handleLogout = useCallback(async () => {
    await logout()
    await refresh()
  }, [logout, refresh])

  const resetPasswordModal = useCallback(() => {
    setShowChangePassword(false)
    setNewPassword('')
    setConfirmPassword('')
  }, [])

  const handleChangePassword = useCallback(async () => {
    if (changingPassword) return
    if (!newPassword || newPassword !== confirmPassword) {
      showToast(t('toast.passwordMismatch'), 'error')
      return
    }
    setChangingPassword(true)
    try {
      await updatePassword(newPassword)
      // Write-through, so the line under the button says "today" without waiting for a
      // relaunch. Main has already stamped the column with its own `now()`; this is a
      // second clock, and the two can differ by the round trip. That is invisible at
      // `dateStyle: 'long'` — a date, not a time — and re-reading the row to avoid a
      // difference nothing can display would be a round trip spent on nothing.
      setPasswordChangedAt(new Date().toISOString())
      showToast(t('toast.passwordUpdated'), 'success')
      resetPasswordModal()
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.passwordUpdateFailed'), 'error')
    } finally {
      setChangingPassword(false)
    }
  }, [changingPassword, newPassword, confirmPassword, updatePassword, resetPasswordModal])

  const resetEmailModal = useCallback(() => {
    setShowChangeEmail(false)
    setNewEmail('')
  }, [])

  /**
   * Ask for the change, and stop there.
   *
   * ONE STEP, WHERE THERE WERE TWO. The second used to take a 6-digit code out of the
   * email, and there is no code: the project is on the free tier with Supabase's own
   * mail provider, which forbids custom templates, so the message that goes out is the
   * stock one and it carries a LINK. A box asking for a code that no email contains is
   * a dead end with a cursor blinking in it.
   *
   * SO NOTHING IS CONFIRMED HERE. Opening the link applies the change server-side, in a
   * browser, on whatever machine the mailbox is on. This app finds out by asking — see
   * `email-change-watcher` in main, and the effect below that turns its answer into a
   * dialog.
   *
   * `confirmEmailChange` is still wired end to end, unused. It is the path back the day
   * a custom SMTP provider unlocks the token template.
   */
  const handleChangeEmail = useCallback(async () => {
    if (changingEmail) return
    if (!newEmail.trim()) { showToast(t('toast.emailRequired'), 'error'); return }
    // BEFORE the round trip, and before the server mails anything: a typo in the domain
    // costs a message sent to an inbox nobody can open, and a change left pending
    // against an address that does not exist. `looksLikeEmail` only catches what is
    // nonsense in any reading — it is a gate, not a verdict on delivery.
    if (!looksLikeEmail(newEmail)) { showToast(t('toast.emailInvalid'), 'error'); return }

    setChangingEmail(true)
    try {
      await requestEmailChange(newEmail.trim())
      showToast(t('toast.emailLinkSent'), 'success')
      resetEmailModal()
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.emailChangeFailed'), 'error')
    } finally {
      setChangingEmail(false)
    }
  }, [changingEmail, newEmail, requestEmailChange, resetEmailModal, t])

  /**
   * Notice that the address actually moved.
   *
   * MAIN IS WHAT WATCHES; this only reacts. The poller there emits `auth:statusChanged`
   * when the server reports a new address, `useAuth` re-renders with it, and the two
   * refs below turn that into the one thing a user needs: an acknowledgement that the
   * thing they did in another window worked.
   *
   * IT COMPARES AGAINST THE PREVIOUS EMAIL, AND ONLY WITHIN ONE ACCOUNT. Signing out
   * and back in as somebody else also changes `status.user.email`, and congratulating
   * the new arrival on a change they never made would be worse than saying nothing —
   * hence the `user.id` guard. The first render seeds the ref and announces nothing,
   * because an address that was already this one when the tab opened did not change.
   */
  const seenAccount = useRef<{ id: string; email: string } | null>(null)
  useEffect(() => {
    const id = status.user?.id
    const email = status.user?.email
    if (!status.loggedIn || !id || !email) {
      seenAccount.current = null
      return
    }
    const seen = seenAccount.current
    seenAccount.current = { id, email }
    if (seen && seen.id === id && seen.email !== email) setChangedEmail(email)
  }, [status])


  const handleDeleteAccount = useCallback(async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteAccount()
      showToast(t('toast.accountDeleted'), 'success')
      setShowDeleteAccount(false)
      await refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.accountDeleteFailed'), 'error')
    } finally {
      setDeleting(false)
    }
  }, [deleting, deleteAccount, refresh])

  /**
   * The line under "Password", or nothing.
   *
   * TWO CLAIMS AND ONLY ONE OF THEM IS PROVABLE, which is why this is a branch and not
   * one message with a fallback date substituted in. A recorded change gives a date the
   * app stamped itself, and "last changed on" is true. A null does NOT mean the
   * password never changed — `profiles.password_changed_at` postdates most accounts, so
   * somebody who changed theirs last year reads as null here and always will — so the
   * fallback claims only that no change was RECORDED, and dates that from the account's
   * creation, which is at least the earliest the current password can be.
   *
   * No date at all (the session could not be read) draws no line, which is the reason
   * `formatDay` answers null instead of a placeholder.
   */
  const avatarUpdatedOn = formatDay(avatarUpdatedAt, locale)
  const changedOn = formatDay(passwordChangedAt, locale)
  const createdOn = formatDay(accountCreatedAt, locale)
  const passwordHint = changedOn
    ? t('cloud.password.changedOn', { date: changedOn })
    : createdOn
      ? t('cloud.password.notRecorded', { date: createdOn })
      : undefined

  /**
   * The same two facts, turned around for the dialog.
   *
   * THE ROW SAYS WHEN, THE DIALOG SAYS HOW LONG IT HAS STOOD. They are one date read two
   * ways, and the difference is what the reader is doing at the time: scanning the card
   * they want the value of the setting, and standing in front of an empty password field
   * they want the reason to fill it in. "Last changed on 4 March" and "you have not
   * changed it since 4 March" are the same sentence pointed at two different decisions.
   *
   * IT CLAIMS NOTHING MORE THAN THE COLUMN SUPPORTS, which is the same discipline the row
   * keeps: a null `passwordChangedAt` does NOT mean the password has never changed, only
   * that no change was recorded, so the fallback says exactly that and dates it from the
   * account instead. No date at all draws no line rather than an empty paragraph.
   */
  const passwordModalHelp = changedOn
    ? t('cloud.password.modalHelp', { date: changedOn })
    : createdOn
      ? t('cloud.password.modalHelpNotRecorded', { date: createdOn })
      : undefined

  // Cloud disabled entirely (no Supabase env baked in) → nothing to sign in to.
  if (!authLoading && !status.enabled) {
    return (
      /* The same plate `AccountCard` draws, minus the border for the same reason — a
         hairline around something already a different colour from the page is the same
         thing said twice. Not the card itself: this state has no identity and no
         actions, only a mark and two lines saying there is nothing to sign in to.

         RETURNED BARE, where it used to sit in a wrapper under a section header. With
         the header gone the wrapper held exactly one child and contributed nothing —
         see the note on the signed-in branch for why the header went. */
      <div className="bg-surface rounded-xl p-6 text-center">
        <Cloud className="w-8 h-8 text-icon-muted mx-auto mb-3" />
        <div className="text-sm text-text-secondary/60">{t('org.cloudDisabled')}</div>
        <div className="text-xs text-text-secondary/40 mt-1">{t('org.cloudDisabledHint')}</div>
      </div>
    )
  }

  return (
    /* NO SECTION HEADER. "Cloud account" sat above this card in the same rung the
       checklist and the profile still use, and it was the one of the three that named
       something the card already says: the plate opens on a face, an address and a Sign
       out button, which is not a block a reader has to be told is about their account.
       The wrapper stays — it groups the card with the five dialogs below it. */
    <div>
      {/* THE CARD IS `AccountCard` NOW — the drawing went to the design system whole, both
          branches of it, and what is left here is the wiring: the session, the avatar
          bytes, the translator, and four dialogs. The two branches used to be two blocks
          of markup sharing a plate and nothing else, which is how they had drifted into
          different button heights; the difference between them is DATA now.

          `alt` comes from this side because the design system cannot read a translation.
          That split used to live in an `AccountAvatar` wrapper with a table of four
          surfaces; the card was the last of them that still needed a name, so the wrapper
          is gone and the caller names the rung. */}
      {status.loggedIn ? (
        <AccountCard
          avatar={{ src: avatar, alt: t('cloud.avatar.alt') }}
          /* THE HANDLE NAMES THE CARD, and the email address is what stands in until
             there is one. An address is an identifier rather than a name: it is the
             one field its owner cannot choose the look of, it carries their employer
             in the domain, and it is the piece of this card you would least like on a
             shared screen. It keeps its own line below, where it is the value of the
             setting that changes it. */
          name={username ?? status.user?.email ?? t('cloud.signedInFallback')}
          hint={t('cloud.signedInHint')}
          actions={[
            { id: 'sign-out', label: t('cloud.signOut'), icon: LogOut, onClick: handleLogout },
          ]}
          /* ONE LINE PER SETTING, in the order a person meets them: who you are, what
             you look like, how you sign in, and — last, alone, past everything you
             might have come here to change — how you leave.

             THE BUTTONS SAY THE VERB AND THE LINE SAYS THE NOUN. Four of the five read
             `Edit`, which would be unreadable in the wrapping row this replaced (four
             identical buttons in a line) and is the only sensible label once each one
             sits beside the thing it edits. The two REMOVALS keep a mark of their own,
             because they are the pair you must not press by mistake. */
          rows={[
            {
              id: 'username',
              label: t('cloud.row.username'),
              value: username ?? t('cloud.username.none'),
              unset: username === null,
              hint: t('cloud.username.hint'),
              actions: [
                { id: 'change-username', label: t('common.edit'), icon: Pencil, onClick: openUsernameModal },
              ],
            },
            {
              id: 'avatar',
              label: t('cloud.row.avatar'),
              // The date comes from STORAGE'S OWN `updated_at` on the object, so it
              // cannot drift from the photo: it is the photo's row. A photo with no
              // readable date still says there is one — `avatar` is the bytes, and the
              // bytes are the fact that matters.
              value: avatar
                ? (avatarUpdatedOn ? t('cloud.avatar.updatedOn', { date: avatarUpdatedOn }) : t('cloud.avatar.set'))
                : t('cloud.avatar.none'),
              unset: !avatar,
              actions: [
                {
                  id: 'choose-avatar',
                  label: t('common.edit'),
                  icon: Pencil,
                  busy: avatarBusy,
                  disabled: cropSource !== null,
                  onClick: openAvatarPicker,
                },
                // No photo, no remove button — there is nothing to undo.
                ...(avatar
                  ? [{
                      id: 'remove-photo',
                      label: t('common.remove'),
                      icon: ImageOff,
                      tone: 'danger' as const,
                      disabled: avatarBusy,
                      onClick: handleRemovePhoto,
                    }]
                  : []),
              ],
            },
            {
              id: 'email',
              label: t('cloud.row.email'),
              value: status.user?.email ?? t('cloud.signedInFallback'),
              actions: [
                {
                  id: 'change-email',
                  label: t('common.edit'),
                  icon: Pencil,
                  onClick: () => setShowChangeEmail(true),
                },
              ],
            },
            {
              id: 'password',
              label: t('cloud.row.password'),
              // A STAND-IN AND NOT THE THING. The value column wants something in every
              // row, and a password is the one setting whose value must never be drawn,
              // so it gets the mask a password field would show. What is actually
              // informative here is the date underneath.
              value: PASSWORD_MASK,
              hint: passwordHint,
              actions: [
                {
                  id: 'change-password',
                  label: t('common.edit'),
                  icon: Pencil,
                  onClick: () => setShowChangePassword(true),
                },
              ],
            },
            {
              id: 'delete-account',
              label: t('cloud.deleteAccount'),
              // NO VALUE, because deleting an account is a thing you do and not a thing
              // that is set to something. The explanation takes the cell instead, which
              // is how the longest sentence on the card gets the widest column without
              // needing one of its own.
              hint: t('cloud.delete.rowHint'),
              actions: [
                {
                  id: 'delete-account',
                  label: t('common.remove'),
                  icon: Trash2,
                  tone: 'danger',
                  onClick: () => setShowDeleteAccount(true),
                },
              ],
            },
          ]}
        />
      ) : (
        <AccountCard
          name={t('cloud.notSignedIn')}
          hint={t('cloud.notSignedInHint')}
          actions={[
            {
              id: 'join',
              label: t('cloud.joinWithInvitation'),
              icon: UserPlus,
              onClick: () => setShowInvitationWizard(true),
            },
            {
              id: 'sign-in',
              label: t('cloud.signIn'),
              icon: LogIn,
              tone: 'accent',
              onClick: () => setShowLogin(true),
            },
          ]}
        />
      )}

      {/* Pick a face. The FIRST dialog now — the file picker is reached from inside it,
          and `avatar` is passed so the grid can open on the portrait already in force. */}
      <AvatarPickerModal
        isOpen={showAvatarPicker}
        currentSrc={avatar}
        busy={avatarBusy}
        onConfirm={handleChoosePortrait}
        onUploadPhoto={handleUploadInstead}
        onClose={() => setShowAvatarPicker(false)}
      />

      {/* Frame the picked photo. Open only between the picker and the upload, and
          the only thing that can start the upload at all. */}
      <AvatarCropModal
        isOpen={cropSource !== null}
        sourceDataUrl={cropSource}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
        onUnreadable={handleCropUnreadable}
      />

      <LoginScreen isOpen={showLogin} onClose={() => setShowLogin(false)} onSignedIn={refresh} />
      <InvitationOnboardingWizard isOpen={showInvitationWizard} onClose={() => { setShowInvitationWizard(false); refresh() }} />

      {/* Choose a handle */}
      <Modal
        isOpen={showChangeUsername}
        onClose={resetUsernameModal}
        title={t('cloud.username.title')}
        footer={
          <>
            <Button size="md" tone="neutral" onClick={resetUsernameModal}>
              {t('common.cancel')}
            </Button>
            {/* AVAILABLE IS THE ONLY STATE THAT ENABLES THIS, which makes the button a
                second reading of the line above it rather than a separate rule to keep
                in step: `checking` and `idle` both leave it off, so there is no press
                that can be made while the answer is still in the air. It is still not a
                guarantee — see `handleChangeUsername` on why `taken` can come back from
                here anyway. */}
            <Button
              size="md"
              tone="accent"
              icon={Check}
              busy={savingUsername}
              disabled={savingUsername || usernameCheck.kind !== 'available'}
              onClick={handleChangeUsername}
            >
              {t('cloud.username.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-text-secondary/60">
            {t('cloud.username.help', { min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH })}
          </p>
          {/* `maxLength` so the field cannot hold a string the column would refuse: a
              limit enforced only after the press is a limit the user meets as an error
              message. The other rules cannot be expressed as an input attribute, which
              is what the line below is for. */}
          <Input
            size="lg"
            value={usernameDraft}
            onChange={setUsernameDraft}
            placeholder={t('cloud.username.placeholder')}
            autoFocus
            maxLength={USERNAME_MAX_LENGTH}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangeUsername() }}
            className="w-full"
          />
          {/* THE VERDICT, ON ONE LINE THAT IS ALWAYS THERE — `min-h-4` reserves it even
              while idle, so the field and the buttons do not jump the moment the first
              character is typed. Three readings and three colours: green for a handle
              you can have, red for one you cannot, quiet for the wait. */}
          <div className="min-h-4">
            {usernameCheck.kind === 'checking' && (
              <p className="flex items-center gap-1.5 text-xs text-text-secondary/60">
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('cloud.username.checking')}
              </p>
            )}
            {usernameCheck.kind === 'available' && (
              <p className="flex items-center gap-1.5 text-xs text-green">
                <Check className="w-3 h-3" />
                {t('cloud.username.available', { username: usernameDraft.trim() })}
              </p>
            )}
            {usernameCheck.kind === 'taken' && (
              <p className="text-xs text-red">
                {t('cloud.username.taken', { username: usernameDraft.trim() })}
              </p>
            )}
            {usernameCheck.kind === 'invalid' && (
              <p className="text-xs text-red">
                {t(USERNAME_MESSAGE[usernameCheck.reason], {
                  min: USERNAME_MIN_LENGTH,
                  max: USERNAME_MAX_LENGTH,
                })}
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* Change password */}
      <Modal
        isOpen={showChangePassword}
        onClose={resetPasswordModal}
        title={t('cloud.changePassword')}
        footer={
          <>
            <Button size="md" tone="neutral" onClick={resetPasswordModal}>
              {t('common.cancel')}
            </Button>
            <Button
              size="md"
              tone="accent"
              icon={KeyRound}
              busy={changingPassword}
              disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
              onClick={handleChangePassword}
            >
              {t('cloud.password.submit')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {/* Above the fields, where the email dialog puts its own help line: it is the
              context for what you are about to type, not a footnote about it. */}
          {passwordModalHelp && (
            <p className="text-xs text-text-secondary/60">{passwordModalHelp}</p>
          )}
          <Input
            size="lg"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder={t('cloud.password.newPlaceholder')}
            autoFocus
            className="w-full"
          />
          <Input
            size="lg"
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder={t('cloud.password.confirmPlaceholder')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
            className="w-full"
          />
        </div>
      </Modal>

      {/* Change email (OTP code flow) */}
      <Modal
        isOpen={showChangeEmail}
        onClose={resetEmailModal}
        title={t('cloud.changeEmail')}
        footer={
          <>
            <Button size="md" tone="neutral" onClick={resetEmailModal}>
              {t('common.cancel')}
            </Button>
            <Button
              size="md"
              tone="accent"
              icon={AtSign}
              busy={changingEmail}
              disabled={changingEmail || !looksLikeEmail(newEmail)}
              onClick={handleChangeEmail}
            >
              {t('cloud.email.sendLink')}
            </Button>
          </>
        }
      >
        {/* ONE STEP. The second one asked for a 6-digit code out of the email, and the
            email has no code in it — see `handleChangeEmail`. What is left is the
            address and a sentence saying what happens next, because what happens next
            is somewhere else entirely. */}
        <div className="space-y-3">
          <p className="text-xs text-text-secondary/60">
            {t('cloud.email.linkHelp')}
          </p>
          <Input
            size="lg"
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder={t('cloud.email.newPlaceholder')}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail() }}
            className="w-full"
          />
        </div>
      </Modal>

      {/* THE ACKNOWLEDGEMENT, and the only one this side of the app can give.
          The change is applied in a browser and the user comes back here to an
          address that has silently become correct — which reads as nothing having
          happened. This is main's watcher arriving: see the effect on `seenAccount`. */}
      <Modal
        isOpen={changedEmail !== null}
        onClose={() => setChangedEmail(null)}
        title={t('cloud.email.changed.title')}
        footer={
          <Button size="md" tone="accent" icon={Check} onClick={() => setChangedEmail(null)}>
            {t('common.done')}
          </Button>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-green/10 rounded-lg flex-shrink-0">
            <Check className="w-4 h-4 text-green" />
          </div>
          <p className="text-sm text-ink">
            {t('cloud.email.changed.body', { email: changedEmail ?? '' })}
          </p>
        </div>
      </Modal>

      {/* Delete account (danger) */}
      <Modal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        title={t('cloud.deleteAccount')}
        footer={
          <>
            <Button size="md" tone="neutral" onClick={() => setShowDeleteAccount(false)}>
              {t('common.cancel')}
            </Button>
            {/* `danger` — tinted rather than filled, which is `Button`'s own judgement
                and the right one on the button that ends an account: available, never
                the obvious next step. It replaces a hand-built `bg-red` fill. */}
            <Button
              size="md"
              tone="danger"
              icon={Trash2}
              busy={deleting}
              disabled={deleting}
              onClick={handleDeleteAccount}
            >
              {t('cloud.delete.submit')}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red/10 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-ink">{t('cloud.delete.warning')}</p>
            <p className="text-xs text-text-secondary/60">
              {t('cloud.delete.body')}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
