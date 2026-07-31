import type { HistoryEntry, HistoryAction } from '../../types'
import { getStore } from '../store/Store'
import { enqueue, newClientEventId } from '../store/outbox'
import { readConfig } from './config'

/**
 * Record ONE activity event in the append-only `activity_events` table.
 *
 * Gated behind Config.usageLogsEnabled (ON by default, so only an explicit false
 * stops it) — the same switch that gates usage_events and skill_invocations. Every
 * row the app writes about what a human did sits behind ONE flag, instead of the
 * activity feed riding a preference of its own. Reading the org aggregate (the
 * Team page) is unaffected, exactly like usage.
 *
 * Synchronous and non-blocking, like the two other event tables: there is no
 * in-memory cache to keep consistent (the personal History page that read one is
 * gone) and hence no reportWriteError wiring. A failed write is not lost, though —
 * it goes to the on-disk outbox and is replayed when the backend is reachable,
 * under the clientEventId minted here so the replay cannot double-count.
 */
export function addHistoryEntry(params: {
  agentId: string
  agentName: string
  action: HistoryAction
  ticketId?: string
  description?: string
  repositories: string[]
}): void {
  if (readConfig().usageLogsEnabled === false) return

  const entry: HistoryEntry = {
    agentId: params.agentId,
    agentName: params.agentName,
    action: params.action,
    ticketId: params.ticketId,
    description: params.description,
    repositories: params.repositories,
    timestamp: Date.now(),
    clientEventId: newClientEventId(),
  }

  void getStore()
    .appendHistory(entry)
    .catch((error) => {
      console.error('Queued an activity event after a failed write:', error)
      enqueue({ kind: 'history', payload: entry })
    })
}
