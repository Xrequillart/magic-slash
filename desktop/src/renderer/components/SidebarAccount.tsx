import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, LogOut, Building2, ChevronDown } from 'lucide-react'
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
 * Sidebar footer account control. Logged out → a "Login / Sign up" button that
 * opens the existing email/password modal. Logged in → the user's first name
 * with a small menu (organization, sign out). Hidden entirely when cloud is
 * disabled, matching how the rest of the app treats `enabled: false`.
 */
export function SidebarAccount() {
  const { status, logout } = useAuth()
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const setSettingsInitialTab = useStore((s) => s.setSettingsInitialTab)
  const setActiveTerminal = useStore((s) => s.setActiveTerminal)

  const [showLogin, setShowLogin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setMenuOpen(false) }
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const openOrganization = useCallback(() => {
    setMenuOpen(false)
    setSettingsInitialTab('organization')
    setActiveTerminal(null)
    setCurrentPage('config')
  }, [setSettingsInitialTab, setActiveTerminal, setCurrentPage])

  const handleLogout = useCallback(async () => {
    setMenuOpen(false)
    try {
      await logout()
    } catch {
      // logout is best-effort; the hook's statusChanged subscription reconciles state.
    }
  }, [logout])

  // Cloud disabled → nothing to show.
  if (!status.enabled) return null

  if (!status.loggedIn) {
    return (
      <>
        <div className="px-2 pb-2">
          <button
            onClick={() => setShowLogin(true)}
            className="w-full flex items-center justify-center gap-2 px-2 py-2 text-xs font-medium text-text-secondary rounded-lg hover:bg-text-secondary/10 hover:text-white transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Login / Sign up</span>
          </button>
        </div>
        {/* Portal to <body> so the fixed overlay covers the whole app, not just
            the sidebar (the sidebar's backdrop-filter would otherwise be the
            containing block for the fixed modal). */}
        {createPortal(
          <LoginScreen isOpen={showLogin} onClose={() => setShowLogin(false)} />,
          document.body,
        )}
      </>
    )
  }

  const name = displayNameFromEmail(status.user?.email)
  const initial = name.charAt(0).toUpperCase()

  return (
    <div ref={containerRef} className="relative px-2 pb-2">
      {menuOpen && (
        <div className="absolute bottom-full left-2 right-2 mb-1 bg-bg-secondary border border-white/10 rounded-lg shadow-xl backdrop-blur-2xl overflow-hidden z-30">
          <button
            onClick={openOrganization}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-white/10 hover:text-white transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Account &amp; organization</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      )}

      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-2 text-xs font-medium text-text-secondary rounded-lg hover:bg-text-secondary/10 hover:text-white transition-all"
      >
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold shrink-0">
          {initial}
        </span>
        <span className="truncate">{name}</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  )
}
