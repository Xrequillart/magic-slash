import { BrowserWindow, powerSaveBlocker } from 'electron'
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

/**
 * Pure-logic check: was a schedule missed during a sleep window?
 * Returns true if the schedule's time falls between sleepStart and wakeTime,
 * and the schedule hasn't already been executed in that window.
 */
export function shouldCatchUp(
  schedule: Schedule | undefined,
  sleepStart: number,
  wakeTime: Date,
): boolean {
  if (!schedule || !schedule.enabled || !schedule.command) return false

  const [hoursStr, minutesStr] = schedule.time.split(':')
  const targetHour = parseInt(hoursStr, 10)
  const targetMinute = parseInt(minutesStr, 10)

  // Already executed today at or after the scheduled time
  if (schedule.lastRunAt) {
    const lastRun = new Date(schedule.lastRunAt)
    if (
      lastRun.getFullYear() === wakeTime.getFullYear() &&
      lastRun.getMonth() === wakeTime.getMonth() &&
      lastRun.getDate() === wakeTime.getDate() &&
      (lastRun.getHours() > targetHour ||
        (lastRun.getHours() === targetHour && lastRun.getMinutes() >= targetMinute))
    ) {
      return false
    }
  }

  // Build the would-have-fired timestamp for today (relative to wake date)
  const scheduledToday = new Date(wakeTime)
  scheduledToday.setHours(targetHour, targetMinute, 0, 0)
  const scheduledTs = scheduledToday.getTime()

  // The scheduled time must fall within the sleep window
  if (scheduledTs < sleepStart || scheduledTs > wakeTime.getTime()) {
    return false
  }

  // Reuse frequency logic with lastRunAt cleared to avoid the "already ran this minute" guard
  const tempSchedule: Schedule = { ...schedule, lastRunAt: null }
  return shouldRunSchedule(tempSchedule, scheduledToday)
}

export class Scheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private powerSaveBlockerId: number | null = null
  private lastTickTime: number = 0
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
    this.lastTickTime = Date.now()
    this.intervalId = setInterval(() => this.tick(), 60_000)
    this.tick()
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.releasePowerBlocker()
  }

  tick(): void {
    this.lastTickTime = Date.now()
    const config = readConfig()
    if (config.schedulerEnabled === false) return

    const agents = readAgents().filter(a => a.schedule?.enabled === true)
    for (const agent of agents) {
      if (this.shouldRun(agent)) {
        this.launchAgent(agent)
      }
    }

    this.updatePowerBlocker()
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

  onSuspend(): void {
    // No-op: lastTickTime already tracks the last known-awake moment.
  }

  onResume(): void {
    const now = new Date()
    const sleepStart = this.lastTickTime
    const sleepDurationMs = now.getTime() - sleepStart

    if (sleepDurationMs < 120_000) {
      this.tick()
      return
    }

    console.log(`[Scheduler] Catch-up: system was asleep for ${Math.round(sleepDurationMs / 60_000)} minutes`)

    const config = readConfig()
    if (config.schedulerEnabled === false) {
      this.lastTickTime = now.getTime()
      return
    }

    const agents = readAgents().filter(a => a.schedule?.enabled === true)
    for (const agent of agents) {
      if (shouldCatchUp(agent.schedule, sleepStart, now)) {
        console.log(`[Scheduler] Catching up missed schedule for agent "${agent.name}"`)
        this.launchAgent(agent)
      }
    }

    this.lastTickTime = now.getTime()

    // Also check if anything is due at the current minute
    for (const agent of agents) {
      if (shouldRunSchedule(agent.schedule, now)) {
        const existingTerminals = getAllTerminals()
        if (!existingTerminals.some(t => t.id === agent.id)) {
          this.launchAgent(agent)
        }
      }
    }

    this.updatePowerBlocker()
  }

  private updatePowerBlocker(): void {
    const hasActiveTerminals = getAllTerminals().length > 0
    const hasUpcomingSchedule = this.hasScheduleDueSoon(5)

    if (hasActiveTerminals || hasUpcomingSchedule) {
      if (this.powerSaveBlockerId === null || !powerSaveBlocker.isStarted(this.powerSaveBlockerId)) {
        this.powerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
      }
    } else {
      this.releasePowerBlocker()
    }
  }

  private releasePowerBlocker(): void {
    if (this.powerSaveBlockerId !== null && powerSaveBlocker.isStarted(this.powerSaveBlockerId)) {
      powerSaveBlocker.stop(this.powerSaveBlockerId)
    }
    this.powerSaveBlockerId = null
  }

  private hasScheduleDueSoon(minutesAhead: number): boolean {
    const agents = readAgents().filter(a => a.schedule?.enabled === true)
    const now = new Date()

    for (let offset = 0; offset <= minutesAhead; offset++) {
      const future = new Date(now.getTime() + offset * 60_000)
      for (const agent of agents) {
        if (shouldRunSchedule(agent.schedule, future)) {
          return true
        }
      }
    }
    return false
  }

  executeNow(agentId: string): void {
    const agents = readAgents()
    const agent = agents.find(a => a.id === agentId)
    if (!agent || !agent.schedule) return

    this.launchAgent(agent)
  }

}
