import { useEffect, useCallback, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Sparkles, NotebookPen, ListTodo } from '@ds/desktop/icons'
import { Sidebar as SidebarColumn, type SidebarAgentRow, type SidebarList } from '@ds/desktop'
import { useStore, type ModalId } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { useOrderedTerminals, useSplitOrderedTerminals, type TerminalWithRepos } from '../hooks/useOrderedTerminals'
import { groupKeyOf, isGroupStart, repoLabel } from '../hooks/terminalOrder'
import { useAgentSortAction } from './AgentSort'
import { SidebarUsageCard } from './SidebarUsageCard'
import { SidebarUpdateButton } from './SidebarUpdateButton'
import { useAccountMenuEntry } from './SidebarAccount'
import { LoginScreen } from './LoginScreen'
import { useT } from '../i18n'

/**
 * The left column, WIRED — and nothing else.
 *
 * Not one class string in this file. The column, the menu, the agent rows, the group
 * headings, the drop zones, the foot and the version line are `Sidebar` in
 * `@ds/desktop`, which knows none of this app: what is left here is the half that is
 * genuinely the app's — the store, the translator, the keyboard, and what a drop means.
 *
 * IT WAS 472 LINES and most of them were drawing. The same drawing existed a second
 * time on the public site (`AgentsSidebarMockup`), copied band for band with a comment
 * saying where each padding came from, and it had already fallen behind — it still
 * shows the `Team` row this app replaced with `Plans`. Both now render the one
 * component.
 *
 * THE APP'S BUILD, spelled here because this is the app. The version the column draws
 * is a literal that moves at release, not a value fetched from anywhere.
 */
const APP_VERSION = 'v0.94.5'

/**
 * The ⌘/Ctrl shortcuts that open a page overlay, keyed by `KeyboardEvent.key`.
 *
 * KEYED BY LETTER, NOT BY POSITION, and the two deliberately disagree: the menu below
 * reads Plans, Tasks, Skills, while ⌘T opens the first of them and ⌘J the second. The
 * letters were bound before Plans took Team's place and are what people's hands know —
 * rebinding them to follow a reordered column would break every reader's muscle memory
 * to make a table look tidy. Moving a row changes the reading order and nothing else.
 *
 * ⌘J for Tasks rather than ⌘T: T was already spoken for when Tasks arrived, and every
 * other initial the page could claim (b, /, ;, ,, p, n, i, d) is bound elsewhere in the
 * app.
 *
 * Settings is absent on purpose: ⌘, goes through `openSettingsModal`, the wrapper
 * that can preselect a tab, so it is not a plain `openModal` like the other three.
 */
const PAGE_SHORTCUTS: Record<string, ModalId> = {
  ';': 'skills',
  j: 'tasks',
  t: 'plans',
}

/** How many agents on a list are stuck on the person: waiting on an answer, or dead
 *  on an error. The column hides the banner at zero, so this is only ever a count. */
function attentionCount(terminals: TerminalWithRepos[]): number {
  return terminals.filter((terminal) => terminal.state === 'waiting' || terminal.state === 'error').length
}

export function Sidebar() {
  const { terminals, activeTerminalId, config, leftSidebarVisible, isSplitMode, splitTerminalId, focusedPane, setSplitTerminalId, setFocusedPane, moveTerminalToPane, rightPaneTerminalIds, openModal, closeModal, openSettingsModal } = useStore()
  const { setActiveTerminal } = useTerminals()
  const t = useT()

  // Agents in the order the person picked from the header control — newest first
  // unless they said otherwise (see hooks/terminalOrder.ts).
  const { ordered, colorMap, sort } = useOrderedTerminals()
  const { leftTerminals, rightTerminals, colorMap: splitColorMap } = useSplitOrderedTerminals()

  // Compared against the sort the ordering resolved, not against raw `config.agentSort`:
  // one value with the default already applied, so the headings cannot describe a
  // grouping the list is not in. `useSplitOrderedTerminals` resolves the same value from
  // the same store field, so one flag is right for all three branches.
  const showRepoHeaders = sort === 'repository'

  // Drag & drop state for split zones
  const [dragOverZone, setDragOverZone] = useState<'left' | 'right' | null>(null)

  const handleSelectTerminal = useCallback((id: string, e?: React.MouseEvent) => {
    closeModal()
    if (isSplitMode && splitTerminalId) {
      const targetSecondary = (e && (e.metaKey || e.ctrlKey))
        ? focusedPane !== 'secondary'
        : focusedPane === 'secondary'

      if (targetSecondary) {
        if (id === activeTerminalId) {
          setSplitTerminalId(activeTerminalId)
          setActiveTerminal(splitTerminalId)
        } else {
          setSplitTerminalId(id)
        }
        setFocusedPane('secondary')
      } else {
        if (id === splitTerminalId) {
          setActiveTerminal(splitTerminalId)
          setSplitTerminalId(activeTerminalId)
        } else {
          setActiveTerminal(id)
        }
        setFocusedPane('primary')
      }
    } else {
      setActiveTerminal(id)
    }
  }, [closeModal, setActiveTerminal, isSplitMode, activeTerminalId, splitTerminalId, focusedPane, setSplitTerminalId, setFocusedPane])

  // Zone-specific select handlers for split mode
  const handleSelectLeftTerminal = useCallback((id: string) => {
    closeModal()
    setActiveTerminal(id)
    setFocusedPane('primary')
  }, [closeModal, setActiveTerminal, setFocusedPane])

  const handleSelectRightTerminal = useCallback((id: string) => {
    closeModal()
    setSplitTerminalId(id)
    setFocusedPane('secondary')
  }, [closeModal, setSplitTerminalId, setFocusedPane])

  // Drop handlers for split zones
  const handleDropOnZone = useCallback((pane: 'left' | 'right', e: React.DragEvent) => {
    e.preventDefault()
    setDragOverZone(null)
    const terminalId = e.dataTransfer.getData('terminal-id')
    if (terminalId) {
      moveTerminalToPane(terminalId, pane)
    }
  }, [moveTerminalToPane])

  const handleDragOverZone = useCallback((pane: 'left' | 'right', e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverZone(pane)
  }, [])

  const handleAgentDragStart = useCallback((id: string, e: React.DragEvent) => {
    e.dataTransfer.setData('terminal-id', id)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const shortcutKey = isMac ? '⌘N' : 'Ctrl+N'
  const skillsShortcutKey = isMac ? '⌘;' : 'Ctrl+;'
  const tasksShortcutKey = isMac ? '⌘J' : 'Ctrl+J'
  const plansShortcutKey = isMac ? '⌘T' : 'Ctrl+T'
  const settingsShortcutKey = isMac ? '⌘,' : 'Ctrl+,'

  // After the table above, because it is handed the accelerator it displays.
  const { entry: accountEntry, login } = useAccountMenuEntry({ shortcutKey: settingsShortcutKey })
  // The sort control, as one action on the AGENTS header plus the panel it opens. A
  // hook for the same reason the account row is one: the column draws its own controls.
  const { action: sortAction, panel: sortPanel } = useAgentSortAction()

  // One listener for every page shortcut, not one per page: ⌘; / ⌘J / ⌘T all do the
  // same thing to a different modal, and a fourth copy of the same nine lines is a
  // table asking to be written. ⌘, stays out of the map — Settings has its own
  // action, the one that can preselect a tab.
  //
  // Which letter opens which page, and why they do not follow the menu below, is on
  // PAGE_SHORTCUTS.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return
      // A CTRL chord aimed at a focused terminal belongs to the shell, not to us:
      // Ctrl+J *is* LF, and Ctrl+T, Ctrl+; and Ctrl+, all carry meaning in a
      // readline or an editor running in the pane. Swallowing them here would take
      // the keystroke away from the process the user is typing into. CMD chords are
      // left alone — nothing in the shell listens for them, and gating those on
      // focus would kill the shortcuts where they are actually used. Same guard,
      // and same reasoning, as TitleBar.tsx's ⌘W handler.
      // (`.xterm` is the class the library puts on the element it is opened into.)
      if (!e.metaKey && e.target instanceof Element && e.target.closest('.xterm')) return
      if (e.key === ',') {
        e.preventDefault()
        openSettingsModal()
        return
      }
      // hasOwn, not a bare lookup: `e.key` is whatever the keyboard produced, and
      // an object literal answers to `constructor` and `toString` as readily as to
      // `j`. The guard is what keeps the map a map.
      if (!Object.hasOwn(PAGE_SHORTCUTS, e.key)) return
      const modal = PAGE_SHORTCUTS[e.key]
      e.preventDefault()
      openModal(modal)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal, openSettingsModal])

  /**
   * A terminal, as a row the column can draw — and the repository heading it opens.
   *
   * Group starts are read from THE LIST BEING DRAWN, never from one global pass: each
   * split pane gets its own filtered array, and a shared pass would leave the right
   * pane opening mid-group with no heading above it.
   *
   * The last group has no repository, so `colors['']` is undefined and the glyph
   * inherits the heading's muted ink. That is the intent, not an oversight: there is
   * no repository to be the colour of.
   */
  const toRows = useCallback((
    list: TerminalWithRepos[],
    activeId: string | null,
    colors: Record<string, string>,
  ): SidebarAgentRow[] => list.map((terminal, index) => {
    const groupKey = groupKeyOf(terminal)
    return {
      id: terminal.id,
      name: terminal.metadata?.title || terminal.name,
      state: terminal.state,
      active: activeId === terminal.id,
      heading: showRepoHeaders && isGroupStart(list, index)
        ? {
          label: groupKey ? repoLabel(groupKey) : t('sidebar.group.noRepository'),
          color: colors[groupKey],
        }
        : undefined,
    }
  }), [showRepoHeaders, t])

  /**
   * One list, or one per pane.
   *
   * TWO ONLY WHEN THERE IS SOMETHING TO SPLIT: with no agents at all the column shows
   * a single header and the empty line under it, rather than two headers over two
   * empty drop zones explaining where to put agents that do not exist.
   *
   * The pane chip is passed in BOTH cases and hidden in the single one, because it
   * holds its width open: the `+` sits flush against the right edge, and a chip that
   * came and went would shunt it sideways every time the window was split.
   */
  const lists = useMemo<SidebarList[]>(() => {
    const splitting = isSplitMode && terminals.length > 0
    const actions = [sortAction, {
      id: 'new',
      icon: Plus,
      title: t('sidebar.newAgentShortcut', { shortcut: shortcutKey }),
      // ⌘N (pages/Terminals) and the native File menu (App.tsx) dispatch this very
      // same event.
      onClick: () => window.dispatchEvent(new CustomEvent('new-terminal')),
    }]

    if (!splitting) {
      return [{
        id: 'agents',
        label: t('sidebar.agents'),
        pane: { label: t('sidebar.paneLeft'), visible: false },
        actions,
        attention: { label: t('sidebar.needsAttention'), count: attentionCount(ordered) },
        agents: toRows(ordered, activeTerminalId, colorMap),
        onSelectAgent: handleSelectTerminal,
      }]
    }

    return [
      {
        id: 'left',
        label: t('sidebar.agents'),
        pane: { label: t('sidebar.paneLeft') },
        actions,
        attention: { label: t('sidebar.needsAttention'), count: attentionCount(leftTerminals) },
        agents: toRows(leftTerminals, focusedPane === 'primary' ? activeTerminalId : null, splitColorMap),
        emptyHint: t('sidebar.dropAgents'),
        onSelectAgent: handleSelectLeftTerminal,
        draggable: true,
        onAgentDragStart: handleAgentDragStart,
        drop: {
          over: dragOverZone === 'left',
          onDragOver: (e) => handleDragOverZone('left', e),
          onDragLeave: () => setDragOverZone(null),
          onDrop: (e) => handleDropOnZone('left', e),
        },
      },
      {
        id: 'right',
        label: t('sidebar.agents'),
        pane: { label: t('sidebar.paneRight') },
        attention: { label: t('sidebar.needsAttention'), count: attentionCount(rightTerminals) },
        agents: toRows(rightTerminals, focusedPane === 'secondary' ? splitTerminalId : null, splitColorMap),
        // The right zone reports on the PANE and not on its own array: an agent moved
        // out of it leaves the pane empty, and the hint is how it says so.
        emptyHint: rightPaneTerminalIds.length === 0 ? t('sidebar.dropAgents') : undefined,
        onSelectAgent: handleSelectRightTerminal,
        draggable: true,
        onAgentDragStart: handleAgentDragStart,
        drop: {
          over: dragOverZone === 'right',
          onDragOver: (e) => handleDragOverZone('right', e),
          onDragLeave: () => setDragOverZone(null),
          onDrop: (e) => handleDropOnZone('right', e),
        },
      },
    ]
  }, [isSplitMode, terminals.length, sortAction, t, shortcutKey, ordered, activeTerminalId, colorMap, toRows, handleSelectTerminal, leftTerminals, rightTerminals, splitColorMap, focusedPane, splitTerminalId, rightPaneTerminalIds.length, dragOverZone, handleSelectLeftTerminal, handleSelectRightTerminal, handleAgentDragStart, handleDragOverZone, handleDropOnZone])

  return (
    <>
      <SidebarColumn
        collapsed={!leftSidebarVisible}
        menuAriaLabel={t('sidebar.menu.aria')}
        listsAriaLabel={t('sidebar.agents')}
        /* THE ORDER IS THE ORDER THE WORK HAPPENS IN: you plan something, then you pick
           it up, and Skills is the reference material for doing so — putting the
           reference list above either view of live work would be filing the manual in
           front of the job. The account is last and is the one row that changes shape,
           which is why it arrives as an entry rather than as markup. */
        menu={[
          { id: 'plans', icon: NotebookPen, label: t('sidebar.plans'), shortcut: plansShortcutKey, onClick: () => openModal('plans') },
          { id: 'tasks', icon: ListTodo, label: t('sidebar.tasks'), shortcut: tasksShortcutKey, onClick: () => openModal('tasks') },
          { id: 'skills', icon: Sparkles, label: t('sidebar.skills'), shortcut: skillsShortcutKey, onClick: () => openModal('skills') },
          accountEntry,
        ]}
        lists={lists}
        emptyLabel={t('sidebar.empty')}
        footer={
          <>
            {/* Claude usage card — opt-out: shown unless explicitly disabled. */}
            {config?.usageCardEnabled !== false && <SidebarUsageCard />}
            {/* Renders itself only when there is an update to act on. Not behind the
                usage card's setting: hiding usage must not hide the update. */}
            <SidebarUpdateButton />
          </>
        }
        version={APP_VERSION}
      />

      {/* The sort panel, and the login overlay the account row may need. Both are
          portalled out of the column — one is anchored to a button inside a scrolling
          <nav> that would clip it, the other is a fixed overlay covering the whole app
          — and neither can be rendered from inside a list of entries. */}
      {sortPanel}
      {createPortal(
        <LoginScreen isOpen={login.open} onClose={login.onClose} />,
        document.body,
      )}
    </>
  )
}
