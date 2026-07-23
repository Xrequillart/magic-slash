import { useState, useEffect, useCallback } from 'react'
import { Cloud, X, LogIn, UserPlus, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

interface LoginScreenProps {
  isOpen: boolean
  onClose: () => void
  onSignedIn?: () => void
}

type Mode = 'signin' | 'signup'

/**
 * Optional email/password sign-in + sign-up (personal org). Fully SKIPPABLE —
 * the app never blocks on auth. Sign-up creates a personal org server-side.
 */
export function LoginScreen({ isOpen, onClose, onSignedIn }: LoginScreenProps) {
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = useCallback(async () => {
    if (busy) return
    setError(null)
    setNotice(null)
    if (!email.trim() || !password) {
      setError('Email and password are required')
      return
    }
    setBusy(true)
    try {
      const status = mode === 'signin'
        ? await login(email.trim(), password)
        : await signup(email.trim(), password, { orgName: orgName.trim() || undefined })

      if (status.loggedIn) {
        onSignedIn?.()
        onClose()
      } else {
        // Sign-up with email confirmation enabled: no session yet.
        setNotice('Check your inbox to confirm your email, then sign in.')
        setMode('signin')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setBusy(false)
    }
  }, [busy, email, password, orgName, mode, login, signup, onSignedIn, onClose])

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
              <Cloud className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-base font-semibold">
              {mode === 'signin' ? 'Sign in to Magic Slash' : 'Create your account'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-text-secondary/60">
            Cloud sign-in is optional — Magic Slash works fully without an account. Sign in to manage your organization and invite teammates.
          </p>

          <div className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoFocus
              className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
            />
            {mode === 'signup' && (
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization name (optional)"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                className="w-full px-3 py-2 bg-white/[0.06] backdrop-blur-md border border-white/[0.08] rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
              />
            )}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red/10 border border-red/20 rounded-lg text-xs text-red">
              {error}
            </div>
          )}
          {notice && (
            <div className="px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg text-xs text-accent">
              {notice}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>

          <div className="text-center text-xs text-text-secondary/60">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button onClick={() => { setMode('signup'); setError(null); setNotice(null) }} className="text-accent hover:underline">
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null); setNotice(null) }} className="text-accent hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
