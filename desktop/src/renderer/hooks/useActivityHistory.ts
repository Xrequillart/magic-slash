import { useState, useEffect, useCallback, useMemo } from 'react'
import type { HistoryEntry, TicketEventGroup } from '../../types'
import { useLocale, useT, type Translate } from '../i18n'

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

/**
 * "Today — 12 June 2026", or just the date for any older day. The locale and the
 * translator are passed in rather than read here: this is a plain function, and
 * both must be the ones current at render time, not at import time.
 */
function getDayLabel(dateKey: string, locale: string, t: Translate): string {
  const today = new Date()
  const todayKey = getDateKey(today.getTime())

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDateKey(yesterday.getTime())

  const [year, month, day] = dateKey.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const fullDate = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })

  if (dateKey === todayKey) return t('history.today', { date: fullDate })
  if (dateKey === yesterdayKey) return t('history.yesterday', { date: fullDate })

  return fullDate
}

export function useActivityHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const locale = useLocale()
  const t = useT()

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
        label: getDayLabel(key, locale, t),
        date: key,
        entries: sorted,
        ticketGroups: groupConsecutiveByTicket(sorted),
      }
    })
  }, [entries, locale, t])

  return { entries, groups, loading, error, refresh: loadHistory }
}
