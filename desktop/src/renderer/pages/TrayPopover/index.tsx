import { useState, useEffect, useCallback } from 'react'
import { Settings, Power } from 'lucide-react'

interface AgentInfo {
  id: string
  name: string
  state: string
  ticketId: string
  title: string
  createdAt: number
}

function stateLabel(state: string): string {
  switch (state) {
    case 'working': return 'Working'
    case 'waiting': return 'Waiting for input'
    case 'idle': return 'Idle'
    case 'completed': return 'Completed'
    case 'error': return 'Error'
    default: return state
  }
}

function stateColor(state: string): string {
  switch (state) {
    case 'working': return 'text-amber-400'
    case 'waiting': return 'text-red-400'
    case 'idle': return 'text-emerald-400'
    case 'completed': return 'text-emerald-400'
    case 'error': return 'text-red-400'
    default: return 'text-zinc-400'
  }
}

function stateDot(state: string): string {
  switch (state) {
    case 'working': return 'bg-amber-400'
    case 'waiting': return 'bg-red-400'
    case 'idle': return 'bg-emerald-400'
    case 'completed': return 'bg-emerald-400'
    case 'error': return 'bg-red-400'
    default: return 'bg-zinc-400'
  }
}

function elapsedTime(createdAt: number): string {
  const seconds = Math.floor((Date.now() - createdAt) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

export function TrayPopover() {
  const [agents, setAgents] = useState<AgentInfo[]>([])

  const loadAgents = useCallback(async () => {
    try {
      const data = await window.electronAPI.tray.getAgents()
      setAgents(data)
    } catch {
      // Silently ignore errors
    }
  }, [])

  useEffect(() => {
    loadAgents()
    const interval = setInterval(loadAgents, 2000)
    return () => clearInterval(interval)
  }, [loadAgents])

  const handleFocusAgent = (id: string) => {
    window.electronAPI.tray.focusAgent(id)
  }

  const handleOpenSettings = () => {
    window.electronAPI.tray.openSettings()
  }

  const handleQuit = () => {
    window.electronAPI.tray.quit()
  }

  return (
    <div className="w-[320px] bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">Magic Slash</span>
          {agents.length > 0 && (
            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-medium rounded">
              {agents.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenSettings}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleQuit}
            className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Agent List */}
      <div className="max-h-[360px] overflow-y-auto">
        {agents.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="text-zinc-500 text-sm">No active agents</div>
          </div>
        ) : (
          <div className="py-1">
            {agents.map(agent => (
              <button
                key={agent.id}
                onClick={() => handleFocusAgent(agent.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${stateDot(agent.state)}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">
                    {agent.ticketId ? (
                      <><span className="text-zinc-400">{agent.ticketId}</span> {agent.title}</>
                    ) : (
                      agent.title || agent.name
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] ${stateColor(agent.state)}`}>
                      {stateLabel(agent.state)}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {elapsedTime(agent.createdAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
