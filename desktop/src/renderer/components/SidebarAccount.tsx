import { useMemo } from 'react'
import type { MenuSidebarEntry } from '@ds/desktop'
import { FolderGit2 } from '@ds/desktop/icons'
import { useAuth } from '../hooks/useAuth'
import { useAvatar } from '../hooks/useAvatar'
import { useStore } from '../store'
import { displayNameFromEmail } from '../utils/displayName'
import { useT } from '../i18n'

/**
 * Who is signed in, as the two things a control needs to NAME them: the word and the
 * photo.
 *
 * Extracted the day a second surface had to draw the same person. Those surfaces have
 * moved since — the sidebar row this file is named for is the repositories now, and the
 * person is in the TITLE BAR, as the label and as the first card of the sheet it opens —
 * but there are still two of them, and two copies of this would be two answers to "what
 * do we call the user" that disagree the first time `displayNameFromEmail`'s fallback is
 * reached on one side and not the other.
 *
 * `signedIn` is the caller's branch and not a name this can resolve: signed out and
 * cloud-disabled are different states with different controls (a way in, or nothing at
 * all), and only the caller knows which of its own shapes to draw. What this guarantees
 * is that when there IS an account, both surfaces call it the same thing.
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
 * THE REPOSITORIES, as ONE ROW of the sidebar's menu.
 *
 * It was the ACCOUNT row — a face, a name, and a settings modal of seven tabs behind
 * it. The account is in the title bar now, and the modal is down to one page, so the
 * row names the page instead of the person: what opens is a list of repositories, and a
 * row wearing somebody's photograph was a promise about their profile.
 *
 * A HOOK AND NOT A COMPONENT, which has not changed: `MenuSidebar` takes entries, so
 * what this hands over is an entry. What HAS gone is the second return value — the
 * login overlay. It was here because a signed-out account row had to offer a way in;
 * the title bar's label carries that now, and a repository row has nothing to say about
 * being signed in.
 *
 * THE WARNING STAYS AND MEANS MORE THAN IT DID: no repository configured yet. It used
 * to hang off a face, where it was a fact about the app pinned to a person. On this row
 * it is a fact about the very thing the row opens.
 */
export function useRepositoriesMenuEntry({ shortcutKey }: { shortcutKey?: string } = {}): MenuSidebarEntry {
  const t = useT()
  const config = useStore((s) => s.config)
  const openSettingsModal = useStore((s) => s.openSettingsModal)

  const hasNoRepos = useMemo(() => {
    if (!config) return false
    return Object.keys(config.repositories).length === 0
  }, [config])

  return {
    id: 'repositories',
    icon: FolderGit2,
    label: t('settings.tab.repositories'),
    shortcut: shortcutKey,
    alert: hasNoRepos,
    // Settings is a MODAL and not a page: opening it must never clear the active
    // terminal, or the app behind the overlay renders blank.
    onClick: () => openSettingsModal(),
  }
}
