import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Bot, Bug, Download, FileText, LogIn, ScrollText, Sparkles, Wrench } from '@ds/desktop/icons'
import { setSimulatedSetup } from '../dev/simulatedSetup'
import { useStore } from '../store'
import { useT } from '../i18n'

/**
 * Id of the fake agent the debug menu pins into the list. Prefixed like the other
 * non-pty ids so it is recognisable in the store, but NOT `sidebar-`/`script-`:
 * those two are filtered out of the agent list, and the point here is to appear in it.
 */
const DEBUG_PLANNING_AGENT_ID = 'debug-planning-agent'

export function UpdateOverlay() {
  const t = useT()
  const activeTerminalId = useStore((s) => s.activeTerminalId)
  // The one thing left that is worth interrupting for: the download is on disk, the
  // restart happened, and the app did not come back. Everything else the updater has
  // to say is `UpdateModal`'s splash to report.
  const [installError, setInstallError] = useState<string | null>(null)
  const [debugMenuOpen, setDebugMenuOpen] = useState(false)
  const [emptyStatePinned, setEmptyStatePinned] = useState(false)
  const [planningAgentPinned, setPlanningAgentPinned] = useState(false)
  const [updateDialogPinned, setUpdateDialogPinned] = useState(false)
  const [brokenSetupPinned, setBrokenSetupPinned] = useState(false)
  const debugMenuRef = useRef<HTMLDivElement>(null)

  function floodTerminal() {
    if (!activeTerminalId) return
    setDebugMenuOpen(false)
    const prompt = 'Print exactly 200 lines of lorem ipsum text, each line numbered. Do not ask questions, just print.\n'
    window.electronAPI.terminal.write(activeTerminalId, prompt)
  }

  // Toggle rather than fire-and-forget: the agents page keeps showing its empty
  // state until this is switched back off, so it can be styled with sessions
  // still running underneath.
  /**
   * Makes the app believe this machine is in trouble — a required tool missing, another
   * too old, an MCP server unconfigured, a skill not installed.
   *
   * It is the only way to see the quick-settings verdict in red: on the machine of
   * whoever is drawing it, the setup is always ready. Both surfaces that ask about the
   * setup read the same fake, so the verdict and the repair card it opens agree.
   */
  function toggleBrokenSetup() {
    const next = !brokenSetupPinned
    setBrokenSetupPinned(next)
    setDebugMenuOpen(false)
    setSimulatedSetup(next)
  }

  function toggleEmptyState() {
    const next = !emptyStatePinned
    setEmptyStatePinned(next)
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('debug:empty-state', { detail: next }))
  }

  /**
   * Hands the update splash a fake manual check to hold. It is the only way to see that
   * splash in development: checkForUpdatesOnStartup() returns early under the dev
   * server, so no real status ever reaches it.
   *
   * A toggle rather than a scripted playback, because the point is to WATCH it: the
   * splash simulates its own answer, download and relaunch while pinned, so the whole
   * checking → found → transferring → counting down path plays out by hand.
   */
  function toggleUpdateDialog() {
    const next = !updateDialogPinned
    setUpdateDialogPinned(next)
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('debug:update-sim', {
      detail: next ? { type: 'checking', manual: true } : null,
    }))
  }

  /** Jumps the pinned splash straight to a failed download, so retry can be clicked. */
  function pinUpdateDialogError() {
    setUpdateDialogPinned(true)
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('debug:update-sim', {
      detail: { type: 'error', message: 'net::ERR_CONNECTION_RESET (simulated)', phase: 'download' },
    }))
  }

  /**
   * Pins a fake `planning` agent into the list, so the spec panel can be seen without
   * running a real `/magic:plan` session. A toggle, like the empty state above: the
   * point is to switch into it, resize the sidebar, expand the spec, then switch back.
   *
   * It exists only in the renderer store — no pty is spawned, so its terminal pane is
   * blank and writing to it is a no-op. `specPath` points at the first configured
   * repository's CHANGELOG.md purely because it is long, real markdown that is certain
   * to be there; with no repository configured the path stays absent and the panel
   * shows its "drafting the spec" empty state instead, which is worth seeing too.
   *
   * That path is NOT spec-shaped, so the /metadata route would reject it — this works
   * only because the fixture writes the renderer store directly, which is the whole
   * point of a debug fixture and no reason to relax the route's guard.
   */
  function togglePlanningAgent() {
    setDebugMenuOpen(false)
    const next = !planningAgentPinned
    setPlanningAgentPinned(next)

    if (!next) {
      useStore.getState().removeTerminal(DEBUG_PLANNING_AGENT_ID)
      return
    }

    const repoPath = Object.values(useStore.getState().config?.repositories ?? {})[0]?.path
    useStore.getState().addTerminal({
      id: DEBUG_PLANNING_AGENT_ID,
      name: 'Fake planning agent',
      state: 'working',
      repositories: repoPath ? [repoPath] : [],
      metadata: {
        title: 'Fake planning agent',
        description: 'Simulated /magic:plan session (debug menu)',
        type: 'planner',
        status: 'planning',
        specPath: repoPath ? `${repoPath}/CHANGELOG.md` : undefined,
      },
    })
  }

  function showWhatsNew() {
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('show:whats-new', {
      detail: {
        version: '1.0.0',
        releaseNotes: '<h3>🚀 New Features</h3><ul><li><strong>What\'s New modal</strong> — See release notes after each update</li><li>Improved terminal performance</li></ul><h3>🐛 Bug Fixes</h3><ul><li>Fixed sidebar toggle on small screens</li><li>Resolved config sync issue</li></ul>',
      },
    }))
  }

  /**
   * Opens the sign-in card over whatever is on screen, signed in or not.
   *
   * It is the only way to SEE that screen without ending your own session: the title
   * bar's label opens the account menu once there is an account, so the card is
   * otherwise reachable only by signing out — and then again after every change to it.
   * `useAccountTitleBarControl` listens for this and holds the open state.
   */
  function showLoginScreen() {
    setDebugMenuOpen(false)
    window.dispatchEvent(new CustomEvent('debug:login-screen'))
  }

  /** Pins the install-failure overlay — the one state that still takes the screen. */
  function toggleInstallFailure() {
    setDebugMenuOpen(false)
    setInstallError((current) => (current ? null : 'quitAndInstall failed (simulated)'))
  }

  // Close debug menu on click outside
  useEffect(() => {
    if (!debugMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (debugMenuRef.current && !debugMenuRef.current.contains(e.target as Node)) {
        setDebugMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [debugMenuOpen])

  // The real update flow, and all that is left of it here. The whole sequence (check,
  // download, relaunch) is reported and driven by `UpdateModal` now, on a splash that
  // takes the window from the moment a release is found until the app comes back newer.
  //
  // One thing still belongs to this component: the overlay for a restart that failed.
  useEffect(() => {
    const unsubscribe = window.electronAPI.updater.onStatus((newStatus) => {
      if (newStatus.type === 'error' && newStatus.phase === 'install') {
        setInstallError(newStatus.message)
      }

      // A fresh check is someone trying again, so a failure from last time stops
      // being the truth on screen.
      if (newStatus.type === 'checking') {
        setInstallError(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <>
      {/* The restart did not happen and the terminals are already gone, so this one
          does hold the screen — quitting and reopening is the only way out. */}
      {installError && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] animate-fade-in">
          <div className="bg-bg-secondary/90 border border-border/50 rounded-2xl shadow-2xl w-80 px-10 py-10 flex flex-col items-center gap-5">
            <AlertTriangle className="w-12 h-12 text-red" />
            <p className="text-center text-sm text-text-secondary">{t('update.installFailed')}</p>
          </div>
        </div>
      )}

      {/* Dev-only debug menu. Its button labels are deliberately NOT in the
          catalogue: `import.meta.env.DEV` strips the whole block from a
          production build, so no user ever reads them. The toasts it fires ARE
          translated — those are the real ones, simulated. */}
      {import.meta.env.DEV && (
        <div ref={debugMenuRef} className="fixed bottom-3 right-3 z-[200]">
          {debugMenuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-52 py-1 rounded-lg bg-bg-secondary border border-border/50 shadow-xl animate-fade-in">
              <button
                onClick={toggleInstallFailure}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  installError ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Install failure overlay
                {installError && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={toggleUpdateDialog}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  updateDialogPinned ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Update splash
                {updateDialogPinned && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={pinUpdateDialogError}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Update splash: failed
              </button>
              <button
                onClick={toggleBrokenSetup}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  brokenSetupPinned ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Broken machine setup
                {brokenSetupPinned && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={toggleEmptyState}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  emptyStatePinned ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                Empty agents state
                {emptyStatePinned && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={togglePlanningAgent}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs transition-colors hover:bg-bg-tertiary ${
                  planningAgentPinned ? 'text-purple' : 'text-text-secondary hover:text-ink'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Fake planning agent
                {planningAgentPinned && <span className="ml-auto text-[10px] uppercase tracking-wider">on</span>}
              </button>
              <button
                onClick={showWhatsNew}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                What&apos;s New modal
              </button>
              <button
                onClick={showLoginScreen}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Login screen
              </button>
              <button
                onClick={floodTerminal}
                disabled={!activeTerminalId}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-secondary hover:text-ink hover:bg-bg-tertiary transition-colors disabled:opacity-40"
              >
                <ScrollText className="w-3.5 h-3.5" />
                Flood terminal
              </button>
            </div>
          )}
          <button
            onClick={() => setDebugMenuOpen((o) => !o)}
            className={`p-2 rounded-lg border transition-colors ${
              debugMenuOpen
                ? 'bg-red border-red text-on-brand'
                : 'bg-red/80 border-red/60 text-on-brand hover:bg-red'
            }`}
            title={t('update.debugMenu')}
          >
            <Bug className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
