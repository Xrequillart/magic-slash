import { useState, useEffect, useCallback, useRef } from 'react'
import { CircleUserRound, Power, RefreshCw, RotateCw } from 'lucide-react'
import { AgentStateBadge } from '../../components/AgentStateBadge'
import { stateHoverBgColors } from '../../utils/stateColors'
import { displayNameFromEmail } from '../../utils/displayName'
import { useT, type Translate } from '../../i18n'
import { QuestionCard } from './QuestionCard'
import type { TrayAgent, TrayAnswerChoice, TrayState, TrayUpdate } from '../../../types'

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

/** Every state of the button shares this, so only the icon and colour differ. */
const ICON_BUTTON = 'flex items-center justify-center w-6 h-6 rounded-lg transition-colors shrink-0'

/**
 * The app's update control — the menu bar panel replaced a native menu that had a
 * "Check for Updates" entry, and this is where that went. Icon only, sitting in
 * the header: idle, click to check; ready, an accent button that restarts into
 * the new version. In between it only reports. The version it would otherwise
 * print lives in the idle tooltip.
 */
function UpdateButton({ version, update, t }: { version: string; update: TrayUpdate; t: Translate }) {
  if (update.phase === 'ready') {
    return (
      <button
        onClick={() => window.electronAPI.updater.install()}
        title={t('tray.update.restart', { version: update.version })}
        className={`${ICON_BUTTON} bg-accent/15 text-accent hover:bg-accent/25`}
      >
        <RotateCw className="w-3.5 h-3.5" />
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
        className={`${ICON_BUTTON} text-text-secondary`}
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      </span>
    )
  }

  return (
    <button
      onClick={() => window.electronAPI.updater.check()}
      title={
        update.phase === 'error'
          ? t('tray.update.checkFailed')
          : t('tray.update.checkVersion', { version })
      }
      className={`${ICON_BUTTON} hover:bg-surface ${
        update.phase === 'error' ? 'text-red' : 'text-text-secondary hover:text-ink'
      }`}
    >
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  )
}

/** Same shape as the sidebar's agent item: inset, rounded, hover tinted by state. */
function AgentRow({ agent, t }: { agent: TrayAgent; t: Translate }) {
  return (
    <button
      onClick={() => window.electronAPI.tray.focusAgent(agent.id)}
      title={stateLabel(agent.state, t)}
      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-text-secondary transition-all text-left hover:text-ink ${stateHoverBgColors[agent.state]}`}
    >
      <span className="flex-1 min-w-0 truncate font-medium">
        {agent.ticketId && <span className="text-text-secondary/70">{agent.ticketId} </span>}
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
  const [staleAnswer, setStaleAnswer] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      setState(await window.electronAPI.tray.getState())
    } catch {
      // A poll that fails (main tearing down) leaves the last frame on screen.
    }
  }, [])

  /**
   * Answer an agent without leaving the panel.
   *
   * The card is dropped locally straight away rather than waiting for the next
   * poll: the agent's state does NOT flip back from `waiting` on its own — it is
   * the hooks that drive that — so an optimistic removal is the only thing that
   * makes the click feel like it did something. `load()` then reconciles.
   *
   * A `stale` result means main compared the token and wrote nothing at all. The
   * card is gone either way (the question really is over), so all that is left to
   * do is say the answer was not sent.
   */
  const answer = useCallback(async (agent: TrayAgent, choice: TrayAnswerChoice) => {
    const question = agent.pendingQuestion
    if (!question) return

    setStaleAnswer(false)
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => (a.id === agent.id ? { ...a, pendingQuestion: undefined } : a)),
    }))

    try {
      const result = await window.electronAPI.tray.answerQuestion(agent.id, question.token, choice)
      if (!result.ok) setStaleAnswer(true)
    } catch {
      setStaleAnswer(true)
    }
    load()
  }, [load])

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
      // Reopening the panel is a fresh look at the agents: a notice about an answer
      // that missed has no business surviving into it.
      setStaleAnswer(false)
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

  // Agents blocked on a question first, each group keeping the order main sent it —
  // so the list does not reshuffle under the cursor on every 2s poll.
  const blocked = agents.filter(a => a.pendingQuestion)
  const ordered = [...blocked, ...agents.filter(a => !a.pendingQuestion)]

  return (
    <div
      ref={panelRef}
      className="w-full bg-bg/80 border border-line rounded-xl overflow-hidden select-none"
    >
      {/* Header — the app on the left, the account and the update control right */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-line">
        {/* The app's name opens the app — the one thing the native menu did that
            the list below cannot do on its own when there is no agent yet. */}
        <button
          onClick={() => window.electronAPI.tray.showWindow()}
          title={t('tray.showWindow')}
          className="text-[13px] font-semibold text-ink hover:text-accent transition-colors truncate"
        >
          Magic Slash
        </button>
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={() => window.electronAPI.tray.openSettings()}
            title={t('tray.popover.account')}
            className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg text-[12px] text-text-secondary hover:bg-surface hover:text-ink transition-colors min-w-0"
          >
            <CircleUserRound className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[110px]">
              {account ?? t('sidebar.accountFallback')}
            </span>
          </button>
          <UpdateButton version={version} update={update} t={t} />
        </div>
      </div>

      {/* How many agents are blocked on something, when any are. Only ever shown
          with a card below it, so it needs no state of its own. */}
      {blocked.length > 0 && (
        <div className="px-3.5 py-1.5 border-b border-line text-[11px] font-medium text-accent">
          {t('tray.question.waiting', { count: blocked.length })}
        </div>
      )}

      {/* Every agent in the app, whatever it is doing.

          The cap grows only while a question is on screen: a card is far taller than
          a row, and at 380px it would open inside a scroller instead of being read at
          a glance. With nothing blocked the panel keeps exactly the height it had
          before this feature. 560px stays under MAX_HEIGHT in popover-window once the
          header, the counter and the footer are added. */}
      <div className={`${blocked.length > 0 ? 'max-h-[560px]' : 'max-h-[380px]'} overflow-y-auto`}>
        {agents.length === 0 ? (
          <div className="px-3.5 py-6 text-center text-[13px] text-text-secondary">
            {t('tray.popover.empty')}
          </div>
        ) : (
          // px-2 like the sidebar's nav: the rounded rows sit inset from the
          // panel's edge instead of running into its border.
          <div className="flex flex-col gap-1 px-2 py-2">
            {staleAnswer && (
              <p className="px-2 py-1 text-[11px] text-text-secondary">{t('tray.question.stale')}</p>
            )}
            {ordered.map(agent => (
              // An agent with nothing pending renders exactly as it always did:
              // the row, and no card.
              <div key={agent.id} className="flex flex-col gap-1">
                <AgentRow agent={agent} t={t} />
                {agent.pendingQuestion && (
                  <QuestionCard
                    question={agent.pendingQuestion}
                    onAnswer={choice => answer(agent, choice)}
                    onOpenAgent={() => window.electronAPI.tray.focusAgent(agent.id)}
                    t={t}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Way out */}
      <div className="border-t border-line px-2 py-2">
        <button
          onClick={() => window.electronAPI.tray.quit()}
          className="w-full flex items-center justify-start gap-2 px-2 py-2 rounded-lg text-xs font-medium text-text-secondary hover:bg-red/10 hover:text-red transition-all"
        >
          <Power className="w-3.5 h-3.5 shrink-0" />
          <span>{t('tray.popover.quit')}</span>
        </button>
      </div>
    </div>
  )
}
