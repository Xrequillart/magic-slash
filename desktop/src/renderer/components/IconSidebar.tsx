import { Bot, Settings, Circle, AlertTriangle, Sparkles } from 'lucide-react'
import { useStore } from '../store'
import { stateColorsIcon as stateColors, stateBgColorsIcon as stateBgColors } from '../utils/stateColors'
import { useMemo } from 'react'

export function IconSidebar() {
  const { currentPage, setCurrentPage, terminals, iconSidebarVisible, config } = useStore()

  // Check if there are no repos configured
  const hasNoRepos = useMemo(() => {
    if (!config) return false
    return Object.keys(config.repositories).length === 0
  }, [config])

  if (!iconSidebarVisible) {
    return null
  }

  // Build status dots array
  const statusDots = terminals.map(t => ({
    state: t.state,
    color: stateColors[t.state] || 'text-white'
  }))

  return (
    <div className="w-14 bg-bg-secondary border-r border-border flex flex-col items-center py-2 gap-2">
      {/* Agents button with status dots inside */}
      <button
        onClick={() => setCurrentPage('terminals')}
        className={`w-10 flex flex-col items-center gap-1.5 py-2 rounded-lg transition-colors ${
          currentPage === 'terminals'
            ? 'text-purple bg-purple/20'
            : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
        }`}
        title="Agents"
      >
        <Bot className="w-5 h-5" />

        {/* Status dots displayed vertically inside the button */}
        {statusDots.length > 0 && (
          <div className="flex flex-col items-center gap-1">
            {statusDots.map((dot, i) => (
              <span
                key={i}
                className={`w-4 h-4 flex items-center justify-center rounded-sm ${stateBgColors[dot.state] || 'bg-white/20'}`}
              >
                {dot.state === 'working' ? (
                  <span className="loader-spinner-small" />
                ) : (
                  <Circle className={`w-2 h-2 fill-current ${dot.color}`} />
                )}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Skills button */}
      <button
        onClick={() => setCurrentPage('skills')}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          currentPage === 'skills'
            ? 'text-accent bg-accent/20'
            : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
        }`}
        title="Skills"
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Spacer to push Configuration to bottom */}
      <div className="flex-1" />

      {/* Configuration button */}
      <button
        onClick={() => setCurrentPage('config')}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors relative ${
          hasNoRepos ? 'ring-2 ring-yellow' : ''
        } ${
          currentPage === 'config'
            ? 'text-accent bg-accent/20'
            : hasNoRepos
              ? 'text-yellow hover:bg-yellow/10'
              : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
        }`}
        title="Configuration"
      >
        <Settings className="w-5 h-5" />
        {hasNoRepos && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow rounded-full flex items-center justify-center">
            <AlertTriangle className="w-2.5 h-2.5 text-black" />
          </span>
        )}
      </button>

      {/* Keyboard shortcut hint */}
      <span className="mt-2 text-[10px] text-text-secondary/50">⌘B</span>
    </div>
  )
}
