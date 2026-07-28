import type { UsageEventInput } from '../../types'
import { readConfig } from '../config/config'
import { getStore } from '../store/Store'

/**
 * Record ONE aggregated usage snapshot at session end.
 *
 * Gated behind Config.usageLogsEnabled, which is ON by default: only an EXPLICIT
 * false makes this a no-op. An absent flag means the user never touched the
 * toggle, and the product's default is to record — so `=== false`, never
 * `!== true`.
 *
 * Fire-and-forget: this never throws into the caller. Callers may `void` the
 * returned promise; any store/network error is swallowed and logged. usage_events
 * is append-only, so there is no cache to keep consistent (unlike config/agents/
 * history), hence no reportWriteError wiring here.
 */
export async function recordUsageSnapshot(input: UsageEventInput): Promise<void> {
  if (readConfig().usageLogsEnabled === false) return
  try {
    await getStore().appendUsage(input)
  } catch (error) {
    console.error('[usage] Failed to record usage snapshot:', error)
  }
}
