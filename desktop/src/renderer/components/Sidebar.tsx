import { useState, useEffect, useCallback, memo } from 'react'
import { Plus, Sparkles, Users, ListTodo, AlertTriangle } from 'lucide-react'
import { useStore, type ModalId } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { useOrderedTerminals, useSplitOrderedTerminals, type TerminalWithRepos } from '../hooks/useOrderedTerminals'
import { AgentSortButton } from './AgentSortButton'
import { SidebarUsageCard } from './SidebarUsageCard'
import { SidebarUpdateButton } from './SidebarUpdateButton'
import { AgentStateBadge } from './AgentStateBadge'
import { SidebarAccount } from './SidebarAccount'
import { stateBgColors, stateHoverBgColors } from '../utils/stateColors'
import { useT } from '../i18n'

/**
 * Fixed, and deliberately not resizable. The agent list is a column of short labels
 * with a known shape, so there was nothing for a drag handle to reveal — while the
 * width it produced was one more piece of layout state to keep consistent with the
 * right sidebar, which now sizes itself from the kind of agent being inspected.
 */
const SIDEBAR_WIDTH = 230

/**
 * The ⌘/Ctrl shortcuts that open a page overlay, keyed by `KeyboardEvent.key`.
 *
 * Settings is absent on purpose: ⌘, goes through `openSettingsModal`, the wrapper
 * that can preselect a tab, so it is not a plain `openModal` like the other three.
 */
const PAGE_SHORTCUTS: Record<string, ModalId> = {
  ';': 'skills',
  j: 'tasks',
  t: 'team',
}

/**
 * How many agents are stuck on the person: waiting on an answer, or dead on an
 * error. A count, NOT a group — the agents it counts stay exactly where they
 * are in the list, and the banner hides itself at zero so a calm list stays calm.
 */
const AttentionBanner = memo(function AttentionBanner({ terminals }: { terminals: TerminalWithRepos[] }) {
  const t = useT()
  const count = terminals.filter(t => t.state === 'waiting' || t.state === 'error').length

  if (count === 0) return null

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-orange">
      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      <span className="truncate">{t('sidebar.needsAttention')}</span>
      <span className="ml-auto">{count}</span>
    </div>
  )
})

interface AgentItemProps {
  terminal: TerminalWithRepos
  isActive: boolean
  isSplitTarget: boolean
  onSelect: (e: React.MouseEvent) => void
  now: number
  draggable?: boolean
}

const AgentItem = memo(function AgentItem({ terminal, isActive, isSplitTarget, onSelect, now: _now, draggable }: AgentItemProps) {
  return (
    <button
      onClick={onSelect}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('terminal-id', terminal.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`
        w-full flex items-center gap-2 px-2 py-2 text-xs transition-all rounded-lg group/agent
        ${draggable ? 'cursor-pointer active:cursor-grab' : 'cursor-pointer'}
        ${isActive || isSplitTarget
          ? `${stateBgColors[terminal.state]} text-ink`
          : `text-text-secondary ${stateHoverBgColors[terminal.state]} hover:text-ink`
        }
      `}
    >
      <div className="flex-1 text-left min-w-0">
        <div className="truncate font-medium">{terminal.metadata?.title || terminal.name}</div>
      </div>
      <AgentStateBadge state={terminal.state} />
    </button>
  )
})

// Flat agent list, in whatever order `useOrderedTerminals` handed it: newest first by
// default, so a row stays exactly where the user last saw it, and grouped by status or
// by repository when they have asked for that instead.
interface AgentListProps {
  terminals: TerminalWithRepos[]
  activeTerminalId: string | null
  splitTerminalId: string | null
  isSplitMode: boolean
  onSelectTerminal: (id: string, e: React.MouseEvent) => void
  now: number
  draggable?: boolean
}

const AgentList = memo(function AgentList({
  terminals,
  activeTerminalId,
  splitTerminalId,
  isSplitMode,
  onSelectTerminal,
  now,
  draggable,
}: AgentListProps) {
  if (terminals.length === 0) return null

  return (
    <div className="flex flex-col gap-1">
      {terminals.map(terminal => (
        <AgentItem
          key={terminal.id}
          terminal={terminal}
          isActive={activeTerminalId === terminal.id}
          isSplitTarget={isSplitMode && splitTerminalId === terminal.id}
          onSelect={(e) => onSelectTerminal(terminal.id, e)}
          now={now}
          draggable={draggable}
        />
      ))}
    </div>
  )
})

export function Sidebar() {
  const { terminals, activeTerminalId, config, leftSidebarVisible, isSplitMode, splitTerminalId, focusedPane, setSplitTerminalId, setFocusedPane, moveTerminalToPane, rightPaneTerminalIds, openModal, closeModal, openSettingsModal } = useStore()
  const { setActiveTerminal } = useTerminals()
  const t = useT()

  const [now, setNow] = useState(Date.now())

  // Refresh `now` every 60s to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Agents in the order the person picked from the header control — newest first
  // unless they said otherwise (see hooks/terminalOrder.ts).
  const { ordered } = useOrderedTerminals()
  const { leftTerminals, rightTerminals } = useSplitOrderedTerminals()

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

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const shortcutKey = isMac ? '⌘N' : 'Ctrl+N'
  const skillsShortcutKey = isMac ? '⌘;' : 'Ctrl+;'
  const tasksShortcutKey = isMac ? '⌘J' : 'Ctrl+J'
  const teamShortcutKey = isMac ? '⌘T' : 'Ctrl+T'
  const settingsShortcutKey = isMac ? '⌘,' : 'Ctrl+,'

  // One listener for every page shortcut, not one per page: ⌘; / ⌘J / ⌘T all do the
  // same thing to a different modal, and a fourth copy of the same nine lines is a
  // table asking to be written. ⌘, stays out of the map — Settings has its own
  // action, the one that can preselect a tab.
  //
  // ⌘J for Tasks: T is the team dashboard, and every other initial the page could
  // claim (b, /, ;, ,, p, n, i, d) is already bound elsewhere in the app.
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

  return (
    <div
      className="bg-surface-sunken flex flex-col h-full relative z-10 transition-all duration-300 ease-in-out"
      style={{ width: `${SIDEBAR_WIDTH}px`, marginLeft: leftSidebarVisible ? 0 : -SIDEBAR_WIDTH }}
    >
      {/* Top actions */}
      <div className="px-2 pt-3 flex flex-col gap-1">
        {/* Tasks — the open GitHub issues of every GitHub-tracked repository.
            Takes the slot "new agent" used to hold: that action now sits on the
            AGENTS header below, next to the list it adds to. */}
        <button
          onClick={() => openModal('tasks')}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all text-text-secondary hover:bg-text-secondary/10 hover:text-ink"
        >
          <ListTodo className="w-3.5 h-3.5" />
          <span>{t('sidebar.tasks')}</span>
          <span className="ml-auto text-xs opacity-50">{tasksShortcutKey}</span>
        </button>

        {/* Team dashboard button. Sits between Tasks and Skills on purpose: the two
            around it are what the person and their team are WORKING ON, and Skills is
            reference material — so the order reads as work, then the tooling for it,
            rather than putting the reference list in the middle of the two views of
            live activity. The keyboard shortcuts are keyed by letter (see
            PAGE_SHORTCUTS) and do not follow this order, so moving a button here
            changes nothing but the reading order. */}
        <button
          onClick={() => openModal('team')}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all text-text-secondary hover:bg-text-secondary/10 hover:text-ink"
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('sidebar.team')}</span>
          <span className="ml-auto text-xs opacity-50">{teamShortcutKey}</span>
        </button>

        {/* Skills button — opens an overlay, so no active state */}
        <button
          onClick={() => openModal('skills')}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all text-text-secondary hover:bg-text-secondary/10 hover:text-ink"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('sidebar.skills')}</span>
          <span className="ml-auto text-xs opacity-50">{skillsShortcutKey}</span>
        </button>

        {/* Account / Settings — opens the settings modal (or login when signed out) */}
        <SidebarAccount shortcutKey={settingsShortcutKey} />
      </div>

      {/* Mode toggle + Agents list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col">

        {/* Agents label - always in the same position.
            The "new agent" action sits on this list's header, because the button that
            adds to a list belongs to it. Icon only: at this size a label costs more
            width than it explains, so the affordance is the +, and the wording moves
            to title/aria-label — which an icon-only control needs anyway.
            Padding on the LEFT only: `pl-2` puts the label on the same 16px line as
            the top action buttons and the agent rows below, which all sit at px-2
            inside a px-2 container. No `pr`, so the + stays flush against the right
            edge — which is also why it is LAST in the row, after the pane chip: that
            chip stays mounted at opacity-0 outside split mode and keeps occupying its
            width, so ordering the button before it would leave a permanent invisible
            gutter to its right. `mr-auto` on the label does the spacing a
            justify-between could not, for the same reason.
            The sort control sits between the two, i.e. immediately left of the +: both
            act on the list under them, and the one that CHANGES the list reads before
            the one that adds to it.
            The event is unchanged: ⌘N (pages/Terminals) and the native File menu
            (App.tsx) dispatch this very same 'new-terminal'. */}
        <div className="pl-2 pt-3 pb-2 flex items-center gap-1">
          <div className="text-xs text-text-secondary/50 uppercase tracking-wider mr-auto">{t('sidebar.agents')}</div>
          <span className={`text-[10px] bg-surface px-1.5 py-0.5 rounded transition-opacity duration-150 ${
            isSplitMode && terminals.length > 0 ? 'text-text-secondary/40 opacity-100' : 'opacity-0'
          }`}>{t('sidebar.paneLeft')}</span>
          <AgentSortButton />
          <button
            onClick={() => {
              const event = new CustomEvent('new-terminal')
              window.dispatchEvent(event)
            }}
            title={t('sidebar.newAgentShortcut', { shortcut: shortcutKey })}
            aria-label={t('sidebar.newAgentShortcut', { shortcut: shortcutKey })}
            className="p-1.5 text-icon rounded hover:bg-text-secondary/10 hover:text-ink transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {terminals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-xs p-4 text-center">
            {t('sidebar.empty')}
          </div>
        ) : isSplitMode ? (
          <>
            {/* LEFT zone */}
            <div
              className={`flex flex-col gap-1 rounded-lg transition-colors ${dragOverZone === 'left' ? 'bg-accent/10' : ''}`}
              onDragOver={(e) => handleDragOverZone('left', e)}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={(e) => handleDropOnZone('left', e)}
            >
              <AttentionBanner terminals={leftTerminals} />
              <AgentList
                terminals={leftTerminals}
                activeTerminalId={focusedPane === 'primary' ? activeTerminalId : null}
                splitTerminalId={null}
                isSplitMode={false}
                onSelectTerminal={handleSelectLeftTerminal}
                now={now}
                draggable
              />
              {leftTerminals.length === 0 && (
                <div className="text-text-secondary/30 text-xs text-center py-3">
                  {t('sidebar.dropAgents')}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-line-subtle mx-2 my-2" />

            {/* RIGHT zone */}
            <div
              className={`flex flex-col gap-1 rounded-lg transition-colors ${dragOverZone === 'right' ? 'bg-accent/10' : ''}`}
              onDragOver={(e) => handleDragOverZone('right', e)}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={(e) => handleDropOnZone('right', e)}
            >
              <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                <div className="text-xs text-text-secondary/50 uppercase tracking-wider">{t('sidebar.agents')}</div>
                <span className="text-[10px] text-text-secondary/40 bg-surface px-1.5 py-0.5 rounded">{t('sidebar.paneRight')}</span>
              </div>
              <AttentionBanner terminals={rightTerminals} />
              <AgentList
                terminals={rightTerminals}
                activeTerminalId={focusedPane === 'secondary' ? splitTerminalId : null}
                splitTerminalId={null}
                isSplitMode={false}
                onSelectTerminal={handleSelectRightTerminal}
                now={now}
                draggable
              />
              {rightPaneTerminalIds.length === 0 && (
                <div className="text-text-secondary/30 text-xs text-center py-3">
                  {t('sidebar.dropAgents')}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <AttentionBanner terminals={ordered} />
            <AgentList
              terminals={ordered}
              activeTerminalId={activeTerminalId}
              splitTerminalId={splitTerminalId}
              isSplitMode={isSplitMode}
              onSelectTerminal={handleSelectTerminal}
              now={now}
            />
          </>
        )}
      </nav>

      {/* Claude usage card — opt-out: shown unless explicitly disabled. */}
      {config?.usageCardEnabled !== false && <SidebarUsageCard />}

      {/* Renders itself only when there is an update to act on. Not behind the
          usage card's setting: hiding usage must not hide the update. */}
      <SidebarUpdateButton />

      {/* Footer */}
      <div className="px-4 py-2 text-xs text-text-secondary flex items-center justify-start gap-2">
        <span className="opacity-60">v0.86.5</span>
      </div>
    </div>
  )
}
