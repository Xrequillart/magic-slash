import { useState, useEffect, useCallback, useRef } from 'react'
import { CircleUserRound, Power, RefreshCw, RotateCw } from 'lucide-react'
import { AgentStateBadge } from '../../components/AgentStateBadge'
import { displayNameFromEmail } from '../../utils/displayName'
import { useT, type Translate } from '../../i18n'
import type { TrayAgent, TrayState, TrayUpdate } from '../../../types'

const EMPTY: TrayState = { version: '', update: { phase: 'idle' }, agents: [] }

function stateLabel(state: string, t: Translate): string {
  switch (state) {
    case 'working': return t('agentState.working')
    case 'waiting': return t('agentState.waiting')
    case 'idle': return t('agentState.idle')
    case 'completed': return t('agentState.completed')
    case 'error': return t('agentState.error')
    // A state this window does not know yet (a newer main process) still renders.
    default: return state
  }
}

/**
 * The version, which doubles as the app's update control — the menu bar panel
 * replaced a native menu that had a "Check for Updates" entry, and this is where
 * that went. Idle: click to check. Ready: an accent pill that restarts into the
 * new version. In between it only reports.
 */
function VersionChip({ version, update, t }: { version: string; update: TrayUpdate; t: Translate }) {
  const label = `v${version}`

  if (update.phase === 'ready') {
    return (
      <button
        onClick={() => window.electronAPI.updater.install()}
        title={t('tray.update.restart', { version: update.version })}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[11px] font-medium hover:bg-accent/25 transition-colors"
      >
        <RotateCw className="w-3 h-3" />
        <span>v{update.version}</span>
      </button>
    )
  }

  if (update.phase === 'checking' || update.phase === 'downloading') {
    return (
      <span
        title={
          update.phase === 'checking'
            ? t('tray.update.checking')
            : t('tray.update.downloadingProgress', { percent: update.percent })
        }
        className="flex items-center gap-1 text-[11px] text-text-secondary"
      >
        <RefreshCw className="w-3 h-3 animate-spin" />
        <span>{update.phase === 'downloading' ? `${update.percent}%` : label}</span>
      </span>
    )
  }

  return (
    <button
      onClick={() => window.electronAPI.updater.check()}
      title={update.phase === 'error' ? t('tray.update.checkFailed') : t('tray.update.check')}
      className={`text-[11px] rounded px-1 -mx-1 hover:text-ink transition-colors ${
        update.phase === 'error' ? 'text-red' : 'text-text-secondary'
      }`}
    >
      {label}
    </button>
  )
}

function AgentRow({ agent, t }: { agent: TrayAgent; t: Translate }) {
  return (
    <button
      onClick={() => window.electronAPI.tray.focusAgent(agent.id)}
      title={stateLabel(agent.state, t)}
      className="w-full flex items-center gap-3 px-3.5 py-2 hover:bg-surface transition-colors text-left"
    >
      <span className="flex-1 min-w-0 text-[13px] text-ink truncate">
        {agent.ticketId && <span className="text-text-secondary">{agent.ticketId} </span>}
        {agent.title || agent.name}
      </span>
      <AgentStateBadge state={agent.state} />
    </button>
  )
}

/**
 * The menu bar panel: the app's own window in place of the native tray menu (see
 * main/tray/tray-manager.ts). Header with the app, its version and the signed-in
 * person, the live agent list, and a way out at the bottom.
 *
 * It owns no store and no Supabase client — the window is created empty and never
 * hydrates one. Everything it shows arrives over `tray:getState`, which it polls
 * because the main process broadcasts agent changes to the main window only.
 * Cheap: the handler reads state already in memory, and the window is destroyed
 * with the app, not left polling behind a hidden panel… which is why the interval
 * is paused while it is not visible.
 */
export function TrayPopover() {
  const t = useT()
  const [{ version, update, agents }, setState] = useState<TrayState>(EMPTY)
  const [account, setAccount] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setState(await window.electronAPI.tray.getState())
    } catch {
      // A poll that fails (main tearing down) leaves the last frame on screen.
    }
  }, [])

  /**
   * Who is signed in. Not part of the poll on purpose: resolving it can refresh an
   * expired token over the network. It is re-read on focus instead, which is the
   * moment the panel opens — so a sign-in made in the app is reflected next time.
   */
  const loadAccount = useCallback(async () => {
    try {
      const status = await window.electronAPI.auth.status()
      setAccount(
        status.loggedIn ? displayNameFromEmail(status.user?.email, t('sidebar.accountFallback')) : null,
      )
    } catch {
      setAccount(null)
    }
  }, [t])

  useEffect(() => {
    load()
    loadAccount()

    const refresh = () => {
      load()
      loadAccount()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [load, loadAccount])

  // Hidden means blurred (the window hides on blur), so a closed panel costs
  // nothing. `document.hasFocus()` rather than a visibility listener: a hidden
  // BrowserWindow does not fire `visibilitychange` reliably on macOS.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hasFocus()) load()
    }, 2000)
    return () => clearInterval(interval)
  }, [load])

  // The window is created at a placeholder height and takes the panel's instead,
  // so it fits its content — one agent or ten.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const observer = new ResizeObserver(() => {
      window.electronAPI.tray.resize(panel.offsetHeight)
    })
    observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={panelRef}
      className="w-full bg-bg/80 border border-line rounded-xl overflow-hidden select-none"
    >
      {/* Header — the app and its version on the left, the account on the right */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-line">
        <div className="flex items-baseline gap-2 min-w-0">
          {/* The app's name opens the app — the one thing the native menu did that
              the list below cannot do on its own when there is no agent yet. */}
          <button
            onClick={() => window.electronAPI.tray.showWindow()}
            title={t('tray.showWindow')}
            className="text-[13px] font-semibold text-ink hover:text-accent transition-colors"
          >
            Magic Slash
          </button>
          <VersionChip version={version} update={update} t={t} />
        </div>
        <button
          onClick={() => window.electronAPI.tray.openSettings()}
          title={t('tray.popover.account')}
          className="flex items-center gap-1.5 px-1.5 py-1 -mr-1 rounded-md text-[12px] text-text-secondary hover:bg-surface hover:text-ink transition-colors"
        >
          <CircleUserRound className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[110px]">
            {account ?? t('sidebar.accountFallback')}
          </span>
        </button>
      </div>

      {/* Every agent in the app, whatever it is doing */}
      <div className="max-h-[380px] overflow-y-auto">
        {agents.length === 0 ? (
          <div className="px-3.5 py-6 text-center text-[13px] text-text-secondary">
            {t('tray.popover.empty')}
          </div>
        ) : (
          <div className="py-1">
            {agents.map(agent => (
              <AgentRow key={agent.id} agent={agent} t={t} />
            ))}
          </div>
        )}
      </div>

      {/* Way out */}
      <div className="border-t border-line">
        <button
          onClick={() => window.electronAPI.tray.quit()}
          className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[12px] text-text-secondary hover:bg-red/10 hover:text-red transition-colors text-left"
        >
          <Power className="w-3.5 h-3.5 shrink-0" />
          <span>{t('tray.popover.quit')}</span>
        </button>
      </div>
    </div>
  )
}
