import * as crypto from 'crypto'
import type { HistoryEntry, HistoryAction } from '../../types'
import { getStore, reportWriteError } from '../store/Store'

// Read limit for the activity feed. activity_events is append-only (there is no
// clear/purge), so instead of capping on write we simply read the most recent
// READ_LIMIT entries. This replaces the old MAX_ENTRIES=500 purge.
const READ_LIMIT = 500

// In-memory history cache. History lives in the Supabase `activity_events` table
// (see store/CloudStore.ts) — there is no local history.json.
let historyCache: HistoryEntry[] = []

/** Load recent history from the store into the cache. Call after auth is established. */
export async function hydrateHistory(): Promise<HistoryEntry[]> {
  try {
    historyCache = await getStore().loadHistory(READ_LIMIT)
  } catch (error) {
    console.error('Error hydrating activity history:', error)
    historyCache = []
  }
  return historyCache
}

/** Drop the cached history (on sign-out). */
export function resetHistoryCache(): void {
  historyCache = []
}

export function readHistory(): HistoryEntry[] {
  return historyCache
}

export function addHistoryEntry(params: {
  agentId: string
  agentName: string
  action: HistoryAction
  ticketId?: string
  description?: string
  repositories: string[]
}): HistoryEntry {
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    agentId: params.agentId,
    agentName: params.agentName,
    action: params.action,
    ticketId: params.ticketId,
    description: params.description,
    repositories: params.repositories,
    timestamp: Date.now(),
  }

  historyCache.push(entry)
  // Keep the in-memory cache bounded to the read limit (oldest-first order).
  if (historyCache.length > READ_LIMIT) {
    historyCache.splice(0, historyCache.length - READ_LIMIT)
  }

  void getStore()
    .appendHistory(entry)
    .catch((error) => {
      console.error('Error persisting activity history:', error)
      reportWriteError('history', error)
    })

  return entry
}
