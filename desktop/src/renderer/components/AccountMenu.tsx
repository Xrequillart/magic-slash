import { useEffect, useRef, useState, type RefObject } from 'react'
import { Menu, type MenuGroup, type MenuItem } from '@ds/desktop'
import {
  Building2, CircleUserRound, Cog, Download, Info, LogOut, Plug, SquareTerminal,
} from '@ds/desktop/icons'
import { useAccountIdentity } from './SidebarAccount'
import { showToast } from './Toast'
import { useAuth } from '../hooks/useAuth'
import { useStore } from '../store'
import { useT } from '../i18n'
import type { AccountModalTab } from './AccountModal'

/**
 * THE ACCOUNT, AS A DROPDOWN under the label at the end of the title bar.
 *
 * It was a second `ControlCenter` — a frosted sheet of cards hanging from the same
 * corner as the quick settings. Two sheets from one bar was one sheet too many: the
 * quick settings are CONTROLS, things you turn on and off without leaving what you are
 * doing, and an account is a set of DESTINATIONS. A destination does not want a tile,
 * it wants a row and a modal at the end of it, which is what every account menu in
 * every application has been for thirty years.
 *
 * THE FIRST TWO LINES ARE NOT ROWS. The face, the name and the address are the menu's
 * header: they say whose menu this is and nothing happens when they are pressed.
 *
 * THEN THE DESTINATIONS, and there are two kinds sharing one run. Four are tabs of
 * `AccountModal` — the row picks which one it opens on. The fifth, Settings, opens the
 * OTHER dialog, the one the quick settings sheet also leads to: it sits between Claude
 * Code and About because that is where it belongs by subject, not because it is the
 * same kind of link. Nothing on screen distinguishes them and nothing should: from the
 * reader's side both are "take me to that page".
 *
 * THEN THE TWO THAT ARE NOT DESTINATIONS AT ALL, under their own rule. Checking for
 * updates ACTS IN PLACE — it spins on its own row and the menu stays down, because an
 * answer that arrived after the menu had dismissed itself would be an answer to a
 * question the reader can no longer see they asked. Then signing out, drawn as the
 * dangerous row it is.
 *
 * THE ID OF EVERY DESTINATION ROW IS ITS TAB, which is why the switch below is a cast
 * and not a table: `AccountModalTab` is the union, the rows are built from it, and a row
 * that did not correspond to a tab could not be added without `tsc` noticing.
 */

/** The rows that open the modal. The id IS the tab — see the note above. */
const DESTINATIONS: { tab: AccountModalTab; icon: MenuItem['icon']; labelKey: Parameters<ReturnType<typeof useT>>[0] }[] = [
  { tab: 'account', icon: CircleUserRound, labelKey: 'settings.tab.account' },
  { tab: 'organization', icon: Building2, labelKey: 'settings.tab.organization' },
  { tab: 'connections', icon: Plug, labelKey: 'settings.tab.connections' },
  { tab: 'claude-code', icon: SquareTerminal, labelKey: 'settings.tab.claudeCode' },
  { tab: 'about', icon: Info, labelKey: 'settings.tab.about' },
]

/** Where Settings sits in that run — after Claude Code, before About. */
const SETTINGS_AFTER: AccountModalTab = 'claude-code'

const APP_SETTINGS = 'app-settings'
const CHECK_UPDATES = 'check-updates'
const SIGN_OUT = 'sign-out'

export function AccountMenu({ anchor }: { anchor: HTMLElement | null }) {
  const t = useT()
  const { status, logout } = useAuth()
  const { name, avatar } = useAccountIdentity()
  const open = useStore((s) => s.accountMenuOpen)
  const setOpen = useStore((s) => s.setAccountMenuOpen)
  const setAccountTab = useStore((s) => s.setAccountTab)
  const setAppSettingsTab = useStore((s) => s.setAppSettingsTab)
  // The wait on the update check, and nothing else — a row that spins is the whole of
  // what this component has to remember between the press and the answer.
  const [checking, setChecking] = useState(false)
  // Cleared by hand on sign-out rather than by `useOrg().refresh()`, which is what this
  // used to call. That hook fetches the roster — and every org's members and invitations
  // — on MOUNT, and this menu is mounted for the whole session whether or not anybody
  // opens it. Signing out has exactly one thing to say about organizations anyway: there
  // are none now.
  const setOrgs = useStore((s) => s.setOrgs)
  const setActiveOrg = useStore((s) => s.setActiveOrg)

  const destinations: MenuItem[] = DESTINATIONS.flatMap(({ tab, icon, labelKey }) => {
    const row: MenuItem = { id: tab, icon, label: t(labelKey) }
    return tab === SETTINGS_AFTER
      ? [row, { id: APP_SETTINGS, icon: Cog, label: t('accountMenu.settings') }]
      : [row]
  })

  const groups: MenuGroup[] = [
    { items: destinations },
    {
      items: [
        {
          id: CHECK_UPDATES,
          icon: Download,
          label: checking ? t('accountMenu.checking') : t('accountMenu.checkUpdates'),
          loading: checking,
          // The menu stays down: the answer lands on this row, and a menu that had
          // dismissed itself would have nowhere to put it.
          keepOpen: true,
        },
        { id: SIGN_OUT, icon: LogOut, label: t('cloud.signOut'), tone: 'danger' },
      ],
    },
  ]

  const handleSelect = async (item: MenuItem) => {
    if (item.id === CHECK_UPDATES) {
      /**
       * AN ACTION, AND THE ONLY ONE HERE THAT MAKES YOU WAIT.
       *
       * `check()` resolves when the server has answered, so the status read straight
       * after it is the answer rather than whatever the last check left behind. Three
       * ways it can go, and each gets its own ending:
       *
       *  * an update is there — `UpdateOverlay` is mounted at the app's root and has
       *    been listening on the status channel the whole time, so the dialog is
       *    already coming up. The menu closes to get out of its way.
       *  * there is none — the row stops spinning and says so once. Silence was the
       *    first version and it reads as a button that did nothing.
       *  * it failed — the same, in red.
       */
      setChecking(true)
      try {
        await window.electronAPI.updater.check()
        const status = await window.electronAPI.updater.getStatus()
        if (status.type === 'available' || status.type === 'downloading' || status.type === 'downloaded') {
          setOpen(false)
        } else if (status.type === 'error') {
          showToast(status.message || t('accountMenu.checkUpdatesFailed'), 'error')
        } else {
          showToast(t('accountMenu.upToDate'))
        }
      } catch {
        showToast(t('accountMenu.checkUpdatesFailed'), 'error')
      } finally {
        setChecking(false)
      }
      return
    }
    if (item.id === APP_SETTINGS) {
      setAppSettingsTab('application')
      return
    }
    if (item.id === SIGN_OUT) {
      try {
        await logout()
        setOrgs([])
        setActiveOrg(null)
      } catch (error) {
        showToast(error instanceof Error ? error.message : t('accountMenu.signOutFailed'), 'error')
      }
      return
    }
    // Everything else is a destination, and its id is the tab it opens. The cast holds
    // because `DESTINATIONS` is built from the union itself.
    setAccountTab(item.id as AccountModalTab)
  }

  return (
    <Menu
      open={open}
      onClose={() => setOpen(false)}
      anchor={anchor}
      label={t('accountMenu.title')}
      header={{ title: name, subtitle: status.user?.email, avatar: { src: avatar, alt: '' } }}
      groups={groups}
      onSelect={(item) => void handleSelect(item)}
    />
  )
}

/**
 * The account as the title bar's own control — the label at the far right, the element
 * the menu hangs from, and whatever the label opens.
 *
 * A HOOK AND NOT A COMPONENT, for the reason `useRepositoriesMenuEntry` gives next
 * door: `AppTitleBar` draws its own controls, so what this hands over is the PROP it
 * draws one from. The anchor comes back with it because a portalled menu has to be
 * positioned against an element somebody else rendered.
 *
 * THREE STATES, the sidebar's own three. Signed in, the label is the person and it
 * opens the dropdown. Signed OUT with the cloud on, it is a way in — the caller renders
 * the login screen, which is why `login` comes back rather than being rendered here.
 * Cloud off entirely, there is no account to name and the bar simply ends at the
 * sliders: an invitation to sign in to something that is not configured is worse than
 * silence.
 */
export function useAccountTitleBarControl(): {
  account: {
    label: string
    title: string
    onClick: () => void
    avatar?: { src: string | null; alt: string }
    anchorRef: RefObject<HTMLSpanElement>
  } | undefined
  anchor: HTMLElement | null
  login: { open: boolean; onClose: () => void }
} {
  const t = useT()
  const { status } = useAuth()
  const { signedIn, name, avatar } = useAccountIdentity()
  const menuOpen = useStore((s) => s.accountMenuOpen)
  const setMenuOpen = useStore((s) => s.setAccountMenuOpen)
  const [loginOpen, setLoginOpen] = useState(false)

  /**
   * The label's own element, for `Menu` to hang off.
   *
   * A ref AND a state copy, which looks like one too many until you ask when the menu
   * gets to measure. A ref does not re-render when it is filled, so on the first paint
   * the menu would be handed `null`, decide it has nothing to position against, and
   * never hear that the label had arrived. The effect copies it into state once, which
   * is the render the menu needs.
   */
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  useEffect(() => { setAnchor(anchorRef.current) }, [signedIn])

  const login = { open: loginOpen, onClose: () => setLoginOpen(false) }

  if (signedIn) {
    return {
      account: {
        label: name,
        title: t('titlebar.account'),
        // `alt: ''` — the name is on the plate beside the face.
        avatar: { src: avatar, alt: '' },
        anchorRef,
        onClick: () => setMenuOpen(!menuOpen),
      },
      anchor,
      login,
    }
  }

  if (status.enabled) {
    return {
      account: {
        label: t('sidebar.login'),
        title: t('sidebar.login'),
        anchorRef,
        onClick: () => setLoginOpen(true),
      },
      anchor,
      login,
    }
  }

  return { account: undefined, anchor, login }
}
