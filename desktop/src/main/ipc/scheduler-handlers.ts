import { ipcMain } from 'electron'
import {
  readAgents,
  writeAgents,
  removeAgent,
  updateAgentSchedule,
  clearAgentSchedule,
  createDefaultMetadata,
} from '../config/agents'
import { filterValidRepositories, readConfig, writeConfig } from '../config/config'
import { type Scheduler, formatDateYMD } from '../scheduler/scheduler'
import type { Agent, Schedule } from '../../types'

export function setupSchedulerHandlers(scheduler: Scheduler) {
  // Create a new scheduled agent
  ipcMain.handle('scheduler:create', async (_event, name: string, repositories: string[], schedule: Schedule) => {
    // Reject 'once' schedules with a past date
    if (schedule.frequency === 'once' && schedule.date) {
      if (schedule.date < formatDateYMD(new Date())) {
        throw new Error('Cannot schedule a one-time event in the past')
      }
    }

    const id = `scheduled-${Date.now()}`
    const tsCreate = Date.now()

    const agent: Agent = {
      id,
      name,
      repositories: filterValidRepositories(repositories),
      tsCreate,
      metadata: createDefaultMetadata(),
      schedule,
    }

    const agents = readAgents().filter(a => a.id !== id)
    agents.push(agent)
    writeAgents(agents)

    return agent
  })

  // Update schedule for an existing agent
  ipcMain.handle('scheduler:update', async (_event, id: string, schedule: Schedule, name?: string, repositories?: string[]) => {
    // Reject 'once' schedules with a past date
    if (schedule.frequency === 'once' && schedule.date) {
      if (schedule.date < formatDateYMD(new Date())) {
        throw new Error('Cannot schedule a one-time event in the past')
      }
    }

    updateAgentSchedule(id, schedule)

    // Update name and repositories if provided
    if (name !== undefined || repositories !== undefined) {
      const agents = readAgents()
      const agent = agents.find(a => a.id === id)
      if (agent) {
        if (name !== undefined) {
          agent.name = name
        }
        if (repositories !== undefined) {
          agent.repositories = filterValidRepositories(repositories)
        }
        writeAgents(agents)
      }
    }

    const agents = readAgents()
    return agents.find(a => a.id === id) || null
  })

  // Clear schedule from an agent
  ipcMain.handle('scheduler:clear', async (_event, id: string) => {
    clearAgentSchedule(id)

    const agents = readAgents()
    return agents.find(a => a.id === id) || null
  })

  // Delete a scheduled agent
  ipcMain.handle('scheduler:delete', async (_event, id: string) => {
    removeAgent(id)
  })

  // Execute a scheduled agent immediately
  ipcMain.handle('scheduler:executeNow', async (_event, id: string) => {
    scheduler.executeNow(id)
  })

  // Get all scheduled agents
  ipcMain.handle('scheduler:getScheduled', async () => {
    const agents = readAgents()
    return agents.filter(a => a.schedule !== undefined)
  })

  // Toggle scheduler enabled/disabled
  ipcMain.handle('scheduler:setEnabled', async (_event, enabled: boolean) => {
    const config = readConfig()
    config.schedulerEnabled = enabled
    writeConfig(config)
    return config
  })
}
