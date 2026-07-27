import { useState, useEffect } from 'react'
import { useStore } from '../store'
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
  const { terminals, activeTerminalId, rightSidebar, leftSidebarVisible, toggleRightSidebar, toggleLeftSidebar, isSplitMode, splitTerminalId, focusedPane, isWideScreen, splitEnabled, splitActive, toggleSplitActive } = useStore()
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId)
  const splitTerminal = terminals.find((t) => t.id === splitTerminalId)

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
              title="Toggle agents list (⌘B)"
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
                  title="Normal view (⌘/)"
                >
                  {t('titlebar.normalView')}
                </button>
                <button
                  onClick={() => { if (!splitActive) toggleSplitActive() }}
                  className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-200 text-center ${
                    splitActive ? 'text-ink' : 'text-text-secondary/50 hover:text-text-secondary'
                  }`}
                  title="Split view (⌘/)"
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
          <button
            onClick={() => toggleRightSidebar('info')}
            className={`p-[5px] rounded-full bg-surface transition-colors ${
              rightSidebar === 'info'
                ? 'text-ink'
                : 'text-text-secondary hover:text-ink'
            }`}
            title="Info"
          >
            {rightSidebar === 'info' ? <RightSidebarOpenIcon /> : <RightSidebarCloseIcon />}
          </button>
        </div>
      )}
    </div>
  )
}
