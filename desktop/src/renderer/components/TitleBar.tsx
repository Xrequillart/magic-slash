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
  const { currentPage, terminals, activeTerminalId, rightSidebar, leftSidebarVisible, toggleRightSidebar, toggleLeftSidebar } = useStore()
  const activeTerminal = terminals.find((t) => t.id === activeTerminalId)

  return (
    <div
      className="h-10 bg-black/30 backdrop-blur-md select-none flex items-center justify-between px-3 relative"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side - Traffic lights space + Left sidebar toggle */}
      <div className="flex items-center gap-2">
        {/* Space for macOS traffic lights */}
        <div className="w-16 flex-shrink-0" />

        {/* Left sidebar toggle */}
        {(currentPage === 'terminals' || currentPage === 'config' || currentPage === 'skills') && (
          <div
            className="flex items-center gap-1"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <button
              onClick={() => toggleLeftSidebar()}
              className={`p-2 rounded-lg transition-colors ${
                leftSidebarVisible
                  ? 'text-white'
                  : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
              }`}
              title="Toggle agents list (⌘B)"
            >
              {leftSidebarVisible ? <LeftSidebarOpenIcon /> : <LeftSidebarCloseIcon />}
            </button>
          </div>
        )}
      </div>

      {/* Center - Active agent name */}
      <div className="absolute left-1/2 -translate-x-1/2 text-sm text-text-secondary truncate max-w-[40%]">
        {currentPage === 'terminals' && (activeTerminal?.metadata?.title || activeTerminal?.name)}
      </div>

      {/* Right side - Sidebar toggle (only on agents page with at least one agent) */}
      {currentPage === 'terminals' && terminals.length > 0 && (
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => toggleRightSidebar('info')}
            className={`p-2 rounded-lg transition-colors ${
              rightSidebar === 'info'
                ? 'text-white'
                : 'text-text-secondary hover:text-white hover:bg-bg-tertiary'
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
