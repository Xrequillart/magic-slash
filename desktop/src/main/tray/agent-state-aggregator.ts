import { EventEmitter } from 'events'
import { getAllTerminals, type TerminalState } from '../pty/terminal-manager'
import { getPendingQuestion } from '../questions/pending-questions'
import type { TrayQuestion } from '../../types'
import type { AggregateState } from './tray-icons'

export interface AgentSummary {
  id: string
  name: string
  state: TerminalState
  ticketId: string
  title: string
  repositories: string[]
  createdAt: Date
  /** The question this agent is blocked on, if any (see main/questions/). */
  pendingQuestion?: TrayQuestion
}

export class AgentStateAggregator extends EventEmitter {
  private currentState: AggregateState = 'none'
  private activeCount = 0
  private questionCount = 0
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private fingerprint = ''

  getState(): AggregateState {
    return this.currentState
  }

  getActiveCount(): number {
    return this.activeCount
  }

  /**
   * How many agents are blocked on a question, which is not the same number as
   * `getActiveCount` and is the one worth acting on: three agents running and one
   * asking means one thing to do, not four. The menu bar alternates between them
   * (see TrayManager.renderTitle).
   */
  getQuestionCount(): number {
    return this.questionCount
  }

  getAgentSummaries(): AgentSummary[] {
    return getAllTerminals()
      .filter(t => !t.id.startsWith('script-') && !t.id.startsWith('sidebar-'))
      .map(t => ({
        id: t.id,
        name: t.name,
        state: t.state,
        ticketId: t.metadata?.ticketId || '',
        title: t.metadata?.title || t.name,
        repositories: t.repositories,
        createdAt: t.createdAt,
        pendingQuestion: getPendingQuestion(t.id),
      }))
  }

  startPolling(): void {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => this.update(), 3000)
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  update(): void {
    const terminals = getAllTerminals().filter(
      t => !t.id.startsWith('script-') && !t.id.startsWith('sidebar-')
    )
    const count = terminals.length
    // Counted rather than probed with `some`: the menu bar shows this number, so it is
    // not enough to know that at least one agent is asking.
    const questions = terminals.filter(t => getPendingQuestion(t.id) !== undefined).length
    let newState: AggregateState = 'none'

    if (count > 0) {
      // A question or a permission request is the only thing here that cannot resolve
      // itself: every other state ends on its own, this one waits on a person. It
      // therefore outranks `waiting`, which it would otherwise hide behind — an agent
      // blocked on a question is already `waiting`, so the two always coincide.
      const hasWaiting = terminals.some(t => t.state === 'waiting')
      const hasWorking = terminals.some(t => t.state === 'working')

      if (questions > 0) {
        newState = 'question'
      } else if (hasWaiting) {
        newState = 'waiting'
      } else if (hasWorking) {
        newState = 'running'
      } else {
        newState = 'idle'
      }
    }

    // Build a fingerprint that captures individual agent states and titles
    // so we detect changes even when the aggregate state stays the same.
    //
    // The question token is part of it because a question typically arrives on an
    // agent that is ALREADY `waiting` — same state, same title, so without the
    // token nothing here would look changed and the panel would never be told.
    const newFingerprint = terminals
      .map(t => `${t.id}:${t.state}:${t.metadata?.title || t.name}:${getPendingQuestion(t.id)?.token ?? ''}`)
      .join('|')

    const changed = newState !== this.currentState
      || count !== this.activeCount
      || newFingerprint !== this.fingerprint

    this.currentState = newState
    this.activeCount = count
    this.questionCount = questions
    this.fingerprint = newFingerprint

    if (changed) {
      this.emit('change', { state: newState, count, questions })
    }
  }
}
