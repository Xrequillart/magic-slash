import { useEffect, useCallback, useRef, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useStore } from './store'
import { useConfig } from './hooks/useConfig'
import { useTerminals } from './hooks/useTerminals'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { AgentInfoSidebar } from './components/AgentInfoSidebar'
import { ToastContainer } from './components/Toast'
import { UpdateOverlay } from './components/UpdateOverlay'
import { WhatsNewModal } from './components/WhatsNewModal'
import { ConfigPage } from './pages/Config'
import { TerminalsPage } from './pages/Terminals'
import { SkillsPage } from './pages/Skills'
import { ErrorBoundary } from './components/ErrorBoundary'

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-transparent">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-3 border-white/20 border-t-accent rounded-full animate-spin" />
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-transparent">
      <div className="text-center">
        <p className="text-red mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

export function App() {
  const { currentPage, closeAgentModal, closeCloseAgentModal, terminals, activeTerminalId, toggleRightSidebar, toggleLeftSidebar, config, noReposWarningShown, setNoReposWarningShown, setCurrentPage } = useStore()
  const { configLoading, configError, loadConfig } = useConfig()
  const { killTerminal } = useTerminals()
  const confirmCloseButtonRef = useRef<HTMLButtonElement>(null)
  const [showNoReposModal, setShowNoReposModal] = useState(false)

  // Check if there are no repos configured
  const hasNoRepos = useMemo(() => {
    if (!config) return false
    return Object.keys(config.repositories).length === 0
  }, [config])

  // Show warning modal on first app open if no repos configured
  useEffect(() => {
    if (!configLoading && hasNoRepos && !noReposWarningShown) {
      setShowNoReposModal(true)
      setNoReposWarningShown(true)
    }
  }, [configLoading, hasNoRepos, noReposWarningShown, setNoReposWarningShown])

  // Handle going to configuration
  const handleGoToConfig = useCallback(() => {
    setShowNoReposModal(false)
    setCurrentPage('config')
  }, [setCurrentPage])

  // Handle closing an agent
  const handleCloseAgent = useCallback(async () => {
    if (closeAgentModal) {
      const isLastAgent = terminals.length === 1
      await killTerminal(closeAgentModal.terminalId)
      closeCloseAgentModal()
      if (isLastAgent) {
        toggleRightSidebar('info')
      }
    }
  }, [closeAgentModal, terminals.length, killTerminal, closeCloseAgentModal, toggleRightSidebar])

  // Focus confirm button and listen for Enter/Escape when close agent modal is shown
  useEffect(() => {
    if (!closeAgentModal) return

    setTimeout(() => confirmCloseButtonRef.current?.focus(), 0)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCloseAgent()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeCloseAgentModal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeAgentModal, handleCloseAgent, closeCloseAgentModal])

  // Prevent default Electron behavior of navigating to dropped files
  useEffect(() => {
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation() }
    document.addEventListener('dragover', prevent)
    document.addEventListener('drop', prevent)
    return () => {
      document.removeEventListener('dragover', prevent)
      document.removeEventListener('drop', prevent)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  // Keyboard shortcut: Cmd+B to toggle left sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        toggleLeftSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentPage, toggleLeftSidebar])

  if (configLoading) {
    return <LoadingScreen />
  }

  if (configError) {
    return <ErrorScreen error={configError} />
  }

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden relative">
          {/* Config Page */}
          <div className={`absolute inset-0 overflow-auto ${currentPage === 'config' ? 'block' : 'hidden'}`}>
            <div className="max-w-5xl mx-auto p-6 h-full">
              <ConfigPage />
            </div>
          </div>

          {/* Skills Page */}
          <div className={`absolute inset-0 overflow-auto ${currentPage === 'skills' ? 'block' : 'hidden'}`}>
            <div className="max-w-5xl mx-auto p-6 h-full">
              <SkillsPage />
            </div>
          </div>

          {/* Terminals Page - Always mounted to preserve terminal state */}
          <div className={`absolute inset-0 ${currentPage === 'terminals' ? 'block' : 'hidden'}`}>
            <ErrorBoundary fallbackLabel="Terminal error">
              <TerminalsPage />
            </ErrorBoundary>
          </div>
        </main>

        {/* Right Sidebar - Only on Agents page, hidden when viewing a script terminal */}
        {currentPage === 'terminals' && !activeTerminalId?.startsWith('script-') && (
          <ErrorBoundary fallbackLabel="Sidebar error">
            <AgentInfoSidebar />
          </ErrorBoundary>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Global Close Agent Confirmation Modal */}
      {closeAgentModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-backdrop"
          onClick={closeCloseAgentModal}
        >
          <div
            className="bg-bg-secondary border border-white/10 rounded-xl mx-4 max-w-sm backdrop-blur-2xl animate-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="p-2 bg-yellow/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow" />
              </div>
              <h3 className="text-base font-semibold">Close this agent?</h3>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-text-secondary text-sm mb-4">
                Before closing, please verify that your Pull Request has been merged on GitHub.
              </p>

              {/* Show all PR links from repositoryMetadata */}
              {closeAgentModal.repositoryMetadata && Object.entries(closeAgentModal.repositoryMetadata).length > 0 && (
                <div className="space-y-2 mb-4">
                  {Object.entries(closeAgentModal.repositoryMetadata).map(([repoPath, repoMeta]) => repoMeta.prUrl && (
                    <button
                      key={repoPath}
                      onClick={() => window.electronAPI.shell.openExternal(repoMeta.prUrl!)}
                      className="block w-full text-center px-3 py-2 text-xs font-medium text-purple border border-purple/20 rounded-lg hover:bg-purple/10 transition-all cursor-pointer"
                    >
                      {Object.keys(closeAgentModal.repositoryMetadata!).length > 1
                        ? `Open PR - ${repoPath.split('/').pop()}`
                        : 'Open PR on GitHub'}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={closeCloseAgentModal}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  ref={confirmCloseButtonRef}
                  onClick={handleCloseAgent}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all focus:outline-none"
                >
                  Yes, close agent
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Repos Warning Modal */}
      {showNoReposModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-modal-backdrop">
          <div className="bg-bg-secondary border border-white/10 rounded-xl mx-4 max-w-md backdrop-blur-2xl animate-modal-content">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="p-2 bg-yellow/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow" />
              </div>
              <h3 className="text-base font-semibold">Configuration required</h3>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-text-secondary text-sm mb-5">
                No repository is configured. To use Magic Slash, you must first add at least one repository in the configuration.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNoReposModal(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                >
                  Later
                </button>
                <button
                  onClick={handleGoToConfig}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-yellow border border-yellow/20 rounded-lg hover:bg-yellow/10 transition-all"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* What's New Modal (after auto-update) */}
      <WhatsNewModal />

      {/* Update Overlay */}
      <UpdateOverlay />
    </div>
  )
}
