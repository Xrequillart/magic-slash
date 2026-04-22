import { BrowserWindow } from 'electron'
import { readAgents, updateAgentSchedule, saveAgent } from '../config/agents'
import { readConfig } from '../config/config'
import {
  launchClaude,
  getAllTerminals,
} from '../pty/terminal-manager'
import { createBaseCallbacks } from '../ipc/terminal-handlers'
import type { Agent, Schedule, TerminalMetadata } from '../../types'

/** Format a Date as YYYY-MM-DD. */
export function formatDateYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Pure-logic check: should a schedule fire at the given time?
 * Extracted so it can be unit-tested without instantiating the Scheduler.
 */
export function shouldRunSchedule(schedule: Schedule | undefined, now: Date): boolean {
  if (!schedule || !schedule.enabled || !schedule.command) return false

  const currentHH = String(now.getHours()).padStart(2, '0')
  const currentMM = String(now.getMinutes()).padStart(2, '0')
  const currentTime = `${currentHH}:${currentMM}`

  // Time must match
  if (currentTime !== schedule.time) return false

  // Ensure we haven't already run in this minute
  if (schedule.lastRunAt) {
    const lastRun = new Date(schedule.lastRunAt)
    if (
      lastRun.getFullYear() === now.getFullYear() &&
      lastRun.getMonth() === now.getMonth() &&
      lastRun.getDate() === now.getDate() &&
      lastRun.getHours() === now.getHours() &&
      lastRun.getMinutes() === now.getMinutes()
    ) {
      return false
    }
  }

  // Check frequency-specific conditions
  switch (schedule.frequency) {
    case 'once': {
      if (!schedule.date) return false
      return formatDateYMD(now) === schedule.date
    }
    case 'daily':
      return true
    case 'weekdays': {
      const day = now.getDay()
      return day >= 1 && day <= 5
    }
    case 'weekly': {
      if (schedule.dayOfWeek === null || schedule.dayOfWeek === undefined) return false
      return now.getDay() === schedule.dayOfWeek
    }
    case 'monthly': {
      if (schedule.dayOfMonth === null || schedule.dayOfMonth === undefined) return false
      // Skip if dayOfMonth exceeds days in current month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      if (schedule.dayOfMonth > daysInMonth) return false
      return now.getDate() === schedule.dayOfMonth
    }
    default:
      return false
  }
}

export class Scheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private getMainWindow: () => BrowserWindow | null
  private showNotification: (title: string, body: string) => void

  constructor(
    getMainWindow: () => BrowserWindow | null,
    showNotification: (title: string, body: string) => void,
  ) {
    this.getMainWindow = getMainWindow
    this.showNotification = showNotification
  }

  start(): void {
    if (this.intervalId) return
    // Tick every 60 seconds
    this.intervalId = setInterval(() => this.tick(), 60_000)
    // Also tick immediately on start
    this.tick()
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  tick(): void {
    const config = readConfig()
    if (config.schedulerEnabled === false) return

    const agents = readAgents().filter(a => a.schedule?.enabled === true)
    for (const agent of agents) {
      if (this.shouldRun(agent)) {
        this.launchAgent(agent)
      }
    }
  }

  private shouldRun(agent: Agent): boolean {
    return shouldRunSchedule(agent.schedule, new Date())
  }

  private launchAgent(agent: Agent): void {
    // Collision check: skip if already running
    const existingTerminals = getAllTerminals()
    if (existingTerminals.some(t => t.id === agent.id)) {
      this.showNotification(
        'Scheduled agent skipped',
        `Agent "${agent.name}" is already running`
      )
      return
    }

    const cwd = agent.repositories[0]
    if (!cwd) {
      this.showNotification(
        'Scheduled agent failed',
        `Agent "${agent.name}" has no repository configured`
      )
      return
    }

    const schedule = agent.schedule!

    const callbacks = createBaseCallbacks(agent.id, this.getMainWindow)

    launchClaude(
      agent.id,
      agent.name,
      cwd,
      callbacks.onData,
      callbacks.onStateChange,
      (exitCode: number) => {
        this.handleExit(agent, exitCode)
        callbacks.onExit(exitCode)
      },
      callbacks.onBranchChange,
      callbacks.onMetadataChange,
      agent.metadata as TerminalMetadata | undefined,
      callbacks.onRepositoriesChange,
      agent.repositories,
      schedule.command,
      'bypassPermissions'
    )

    // Notify on start
    this.showNotification(
      'Scheduled agent started',
      `Scheduled agent "${agent.name}" started with: ${schedule.command}`
    )

    // Save agent to disk
    saveAgent(agent.id, agent.name, agent.repositories, agent.metadata, agent.tsCreate)
  }

  private handleExit(agent: Agent, exitCode: number): void {
    const schedule = agent.schedule
    if (!schedule) return

    const updatedSchedule: Schedule = {
      ...schedule,
      lastRunAt: Date.now(),
      lastRunStatus: exitCode === 0 ? 'success' : 'error',
    }

    // Disable once-schedules after execution
    if (schedule.frequency === 'once') {
      updatedSchedule.enabled = false
    }

    updateAgentSchedule(agent.id, updatedSchedule)

    // Notify
    const status = exitCode === 0 ? 'completed successfully' : 'finished with errors'
    this.showNotification(
      'Scheduled agent finished',
      `Agent "${agent.name}" ${status}`
    )

    // Notify renderer
    const mainWindow = this.getMainWindow()
    if (mainWindow) {
      mainWindow.webContents.send('scheduler:updated', { agentId: agent.id })
    }
  }

  executeNow(agentId: string): void {
    const agents = readAgents()
    const agent = agents.find(a => a.id === agentId)
    if (!agent || !agent.schedule) return

    this.launchAgent(agent)
  }

}
