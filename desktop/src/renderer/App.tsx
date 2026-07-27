import { useEffect, useCallback, useRef, useMemo, useState } from 'react'
import { AlertTriangle, RotateCcw, FolderOpen } from 'lucide-react'
import type { InvalidRepo } from '../preload'
import { useStore } from './store'
import { useConfig } from './hooks/useConfig'
import { useTerminals } from './hooks/useTerminals'
import { useGroupedTerminals } from './hooks/useGroupedTerminals'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { AgentInfoSidebar } from './components/AgentInfoSidebar'
import { ToastContainer, showToast } from './components/Toast'
import { VSCodeIcon } from './components/agent-info-sidebar/icons'
import { UpdateOverlay } from './components/UpdateOverlay'
import { WhatsNewModal } from './components/WhatsNewModal'
import { ConfigPage } from './pages/Config'
import { TerminalsPage } from './pages/Terminals'
import { SkillsPage } from './pages/Skills'
import { HistoryPage } from './pages/History'
import { DashboardPage } from './pages/Dashboard'
import { PageModal } from './components/PageModal'
import { LiveIndicator } from './components/LiveIndicator'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProfileOnboardingWizard } from './components/ProfileOnboardingWizard'
import { useWindowSplitMode } from './hooks/useWindowSplitMode'
import FilePreviewPanel from './components/FilePreviewPanel'
import { useT, type MessageKey } from './i18n'

function LoadingScreen() {
  const t = useT()
  return (
    <div className="flex items-center justify-center h-screen bg-transparent">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-3 border-line-strong border-t-accent rounded-full animate-spin" />
        <p className="text-ink/60">{t('common.loading')}</p>
      </div>
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  const t = useT()
  return (
    <div className="flex items-center justify-center h-screen bg-transparent">
      <div className="text-center">
        <p className="text-red mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-on-brand rounded-lg transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  )
}

export function App() {
  const t = useT()
  const { closeAgentModal, closeCloseAgentModal, terminals, activeTerminalId, setActiveTerminal, rightPaneTerminalIds, toggleRightSidebar, toggleLeftSidebar, toggleSplitActive, isWideScreen, splitEnabled, config, setConfig, noReposWarningShown, setNoReposWarningShown, activeModal, openSettingsModal, closeModal } = useStore()
  const { configLoading, configError, loadConfig } = useConfig()
  const { killTerminal, launchClaudeTerminal } = useTerminals()
  const { flatVisualOrder } = useGroupedTerminals()
  useWindowSplitMode()
  const confirmCloseButtonRef = useRef<HTMLButtonElement>(null)
  const [showNoReposModal, setShowNoReposModal] = useState(false)
  const [showProfileWizard, setShowProfileWizard] = useState(false)
  const didLandRef = useRef(false)

  // Landing page: stay on the agents page and select the topmost agent of the
  // sidebar list, so the app never opens on an empty screen. Runs once, only
  // while nothing is selected yet, so it never overrides a session-restored
  // selection nor the user's own navigation. Right-pane agents are skipped —
  // the active terminal always belongs to the left pane.
  useEffect(() => {
    if (didLandRef.current) return
    if (useStore.getState().activeTerminalId) {
      didLandRef.current = true
      return
    }
    const first = flatVisualOrder.find((t) => !rightPaneTerminalIds.includes(t.id))
    if (!first) return
    didLandRef.current = true
    setActiveTerminal(first.id)
  }, [flatVisualOrder, rightPaneTerminalIds, setActiveTerminal])

  // Check if user profile exists on mount
  useEffect(() => {
    if (configLoading) return
    window.electronAPI.profile.get().then((profile) => {
      if (!profile) {
        setShowProfileWizard(true)
      }
    }).catch(() => {})
  }, [configLoading])

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
    openSettingsModal('repositories')
  }, [openSettingsModal])

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

  // Listen for tray:focusAgent IPC events
  useEffect(() => {
    const unsubscribe = window.electronAPI.tray.onFocusAgent((data) => {
      const { setActiveTerminal, closeModal } = useStore.getState()
      closeModal()
      setActiveTerminal(data.id)
    })
    return () => { unsubscribe() }
  }, [])

  // Listen for tray:openSettings IPC events
  useEffect(() => {
    const unsubscribe = window.electronAPI.tray.onOpenSettings(() => {
      useStore.getState().openSettingsModal()
    })
    return () => { unsubscribe() }
  }, [])

  // Reset the shared hash route on close so the next open lands on the modal's
  // home rather than a stale sub-page. Both Settings (#/repo/<name>) and Skills
  // (#/skill/<name>, #/new, #/repo-skill/<path>) route off window.location.hash.
  const handleCloseModal = useCallback(() => {
    closeModal()
    if (window.location.hash && window.location.hash !== '#/') {
      window.location.hash = '#/'
    }
  }, [closeModal])

  // Listen for quicklaunch:dispatch IPC events
  useEffect(() => {
    const unsubscribe = window.electronAPI.quickLaunch.onDispatch(async (data) => {
      const prompt = data.ticketId // contains the raw input text
      const store = useStore.getState()
      store.closeModal()

      // Find first repo to use as cwd
      const repos = store.config?.repositories || {}
      const firstRepo = Object.values(repos)[0]
      const cwd = firstRepo?.path || '~/Documents'

      // Name the agent "Claude N" like Cmd+N does
      const count = store.terminals.length + 1
      const agentName = `Claude ${count}`

      // Launch agent with the prompt passed directly as a CLI argument
      await launchClaudeTerminal(agentName, cwd, prompt)
    })
    return () => { unsubscribe() }
  }, [launchClaudeTerminal])

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

  // Listen for config validation errors from main process
  useEffect(() => {
    const unsubscribe = window.electronAPI.config.onValidationErrors((data) => {
      const count = data.errors.length
      showToast(
        t(count > 1 ? 'toast.invalidConfig.other' : 'toast.invalidConfig.one', { count }),
        'error',
        {
          persistent: true,
          actions: [
            {
              label: t('toast.resetToDefaults'),
              icon: <RotateCcw className="w-3.5 h-3.5" />,
              onClick: async () => {
                await window.electronAPI.config.repair()
                loadConfig()
                showToast(t('toast.configRepaired'), 'success')
              },
            },
            {
              label: t('toast.openInVSCode'),
              icon: <VSCodeIcon className="w-3.5 h-3.5" />,
              onClick: () => {
                window.electronAPI.shell.openInVSCode(data.configPath)
              },
            },
          ],
        }
      )
    })
    return () => { unsubscribe() }
  }, [loadConfig, t])

  // Surface configured repositories whose folder is missing or is not a git repo,
  // with a one-click "re-point folder" action. Runs on launch (initial fetch +
  // the main-process 'repos:invalid' event) so invalid paths are caught early.
  useEffect(() => {
    const shownRef = new Set<string>()

    const repointFolder = async (name: string) => {
      const folder = await window.electronAPI.dialog.openFolder()
      if (!folder) return
      try {
        await window.electronAPI.config.updateRepository(name, { path: folder })
        loadConfig()
        showToast(t('toast.repoRepointed', { name }), 'success')
      } catch (err) {
        showToast(err instanceof Error ? err.message : t('toast.repoRepointFailed', { name }), 'error')
      }
    }

    const surface = (repos: InvalidRepo[]) => {
      for (const repo of repos) {
        // A team repo not yet bound to a local folder is an expected state,
        // surfaced gently in Settings — don't nag with a persistent error toast.
        if (repo.reason === 'no-local-path') continue
        if (shownRef.has(repo.name)) continue
        shownRef.add(repo.name)
        const key: MessageKey = repo.reason === 'missing'
          ? 'toast.repoInvalidMissing'
          : 'toast.repoInvalidNotGit'
        showToast(t(key, { name: repo.name, path: repo.path }), 'error', {
          persistent: true,
          actions: [
            {
              label: t('toast.repointFolder'),
              icon: <FolderOpen className="w-3.5 h-3.5" />,
              onClick: () => repointFolder(repo.name),
            },
          ],
        })
      }
    }

    window.electronAPI.config.getInvalidRepos().then(surface).catch(() => {})
    const unsubscribe = window.electronAPI.config.onInvalidRepos(surface)
    return () => { unsubscribe() }
  }, [loadConfig])

  // A write-through to the cloud failed: the main process already re-synced the
  // caches from the DB, so the latest change may not have been saved. Tell the
  // user, and refresh the local config view so it reflects the re-synced state.
  useEffect(() => {
    const KIND_KEYS: Record<'config' | 'agents' | 'history', MessageKey> = {
      config: 'toast.cloudWriteKind.config',
      agents: 'toast.cloudWriteKind.agents',
      history: 'toast.cloudWriteKind.history',
    }
    const unsubscribe = window.electronAPI.connectivity.onWriteError(({ kind }) => {
      showToast(t('toast.cloudWriteFailed', { kind: t(KIND_KEYS[kind]) }), 'error')
      if (kind === 'config') loadConfig()
    })
    return () => { unsubscribe() }
  }, [loadConfig])

  // A setting or a repository was changed elsewhere — the web app, or this
  // account on another machine — and the main process adopted it. The new config
  // comes with the event, so this replaces the store copy rather than re-fetching.
  // The settings pages read from `config`, so they follow on their own.
  useEffect(() => {
    const unsubscribe = window.electronAPI.config.onChanged((next) => {
      setConfig(next)
    })
    return () => { unsubscribe() }
  }, [setConfig])

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
  }, [toggleLeftSidebar])

  // Keyboard shortcut: Cmd+/ to toggle split view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        if (isWideScreen && splitEnabled && terminals.length >= 2) {
          e.preventDefault()
          toggleSplitActive()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isWideScreen, splitEnabled, terminals.length, toggleSplitActive])

  if (configLoading) {
    return <LoadingScreen />
  }

  if (configError) {
    return <ErrorScreen error={configError} />
  }

  return (
    <div className="flex flex-col h-screen text-ink overflow-hidden">
      {/* Title Bar */}
      <TitleBar />

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content — Agents is the only page; everything else is an overlay */}
        <main className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0">
            <ErrorBoundary fallbackLabel="Terminal error">
              <TerminalsPage />
            </ErrorBoundary>
          </div>
        </main>

        {/* Right Sidebar - Hidden when viewing a script terminal */}
        {!activeTerminalId?.startsWith('script-') && (
          <ErrorBoundary fallbackLabel="Sidebar error">
            <AgentInfoSidebar />
          </ErrorBoundary>
        )}
      </div>

      <FilePreviewPanel />

      {/* Page overlays — Settings, Skills, History and Team */}
      {activeModal === 'settings' && (
        <PageModal title={t('sidebar.settings')} onClose={handleCloseModal}>
          <ConfigPage />
        </PageModal>
      )}

      {activeModal === 'skills' && (
        <PageModal title={t('sidebar.skills')} onClose={handleCloseModal}>
          <SkillsPage />
        </PageModal>
      )}

      {activeModal === 'history' && (
        <PageModal title={t('sidebar.history')} onClose={handleCloseModal}>
          <HistoryPage />
        </PageModal>
      )}

      {activeModal === 'team' && (
        <PageModal title={t('sidebar.team')} onClose={handleCloseModal} headerRight={<LiveIndicator />}>
          <DashboardPage />
        </PageModal>
      )}

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Global Close Agent Confirmation Modal */}
      {closeAgentModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-modal-backdrop"
          onClick={closeCloseAgentModal}
        >
          <div
            className="bg-bg-secondary border border-line rounded-xl mx-4 max-w-sm animate-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="p-2 bg-yellow/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow" />
              </div>
              <h3 className="text-base font-semibold">{t('app.closeAgent.title')}</h3>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-text-secondary text-sm mb-4">
                {t('app.closeAgent.body')}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={closeCloseAgentModal}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  ref={confirmCloseButtonRef}
                  onClick={handleCloseAgent}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all focus:outline-none"
                >
                  {t('app.closeAgent.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Onboarding Wizard */}
      <ProfileOnboardingWizard
        isOpen={showProfileWizard}
        onClose={() => setShowProfileWizard(false)}
      />

      {/* No Repos Warning Modal */}
      {showNoReposModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-modal-backdrop">
          <div className="bg-bg-secondary border border-line rounded-xl mx-4 max-w-md animate-modal-content">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="p-2 bg-yellow/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow" />
              </div>
              <h3 className="text-base font-semibold">{t('app.configRequired.title')}</h3>
            </div>

            {/* Body */}
            <div className="px-5 pb-5">
              <p className="text-text-secondary text-sm mb-5">
                {t('app.configRequired.body')}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNoReposModal(false)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                >
                  {t('app.later')}
                </button>
                <button
                  onClick={handleGoToConfig}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-yellow border border-yellow/20 rounded-lg hover:bg-yellow/10 transition-all"
                >
                  {t('app.configure')}
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
