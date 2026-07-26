import { useState, useCallback } from 'react'
import { Cloud, LogOut, LogIn, UserPlus, Loader2, KeyRound, AtSign, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { LoginScreen } from '../../components/LoginScreen'
import { Modal } from '../../components/Modal'
import { SectionHeader } from './SectionHeader'
import { InvitationOnboardingWizard } from '../../components/InvitationOnboardingWizard'
import { showToast } from '../../components/Toast'

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
      showToast('Passwords do not match', 'error')
      return
    }
    setChangingPassword(true)
    try {
      await updatePassword(newPassword)
      showToast('Password updated', 'success')
      resetPasswordModal()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to update password', 'error')
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
        if (!newEmail.trim()) { showToast('Enter a new email', 'error'); return }
        await requestEmailChange(newEmail.trim())
        showToast('Check your new email for the confirmation code', 'success')
        setEmailStep('confirm')
      } else {
        if (!emailCode.trim()) { showToast('Enter the code', 'error'); return }
        await confirmEmailChange(newEmail.trim(), emailCode.trim())
        showToast('Email updated', 'success')
        resetEmailModal()
        await refresh()
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to change email', 'error')
    } finally {
      setChangingEmail(false)
    }
  }, [changingEmail, emailStep, newEmail, emailCode, requestEmailChange, confirmEmailChange, resetEmailModal, refresh])

  const handleDeleteAccount = useCallback(async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteAccount()
      showToast('Your account has been deleted', 'success')
      setShowDeleteAccount(false)
      await refresh()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to delete account', 'error')
    } finally {
      setDeleting(false)
    }
  }, [deleting, deleteAccount, refresh])

  // Cloud disabled entirely (no Supabase env baked in) → nothing to sign in to.
  if (!authLoading && !status.enabled) {
    return (
      <div>
        <SectionHeader icon={Cloud} title="Cloud account" />
        <div className="bg-surface border border-line-strong rounded-xl p-6 text-center">
          <Cloud className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">Cloud features are not configured in this build.</div>
          <div className="text-xs text-text-secondary/40 mt-1">Magic Slash works fully offline — no account required.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <SectionHeader icon={Cloud} title="Cloud account" />
      <div className="bg-surface border border-line-strong rounded-xl p-4">
        {status.loggedIn ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{status.user?.email ?? 'Signed in'}</div>
                <div className="text-xs text-text-secondary/50 mt-0.5">Signed in to Magic Slash cloud</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
            <div className="border-t border-line-subtle pt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowChangePassword(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Change password
              </button>
              <button
                onClick={() => setShowChangeEmail(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <AtSign className="w-3.5 h-3.5" />
                Change email
              </button>
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete my account
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Not signed in</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Sign in to manage your organization (optional)</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInvitationWizard(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Join with invitation
              </button>
              <button
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in
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
        title="Change password"
        footer={
          <>
            <button
              onClick={resetPasswordModal}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Update password
            </button>
          </>
        }
      >
        <div className="space-y-2">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoFocus
            className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
            className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
        </div>
      </Modal>

      {/* Change email (OTP code flow) */}
      <Modal
        isOpen={showChangeEmail}
        onClose={resetEmailModal}
        title="Change email"
        footer={
          <>
            <button
              onClick={resetEmailModal}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleChangeEmail}
              disabled={changingEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
            >
              {changingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AtSign className="w-3.5 h-3.5" />}
              {emailStep === 'request' ? 'Send code' : 'Confirm change'}
            </button>
          </>
        }
      >
        {emailStep === 'request' ? (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary/60">
              We'll email a 6-digit confirmation code to your new address.
            </p>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="New email"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail() }}
              className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary/60">
              Check <span className="text-ink">{newEmail}</span> for the confirmation code and enter it below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              placeholder="6-digit code"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail() }}
              className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm text-ink focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
            />
          </div>
        )}
      </Modal>

      {/* Delete account (danger) */}
      <Modal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        title="Delete my account"
        footer={
          <>
            <button
              onClick={() => setShowDeleteAccount(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-on-brand bg-red hover:bg-red/80 rounded-lg transition-all disabled:opacity-40"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete permanently
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red/10 rounded-lg flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red" />
          </div>
          <div className="space-y-1">
            <p className="text-sm text-ink">This permanently deletes your account and personal data.</p>
            <p className="text-xs text-text-secondary/60">
              Organizations you created will be removed along with their data. This cannot be undone. Magic Slash keeps working locally without an account.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
