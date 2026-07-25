import type { SkillInvocationInput } from '../../types'
import { getStore } from '../store/Store'

/**
 * Record ONE skill invocation.
 *
 * Not gated behind usageLogsEnabled (unlike recordUsageSnapshot): only the skill
 * name is collected — no prompt, no args, no code — which puts it at the same
 * sensitivity as the activity feed, on by default.
 *
 * Fire-and-forget: this never throws into the caller, which is a hook-driven HTTP
 * handler. skill_invocations is append-only, so there is no cache to keep
 * consistent and no reportWriteError wiring — a failed write is simply lost.
 */
export async function recordSkillInvocation(input: SkillInvocationInput): Promise<void> {
  try {
    await getStore().recordSkillInvocation(input)
  } catch (error) {
    console.error('[skills] Failed to record skill invocation:', error)
  }
}
