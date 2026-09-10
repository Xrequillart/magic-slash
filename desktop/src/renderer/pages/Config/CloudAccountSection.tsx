import { useState, useCallback } from 'react'
import { Cloud, LogOut, LogIn, UserPlus, Loader2, KeyRound, AtSign, Trash2, AlertTriangle, ImagePlus, ImageOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAvatar, publishAvatar, avatarSession } from '../../hooks/useAvatar'
import { useOrg } from '../../hooks/useOrg'
import { LoginScreen } from '../../components/LoginScreen'
import { Modal } from '../../components/Modal'
import { AccountAvatar } from '../../components/AccountAvatar'
import { AvatarCropModal, type AvatarCropView } from '../../components/AvatarCropModal'
import { SectionHeader } from './SectionHeader'
import { InvitationOnboardingWizard } from '../../components/InvitationOnboardingWizard'
import { showToast } from '../../components/Toast'
import { useT, type MessageKey } from '../../i18n'
import { BTN, BTN_DANGER, INPUT } from '../../theme/controls'
import { formatSize } from '../../utils/formatSize'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPE, AVATAR_SIZE, type AvatarRejection } from '../../../avatar'
import { sourceRectFor } from '../../../avatarCrop'

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
  const { status, loading: authLoading, logout, updatePassword, requestEmailChange, confirmEmailChange, deleteAccount } = useAuth()
  const { refresh } = useOrg()
  const t = useT()

  const [showLogin, setShowLogin] = useState(false)
  const [showInvitationWizard, setShowInvitationWizard] = useState(false)

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [emailStep, setEmailStep] = useState<'request' | 'confirm'>('request')
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)

  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Shared with the sidebar and the settings rail footer. The store also owns the
  // initial read and the sign-in/sign-out transitions this component used to key an
  // effect on — see `hooks/useAvatar`.
  const avatar = useAvatar()
  const [avatarBusy, setAvatarBusy] = useState(false)
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
    } catch (e) {
      // An IPC rejection: no result to read a resynced value out of, so ask.
      console.error('avatar upload failed:', e)
      await resyncAvatar({}, forSession)
      showToast(t('toast.avatarSaveFailed'), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }, [cropSource, resyncAvatar, t])

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
    } catch (e) {
      console.error('avatar removal failed:', e)
      await resyncAvatar({}, forSession)
      showToast(t('toast.avatarRemoveFailed'), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }, [avatarBusy, resyncAvatar, t])

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
    setEmailStep('request')
    setNewEmail('')
    setEmailCode('')
  }, [])

  const handleChangeEmail = useCallback(async () => {
    if (changingEmail) return
    setChangingEmail(true)
    try {
      if (emailStep === 'request') {
        if (!newEmail.trim()) { showToast(t('toast.emailRequired'), 'error'); return }
        await requestEmailChange(newEmail.trim())
        showToast(t('toast.emailCodeSent'), 'success')
        setEmailStep('confirm')
      } else {
        if (!emailCode.trim()) { showToast(t('toast.emailCodeRequired'), 'error'); return }
        await confirmEmailChange(newEmail.trim(), emailCode.trim())
        showToast(t('toast.emailUpdated'), 'success')
        resetEmailModal()
        await refresh()
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('toast.emailChangeFailed'), 'error')
    } finally {
      setChangingEmail(false)
    }
  }, [changingEmail, emailStep, newEmail, emailCode, requestEmailChange, confirmEmailChange, resetEmailModal, refresh])

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

  // Cloud disabled entirely (no Supabase env baked in) → nothing to sign in to.
  if (!authLoading && !status.enabled) {
    return (
      <div>
        <SectionHeader icon={Cloud} title={t('cloud.section')} />
        <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
          <Cloud className="w-8 h-8 text-icon-muted mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">{t('org.cloudDisabled')}</div>
          <div className="text-xs text-text-secondary/40 mt-1">{t('org.cloudDisabledHint')}</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader icon={Cloud} title={t('cloud.section')} />
      <div className="bg-surface border border-line-strong rounded-xl p-4">
        {status.loggedIn ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AccountAvatar dataUrl={avatar} />
                <div>
                  <div className="text-sm font-medium">{status.user?.email ?? t('cloud.signedInFallback')}</div>
                  <div className="text-xs text-text-secondary/50 mt-0.5">{t('cloud.signedInHint')}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('cloud.signOut')}
              </button>
            </div>
            <div className="border-t border-line-subtle pt-3 flex flex-wrap items-center gap-2">
              {/* The photo actions lead the row, next to the face they act on. */}
              <button
                onClick={handleChoosePhoto}
                disabled={avatarBusy || cropSource !== null}
                className={`${BTN} disabled:opacity-40`}
              >
                {avatarBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                {t('cloud.avatar.choose')}
              </button>
              {/* No photo, no remove button — there is nothing to undo. */}
              {avatar && (
                <button
                  onClick={handleRemovePhoto}
                  disabled={avatarBusy}
                  className={`${BTN_DANGER} disabled:opacity-40`}
                >
                  <ImageOff className="w-3.5 h-3.5" />
                  {t('cloud.avatar.remove')}
                </button>
              )}
              <button
                onClick={() => setShowChangePassword(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {t('cloud.changePassword')}
              </button>
              <button
                onClick={() => setShowChangeEmail(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <AtSign className="w-3.5 h-3.5" />
                {t('cloud.changeEmail')}
              </button>
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('cloud.deleteAccount')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{t('cloud.notSignedIn')}</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">{t('cloud.notSignedInHint')}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInvitationWizard(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {t('cloud.joinWithInvitation')}
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                {t('cloud.signIn')}
              </button>
            </div>
          </div>
        )}
      </div>

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

      {/* Change password */}
      <Modal
        isOpen={showChangePassword}
        onClose={resetPasswordModal}
        title={t('cloud.changePassword')}
        footer={
          <>
            <button
              onClick={resetPasswordModal}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              {t('cloud.password.submit')}
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('cloud.password.newPlaceholder')}
            autoFocus
            className={`${INPUT} w-full`}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('cloud.password.confirmPlaceholder')}
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
            className={`${INPUT} w-full`}
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
            <button
              onClick={resetEmailModal}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleChangeEmail}
              disabled={changingEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {changingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AtSign className="w-3.5 h-3.5" />}
              {emailStep === 'request' ? t('cloud.email.sendCode') : t('cloud.email.confirmChange')}
            </button>
          </>
        }
      >
        {emailStep === 'request' ? (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary/60">
              {t('cloud.email.requestHelp')}
            </p>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t('cloud.email.newPlaceholder')}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail() }}
              className={`${INPUT} w-full`}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary/60">
              {t('cloud.email.confirmHelp', { email: newEmail })}
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              placeholder={t('cloud.email.codePlaceholder')}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail() }}
              className={`${INPUT} w-full`}
            />
          </div>
        )}
      </Modal>

      {/* Delete account (danger) */}
      <Modal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        title={t('cloud.deleteAccount')}
        footer={
          <>
            <button
              onClick={() => setShowDeleteAccount(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-red hover:bg-red/80 rounded-lg transition-all disabled:opacity-40"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {t('cloud.delete.submit')}
            </button>
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
