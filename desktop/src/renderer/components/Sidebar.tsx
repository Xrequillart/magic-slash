import { useMemo, useState, useEffect, useCallback, memo } from 'react'
import { Bot, Settings, AlertTriangle, Check, Clock, XCircle, ChevronDown, ChevronLeft, Sparkles, X } from 'lucide-react'
import { useStore } from '../store'
import { useTerminals } from '../hooks/useTerminals'
import { useScriptRunner } from '../hooks/useScriptRunner'
import { useGroupedTerminals, type MultiProjectTerminal } from '../hooks/useGroupedTerminals'
import { getProjectColorMap } from '../utils/projectColors'
import type { TerminalState, TerminalInfo, ScriptTerminalInfo } from '../../types'

const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_DEFAULT_WIDTH = 300

const stateColors: Record<TerminalState, string> = {
  idle: 'text-text-secondary',
  working: 'text-accent',
  waiting: 'text-yellow',
  completed: 'text-green',
  error: 'text-red',
}

const stateBgColors: Record<TerminalState, string> = {
  idle: 'bg-text-secondary/20',
  working: 'bg-accent/20',
  waiting: 'bg-yellow/20',
  completed: 'bg-green/20',
  error: 'bg-red/20',
}

const stateHoverBgColors: Record<TerminalState, string> = {
  idle: 'hover:bg-text-secondary/10',
  working: 'hover:bg-accent/10',
  waiting: 'hover:bg-yellow/10',
  completed: 'hover:bg-green/10',
  error: 'hover:bg-red/10',
}

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

interface AgentItemProps {
  terminal: TerminalInfo
  isActive: boolean
  onSelect: () => void
  now: number
}

const AgentItem = memo(function AgentItem({ terminal, isActive, onSelect, now: _now }: AgentItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-all rounded-lg
        ${isActive
          ? `${stateBgColors[terminal.state]} text-white`
          : `text-text-secondary ${stateHoverBgColors[terminal.state]} hover:text-white`
        }
      `}
    >
      <div className="flex-1 text-left min-w-0">
        <div className="truncate font-medium">{terminal.metadata?.title || terminal.name}</div>
      </div>
      <StatusBadge state={terminal.state} />
    </button>
  )
})

// Agent item with colored dots for multi-project
interface MultiProjectAgentItemProps {
  terminal: MultiProjectTerminal
  isActive: boolean
  onSelect: () => void
  colorMap: Record<string, string>
  now: number
}

const MultiProjectAgentItem = memo(function MultiProjectAgentItem({ terminal, isActive, onSelect, colorMap, now: _now }: MultiProjectAgentItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-all rounded-lg
        ${isActive
          ? `${stateBgColors[terminal.state]} text-white`
          : `text-text-secondary ${stateHoverBgColors[terminal.state]} hover:text-white`
        }
      `}
    >
      <div className="flex-1 text-left min-w-0">
        <div className="truncate font-medium">{terminal.metadata?.title || terminal.name}</div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {terminal.matchingProjects.map((project) => (
          <ProjectDot
            key={project}
            color={colorMap[project]}
            title={project}
          />
        ))}
      </div>
      <StatusBadge state={terminal.state} />
    </button>
  )
})

// Multi-project section
interface MultiProjectGroupProps {
  terminals: MultiProjectTerminal[]
  colorMap: Record<string, string>
  isCollapsed: boolean
  onToggle: () => void
  activeTerminalId: string | null
  onSelectTerminal: (id: string) => void
  now: number
}

const MultiProjectGroup = memo(function MultiProjectGroup({
  terminals,
  colorMap,
  isCollapsed,
  onToggle,
  activeTerminalId,
  onSelectTerminal,
  now,
}: MultiProjectGroupProps) {
  if (terminals.length === 0) return null

  return (
    <div className="flex flex-col">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary/50 hover:text-white transition-colors w-full"
      >
        <span className="font-medium truncate">Multi-projects</span>
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
            <MultiProjectAgentItem
              key={terminal.id}
              terminal={terminal}
              isActive={activeTerminalId === terminal.id}
              onSelect={() => onSelectTerminal(terminal.id)}
              colorMap={colorMap}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  )
})

interface ProjectGroupProps {
  name: string
  color: string
  terminals: TerminalInfo[]
  isCollapsed: boolean
  onToggle: () => void
  activeTerminalId: string | null
  onSelectTerminal: (id: string) => void
  now: number
}

const ProjectGroup = memo(function ProjectGroup({
  name,
  color,
  terminals,
  isCollapsed,
  onToggle,
  activeTerminalId,
  onSelectTerminal,
  now
}: ProjectGroupProps) {
  const hasAgents = terminals.length >= 1

  return (
    <div className="flex flex-col">
      {/* Group header */}
      {hasAgents ? (
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary/50 hover:text-white transition-colors w-full"
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium truncate">{name}</span>
          <span className="ml-auto">
            {isCollapsed ? (
              <ChevronLeft className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-secondary/50 w-full">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium truncate">{name}</span>
        </div>
      )}

      {/* Agent list */}
      {hasAgents && !isCollapsed && (
        <div className="flex flex-col gap-1">
          {terminals.map(terminal => (
            <AgentItem
              key={terminal.id}
              terminal={terminal}
              isActive={activeTerminalId === terminal.id}
              onSelect={() => onSelectTerminal(terminal.id)}
              now={now}
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
  const { currentPage, setCurrentPage, terminals, activeTerminalId, config, leftSidebarVisible } = useStore()
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

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  // Group terminals by project (shared hook)
  const { noProject, multiProject, byProject, projectNames } = useGroupedTerminals()

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

  const handleSelectTerminal = useCallback((id: string) => {
    setCurrentPage('terminals')
    setActiveTerminal(id)
  }, [setCurrentPage, setActiveTerminal])

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

      {/* Agents section header */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-xs text-text-secondary/50 uppercase tracking-wider">Agents</div>
      </div>

      {/* Agents list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-2">
        {terminals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-text-secondary text-sm p-4 text-center">
            No agents yet. Click "New agent" to start.
          </div>
        ) : (
          <>
            {/* Agents without a project */}
            {noProject.length > 0 && (
              <div className="flex flex-col gap-1">
                {noProject.map(terminal => (
                  <AgentItem
                    key={terminal.id}
                    terminal={terminal}
                    isActive={activeTerminalId === terminal.id}
                    onSelect={() => handleSelectTerminal(terminal.id)}
                    now={now}
                  />
                ))}
              </div>
            )}

            {/* Multi-project agents section */}
            <MultiProjectGroup
              terminals={multiProject}
              colorMap={colorMap}
              isCollapsed={collapsedGroups.has('__multi_project__')}
              onToggle={() => toggleGroup('__multi_project__')}
              activeTerminalId={activeTerminalId}
              onSelectTerminal={handleSelectTerminal}
              now={now}
            />

            {/* Agents by project */}
            {Object.entries(byProject).map(([projectName, projectTerminals]) => (
              <ProjectGroup
                key={projectName}
                name={projectName}
                color={colorMap[projectName]}
                terminals={projectTerminals}
                isCollapsed={collapsedGroups.has(projectName)}
                onToggle={() => toggleGroup(projectName)}
                activeTerminalId={activeTerminalId}
                onSelectTerminal={handleSelectTerminal}
                now={now}
              />
            ))}
          </>
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
        <span className="opacity-60">v0.23.0</span>
        <span className="opacity-30">•</span>
        <a
          href="https://xrequillart.github.io/magic-slash/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
        >
          Docs
        </a>
        <span className="opacity-30">•</span>
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
