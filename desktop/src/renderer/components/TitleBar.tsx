import { useState, useEffect } from 'react'
import { Archive } from 'lucide-react'
import { useStore } from '../store'
import { canChangeAgentType, canCloseAgent, resolveAgentType } from './agent-info-sidebar/utils'
import { useTerminals } from '../hooks/useTerminals'
import type { AgentType } from '../../types'
import { useT } from '../i18n'

// Inline SVG components for left sidebar toggle icons
const LeftSidebarOpenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const LeftSidebarCloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Inline SVG components for right sidebar toggle icons (rotated 180deg)
const RightSidebarOpenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const RightSidebarCloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'rotate(180deg)' }}>
    <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export function TitleBar() {
  const t = useT()
  const { terminals, activeTerminalId, rightSidebar, leftSidebarVisible, toggleRightSidebar, toggleLeftSidebar, openCloseAgentModal, isSplitMode, splitTerminalId, focusedPane, isWideScreen, splitEnabled, splitActive, toggleSplitActive } = useStore()
  const { updateTerminalMetadata } = useTerminals()
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId)
  const splitTerminal = terminals.find((t) => t.id === splitTerminalId)

  // The agent the close button acts on is the one being INSPECTED, which in split
  // mode is whichever pane has focus — the same rule the info sidebar uses, so the
  // button and the panel never disagree about which agent is on screen.
  const inspectedTerminal = isSplitMode && focusedPane === 'secondary' ? splitTerminal : activeTerminal
  const closeableTerminal = inspectedTerminal && canCloseAgent(inspectedTerminal.metadata?.status, inspectedTerminal.metadata?.type)
    ? inspectedTerminal
    : null

  // The kind switcher is offered only while the agent has done nothing. After that the
  // status belongs to a workflow, and switching would strand it outside the list the
  // new kind offers — so the control disappears rather than being shown disabled:
  // there is nothing the user could do to bring it back.
  const switchableTerminal = inspectedTerminal && canChangeAgentType(inspectedTerminal.metadata?.status)
    ? inspectedTerminal
    : null
  const currentAgentType = resolveAgentType(inspectedTerminal?.metadata?.type)

  // ⌘W lives here rather than in the sidebar now that the button does: it used to be
  // gated on the info sidebar being open, which meant the shortcut silently did
  // nothing with the sidebar collapsed even though the agent was perfectly closeable.
  useEffect(() => {
    if (!closeableTerminal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'w' || !(e.metaKey || e.ctrlKey)) return
      // Ctrl+W inside a terminal is readline's delete-previous-word, and the terminal
      // is where this app spends most of its focus. A window-level handler that
      // preventDefaults it would take that keystroke away from the shell and put an
      // archive dialog in its place — so a chord aimed at xterm is left to xterm.
      // (`.xterm` is the class the library puts on the element it is opened into.)
      if (e.target instanceof Element && e.target.closest('.xterm')) return
      e.preventDefault()
      openCloseAgentModal({
        terminalId: closeableTerminal.id,
        terminalName: closeableTerminal.name,
      })
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeableTerminal, openCloseAgentModal])

  const splitToggleVisible = isWideScreen && splitEnabled && terminals.length >= 2
  const [showSplitToggle, setShowSplitToggle] = useState(splitToggleVisible)
  const [splitToggleExiting, setSplitToggleExiting] = useState(false)

  useEffect(() => {
    if (splitToggleVisible) {
      setShowSplitToggle(true)
      setSplitToggleExiting(false)
    } else if (showSplitToggle) {
      setSplitToggleExiting(true)
    }
  }, [splitToggleVisible])

  return (
    <div
      className="h-10 bg-surface-sunken select-none flex items-center justify-between px-3 relative"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side - Traffic lights space + Left sidebar toggle */}
      <div className="flex items-center gap-2">
        {/* Space for macOS traffic lights */}
        <div className="w-16 flex-shrink-0" />

        {/* Left sidebar toggle + Split view toggle */}
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
            <button
              onClick={() => toggleLeftSidebar()}
              className={`p-[5px] rounded-full bg-surface transition-colors ${
                leftSidebarVisible
                  ? 'text-ink'
                  : 'text-text-secondary hover:text-ink'
              }`}
              title={t('titlebar.toggleAgentsList')}
            >
              {leftSidebarVisible ? <LeftSidebarOpenIcon /> : <LeftSidebarCloseIcon />}
            </button>

            {/* Split view segmented toggle */}
            {showSplitToggle && (
              <div
                className={`relative grid grid-cols-2 bg-surface rounded-full p-px ${splitToggleExiting ? 'animate-slide-out' : 'animate-slide-in'}`}
                onAnimationEnd={() => {
                  if (splitToggleExiting) {
                    setShowSplitToggle(false)
                    setSplitToggleExiting(false)
                  }
                }}
              >
                <div className={`absolute top-px bottom-px left-px right-1/2 bg-surface-strong rounded-full transition-transform duration-200 ${
                  splitActive ? 'translate-x-full' : 'translate-x-0'
                }`} />
                <button
                  onClick={() => { if (splitActive) toggleSplitActive() }}
                  className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-200 text-center ${
                    !splitActive ? 'text-ink' : 'text-text-secondary/50 hover:text-text-secondary'
                  }`}
                  title={t('titlebar.normalViewTitle')}
                >
                  {t('titlebar.normalView')}
                </button>
                <button
                  onClick={() => { if (!splitActive) toggleSplitActive() }}
                  className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-200 text-center ${
                    splitActive ? 'text-ink' : 'text-text-secondary/50 hover:text-text-secondary'
                  }`}
                  title={t('titlebar.splitViewTitle')}
                >
                  {t('titlebar.splitView')}
                </button>
              </div>
            )}
        </div>
      </div>

      {/* Center - Active agent name(s). Absolutely positioned, so a width cap is
          the only thing keeping it clear of the left controls; 36% rather than 40%
          because the split toggle beside it is wider in French. */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm truncate max-w-[36%]">
        {isSplitMode && splitTerminal ? (
          <div className="flex items-center gap-2">
            <span className={focusedPane === 'primary' ? 'text-ink' : 'text-text-secondary/50'}>
              {activeTerminal?.metadata?.title || activeTerminal?.name}
            </span>
            <span className="text-text-secondary/30">|</span>
            <span className={focusedPane === 'secondary' ? 'text-ink' : 'text-text-secondary/50'}>
              {splitTerminal?.metadata?.title || splitTerminal?.name}
            </span>
          </div>
        ) : (
          <span className="text-text-secondary">
            {activeTerminal?.metadata?.title || activeTerminal?.name}
          </span>
        )}
      </div>

      {/* Right side - Sidebar toggle (only with at least one agent) */}
      {terminals.length > 0 && (
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Two segments rather than a dropdown, following the split-view toggle in the
              left group: two mutually exclusive values, both worth naming. */}
          {switchableTerminal && (
            <div className="flex items-center rounded-full bg-surface p-0.5">
              {(['coder', 'planner'] as AgentType[]).map(type => (
                <button
                  key={type}
                  onClick={() => updateTerminalMetadata(switchableTerminal.id, { type })}
                  className={`px-2 py-0.5 rounded-full text-[11px] transition-colors ${
                    currentAgentType === type
                      ? 'bg-surface-strong text-ink'
                      : 'text-text-secondary hover:text-ink'
                  }`}
                  title={t(type === 'coder' ? 'agentType.coderHint' : 'agentType.plannerHint')}
                >
                  {t(type === 'coder' ? 'agentType.coder' : 'agentType.planner')}
                </button>
              ))}
            </div>
          )}

          {/* Closing the agent is offered here, next to the sidebar toggle, because the
              info sidebar no longer has a header to carry it — and the action belongs
              to the agent, not to a panel that may be collapsed. */}
          {closeableTerminal && (
            <button
              onClick={() => openCloseAgentModal({
                terminalId: closeableTerminal.id,
                terminalName: closeableTerminal.name,
              })}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface text-[11px] text-text-secondary hover:text-ink transition-colors"
              title={`${t('agentInfo.closeAgent')} ⌘W`}
            >
              <Archive className="w-3.5 h-3.5 flex-shrink-0" />
              {t('agentInfo.closeAgent')}
            </button>
          )}
          <button
            onClick={() => toggleRightSidebar('info')}
            className={`p-[5px] rounded-full bg-surface transition-colors ${
              rightSidebar === 'info'
                ? 'text-ink'
                : 'text-text-secondary hover:text-ink'
            }`}
            title={t('titlebar.info')}
          >
            {rightSidebar === 'info' ? <RightSidebarOpenIcon /> : <RightSidebarCloseIcon />}
          </button>
        </div>
      )}
    </div>
  )
}
