import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, Settings, AlertTriangle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useAvatar } from '../hooks/useAvatar'
import { useStore } from '../store'
import { AccountAvatar } from './AccountAvatar'
import { LoginScreen } from './LoginScreen'
import { displayNameFromEmail } from '../utils/displayName'
import { useT } from '../i18n'

/**
 * Top-of-sidebar account control (replaces the old Settings button). Logged in →
 * the user's first name; clicking opens the Settings modal. Logged out → a
 * "Login / Sign up" button opening the auth modal. When cloud is disabled it
 * falls back to a plain Settings entry so settings stay reachable. A warning
 * badge surfaces when no repositories are configured. Organization switching and
 * sign-out now live inside the Settings modal.
 *
 * `shortcutKey` is the pre-formatted accelerator label (⌘, / Ctrl+,) shown on the
 * right, matching the other sidebar entries. The keybinding itself lives in Sidebar.
 */
export function SidebarAccount({ shortcutKey }: { shortcutKey?: string }) {
  const { status } = useAuth()
  const avatar = useAvatar()
  const t = useT()
  const config = useStore((s) => s.config)
  const openSettingsModal = useStore((s) => s.openSettingsModal)

  const [showLogin, setShowLogin] = useState(false)

  const hasNoRepos = useMemo(() => {
    if (!config) return false
    return Object.keys(config.repositories).length === 0
  }, [config])

  // Settings is a modal, not a page: it must never clear the active terminal,
  // otherwise the app behind the overlay renders blank.
  const openSettings = () => {
    openSettingsModal()
  }

  const WarningBadge = () =>
    hasNoRepos ? (
      <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow rounded-full flex items-center justify-center">
        <AlertTriangle className="w-2.5 h-2.5 text-bg" />
      </span>
    ) : null

  // Cloud enabled but signed out → login entry. (In practice the app is gated
  // behind auth, so this mostly matters before the gate resolves.)
  if (status.enabled && !status.loggedIn) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium text-text-secondary rounded-lg hover:bg-text-secondary/10 hover:text-ink transition-all"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>{t('sidebar.login')}</span>
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
    const name = displayNameFromEmail(status.user?.email, t('sidebar.accountFallback'))
    return (
      <button
        onClick={openSettings}
        className={`relative w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all ${
          hasNoRepos
            ? 'text-yellow hover:bg-yellow/10'
            : 'text-text-secondary hover:bg-text-secondary/10 hover:text-ink'
        }`}
      >
        {/*
          The account photo, or the same generic `CircleUserRound` this line has always
          drawn when there is none. The `sidebar` variant is 14 px with no badge fill,
          so the row is pixel-for-pixel what it was: same box, same `shrink-0`, same
          `gap-2` from the button, and the icon keeps inheriting `currentColor` so it
          still turns yellow with the rest of the row when no repository is configured.
        */}
        <AccountAvatar variant="sidebar" dataUrl={avatar} />
        <span className="truncate">{name}</span>
        {shortcutKey && <span className="ml-auto text-xs opacity-50 shrink-0">{shortcutKey}</span>}
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
          : 'text-text-secondary hover:bg-text-secondary/10 hover:text-ink'
      }`}
    >
      <Settings className="w-3.5 h-3.5" />
      <span>{t('sidebar.settings')}</span>
      {shortcutKey && <span className="ml-auto text-xs opacity-50 shrink-0">{shortcutKey}</span>}
      <WarningBadge />
    </button>
  )
}
