import { useState, useEffect, useCallback } from 'react'
import { Cloud, X, LogIn, Loader2, KeyRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useT } from '../i18n'

interface LoginScreenProps {
  isOpen: boolean
  onClose: () => void
  onSignedIn?: () => void
}

type Mode = 'signin' | 'reset'
// The reset flow has two steps: request a code by email, then confirm the code
// together with a new password.
type ResetStep = 'request' | 'confirm'

/**
 * Optional email/password sign-in. Fully SKIPPABLE — the app never blocks on
 * auth. Account creation is NOT offered here: the only in-app path to a new
 * account is the invitation wizard (see InvitationOnboardingWizard).
 */
export function LoginScreen({ isOpen, onClose, onSignedIn }: LoginScreenProps) {
  const { login, requestPasswordReset, confirmPasswordReset } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [resetStep, setResetStep] = useState<ResetStep>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const t = useT()
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

  const goToMode = useCallback((next: Mode) => {
    setMode(next)
    setResetStep('request')
    setCode('')
    setPassword('')
    setError(null)
    setNotice(null)
  }, [])

  const handleReset = useCallback(async () => {
    if (busy) return
    setError(null)
    setNotice(null)
    if (resetStep === 'request') {
      if (!email.trim()) { setError(t('login.error.emailRequired')); return }
      setBusy(true)
      try {
        await requestPasswordReset(email.trim())
        setNotice('We emailed you a 6-digit code. Enter it below with your new password.')
        setResetStep('confirm')
      } catch (e) {
        setError(e instanceof Error ? e.message : t('login.error.resetEmailFailed'))
      } finally {
        setBusy(false)
      }
      return
    }
    // confirm step
    if (!code.trim() || !password) {
      setError(t('login.error.codeAndPasswordRequired'))
      return
    }
    setBusy(true)
    try {
      await confirmPasswordReset(email.trim(), code.trim(), password)
      goToMode('signin')
      setNotice('Password updated. You can now sign in with your new password.')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.error.resetFailed'))
    } finally {
      setBusy(false)
    }
  }, [busy, resetStep, email, code, password, requestPasswordReset, confirmPasswordReset, goToMode])

  const handleSubmit = useCallback(async () => {
    if (mode === 'reset') { handleReset(); return }
    if (busy) return
    setError(null)
    setNotice(null)
    if (!email.trim() || !password) {
      setError(t('login.error.credentialsRequired'))
      return
    }
    setBusy(true)
    try {
      const status = await login(email.trim(), password)

      if (status.loggedIn) {
        onSignedIn?.()
        onClose()
      } else {
        // Account exists but the email is not confirmed yet: no session.
        setNotice('Check your inbox to confirm your email, then sign in.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('login.error.authFailed'))
    } finally {
      setBusy(false)
    }
  }, [busy, email, password, mode, login, onSignedIn, onClose, handleReset])

  if (!isOpen) return null

  const title = mode === 'signin' ? t('login.signinTitle') : t('login.resetTitle')

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="bg-bg-secondary border border-line rounded-xl w-full max-w-md mx-4 animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Cloud className="w-4 h-4 text-accent" />
            </div>
            <h3 className="text-base font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-ink hover:bg-surface-strong rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-3">
          <p className="text-xs text-text-secondary/60">
            {mode === 'reset' ? t('login.resetHelp') : t('login.signinHelp')}
          </p>

          <div className="space-y-2">
            {/* Email is shown for sign in / sign up, and for the reset "request" step.
                In the reset "confirm" step the email is locked in already. */}
            {(mode !== 'reset' || resetStep === 'request') && (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('login.emailPlaceholder')}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
              />
            )}

            {mode === 'reset' && resetStep === 'confirm' && (
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('login.codePlaceholder')}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
              />
            )}

            {/* Password: hidden during the reset "request" step (email only). */}
            {!(mode === 'reset' && resetStep === 'request') && (
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'reset' ? t('login.newPasswordPlaceholder') : t('login.passwordPlaceholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
                className="w-full px-3 py-2 bg-surface border border-line-field rounded-lg text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-secondary/30"
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-on-brand bg-accent hover:bg-accent-hover rounded-lg transition-all disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'signin' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <KeyRound className="w-4 h-4" />
            )}
            {mode === 'signin'
              ? t('login.signIn')
              : resetStep === 'request'
                ? t('login.sendCode')
                : t('login.resetPassword')}
          </button>

          <div className="text-center text-xs text-text-secondary/60 space-y-1">
            {mode === 'signin' && (
              <div>
                <button onClick={() => goToMode('reset')} className="text-accent hover:underline">
                  {t('login.forgotPassword')}
                </button>
              </div>
            )}
            {mode === 'reset' && (
              <div>
                <button onClick={() => goToMode('signin')} className="text-accent hover:underline">
                  {t('login.backToSignIn')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
