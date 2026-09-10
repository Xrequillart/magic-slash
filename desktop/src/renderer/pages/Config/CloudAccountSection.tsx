import { useState, useEffect, useCallback } from 'react'
import { Cloud, LogOut, LogIn, UserPlus, Loader2, KeyRound, AtSign, Trash2, AlertTriangle, ImagePlus, ImageOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { LoginScreen } from '../../components/LoginScreen'
import { Modal } from '../../components/Modal'
import { AccountAvatar } from '../../components/AccountAvatar'
import { SectionHeader } from './SectionHeader'
import { InvitationOnboardingWizard } from '../../components/InvitationOnboardingWizard'
import { showToast } from '../../components/Toast'
import { useT, type MessageKey } from '../../i18n'
import { BTN, BTN_DANGER, INPUT } from '../../theme/controls'
import { formatSize } from '../../utils/formatSize'
import { AVATAR_MAX_BYTES, AVATAR_MIME_TYPE, AVATAR_SIZE, centerCropBox, type AvatarRejection } from '../../../avatar'

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
 * Source image → the exact 256×256 WebP data URL the account photo is stored as.
 *
 * The crop is automatic at this stage: the centre square, which is where a face is
 * in practically every photo anyone picks for an avatar. `centerCropBox` computes it
 * from the intrinsic size, and `drawImage`'s nine-argument form does the crop and the
 * downscale in one pass, so there is no intermediate canvas to lose a generation of
 * quality to. Story 3 replaces this call with the box a human dragged; everything
 * around it stays as it is.
 *
 * It runs in the renderer rather than the main process because that is where a
 * `<canvas>` and an image decoder exist at all — Electron's main process has neither.
 * Throwing here means the bytes could not be decoded or encoded, which the caller
 * reports as an unreadable file.
 */
async function toAvatarDataUrl(sourceDataUrl: string): Promise<string> {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('avatar: could not decode the source image'))
    image.src = sourceDataUrl
  })

  const box = centerCropBox({ width: image.naturalWidth, height: image.naturalHeight })

  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_SIZE
  canvas.height = AVATAR_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('avatar: no 2d context')
  ctx.drawImage(image, box.x, box.y, box.size, box.size, 0, 0, AVATAR_SIZE, AVATAR_SIZE)

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
 * The avatar is held in local state, fetched once per session and then written
 * through from the value we just uploaded — no re-read, since the bytes on screen
 * are the bytes that were stored. That is the whole of what "updates without a
 * restart" needs. There is deliberately no `profile:changed` broadcast: this card
 * is the only surface showing the photo today, and a bus with one subscriber is a
 * bus that goes stale the first time someone forgets to publish on it.
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

  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarBusy, setAvatarBusy] = useState(false)

  // Keyed on the session: signing out has to drop the photo with it, and signing in
  // as someone else has to fetch theirs rather than keep the previous face on screen.
  useEffect(() => {
    if (!status.loggedIn) {
      setAvatar(null)
      return
    }
    let cancelled = false
    window.electronAPI.profile
      .getAvatar()
      .then((dataUrl) => { if (!cancelled) setAvatar(dataUrl) })
      .catch(() => { /* no photo is the fallback, and it is already on screen */ })
    return () => { cancelled = true }
  }, [status.loggedIn])

  /**
   * Pick a file, crop it, upload it — and on any refusal, change nothing.
   *
   * Every early return here leaves `avatar` exactly as it was. That is the point of
   * C4: a 20 MB TIFF must not blank out the photo that is already working, so the
   * state is written once, at the end, only after the upload has been acknowledged.
   * Same revert-and-toast shape as `ProfileSection.handleChange`.
   */
  const handleChoosePhoto = useCallback(async () => {
    if (avatarBusy) return

    const path = await window.electronAPI.dialog.openFile()
    if (!path) return

    setAvatarBusy(true)
    try {
      const source = await window.electronAPI.profile.readAvatarSource(path)
      if ('reason' in source) {
        showToast(t(REJECTION_MESSAGE[source.reason], { limit: AVATAR_LIMIT_LABEL }), 'error')
        return
      }

      let encoded: string
      try {
        encoded = await toAvatarDataUrl(source.dataUrl)
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
        showToast(t('toast.avatarSaveFailed'), 'error')
        return
      }

      setAvatar(encoded)
    } catch (e) {
      console.error('avatar upload failed:', e)
      showToast(t('toast.avatarSaveFailed'), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }, [avatarBusy, t])

  const handleRemovePhoto = useCallback(async () => {
    if (avatarBusy) return
    setAvatarBusy(true)
    try {
      const result = await window.electronAPI.profile.removeAvatar()
      if (!result.ok) {
        if (result.error) console.error('avatar removal failed:', result.error)
        showToast(t('toast.avatarRemoveFailed'), 'error')
        return
      }
      setAvatar(null)
    } catch (e) {
      console.error('avatar removal failed:', e)
      showToast(t('toast.avatarRemoveFailed'), 'error')
    } finally {
      setAvatarBusy(false)
    }
  }, [avatarBusy, t])

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
                disabled={avatarBusy}
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
