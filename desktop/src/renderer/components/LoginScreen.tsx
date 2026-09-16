import { useState, useEffect, useCallback } from 'react'
import { Button, ButtonIcon, Input } from '@ds/desktop'
import { X, LogIn, KeyRound } from '@ds/desktop/icons'
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
 *
 * ── IT TAKES THE WHOLE WINDOW NOW, AND IT IS THE RELEASE MESH ──────────────────────
 *
 * It was a `max-w-md` panel on `bg-black/70`, which is the shape of a question the app
 * is asking mid-task — "are you sure?", "pick a repository". Signing in is not that: it
 * is the one moment the app has nothing else to show, and dimming a window the reader
 * cannot use anyway to put a small box in the middle of it was a dialog standing in for
 * a screen.
 *
 * THE GROUND IS `bg-release-mesh`, the same picture the What's New dialog opens on —
 * the site's `tone-sky`, `/features`' own ground. Two surfaces, one image: this is what
 * the product looks like when it is talking about ITSELF rather than about your code.
 *
 * ── THE CARD IS GLASS, AND THE BLUR IS AN INLINE STYLE ON PURPOSE ──────────────────
 *
 * `tailwind.config.cjs` turns `backdropBlur` and `backdropFilter` OFF at the core-plugin
 * level, and the comment there is a measurement rather than a preference: a backdrop
 * filter re-reads and re-blurs whatever sits behind it on every frame, which took the
 * settings page from ~10ms to ~53ms per frame. Writing `backdrop-blur-*` in a className
 * is a no-op by design, and that stays true.
 *
 * This is the one place it is worth paying for, and the reason is that none of what made
 * it expensive is here: ONE element, over a STATIC background, on a screen with nothing
 * scrolling behind it and nothing animating under it. So the filter is written as an
 * inline style — which bypasses the disabled plugin rather than re-enabling it for the
 * 284 other elements that must not have one.
 *
 * The recipe is css.glass's: a white fill well under half, a blur, a lighter hairline
 * than the fill, and a soft wide shadow. What it needs from the ground is texture to
 * refract, which is exactly what a mesh of six blooms is and what `bg-black/70` was not.
 *
 * ── SO THE CARD IS A FIXED-LIGHT SURFACE ───────────────────────────────────────────
 *
 * White glass over a light mesh is white whatever the theme is, so nothing on it can be
 * typeset in `ink` — that token is white on four of the eight themes and would vanish.
 * Everything here takes `release-ink`, the fixed near-black declared beside
 * `release-paper` for the release notes dialog, which is the app's other fixed-light
 * surface. The close button takes `ButtonIcon`'s `paper` tone for the same reason, and
 * that tone exists because of these two screens.
 *
 * THE FIELDS ARE `Input` IN ITS `paper` TONE, and that tone exists because of this
 * screen. They were spelled by hand here for one commit, with a note saying there was no
 * input in the design system to reach for; there is now, and it carries the two grounds
 * rather than this file carrying one of them.
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
    /* THE WHOLE WINDOW. `z-[56]` is the modal rung — see the note in the design system's
       `Modal`, which holds the ladder: app < sheet < modal < select. This was at 50,
       which is UNDER the quick-settings sheet, and the sheet is one of the places that
       opens it.

       `pt-10` and not a plain centre: the title bar is 40px of draggable chrome the card
       must not sit under, since the window is dragged by it and a card overlapping it
       would swallow the drag. */
    <div className="fixed inset-0 z-[56] flex items-center justify-center bg-release-mesh px-6 pb-6 pt-10 animate-modal-backdrop">
      <div
        /* THE GLASS. css.glass's recipe, with the blur inline — see the header for why
           that is a deliberate bypass of a disabled core plugin and not an oversight.

           `saturate` alongside the blur is the half of the recipe that is easy to leave
           out: a blur alone greys what it samples, and the six blooms behind this card
           are the only colour on the screen. */
        style={{ backdropFilter: 'blur(14px) saturate(140%)', WebkitBackdropFilter: 'blur(14px) saturate(140%)' }}
        className="w-full max-w-md rounded-3xl border border-release-paper/50 bg-release-paper/35 p-7 text-release-ink shadow-glass animate-modal-content"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight tracking-tight">{title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-release-ink/60">
              {mode === 'reset' ? t('login.resetHelp') : t('login.signinHelp')}
            </p>
          </div>
          {/* `paper`, the one tone mixed from the fixed ink rather than the theme's —
              on white glass every other tone is a mark you cannot see on half the
              themes. `-mr-1 -mt-1` pulls it into the card's own padding so the square
              lines up with the heading's cap rather than floating inside it. */}
          <ButtonIcon
            icon={X}
            tone="paper"
            title={t('modal.closeEsc')}
            onClick={onClose}
            className="-mr-1 -mt-1 shrink-0"
          />
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {/* Email is shown for sign in, and for the reset "request" step. In the reset
              "confirm" step the email is locked in already. */}
          {(mode !== 'reset' || resetStep === 'request') && (
            <Input
              type="email"
              tone="paper"
              size="xl"
              value={email}
              onChange={setEmail}
              placeholder={t('login.emailPlaceholder')}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            />
          )}

          {mode === 'reset' && resetStep === 'confirm' && (
            <Input
              inputMode="numeric"
              tone="paper"
              size="xl"
              value={code}
              onChange={setCode}
              placeholder={t('login.codePlaceholder')}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            />
          )}

          {/* Password: hidden during the reset "request" step (email only). */}
          {!(mode === 'reset' && resetStep === 'request') && (
            <Input
              type="password"
              tone="paper"
              size="xl"
              value={password}
              onChange={setPassword}
              placeholder={mode === 'reset' ? t('login.newPasswordPlaceholder') : t('login.passwordPlaceholder')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            />
          )}
        </div>

        {/* The two reports, on the glass rather than on the theme's surfaces: a red at
            10% of the app's own ground is invisible here. Both keep the hue — red and
            green read on white in every theme — and take the fixed ink for the sentence,
            so a long message is readable rather than merely coloured. */}
        {error && (
          <p className="mt-3 rounded-xl border border-red/30 bg-red/15 px-3 py-2 text-xs leading-relaxed text-release-ink">
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-3 rounded-xl border border-release-paper/60 bg-release-paper/50 px-3 py-2 text-xs leading-relaxed text-release-ink">
            {notice}
          </p>
        )}

        {/* The design system's own button, where this was a `BTN_PRIMARY` string. `busy`
            blocks the press and spins the mark on its own — a sign-in that accepts a
            second press sends a second sign-in, and the reader has no way to know that
            is what they did. */}
        <Button
          tone="accent"
          size="xl"
          icon={mode === 'signin' ? LogIn : KeyRound}
          busy={busy}
          onClick={handleSubmit}
          className="mt-5 w-full"
        >
          {mode === 'signin'
            ? t('login.signIn')
            : resetStep === 'request'
              ? t('login.sendCode')
              : t('login.resetPassword')}
        </Button>

        <div className="mt-4 text-center">
          {mode === 'signin' ? (
            <button
              onClick={() => goToMode('reset')}
              className="text-xs font-medium text-release-ink/60 underline-offset-2 transition-colors hover:text-release-ink hover:underline"
            >
              {t('login.forgotPassword')}
            </button>
          ) : (
            <button
              onClick={() => goToMode('signin')}
              className="text-xs font-medium text-release-ink/60 underline-offset-2 transition-colors hover:text-release-ink hover:underline"
            >
              {t('login.backToSignIn')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
