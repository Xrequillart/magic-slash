import { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { Bot, XCircle, Sparkles, X, Users, AlertTriangle } from 'lucide-react'
import { useStore } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { useScriptRunner } from '../hooks/useScriptRunner'
import { useOrderedTerminals, useSplitOrderedTerminals, type TerminalWithRepos } from '../hooks/useOrderedTerminals'
import { getProjectColorMap } from '../utils/projectColors'
import { SidebarUsageCard } from './SidebarUsageCard'
import { SidebarUpdateButton } from './SidebarUpdateButton'
import { WaveLoader } from './WaveLoader'
import { AgentStateBadge } from './AgentStateBadge'
import { SidebarAccount } from './SidebarAccount'
import { stateBgColors, stateHoverBgColors } from '../utils/stateColors'
import { useT } from '../i18n'
import type { ScriptTerminalInfo } from '../../types'
import { CHANGELOG_URL, DOCUMENTATION_URL } from '../../urls'

const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_DEFAULT_WIDTH = 300

// Project color dot component
const ProjectDot = memo(function ProjectDot({ color, title }: { color: string; title: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={title}
    />
  )
})

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
  colorMap: Record<string, string>
  now: number
  draggable?: boolean
}

const AgentItem = memo(function AgentItem({ terminal, isActive, isSplitTarget, onSelect, colorMap, now: _now, draggable }: AgentItemProps) {
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
      {terminal.matchingProjects.length > 0 && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {terminal.matchingProjects.map((project) => (
            <ProjectDot
              key={project}
              color={colorMap[project]}
              title={project}
            />
          ))}
        </div>
      )}
      <AgentStateBadge state={terminal.state} />
    </button>
  )
})

// Flat agent list — newest first, never reordered by workflow status so a row
// stays exactly where the user last saw it.
interface AgentListProps {
  terminals: TerminalWithRepos[]
  activeTerminalId: string | null
  splitTerminalId: string | null
  isSplitMode: boolean
  onSelectTerminal: (id: string, e: React.MouseEvent) => void
  colorMap: Record<string, string>
  now: number
  draggable?: boolean
}

const AgentList = memo(function AgentList({
  terminals,
  activeTerminalId,
  splitTerminalId,
  isSplitMode,
  onSelectTerminal,
  colorMap,
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
          colorMap={colorMap}
          now={now}
          draggable={draggable}
        />
      ))}
    </div>
  )
})

interface ScriptItemProps {
  script: ScriptTerminalInfo
  isActive: boolean
  onSelect: () => void
  onStop: () => void
}

const ScriptItem = memo(function ScriptItem({ script, isActive, onSelect, onStop }: ScriptItemProps) {
  const t = useT()
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-all rounded-lg group
        ${isActive
          ? 'bg-accent/20 text-ink'
          : 'text-text-secondary hover:bg-accent/10 hover:text-ink'
        }
      `}
    >
      {script.state === 'running' ? (
        <WaveLoader className="flex-shrink-0 text-accent" />
      ) : (
        <XCircle className="w-4 h-4 text-red flex-shrink-0" />
      )}
      <div className="flex-1 text-left min-w-0">
        <div className="truncate text-xs font-medium">
          {script.scriptName} <span className="text-text-secondary/50">({script.agentName})</span>
        </div>
      </div>
      <span
        onClick={(e) => { e.stopPropagation(); onStop() }}
        className="p-0.5 rounded hover:bg-surface-strong opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title={t('sidebar.stopScript')}
      >
        <X className="w-3 h-3 text-text-secondary/50 hover:text-red" />
      </span>
    </button>
  )
})

export function Sidebar() {
  const { terminals, activeTerminalId, config, leftSidebarVisible, isSplitMode, splitTerminalId, focusedPane, setSplitTerminalId, setFocusedPane, moveTerminalToPane, rightPaneTerminalIds, openModal, closeModal, openSettingsModal } = useStore()
  const { setActiveTerminal } = useTerminals()
  const { scriptTerminals, stopScript } = useScriptRunner()
  const t = useT()

  const [width, setWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [now, setNow] = useState(Date.now())

  // Refresh `now` every 60s to update relative timestamps
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const getMaxWidth = useCallback(() => {
    return Math.floor(window.innerWidth * 0.2)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const maxWidth = getMaxWidth()
      const newWidth = e.clientX
      setWidth(Math.min(maxWidth, Math.max(SIDEBAR_MIN_WIDTH, newWidth)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, getMaxWidth])

  useEffect(() => {
    const handleResize = () => {
      const maxWidth = getMaxWidth()
      if (width > maxWidth) {
        setWidth(maxWidth)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [width, getMaxWidth])

  // Agents, newest first — no grouping, no status-driven reordering
  const { ordered, projectNames } = useOrderedTerminals()
  const { leftTerminals, rightTerminals } = useSplitOrderedTerminals()

  // Drag & drop state for split zones
  const [dragOverZone, setDragOverZone] = useState<'left' | 'right' | null>(null)

  // Generate color map for projects (using configured colors if available)
  const colorMap = useMemo(
    () => getProjectColorMap(projectNames, config?.repositories),
    [projectNames, config?.repositories]
  )


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
  const teamShortcutKey = isMac ? '⌘T' : 'Ctrl+T'
  const settingsShortcutKey = isMac ? '⌘,' : 'Ctrl+,'

  // Listen for Command+; keyboard shortcut to open skills
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ';') {
        e.preventDefault()
        openModal('skills')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal])

  // Listen for Command+T keyboard shortcut to open the team dashboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault()
        openModal('team')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openModal])

  // Listen for Command+, keyboard shortcut to open settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        openSettingsModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [openSettingsModal])

  return (
    <div
      className={`bg-surface-sunken flex flex-col h-full relative z-10 ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
      style={{ width: `${width}px`, marginLeft: leftSidebarVisible ? 0 : -width }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-purple/50 transition-colors z-20 ${
          isResizing ? 'bg-purple' : ''
        }`}
      />

      {/* Top actions */}
      <div className="px-2 pt-3 flex flex-col gap-1">
        {/* New agent button */}
        <button
          onClick={() => {
            const event = new CustomEvent('new-terminal')
            window.dispatchEvent(event)
          }}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium text-text-secondary rounded-lg hover:bg-text-secondary/10 hover:text-ink transition-all"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>{t('sidebar.newAgent')}</span>
          <span className="ml-auto text-xs opacity-50">{shortcutKey}</span>
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

        {/* Team dashboard button */}
        <button
          onClick={() => openModal('team')}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 text-xs font-medium rounded-lg transition-all text-text-secondary hover:bg-text-secondary/10 hover:text-ink"
        >
          <Users className="w-3.5 h-3.5" />
          <span>{t('sidebar.team')}</span>
          <span className="ml-auto text-xs opacity-50">{teamShortcutKey}</span>
        </button>

        {/* Account / Settings — opens the settings modal (or login when signed out) */}
        <SidebarAccount shortcutKey={settingsShortcutKey} />
      </div>

      {/* Mode toggle + Agents list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col">

        {/* Agents label - always in the same position */}
        <div className="px-2 pt-2 pb-1 flex items-center justify-between">
          <div className="text-xs text-text-secondary/50 uppercase tracking-wider">{t('sidebar.agents')}</div>
          <span className={`text-[10px] bg-surface px-1.5 py-0.5 rounded transition-opacity duration-150 ${
            isSplitMode && terminals.length > 0 ? 'text-text-secondary/40 opacity-100' : 'opacity-0'
          }`}>{t('sidebar.paneLeft')}</span>
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
                colorMap={colorMap}
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
                colorMap={colorMap}
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
              colorMap={colorMap}
              now={now}
            />
          </>
        )}
      </nav>

      {/* Scripts section */}
      {scriptTerminals.length > 0 && (
        <>
          <div className="px-2 pt-2 pb-1">
            <div className="px-2 text-xs text-text-secondary/50 uppercase tracking-wider">{t('sidebar.scripts')}</div>
          </div>
          <div className="px-2 pb-2 flex flex-col gap-1">
            {scriptTerminals.map(script => (
              <ScriptItem
                key={script.id}
                script={script}
                isActive={activeTerminalId === script.id}
                onSelect={() => handleSelectTerminal(script.id)}
                onStop={() => stopScript(script.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Claude usage card — opt-out: shown unless explicitly disabled. */}
      {config?.usageCardEnabled !== false && <SidebarUsageCard />}

      {/* Renders itself only when there is an update to act on. Not behind the
          usage card's setting: hiding usage must not hide the update. */}
      <SidebarUpdateButton />

      {/* Footer */}
      <div className="px-4 py-2 text-xs text-text-secondary flex items-center justify-start gap-2">
        <span className="opacity-60">v0.76.1</span>
        <span className="opacity-30">&bull;</span>
        <a
          href={DOCUMENTATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink transition-colors"
        >
          {t('sidebar.docs')}
        </a>
        <span className="opacity-30">&bull;</span>
        <a
          href={CHANGELOG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink transition-colors"
        >
          {t('sidebar.changelog')}
        </a>
        <span className="opacity-30">&bull;</span>
        <a
          href="https://github.com/xrequillart/magic-slash"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink transition-colors"
        >
          {t('sidebar.github')}
        </a>
      </div>
    </div>
  )
}
