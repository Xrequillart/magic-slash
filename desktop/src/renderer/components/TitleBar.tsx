import { useState, useEffect } from 'react'
import { useStore } from '../store'

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
  const { currentPage, terminals, activeTerminalId, rightSidebar, leftSidebarVisible, toggleRightSidebar, toggleLeftSidebar, isSplitMode, splitTerminalId, focusedPane, isWideScreen, splitEnabled, splitActive, toggleSplitActive } = useStore()
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
      className="h-10 bg-black/30 backdrop-blur-md select-none flex items-center justify-between px-3 relative"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side - Traffic lights space + Left sidebar toggle */}
      <div className="flex items-center gap-2">
        {/* Space for macOS traffic lights */}
        <div className="w-16 flex-shrink-0" />

        {/* Left sidebar toggle + Split view toggle */}
        {(currentPage === 'terminals' || currentPage === 'config' || currentPage === 'skills') && (
          <div
            className="flex items-center gap-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => toggleLeftSidebar()}
              className={`p-[5px] rounded-full bg-white/[0.06] transition-colors ${
                leftSidebarVisible
                  ? 'text-white'
                  : 'text-text-secondary hover:text-white'
              }`}
              title="Toggle agents list (⌘B)"
            >
              {leftSidebarVisible ? <LeftSidebarOpenIcon /> : <LeftSidebarCloseIcon />}
            </button>

            {/* Split view segmented toggle */}
            {showSplitToggle && (
              <div
                className={`relative grid grid-cols-2 bg-white/[0.06] rounded-full p-px ${splitToggleExiting ? 'animate-slide-out' : 'animate-slide-in'}`}
                onAnimationEnd={() => {
                  if (splitToggleExiting) {
                    setShowSplitToggle(false)
                    setSplitToggleExiting(false)
                  }
                }}
              >
                <div className={`absolute top-px bottom-px left-px right-1/2 bg-white/[0.12] rounded-full transition-transform duration-200 ${
                  splitActive ? 'translate-x-full' : 'translate-x-0'
                }`} />
                <button
                  onClick={() => { if (splitActive) toggleSplitActive() }}
                  className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-200 text-center ${
                    !splitActive ? 'text-white' : 'text-text-secondary/50 hover:text-text-secondary'
                  }`}
                  title="Normal view (⌘/)"
                >
                  Normal
                </button>
                <button
                  onClick={() => { if (!splitActive) toggleSplitActive() }}
                  className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-200 text-center ${
                    splitActive ? 'text-white' : 'text-text-secondary/50 hover:text-text-secondary'
                  }`}
                  title="Split view (⌘/)"
                >
                  Split view
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center - Active agent name(s) */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm truncate max-w-[40%]">
        {currentPage === 'terminals' && isSplitMode && splitTerminal ? (
          <div className="flex items-center gap-2">
            <span className={focusedPane === 'primary' ? 'text-white' : 'text-text-secondary/50'}>
              {activeTerminal?.metadata?.title || activeTerminal?.name}
            </span>
            <span className="text-text-secondary/30">|</span>
            <span className={focusedPane === 'secondary' ? 'text-white' : 'text-text-secondary/50'}>
              {splitTerminal?.metadata?.title || splitTerminal?.name}
            </span>
          </div>
        ) : (
          <span className="text-text-secondary">
            {currentPage === 'terminals' && (activeTerminal?.metadata?.title || activeTerminal?.name)}
          </span>
        )}
      </div>

      {/* Right side - Sidebar toggle (only on agents page with at least one agent) */}
      {currentPage === 'terminals' && terminals.length > 0 && (
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => toggleRightSidebar('info')}
            className={`p-[5px] rounded-full bg-white/[0.06] transition-colors ${
              rightSidebar === 'info'
                ? 'text-white'
                : 'text-text-secondary hover:text-white'
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
