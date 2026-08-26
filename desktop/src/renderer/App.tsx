import { useEffect, useCallback, useRef, useMemo, useState } from 'react'
import { AlertTriangle, RotateCcw, FolderOpen } from 'lucide-react'
import { REASON_META, buildRepoSetup, needsRepoSetup } from './utils/repoSetup'
import type { InvalidRepo } from '../preload'
import { useStore } from './store'
import { useConfig } from './hooks/useConfig'
import { useTerminals } from './hooks/useTerminals'
import { useOrderedTerminals } from './hooks/useOrderedTerminals'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { AgentInfoSidebar } from './components/AgentInfoSidebar'
import { ToastContainer, showToast } from './components/Toast'
import { UpdateOverlay } from './components/UpdateOverlay'
import { WhatsNewModal } from './components/WhatsNewModal'
import { ScriptTerminalModal } from './components/ScriptTerminalModal'
import { ConfigPage } from './pages/Config'
import { TerminalsPage } from './pages/Terminals'
import { SkillsPage } from './pages/Skills'
import { DashboardPage } from './pages/Dashboard'
import { TasksPage } from './pages/Tasks'
import { PageModal } from './components/PageModal'
import { LiveIndicator } from './components/LiveIndicator'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProfileOnboardingWizard } from './components/ProfileOnboardingWizard'
import { SetupWizard } from './components/SetupWizard'
import { RepoSetupWizard } from './components/RepoSetupWizard'
import { useWindowSplitMode } from './hooks/useWindowSplitMode'
import FilePreviewPanel from './components/FilePreviewPanel'
import { useT, type MessageKey } from './i18n'
import { BTN_PRIMARY } from './theme/controls'

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
          className={BTN_PRIMARY}
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  )
}

export function App() {
  const t = useT()
  const { closeAgentModal, closeCloseAgentModal, terminals, setActiveTerminal, rightPaneTerminalIds, toggleLeftSidebar, toggleSplitActive, isWideScreen, splitEnabled, config, setConfig, repoSetupDismissed, setRepoSetupDismissed, activeModal, closeModal } = useStore()
  const { configLoading, configError, loadConfig } = useConfig()
  const { killTerminal, launchClaudeTerminal } = useTerminals()
  const { flatVisualOrder } = useOrderedTerminals()
  useWindowSplitMode()
  const confirmCloseButtonRef = useRef<HTMLButtonElement>(null)
  const [showProfileWizard, setShowProfileWizard] = useState(false)
  const [profileChecked, setProfileChecked] = useState(false)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [setupChecked, setSetupChecked] = useState(false)
  const [invalidRepos, setInvalidRepos] = useState<InvalidRepo[]>([])
  const [showRepoWizard, setShowRepoWizard] = useState(false)
  const didLandRef = useRef(false)
  // Repositories already surfaced by a launch toast, kept out of the effect body
  // so a re-run never re-toasts what the user has already been told about.
  const toastedReposRef = useRef<Set<string>>(new Set())

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
      setProfileChecked(true)
    }).catch(() => setProfileChecked(true))
  }, [configLoading])

  // Machine setup — the integration choice and the prerequisites the install script
  // used to handle. Asked only when something is genuinely missing or undecided (the
  // rule lives in main/setup/status.ts, so every surface agrees on it).
  useEffect(() => {
    if (configLoading) return
    window.electronAPI.setup
      .getStatus()
      .then((status) => {
        setSetupNeeded(status.needsSetup)
        setSetupChecked(true)
      })
      .catch(() => {
        /* the wizard stays closed; Settings still reports the state */
        setSetupChecked(true)
      })
  }, [configLoading])

  // Sequenced behind the profile wizard rather than raced against it: both trigger on
  // a genuine first launch, and two stacked modals would leave one unreachable under
  // the other's backdrop. Waiting for the profile check to RESOLVE (not just for the
  // wizard to be closed) is what makes the order deterministic.
  const showSetupWizard = profileChecked && !showProfileWizard && setupNeeded

  // Everything the launch repository-setup modal needs: no repository at all, or
  // repositories the main process reported as unusable (no folder bound, folder
  // gone, folder not a git repo). Both inputs are needed — the config says what
  // the user has, only the main process can say whether the paths still work.
  const repoSetup = useMemo(() => buildRepoSetup(config?.repositories, invalidRepos), [config, invalidRepos])

  // Sequenced behind the profile and machine wizards for the same reason they are
  // sequenced behind each other, and LATCHED rather than derived: fixing the last
  // row makes the condition false, and a derived boolean would rip the modal away
  // mid-action instead of letting the user see the row turn green. Only onClose
  // closes it. `invalidRepos` is in the deps because an organization's repos land
  // after the connectivity check, well after the first render.
  //
  // Both checks must have RESOLVED, not merely be "not showing a wizard right now":
  // `profile.get()` is a file read and settles long before `setup.getStatus()` probes
  // prerequisites and versions, so testing `showSetupWizard` alone would latch this
  // modal open first and let the machine wizard mount on top of it — two backdrops,
  // and one Escape reaching both keydown handlers.
  useEffect(() => {
    if (configLoading || !profileChecked || !setupChecked || showProfileWizard || showSetupWizard) return
    if (repoSetupDismissed || !needsRepoSetup(repoSetup)) return
    setShowRepoWizard(true)
  }, [configLoading, profileChecked, setupChecked, showProfileWizard, showSetupWizard, repoSetupDismissed, repoSetup])

  // "Later": gone for this session, back on the next launch while paths are still
  // missing — the state is real and the user has to deal with it eventually.
  const handleCloseRepoWizard = useCallback(() => {
    setShowRepoWizard(false)
    setRepoSetupDismissed(true)
  }, [setRepoSetupDismissed])

  // Handle closing an agent
  const handleCloseAgent = useCallback(async () => {
    if (closeAgentModal) {
      await killTerminal(closeAgentModal.terminalId)
      closeCloseAgentModal()
    }
  }, [closeAgentModal, killTerminal, closeCloseAgentModal])

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

  // Listen for menu:command IPC events (native File / app menu)
  useEffect(() => {
    const unsubscribe = window.electronAPI.menu.onCommand((command) => {
      const store = useStore.getState()
      switch (command) {
        // Re-dispatched rather than calling a launcher here: the agents page owns
        // the guards (max agents, unreachable repos, one at a time) AND the
        // split-view rule about which pane a new agent lands in. This is the same
        // event its "+" button fires.
        case 'new-agent':
          window.dispatchEvent(new Event('new-terminal'))
          break
        case 'tasks':
          store.openModal('tasks')
          break
        case 'skills':
          store.openModal('skills')
          break
        case 'team':
          store.openModal('team')
          break
        case 'account':
          store.openSettingsModal('account')
          break
      }
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

  // The repositories the main process reports as unusable. Kept in state rather
  // than consumed on the spot: both the launch modal and the toasts read it, and
  // an organization's repositories only arrive with the event, once the
  // connectivity check has passed — well after the initial fetch has resolved.
  useEffect(() => {
    window.electronAPI.config.getInvalidRepos().then(setInvalidRepos).catch(() => {})
    const unsubscribe = window.electronAPI.config.onInvalidRepos(setInvalidRepos)
    return () => { unsubscribe() }
  }, [])

  // Surface configured repositories whose folder is missing or is not a git repo,
  // with a one-click "re-point folder" action, for the ones the launch modal is
  // NOT already showing — the same problem told twice, once behind a backdrop and
  // once as a toast that outlives it, reads as two problems. Once the modal is
  // out of the way, a repository that breaks later in the session toasts as usual.
  useEffect(() => {
    if (configLoading) return

    const shownRef = toastedReposRef.current
    if (!repoSetupDismissed) {
      for (const row of repoSetup.rows) shownRef.add(row.name)
    }

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

    // The cross-checked rows, not the raw invalid list: a stale `repos:invalid`
    // payload can still name a repository the user has deleted since, and its
    // "re-point folder" action would call updateRepository on a name that is gone.
    for (const row of repoSetup.rows) {
      // No toast key means the state is expected and surfaced gently elsewhere (a
      // team repo not yet bound to a local folder) — see REASON_META.
      const toastKey = REASON_META[row.reason].toastKey
      if (!toastKey) continue
      if (shownRef.has(row.name)) continue
      shownRef.add(row.name)
      showToast(t(toastKey, { name: row.name, path: row.path }), 'error', {
        persistent: true,
        actions: [
          {
            label: t('toast.repointFolder'),
            icon: <FolderOpen className="w-3.5 h-3.5" />,
            onClick: () => repointFolder(row.name),
          },
        ],
      })
    }
  }, [configLoading, repoSetup, repoSetupDismissed, loadConfig, t])

  // A repository was attached to an agent still running somewhere else. The main
  // process has either already moved it (nothing was going on in that session) or
  // is offering to, because relaunching Claude Code wipes the conversation.
  //
  // Lives here rather than in useTerminals: that hook is called by four components,
  // so its listeners are registered four times over — harmless for store writes,
  // four toasts for one event.
  useEffect(() => {
    const basename = (p: string) => p.split('/').filter(Boolean).pop() || p
    const unsubscribe = window.electronAPI.terminal.onCwdSync(({ id, action, cwd, from }) => {
      if (action === 'relaunched') {
        showToast(t('toast.cwdRelaunched', { dir: basename(cwd) }), 'success')
        return
      }
      showToast(
        t('toast.cwdRelaunchOffer', { current: basename(from), dir: basename(cwd) }),
        'warning',
        {
          persistent: true,
          actions: [
            {
              label: t('toast.cwdRelaunchAction', { dir: basename(cwd) }),
              icon: <RotateCcw className="w-3.5 h-3.5" />,
              onClick: () => { window.electronAPI.terminal.relaunchInCwd(id) },
            },
          ],
        }
      )
    })
    return () => { unsubscribe() }
  }, [t])

  // A write-through to the cloud failed: the main process already re-synced the
  // caches from the DB, so the latest change may not have been saved. Tell the
  // user, and refresh the local config view so it reflects the re-synced state.
  useEffect(() => {
    const KIND_KEYS: Record<'config' | 'agents', MessageKey> = {
      config: 'toast.cloudWriteKind.config',
      agents: 'toast.cloudWriteKind.agents',
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

        {/* Right Sidebar - Hidden only with no agent at all. A script terminal cannot
            hide it: a script is never the selected terminal, and its card and stop control
            live in the repository card here — which has to stay reachable while the
            script's own dialog is open over it. */}
        {terminals.length > 0 && (
          <ErrorBoundary fallbackLabel="Sidebar error">
            <AgentInfoSidebar />
          </ErrorBoundary>
        )}
      </div>

      <FilePreviewPanel />

      {/* Page overlays — Settings, Skills, Team and Tasks */}
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

      {activeModal === 'team' && (
        <PageModal title={t('sidebar.team')} onClose={handleCloseModal} headerRight={<LiveIndicator />}>
          <DashboardPage />
        </PageModal>
      )}

      {activeModal === 'tasks' && (
        <PageModal title={t('tasks.title')} onClose={handleCloseModal}>
          <TasksPage />
        </PageModal>
      )}

      {/* Mounted unconditionally on purpose — see the component. */}
      <ScriptTerminalModal />

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

      {/* Machine setup — replaces the install script's prompts */}
      <SetupWizard
        isOpen={showSetupWizard}
        onClose={() => setSetupNeeded(false)}
      />

      {/* Repositories that can't be used yet — none configured, or no usable folder.
          Mounted only while open: the latch never re-opens it, and the wizard holds
          a full-store subscription that would otherwise run for the whole session. */}
      {showRepoWizard && <RepoSetupWizard setup={repoSetup} onClose={handleCloseRepoWizard} />}

      {/* What's New Modal (after auto-update) — held back rather than stacked on
          the repository wizard's backdrop. It self-gates and only clears the
          pending payload when the user closes it, so it comes back on its own. */}
      {!showRepoWizard && <WhatsNewModal />}

      {/* Update Overlay */}
      <UpdateOverlay />
    </div>
  )
}
