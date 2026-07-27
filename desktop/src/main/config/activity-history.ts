import type { HistoryEntry, HistoryAction } from '../../types'
import { getStore } from '../store/Store'
import { readConfig } from './config'

/**
 * Record ONE activity event in the append-only `activity_events` table.
 *
 * GDPR opt-in: gated behind Config.usageLogsEnabled (default OFF) — the same
 * consent that gates usage_events and skill_invocations. Every row the app writes
 * about what a human did now sits behind ONE flag, instead of the activity feed
 * riding an opt-out of its own. Reading the org aggregate (the Team page) is
 * unaffected, exactly like usage.
 *
 * Fire-and-forget, like the two other event tables: there is no in-memory cache
 * to keep consistent (the personal History page that read one is gone) and hence
 * no reportWriteError wiring — a failed write is simply lost.
 */
export function addHistoryEntry(params: {
  agentId: string
  agentName: string
  action: HistoryAction
  ticketId?: string
  description?: string
  repositories: string[]
}): void {
  if (readConfig().usageLogsEnabled !== true) return

  const entry: HistoryEntry = {
    agentId: params.agentId,
    agentName: params.agentName,
    action: params.action,
    ticketId: params.ticketId,
    description: params.description,
    repositories: params.repositories,
    timestamp: Date.now(),
  }

  void getStore()
    .appendHistory(entry)
    .catch((error) => {
      console.error('Error recording activity event:', error)
    })
}
