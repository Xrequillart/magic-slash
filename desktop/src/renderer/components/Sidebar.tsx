import { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { Bot, Settings, AlertTriangle, Check, Clock, XCircle, ChevronDown, ChevronLeft, Sparkles, X, Eye, Play, CheckCircle2, Moon } from 'lucide-react'
import { useStore } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { useScriptRunner } from '../hooks/useScriptRunner'
import { useGroupedTerminals, useSplitGroupedTerminals, WORKFLOW_GROUPS, type WorkflowGroupKey, type TerminalWithRepos } from '../hooks/useGroupedTerminals'
import { getProjectColorMap } from '../utils/projectColors'
import { stateColors, stateBgColors, stateHoverBgColors } from '../utils/stateColors'
import type { TerminalState, ScriptTerminalInfo } from '../../types'

const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_DEFAULT_WIDTH = 300

const StatusBadge = memo(function StatusBadge({ state }: { state: TerminalState }) {
  // Don't render anything for idle state
  if (state === 'idle') return null

  const renderIcon = () => {
    switch (state) {
      case 'working':
        return <span className="loader-spinner-md flex-shrink-0" />
      case 'completed':
        return <Check className="w-4 h-4" />
      case 'waiting':
        return <Clock className="w-4 h-4" />
      case 'error':
        return <XCircle className="w-4 h-4" />
      default:
        return null
    }
  }

  return (
    <span className={`flex items-center ${stateColors[state]}`}>
      {renderIcon()}
    </span>
  )
})

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

// Workflow group icon and color config
const WORKFLOW_GROUP_CONFIG: Record<WorkflowGroupKey, {
  icon: React.ComponentType<{ className?: string }> | null
  spinner?: boolean
  color: string
}> = {
  backlog:         { icon: Moon, color: 'text-text-secondary/50' },
  needs_attention: { icon: AlertTriangle, color: 'text-text-secondary/50' },
  in_progress:     { icon: Play, color: 'text-text-secondary/50' },
  in_review:       { icon: Eye, color: 'text-text-secondary/50' },
  done:            { icon: CheckCircle2, color: 'text-text-secondary/50' },
}

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
        w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-all rounded-lg
        ${draggable ? 'cursor-pointer active:cursor-grab' : 'cursor-pointer'}
        ${isActive || isSplitTarget
          ? `${stateBgColors[terminal.state]} text-white`
          : `text-text-secondary ${stateHoverBgColors[terminal.state]} hover:text-white`
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
      <StatusBadge state={terminal.state} />
    </button>
  )
})

// Workflow group section
interface WorkflowGroupProps {
  groupKey: WorkflowGroupKey
  label: string
  terminals: TerminalWithRepos[]
  isCollapsed: boolean
  onToggle: () => void
  activeTerminalId: string | null
  splitTerminalId: string | null
  isSplitMode: boolean
  onSelectTerminal: (id: string, e: React.MouseEvent) => void
  colorMap: Record<string, string>
  now: number
  draggable?: boolean
}

const WorkflowGroup = memo(function WorkflowGroup({
  groupKey,
  label,
  terminals,
  isCollapsed,
  onToggle,
  activeTerminalId,
  splitTerminalId,
  isSplitMode,
  onSelectTerminal,
  colorMap,
  now,
  draggable,
}: WorkflowGroupProps) {
  if (terminals.length === 0) return null

  const config = WORKFLOW_GROUP_CONFIG[groupKey]
  const IconComponent = config.icon

  return (
    <div className="flex flex-col">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary/50 hover:text-white transition-colors w-full"
      >
        <span className={`flex items-center ${config.color}`}>
          {config.spinner ? (
            <span className="loader-spinner-sm flex-shrink-0" />
          ) : IconComponent ? (
            <IconComponent className="w-3.5 h-3.5" />
          ) : null}
        </span>
        <span className="font-medium truncate">{label}</span>
        <span className="text-text-secondary/30 text-xs">{terminals.length}</span>
        <span className="ml-auto">
          {isCollapsed ? (
            <ChevronLeft className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </span>
      </button>

      {/* Agent list */}
      {!isCollapsed && (
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
      )}
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
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-sm transition-all rounded-lg group
        ${isActive
          ? 'bg-accent/20 text-white'
          : 'text-text-secondary hover:bg-accent/10 hover:text-white'
        }
      `}
    >
      {script.state === 'running' ? (
        <span className="loader-spinner-md flex-shrink-0 text-accent" />
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
        className="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        title="Stop script"
      >
        <X className="w-3 h-3 text-text-secondary/50 hover:text-red" />
      </span>
    </button>
  )
})

export function Sidebar() {
  const { currentPage, setCurrentPage, terminals, activeTerminalId, config, leftSidebarVisible, isSplitMode, splitTerminalId, focusedPane, setSplitTerminalId, setFocusedPane, moveTerminalToPane, rightPaneTerminalIds } = useStore()
  const { setActiveTerminal } = useTerminals()
  const { scriptTerminals, stopScript } = useScriptRunner()

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

  // Collapsed state: Done and Idle collapsed by default
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const group of WORKFLOW_GROUPS) {
      if (group.collapsedByDefault) initial.add(group.key)
    }
    return initial
  })

  // Group terminals by workflow status
  const { groups, projectNames } = useGroupedTerminals()
  const { leftGroups, rightGroups } = useSplitGroupedTerminals()

  // Drag & drop state for split zones
  const [dragOverZone, setDragOverZone] = useState<'left' | 'right' | null>(null)

  // Generate color map for projects (using configured colors if available)
  const colorMap = useMemo(
    () => getProjectColorMap(projectNames, config?.repositories),
    [projectNames, config?.repositories]
  )

  const toggleGroup = useCallback((groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupName)) {
        next.delete(groupName)
      } else {
        next.add(groupName)
      }
      return next
    })
  }, [])

  const handleSelectTerminal = useCallback((id: string, e?: React.MouseEvent) => {
    setCurrentPage('terminals')
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
  }, [setCurrentPage, setActiveTerminal, isSplitMode, activeTerminalId, splitTerminalId, focusedPane, setSplitTerminalId, setFocusedPane])

  // Zone-specific select handlers for split mode
  const handleSelectLeftTerminal = useCallback((id: string) => {
    setCurrentPage('terminals')
    setActiveTerminal(id)
    setFocusedPane('primary')
  }, [setCurrentPage, setActiveTerminal, setFocusedPane])

  const handleSelectRightTerminal = useCallback((id: string) => {
    setCurrentPage('terminals')
    setSplitTerminalId(id)
    setFocusedPane('secondary')
  }, [setCurrentPage, setSplitTerminalId, setFocusedPane])

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

  // Check if there are no repos configured
  const hasNoRepos = useMemo(() => {
    if (!config) return false
    return Object.keys(config.repositories).length === 0
  }, [config])

  // Detect platform for keyboard shortcut display
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
  const shortcutKey = isMac ? '⌘N' : 'Ctrl+N'
  const skillsShortcutKey = isMac ? '⌘;' : 'Ctrl+;'
  const settingsShortcutKey = isMac ? '⌘,' : 'Ctrl+,'

  // Listen for Command+; keyboard shortcut to open skills
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ';') {
        e.preventDefault()
        setCurrentPage('skills')
        setActiveTerminal(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCurrentPage, setActiveTerminal])

  // Listen for Command+, keyboard shortcut to open settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setCurrentPage('config')
        setActiveTerminal(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCurrentPage, setActiveTerminal])

  return (
    <div
      className={`bg-black/30 backdrop-blur-md flex flex-col h-full relative z-10 ${isResizing ? '' : 'transition-all duration-300 ease-in-out'}`}
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
      <div className="px-3 pt-3 flex flex-col gap-1">
        {/* New agent button */}
        <button
          onClick={() => {
            const event = new CustomEvent('new-terminal')
            window.dispatchEvent(event)
          }}
          className="w-full flex items-center justify-center gap-2 px-2.5 py-2.5 text-sm font-medium text-text-secondary rounded-lg hover:bg-text-secondary/10 hover:text-white transition-all"
        >
          <Bot className="w-4 h-4" />
          <span>New agent</span>
          <span className="ml-auto text-xs opacity-50">{shortcutKey}</span>
        </button>

        {/* Skills button */}
        <button
          onClick={() => {
            setCurrentPage('skills')
            setActiveTerminal(null)
          }}
          className={`w-full flex items-center justify-center gap-2 px-2.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            currentPage === 'skills'
              ? 'bg-white/10 text-white'
              : 'text-text-secondary hover:bg-text-secondary/10 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Skills</span>
          <span className="ml-auto text-xs opacity-50">{skillsShortcutKey}</span>
        </button>

        {/* Settings button */}
        <button
          onClick={() => {
            setCurrentPage('config')
            setActiveTerminal(null)
          }}
          className={`w-full flex items-center justify-center gap-2 px-2.5 py-2.5 text-sm font-medium rounded-lg transition-all relative ${
            currentPage === 'config'
              ? 'bg-white/10 text-white'
              : hasNoRepos
                ? 'text-yellow hover:bg-yellow/10'
                : 'text-text-secondary hover:bg-text-secondary/10 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
          <span className="ml-auto text-xs opacity-50">{settingsShortcutKey}</span>
          {hasNoRepos && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow rounded-full flex items-center justify-center">
              <AlertTriangle className="w-2.5 h-2.5 text-black" />
            </span>
          )}
        </button>
      </div>

      {/* Mode toggle + Agents list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col">

        {/* Agents label - always in the same position */}
        <div className="px-2 pt-2 pb-1 flex items-center justify-between">
          <div className="text-xs text-text-secondary/50 uppercase tracking-wider">Agents</div>
          <span className={`text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded transition-opacity duration-150 ${
            isSplitMode && terminals.length > 0 ? 'text-text-secondary/40 opacity-100' : 'opacity-0'
          }`}>Left</span>
        </div>

        {terminals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm p-4 text-center">
            No agents yet. Click &quot;New agent&quot; to start.
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
              {WORKFLOW_GROUPS.map(({ key, label }) => (
                <WorkflowGroup
                  key={`left-${key}`}
                  groupKey={key}
                  label={label}
                  terminals={leftGroups[key]}
                  isCollapsed={collapsedGroups.has(key)}
                  onToggle={() => toggleGroup(key)}
                  activeTerminalId={focusedPane === 'primary' ? activeTerminalId : null}
                  splitTerminalId={null}
                  isSplitMode={false}
                  onSelectTerminal={handleSelectLeftTerminal}
                  colorMap={colorMap}
                  now={now}
                  draggable
                />
              ))}
              {terminals.filter(t => !rightPaneTerminalIds.includes(t.id)).length === 0 && (
                <div className="text-text-secondary/30 text-xs text-center py-3">
                  Drop agents here
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/[0.06] mx-2 my-2" />

            {/* RIGHT zone */}
            <div
              className={`flex flex-col gap-1 rounded-lg transition-colors ${dragOverZone === 'right' ? 'bg-accent/10' : ''}`}
              onDragOver={(e) => handleDragOverZone('right', e)}
              onDragLeave={() => setDragOverZone(null)}
              onDrop={(e) => handleDropOnZone('right', e)}
            >
              <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                <div className="text-xs text-text-secondary/50 uppercase tracking-wider">Agents</div>
                <span className="text-[10px] text-text-secondary/40 bg-white/[0.06] px-1.5 py-0.5 rounded">Right</span>
              </div>
              {WORKFLOW_GROUPS.map(({ key, label }) => (
                <WorkflowGroup
                  key={`right-${key}`}
                  groupKey={key}
                  label={label}
                  terminals={rightGroups[key]}
                  isCollapsed={collapsedGroups.has(key)}
                  onToggle={() => toggleGroup(key)}
                  activeTerminalId={focusedPane === 'secondary' ? splitTerminalId : null}
                  splitTerminalId={null}
                  isSplitMode={false}
                  onSelectTerminal={handleSelectRightTerminal}
                  colorMap={colorMap}
                  now={now}
                  draggable
                />
              ))}
              {rightPaneTerminalIds.length === 0 && (
                <div className="text-text-secondary/30 text-xs text-center py-3">
                  Drop agents here
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1">
            {WORKFLOW_GROUPS.map(({ key, label }) => (
              <WorkflowGroup
                key={key}
                groupKey={key}
                label={label}
                terminals={groups[key]}
                isCollapsed={collapsedGroups.has(key)}
                onToggle={() => toggleGroup(key)}
                activeTerminalId={activeTerminalId}
                splitTerminalId={splitTerminalId}
                isSplitMode={isSplitMode}
                onSelectTerminal={handleSelectTerminal}
                colorMap={colorMap}
                now={now}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Scripts section */}
      {scriptTerminals.length > 0 && (
        <>
          <div className="px-4 pt-2 pb-1">
            <div className="text-xs text-text-secondary/50 uppercase tracking-wider">Scripts</div>
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

      {/* Footer */}
      <div className="px-4 py-2 text-xs text-text-secondary flex items-center justify-start gap-2">
        <span className="opacity-60">v0.40.0</span>
        <span className="opacity-30">&bull;</span>
        <a
          href="https://xrequillart.github.io/magic-slash/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Docs
        </a>
        <span className="opacity-30">&bull;</span>
        <a
          href="https://xrequillart.github.io/magic-slash/documentation.html#changelog"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Changelog
        </a>
        <span className="opacity-30">&bull;</span>
        <a
          href="https://github.com/xrequillart/magic-slash"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          GitHub
        </a>
      </div>
    </div>
  )
}
