import type { UsageEventInput } from '../../types'
import { readConfig } from '../config/config'
import { getStore } from '../store/Store'

/**
 * Record ONE aggregated usage snapshot at session end.
 *
 * GDPR opt-in: writing is gated behind Config.usageLogsEnabled (default OFF). When
 * the flag is not explicitly true this is a no-op — no data leaves the machine.
 *
 * Fire-and-forget: this never throws into the caller. Callers may `void` the
 * returned promise; any store/network error is swallowed and logged. usage_events
 * is append-only, so there is no cache to keep consistent (unlike config/agents/
 * history), hence no reportWriteError wiring here.
 */
export async function recordUsageSnapshot(input: UsageEventInput): Promise<void> {
  if (readConfig().usageLogsEnabled !== true) return
  try {
    await getStore().appendUsage(input)
  } catch (error) {
    console.error('[usage] Failed to record usage snapshot:', error)
  }
}
