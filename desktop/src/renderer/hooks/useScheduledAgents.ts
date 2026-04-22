import { useEffect, useCallback, useState } from 'react'
import { useStore } from '../store'
import type { Schedule, Agent } from '../../types'

export function useScheduledAgents() {
  const { scheduledAgents, setScheduledAgents, addScheduledAgent, updateScheduledAgent, removeScheduledAgent } = useStore()
  const [loading, setLoading] = useState(true)

  const loadScheduledAgents = useCallback(async () => {
    try {
      const agents = await window.electronAPI.scheduler.getScheduled()
      setScheduledAgents(agents)
    } catch (error) {
      console.error('Failed to load scheduled agents:', error)
    } finally {
      setLoading(false)
    }
  }, [setScheduledAgents])

  // Load on mount
  useEffect(() => {
    loadScheduledAgents()
  }, [loadScheduledAgents])

  // Listen for scheduler:updated events to refresh
  useEffect(() => {
    const unsubscribe = window.electronAPI.scheduler.onScheduleUpdate(() => {
      loadScheduledAgents()
    })
    return () => { unsubscribe() }
  }, [loadScheduledAgents])

  const createSchedule = useCallback(async (name: string, repositories: string[], schedule: Schedule): Promise<Agent | null> => {
    try {
      const agent = await window.electronAPI.scheduler.create(name, repositories, schedule)
      if (agent) {
        addScheduledAgent(agent)
      }
      return agent
    } catch (error) {
      console.error('Failed to create schedule:', error)
      throw error
    }
  }, [addScheduledAgent])

  const updateSchedule = useCallback(async (id: string, schedule: Schedule, name?: string, repositories?: string[]): Promise<Agent | null> => {
    try {
      const agent = await window.electronAPI.scheduler.update(id, schedule, name, repositories)
      if (agent) {
        updateScheduledAgent(agent)
      }
      return agent
    } catch (error) {
      console.error('Failed to update schedule:', error)
      throw error
    }
  }, [updateScheduledAgent])

  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    try {
      await window.electronAPI.scheduler.delete(id)
      removeScheduledAgent(id)
    } catch (error) {
      console.error('Failed to delete schedule:', error)
      throw error
    }
  }, [removeScheduledAgent])

  const executeNow = useCallback(async (id: string): Promise<void> => {
    try {
      await window.electronAPI.scheduler.executeNow(id)
    } catch (error) {
      console.error('Failed to execute schedule:', error)
      throw error
    }
  }, [])

  return {
    scheduledAgents,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    executeNow,
    loading,
    refresh: loadScheduledAgents,
  }
}
