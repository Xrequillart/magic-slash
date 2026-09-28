import { useState, useEffect, useCallback, useRef } from 'react'
import { MenuBarPanel, type MenuBarAgent, type MenuBarUpdate } from '@ds/desktop'
import { refreshAvatar, useAvatar } from '../../hooks/useAvatar'
import { displayNameFromEmail } from '../../utils/displayName'
import { useT, type Translate } from '../../i18n'
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

/**
 * The updater, as the panel's button. Idle, a click checks; ready, a click restarts into
 * the new version. In between it only reports: the download starts by itself. The
 * version it would otherwise print lives in the idle tooltip.
 */
function toUpdate(version: string, update: TrayUpdate, t: Translate): MenuBarUpdate {
  switch (update.phase) {
    case 'ready':
      return {
        phase: 'ready',
        title: t('tray.update.restart', { version: update.version }),
        onInstall: () => window.electronAPI.updater.install(),
      }
    case 'checking':
      return { phase: 'busy', title: t('tray.update.checking') }
    case 'downloading':
      return { phase: 'busy', title: t('tray.update.downloadingProgress', { percent: update.percent }) }
    default:
      return {
        phase: update.phase === 'error' ? 'error' : 'idle',
        title: update.phase === 'error' ? t('tray.update.checkFailed') : t('tray.update.checkVersion', { version }),
        onCheck: () => window.electronAPI.updater.check(),
      }
  }
}

/**
 * The menu bar panel's data: the app's own window in place of the native tray menu (see
 * main/tray/tray-manager.ts). The drawing is the design system's `MenuBarPanel`.
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
  const avatar = useAvatar()
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
   * The photo too, for the same reason: this window never hears the app's sign-ins.
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
    void refreshAvatar()
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

  const rows: MenuBarAgent[] = ordered.map(agent => ({
    id: agent.id,
    name: agent.title || agent.name,
    state: agent.state,
    ticketId: agent.ticketId,
    title: stateLabel(agent.state, t),
    onClick: () => window.electronAPI.tray.focusAgent(agent.id),
    question: agent.pendingQuestion && {
      token: agent.pendingQuestion.token,
      kind: agent.pendingQuestion.kind,
      prompt: agent.pendingQuestion.prompt,
      preview: agent.pendingQuestion.preview,
      options: agent.pendingQuestion.options,
      multiSelect: agent.pendingQuestion.multiSelect,
      unsupported: agent.pendingQuestion.unsupported,
      onAnswer: choice => answer(agent, choice),
      onOpenAgent: () => window.electronAPI.tray.focusAgent(agent.id),
    },
  }))

  return (
    <MenuBarPanel
      panelRef={panelRef}
      app={{ title: t('tray.showWindow'), onOpen: () => window.electronAPI.tray.showWindow() }}
      account={{
        label: account ?? t('sidebar.accountFallback'),
        title: t('tray.popover.account'),
        onClick: () => window.electronAPI.tray.openSettings(),
        // Absent when signed out: the label then draws the person glyph, not a face.
        avatar: account ? { src: avatar, alt: account } : undefined,
      }}
      update={toUpdate(version, update, t)}
      agents={rows}
      empty={t('tray.popover.empty')}
      waiting={blocked.length > 0 ? t('tray.question.waiting', { count: blocked.length }) : undefined}
      notice={staleAnswer ? t('tray.question.stale') : undefined}
      questionLabels={{
        allow: t('tray.question.allow'),
        deny: t('tray.question.deny'),
        send: t('tray.question.send'),
        multiHint: t('tray.question.multiHint'),
        unsupported: t('tray.question.unsupported'),
        openAgent: t('tray.question.openAgent'),
        moreOptions: count => t('tray.question.moreOptions', { count }),
      }}
      quit={{ label: t('tray.popover.quit'), onClick: () => window.electronAPI.tray.quit() }}
    />
  )
}
