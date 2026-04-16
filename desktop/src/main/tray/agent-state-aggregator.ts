import { EventEmitter } from 'events'
import { getAllTerminals, type TerminalState } from '../pty/terminal-manager'
import type { AggregateState } from './tray-icons'

export interface AgentSummary {
  id: string
  name: string
  state: TerminalState
  ticketId: string
  title: string
  repositories: string[]
  createdAt: Date
}

export class AgentStateAggregator extends EventEmitter {
  private currentState: AggregateState = 'none'
  private activeCount = 0
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private fingerprint = ''

  getState(): AggregateState {
    return this.currentState
  }

  getActiveCount(): number {
    return this.activeCount
  }

  getAgentSummaries(): AgentSummary[] {
    return getAllTerminals().map(t => ({
      id: t.id,
      name: t.name,
      state: t.state,
      ticketId: t.metadata?.ticketId || '',
      title: t.metadata?.title || t.name,
      repositories: t.repositories,
      createdAt: t.createdAt,
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
    const terminals = getAllTerminals()
    const count = terminals.length
    let newState: AggregateState = 'none'

    if (count > 0) {
      const hasWaiting = terminals.some(t => t.state === 'waiting')
      const hasWorking = terminals.some(t => t.state === 'working')

      if (hasWaiting) {
        newState = 'waiting'
      } else if (hasWorking) {
        newState = 'running'
      } else {
        newState = 'idle'
      }
    }

    // Build a fingerprint that captures individual agent states and titles
    // so we detect changes even when the aggregate state stays the same
    const newFingerprint = terminals
      .map(t => `${t.id}:${t.state}:${t.metadata?.title || t.name}`)
      .join('|')

    const changed = newState !== this.currentState
      || count !== this.activeCount
      || newFingerprint !== this.fingerprint

    this.currentState = newState
    this.activeCount = count
    this.fingerprint = newFingerprint

    if (changed) {
      this.emit('change', { state: newState, count })
    }
  }
}
