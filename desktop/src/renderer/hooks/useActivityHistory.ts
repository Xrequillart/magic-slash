import { useState, useEffect, useCallback, useMemo } from 'react'
import type { HistoryEntry, TicketEventGroup } from '../../types'

export interface HistoryGroup {
  label: string
  date: string
  entries: HistoryEntry[]
  ticketGroups: TicketEventGroup[]
}

function getGroupKey(entry: HistoryEntry): string {
  return entry.ticketId || entry.agentId
}

function groupConsecutiveByTicket(entries: HistoryEntry[]): TicketEventGroup[] {
  if (entries.length === 0) return []

  const groups: TicketEventGroup[] = []
  let currentKey = getGroupKey(entries[0])
  let currentEntries: HistoryEntry[] = [entries[0]]

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i]
    const key = getGroupKey(entry)

    if (key === currentKey) {
      currentEntries.push(entry)
    } else {
      groups.push(buildGroup(currentKey, currentEntries))
      currentKey = key
      currentEntries = [entry]
    }
  }
  groups.push(buildGroup(currentKey, currentEntries))

  return groups
}

function buildGroup(key: string, entries: HistoryEntry[]): TicketEventGroup {
  return {
    key,
    ticketId: entries[0].ticketId,
    agentName: entries[0].agentName,
    lastAction: entries[0].action,
    entries: [...entries],
  }
}

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayLabel(dateKey: string): string {
  const today = new Date()
  const todayKey = getDateKey(today.getTime())

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday.getTime())

  const [year, month, day] = dateKey.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const fullDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })

  if (dateKey === todayKey) return `Today — ${fullDate}`
  if (dateKey === yesterdayKey) return `Yesterday — ${fullDate}`

  return fullDate
}

export function useActivityHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await window.electronAPI.activityHistory.getAll()
      setEntries(data)
    } catch (err) {
      console.error('Error loading activity history:', err)
      setError('Failed to load activity history')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const groups: HistoryGroup[] = useMemo(() => {
    if (entries.length === 0) return []

    const grouped = new Map<string, HistoryEntry[]>()

    // Group entries by day
    for (const entry of entries) {
      const key = getDateKey(entry.timestamp)
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(entry)
    }

    // Sort groups by date descending, entries within each group by timestamp descending
    const sortedKeys = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

    return sortedKeys.map(key => {
      const sorted = grouped.get(key)!.sort((a, b) => b.timestamp - a.timestamp)
      return {
        label: getDayLabel(key),
        date: key,
        entries: sorted,
        ticketGroups: groupConsecutiveByTicket(sorted),
      }
    })
  }, [entries])

  const clear = useCallback(async () => {
    try {
      await window.electronAPI.activityHistory.clear()
      setEntries([])
    } catch (err) {
      console.error('Error clearing activity history:', err)
    }
  }, [])

  return { entries, groups, loading, error, refresh: loadHistory, clear }
}
