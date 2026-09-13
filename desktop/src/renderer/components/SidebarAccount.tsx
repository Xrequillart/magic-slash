import { useState, useMemo, useCallback } from 'react'
import type { MenuSidebarEntry } from '@ds/desktop'
import { LogIn, Settings } from '@ds/desktop/icons'
import { useAuth } from '../hooks/useAuth'
import { useAvatar } from '../hooks/useAvatar'
import { useStore } from '../store'
import { displayNameFromEmail } from '../utils/displayName'
import { useT } from '../i18n'

/**
 * Who is signed in, as the two things a control needs to NAME them: the word and the
 * photo.
 *
 * Extracted the day a second surface had to draw the same person — the Settings tab of
 * the page overlay, which shows the account rather than a gear. Two copies of this would
 * be two answers to "what do we call the user", and they would disagree the first time
 * `displayNameFromEmail`'s fallback was reached on one side and not the other.
 *
 * `signedIn` is the caller's branch and not a name this can resolve: signed out and
 * cloud-disabled are different states with different controls (a login button, a plain
 * Settings entry), and only the caller knows which of its own shapes to draw. What this
 * guarantees is that when there IS an account, both surfaces call it the same thing.
 */
export function useAccountIdentity(): { signedIn: boolean; name: string; avatar: string | null } {
  const { status } = useAuth()
  const avatar = useAvatar()
  const t = useT()
  return {
    signedIn: status.enabled && status.loggedIn,
    name: displayNameFromEmail(status.user?.email, t('sidebar.accountFallback')),
    avatar,
  }
}

/**
 * The account, as ONE ROW of the sidebar's menu — plus the login overlay it may need.
 *
 * A HOOK AND NOT A COMPONENT, because the menu draws its own rows: `MenuSidebar` takes
 * entries, so what this hands over is an entry. It was three hand-written buttons, one
 * per state, each respelling the same class string the three nav rows above it also
 * spelled — six copies of one row in total, and this was the half that had drifted:
 * only these three truncated the label.
 *
 * THREE STATES AND THEY ARE REALLY DIFFERENT, which is why `useAccountIdentity` cannot
 * answer this on its own. Signed in, the row is the person: their photo and their
 * name, opening Settings. Signed OUT with the cloud on, it is a way in — and the only
 * one of the three that needs an overlay, which is why `login` comes back beside the
 * entry rather than being rendered from in here. Cloud off entirely, it is a plain
 * Settings entry, because settings have to stay reachable with no account at all.
 *
 * THE WARNING IS THE SAME FACT IN ALL THREE: no repository configured yet. It reaches
 * the row as `alert`, which turns it yellow and gives it the badge — one fact, one
 * prop, rather than a colour and a decoration that could get out of step.
 */
export function useAccountMenuEntry({ shortcutKey }: { shortcutKey?: string } = {}): {
  entry: MenuSidebarEntry
  login: { open: boolean; onClose: () => void }
} {
  const { status } = useAuth()
  const { signedIn, name, avatar } = useAccountIdentity()
  const t = useT()
  const config = useStore((s) => s.config)
  const openSettingsModal = useStore((s) => s.openSettingsModal)

  const [showLogin, setShowLogin] = useState(false)
  const closeLogin = useCallback(() => setShowLogin(false), [])

  const hasNoRepos = useMemo(() => {
    if (!config) return false
    return Object.keys(config.repositories).length === 0
  }, [config])

  const login = { open: showLogin, onClose: closeLogin }

  // Cloud enabled but signed out → a way in. (In practice the app is gated behind
  // auth, so this mostly matters before the gate resolves.) No shortcut and no
  // warning: neither means anything until there is an account to hang them on.
  if (status.enabled && !status.loggedIn) {
    return {
      entry: { id: 'account', icon: LogIn, label: t('sidebar.login'), onClick: () => setShowLogin(true) },
      login,
    }
  }

  // Settings is a MODAL and not a page: opening it must never clear the active
  // terminal, or the app behind the overlay renders blank.
  const openSettings = () => openSettingsModal()

  if (signedIn) {
    return {
      entry: {
        id: 'account',
        // `alt: ''` because the name is right beside it: a photo that repeats the
        // adjacent label makes a screen reader say the person twice per row.
        avatar: { src: avatar, alt: '' },
        label: name,
        shortcut: shortcutKey,
        alert: hasNoRepos,
        onClick: openSettings,
      },
      login,
    }
  }

  // Cloud disabled → a plain Settings entry, so settings stay reachable.
  return {
    entry: {
      id: 'account',
      icon: Settings,
      label: t('sidebar.settings'),
      shortcut: shortcutKey,
      alert: hasNoRepos,
      onClick: openSettings,
    },
    login,
  }
}
