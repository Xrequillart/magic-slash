import { useState, useCallback } from 'react'
import { Cloud, LogOut, LogIn, UserPlus, Loader2, KeyRound, AtSign, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { LoginScreen } from '../../components/LoginScreen'
import { Modal } from '../../components/Modal'
import { SectionHeader } from './SectionHeader'
import { InvitationOnboardingWizard } from '../../components/InvitationOnboardingWizard'
import { showToast } from '../../components/Toast'
import { useT } from '../../i18n'
import { INPUT } from '../../theme/controls'

/**
 * Cloud identity block of the Account tab: sign in / out, change password,
 * change email, delete account. Extracted from OrgPage so the Organization tab
 * stays about the org itself while identity lives under Account.
 *
 * It owns its own auth modals — nothing else needs to know they exist.
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
          <Cloud className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
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
              <div>
                <div className="text-sm font-medium">{status.user?.email ?? t('cloud.signedInFallback')}</div>
                <div className="text-xs text-text-secondary/50 mt-0.5">{t('cloud.signedInHint')}</div>
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
