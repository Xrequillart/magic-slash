import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, Settings, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../store'
import { LoginScreen } from './LoginScreen'

/**
 * Derive a friendly display name from an email address. Until GitHub OAuth
 * carries a real name (user_metadata.full_name), the local-part of the email is
 * the best we have: "xavier@poppins.io" → "Xavier", "jean.dupont@x" → "Jean".
 */
function displayNameFromEmail(email?: string): string {
  if (!email) return 'Account'
  const local = email.split('@')[0]
  const first = local.split(/[._+-]/)[0]
  if (!first) return 'Account'
  return first.charAt(0).toUpperCase() + first.slice(1)
}

/**
 * Top-of-sidebar account control (replaces the old Settings button). Logged in →
 * the user's first name; clicking opens the Settings modal. Logged out → a
 * "Login / Sign up" button opening the auth modal. When cloud is disabled it
 * falls back to a plain Settings entry so settings stay reachable. A warning
 * badge surfaces when no repositories are configured. Organization switching and
 * sign-out now live inside the Settings modal.
 */
export function SidebarAccount() {
  const { status } = useAuth()
  const config = useStore((s) => s.config)
  const openSettingsModal = useStore((s) => s.openSettingsModal)
  const setActiveTerminal = useStore((s) => s.setActiveTerminal)

  const [showLogin, setShowLogin] = useState(false)

  const hasNoRepos = useMemo(() => {
    if (!config) return false
    return Object.keys(config.repositories).length === 0
  }, [config])

  const openSettings = () => {
    setActiveTerminal(null)
    openSettingsModal()
  }

  const WarningBadge = () =>
    hasNoRepos ? (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow rounded-full flex items-center justify-center">
        <AlertTriangle className="w-2.5 h-2.5 text-black" />
      </span>
    ) : null

  // Cloud enabled but signed out → login entry. (In practice the app is gated
  // behind auth, so this mostly matters before the gate resolves.)
  if (status.enabled && !status.loggedIn) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium text-text-secondary rounded-lg hover:bg-text-secondary/10 hover:text-white transition-all"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Login / Sign up</span>
        </button>
        {/* Portal to <body> so the fixed overlay covers the whole app. */}
        {createPortal(
          <LoginScreen isOpen={showLogin} onClose={() => setShowLogin(false)} />,
          document.body,
        )}
      </>
    )
  }

  // Signed in → account button opening Settings.
  if (status.enabled && status.loggedIn) {
    const name = displayNameFromEmail(status.user?.email)
    const initial = name.charAt(0).toUpperCase()
    return (
      <button
        onClick={openSettings}
        className={`relative w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all ${
          hasNoRepos
            ? 'text-yellow hover:bg-yellow/10'
            : 'text-text-secondary hover:bg-text-secondary/10 hover:text-white'
        }`}
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold shrink-0">
          {initial}
        </span>
        <span className="truncate">{name}</span>
        <WarningBadge />
      </button>
    )
  }

  // Cloud disabled → plain Settings entry so settings stay reachable.
  return (
    <button
      onClick={openSettings}
      className={`relative w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all ${
        hasNoRepos
          ? 'text-yellow hover:bg-yellow/10'
          : 'text-text-secondary hover:bg-text-secondary/10 hover:text-white'
      }`}
    >
      <Settings className="w-3.5 h-3.5" />
      <span>Settings</span>
      <WarningBadge />
    </button>
  )
}
