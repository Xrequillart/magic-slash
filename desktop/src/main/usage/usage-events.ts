import type { UsageEventInput } from '../../types'
import { readConfig } from '../config/config'
import { getStore } from '../store/Store'
import { enqueue, newClientEventId } from '../store/outbox'

/**
 * Record ONE aggregated usage snapshot at session end.
 *
 * Gated behind Config.usageLogsEnabled, which is ON by default: only an EXPLICIT
 * false makes this a no-op. An absent flag means the user never touched the
 * toggle, and the product's default is to record — so `=== false`, never
 * `!== true`.
 *
 * Never throws into the caller; callers may `void` the returned promise.
 * usage_events is append-only, so there is no cache to keep consistent (unlike
 * config/agents) and hence no reportWriteError wiring — but a failed write is no
 * longer dropped either: it goes to the on-disk outbox and is replayed once the
 * backend is reachable, under the same clientEventId so it cannot land twice.
 *
 * This one matters most of the three: it fires exactly ONCE per session, at the end.
 * There is no later event to infer it from, so a lost snapshot is a session whose
 * cost and churn never existed.
 */
export async function recordUsageSnapshot(input: UsageEventInput): Promise<void> {
  if (readConfig().usageLogsEnabled === false) return

  const event: UsageEventInput = {
    ...input,
    occurredAt: input.occurredAt ?? Date.now(),
    clientEventId: input.clientEventId ?? newClientEventId(),
  }

  try {
    await getStore().appendUsage(event)
  } catch (error) {
    console.error('[usage] Queued a usage snapshot after a failed write:', error)
    enqueue({ kind: 'usage', payload: event })
  }
}
