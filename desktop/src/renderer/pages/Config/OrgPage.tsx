import { useState, useEffect, useCallback } from 'react'
import { Cloud, Users, Mail, LogOut, LogIn, UserPlus, Shield, Copy, Check, Github, Loader2, Building2, KeyRound, AtSign, Trash2, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useOrg } from '../../hooks/useOrg'
import { useStore } from '../../store'
import { LoginScreen } from '../../components/LoginScreen'
import { Modal } from '../../components/Modal'
import { InvitationOnboardingWizard } from '../../components/InvitationOnboardingWizard'
import { showToast } from '../../components/Toast'
import type { GitHubAuthStatus } from '../../../types'

export function OrgPage() {
  const { status, loading: authLoading, logout, updatePassword, requestEmailChange, confirmEmailChange, deleteAccount } = useAuth()
  const { org, members, invitations, loading: orgLoading, refresh, invite } = useOrg()
  const { config, setConfig } = useStore()

  const [showLogin, setShowLogin] = useState(false)
  const [showInvitationWizard, setShowInvitationWizard] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Account management modals.
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

  // Integration status (DISPLAY only — no tokens stored).
  const [githubStatus, setGithubStatus] = useState<GitHubAuthStatus | null>(null)
  const atlassianEnabled = config?.integrations?.atlassian ?? true

  useEffect(() => {
    window.electronAPI.config.getGitHubAuthStatus().then(setGithubStatus).catch(() => setGithubStatus({ loggedIn: false }))
  }, [])

  const isAdmin = org?.role === 'admin'

  const handleInvite = useCallback(async () => {
    if (inviting || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await invite(inviteEmail.trim())
      setInviteEmail('')
      showToast('Invitation created', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Failed to create invitation', 'error')
    } finally {
      setInviting(false)
    }
  }, [inviting, inviteEmail, invite])

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

  const handleCopyToken = useCallback((token: string) => {
    navigator.clipboard.writeText(token).then(() => {
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 1500)
    }).catch(() => {})
  }, [])

  const handleAtlassianToggle = useCallback(async () => {
    const next = !atlassianEnabled
    const result = await window.electronAPI.config.setIntegration('atlassian', next)
    setConfig(result.config)
  }, [atlassianEnabled, setConfig])

  // Cloud disabled entirely (no Supabase env baked in) → hide cloud features.
  if (!authLoading && !status.enabled) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Cloud className="w-4 h-4" />
          <span>Organization</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-6 text-center">
          <Cloud className="w-8 h-8 text-text-secondary/30 mx-auto mb-3" />
          <div className="text-sm text-text-secondary/60">Cloud features are not configured in this build.</div>
          <div className="text-xs text-text-secondary/40 mt-1">Magic Slash works fully offline — no account required.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Account */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Cloud className="w-4 h-4" />
          <span>Cloud account</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
          {status.loggedIn ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{status.user?.email ?? 'Signed in'}</div>
                  <div className="text-xs text-text-secondary/50 mt-0.5">Signed in to Magic Slash cloud</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
              <div className="border-t border-white/5 pt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Change password
                </button>
                <button
                  onClick={() => setShowChangeEmail(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Join with invitation
                </button>
                <button
                  onClick={() => setShowLogin(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Organization (signed in) */}
      {status.loggedIn && (
        <>
          <div>
            <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
              <Building2 className="w-4 h-4" />
              <span>Organization</span>
            </div>
            <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4">
              {orgLoading ? (
                <div className="flex items-center justify-center py-4 text-text-secondary/50">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : org ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{org.name}</div>
                    <div className="text-xs text-text-secondary/50 mt-0.5">Your role in this organization</div>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${isAdmin ? 'bg-accent/15 text-accent' : 'bg-white/10 text-text-secondary'}`}>
                    {isAdmin && <Shield className="w-3 h-3" />}
                    {org.role}
                  </span>
                </div>
              ) : (
                <div className="text-sm text-text-secondary/50 text-center py-2">No organization found for this account.</div>
              )}
            </div>
          </div>

          {/* Members */}
          {org && (
            <div>
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                <Users className="w-4 h-4" />
                <span>Members ({members.length})</span>
              </div>
              <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 space-y-2">
                {members.length === 0 ? (
                  <div className="text-sm text-text-secondary/50 text-center py-2">No members yet.</div>
                ) : (
                  members.map((m) => (
                    <div key={m.userId} className="flex items-center justify-between py-1">
                      <span className="text-sm truncate">{m.email ?? m.userId}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${m.role === 'admin' ? 'bg-accent/15 text-accent' : 'bg-white/10 text-text-secondary'}`}>
                        {m.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Invitations (admin only) */}
          {org && isAdmin && (
            <div>
              <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
                <Mail className="w-4 h-4" />
                <span>Invite a colleague</span>
              </div>
              <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInvite() }}
                    className="flex-1 px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
                  >
                    {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    Invite
                  </button>
                </div>

                {invitations.length > 0 && (
                  <div className="border-t border-white/5 pt-4 space-y-2">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{inv.email}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                          inv.status === 'pending' ? 'bg-yellow/10 text-yellow'
                            : inv.status === 'accepted' ? 'bg-green/10 text-green'
                            : 'bg-white/10 text-text-secondary'
                        }`}>
                          {inv.status}
                        </span>
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleCopyToken(inv.token)}
                            className="flex items-center gap-1 px-2 py-0.5 text-[11px] text-text-secondary border border-white/10 rounded hover:bg-white/10 hover:text-white transition-all"
                            title="Copy invitation token"
                          >
                            {copiedToken === inv.token ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            Token
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Integrations status (detection/display only — no tokens stored) */}
      <div>
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <Github className="w-4 h-4" />
          <span>Integrations</span>
        </div>
        <div className="bg-white/[0.06] border border-white/[0.15] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">GitHub CLI</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">
                {githubStatus?.loggedIn
                  ? `Detected via gh${githubStatus.account ? ` — ${githubStatus.account}` : ''}`
                  : 'Not detected. Run `gh auth login` in your terminal.'}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${githubStatus?.loggedIn ? 'bg-green/10 text-green' : 'bg-red/10 text-red'}`}>
              {githubStatus?.loggedIn ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div className="border-t border-white/5 pt-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Atlassian (Jira)</div>
              <div className="text-xs text-text-secondary/50 mt-0.5">Auth is handled by the Atlassian MCP server. Toggle whether Jira features are enabled.</div>
            </div>
            <button
              onClick={handleAtlassianToggle}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${atlassianEnabled ? 'bg-accent' : 'bg-white/20'}`}
            >
              <div className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-200 ${atlassianEnabled ? 'translate-x-[18px]' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
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
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
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
            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword() }}
            className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
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
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleChangeEmail}
              disabled={changingEmail}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
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
              className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-text-secondary/60">
              Check <span className="text-white">{newEmail}</span> for the confirmation code and enter it below.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
              placeholder="6-digit code"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangeEmail() }}
              className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-white focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
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
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red hover:bg-red/80 rounded-lg transition-all disabled:opacity-40"
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
            <p className="text-sm text-white">This permanently deletes your account and personal data.</p>
            <p className="text-xs text-text-secondary/60">
              Organizations you created will be removed along with their data. This cannot be undone. Magic Slash keeps working locally without an account.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
