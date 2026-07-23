import { useState, useCallback, useEffect } from 'react'
import { Mail, ChevronLeft, ChevronRight, X, Check, Folder, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useOrg } from '../hooks/useOrg'
import { useConfig } from '../hooks/useConfig'

interface InvitationOnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  initialToken?: string
}

interface PickedRepo {
  name: string
  path: string
}

const TOTAL_STEPS = 3

/**
 * Invitation onboarding: accept token → sign up/in → accept invitation → ask
 * ONLY for repo paths (everything else is inherited from the org). Skippable —
 * the app never blocks on it. Modeled on ProfileOnboardingWizard.
 */
export function InvitationOnboardingWizard({ isOpen, onClose, initialToken = '' }: InvitationOnboardingWizardProps) {
  const { login, signup } = useAuth()
  const { accept } = useOrg()
  const { loadConfig } = useConfig()

  const [step, setStep] = useState(1)
  const [token, setToken] = useState(initialToken)
  const [isNewAccount, setIsNewAccount] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repos, setRepos] = useState<PickedRepo[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)

  useEffect(() => { setToken(initialToken) }, [initialToken])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Step 1 → 2: authenticate then accept the invitation (membership + inherit config).
  const handleAcceptInvitation = useCallback(async () => {
    if (busy) return
    setError(null)
    if (!token.trim()) { setError('Invitation token is required'); return }
    if (!email.trim() || !password) { setError('Email and password are required'); return }

    setBusy(true)
    try {
      const status = isNewAccount
        ? await signup(email.trim(), password, { invitationToken: token.trim() })
        : await login(email.trim(), password)

      if (!status.loggedIn) {
        setError('Please confirm your email, then reopen this wizard to continue.')
        return
      }

      const result = await accept(token.trim())
      const current = await window.electronAPI.org.current()
      setOrgName(current?.name ?? null)
      // Reflect any inherited config merge in the UI immediately.
      if (result?.config) loadConfig()
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to accept invitation')
    } finally {
      setBusy(false)
    }
  }, [busy, token, email, password, isNewAccount, signup, login, accept, loadConfig])

  const handleAddRepo = useCallback(async () => {
    const folderPath = await window.electronAPI.dialog.openFolder()
    if (!folderPath) return
    const folderName = folderPath.split(/[\\/]/).pop() || ''
    const name = folderName.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
    if (!name) { setError('Invalid folder name'); return }
    if (repos.some(r => r.name === name)) { setError(`'${name}' already added`); return }
    setError(null)
    setRepos(prev => [...prev, { name, path: folderPath }])
  }, [repos])

  const handleRemoveRepo = useCallback((name: string) => {
    setRepos(prev => prev.filter(r => r.name !== name))
  }, [])

  // Step 2 → 3: persist the picked repo paths (inheriting org keywords by name).
  const handleFinishRepos = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      for (const repo of repos) {
        await window.electronAPI.config.addRepository(repo.name, repo.path, [])
      }
      // Newly added repos must also inherit the org's shared config — the merge
      // at accept time only reached repositories that already existed.
      await window.electronAPI.org.applySharedConfig().catch(() => undefined)
      loadConfig()
      setStep(3)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add repositories')
    } finally {
      setBusy(false)
    }
  }, [busy, repos, loadConfig])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-white/10 rounded-xl w-full max-w-md mx-4 backdrop-blur-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Mail className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-base font-semibold">Join your team</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 px-5 pb-4">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i + 1 <= step ? 'bg-accent' : 'bg-white/10'}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pb-5 min-h-[220px]">
          {step === 1 && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Accept your invitation</div>
                <div className="text-xs text-text-secondary/50 mb-3">
                  Paste the invitation token you received, then sign in or create your account. You&apos;ll inherit your team&apos;s configuration automatically.
                </div>
              </div>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Invitation token"
                autoFocus
                className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30 font-mono"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsNewAccount(true)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${isNewAccount ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-white/[0.06] border-white/[0.08] text-text-secondary hover:text-white'}`}
                >
                  New account
                </button>
                <button
                  onClick={() => setIsNewAccount(false)}
                  className={`flex-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${!isNewAccount ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-white/[0.06] border-white/[0.08] text-text-secondary hover:text-white'}`}
                >
                  Existing account
                </button>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (must match the invitation)"
                className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAcceptInvitation() }}
                className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-1">Add your repositories</div>
                <div className="text-xs text-text-secondary/50 mb-3">
                  This is the only thing you set locally — everything else is inherited from your org.
                </div>
              </div>
              <button
                onClick={handleAddRepo}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm border border-dashed border-white/15 rounded-lg text-text-secondary hover:border-accent/40 hover:text-white transition-colors"
              >
                <Folder className="w-4 h-4" />
                Add a repository folder
              </button>
              {repos.length > 0 && (
                <div className="space-y-1.5">
                  {repos.map((repo) => (
                    <div key={repo.name} className="flex items-center gap-2 px-3 py-2 bg-white/[0.06] border border-white/[0.08] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{repo.name}</div>
                        <div className="text-xs text-text-secondary/50 truncate">{repo.path}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveRepo(repo.name)}
                        className="p-1 text-text-secondary/50 hover:text-red transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-3">
              <div className="p-3 bg-green/10 rounded-full">
                <Check className="w-6 h-6 text-green" />
              </div>
              <div className="text-sm font-medium">You&apos;re all set!</div>
              <div className="text-xs text-text-secondary/60">
                {orgName ? <>You&apos;ve joined <span className="text-white font-medium">{orgName}</span> and inherited its configuration.</> : 'You\'ve joined your team and inherited its configuration.'}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5">
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {step < 3 && (
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium text-text-secondary/50 hover:text-text-secondary transition-colors"
              >
                Skip
              </button>
            )}
            {step === 1 && (
              <button
                onClick={handleAcceptInvitation}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent border border-accent/20 rounded-lg hover:bg-accent/10 transition-all disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Accept<ChevronRight className="w-3.5 h-3.5" /></>}
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleFinishRepos}
                disabled={busy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-40"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><ChevronRight className="w-3.5 h-3.5" />Continue</>}
              </button>
            )}
            {step === 3 && (
              <button
                onClick={onClose}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
