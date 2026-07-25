import type { SkillInvocationInput } from '../../types'
import { readConfig } from '../config/config'
import { getStore } from '../store/Store'

/**
 * Record ONE skill invocation.
 *
 * Gated behind Config.historyEnabled, NOT usageLogsEnabled: only the skill name
 * is collected — no prompt, no args, no code — which puts it at the same
 * sensitivity as the activity feed rather than the GDPR usage opt-in. It rides
 * the same opt-out (default ON) so a user who turns activity recording off stops
 * emitting skill telemetry too, instead of silently keeping this one channel open.
 *
 * Fire-and-forget: this never throws into the caller, which is a hook-driven HTTP
 * handler. skill_invocations is append-only, so there is no cache to keep
 * consistent and no reportWriteError wiring — a failed write is simply lost.
 */
export async function recordSkillInvocation(input: SkillInvocationInput): Promise<void> {
  if (readConfig().historyEnabled === false) return
  try {
    await getStore().recordSkillInvocation(input)
  } catch (error) {
    console.error('[skills] Failed to record skill invocation:', error)
  }
}
