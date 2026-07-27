import type { SkillInvocationInput } from '../../types'
import { readConfig } from '../config/config'
import { getStore } from '../store/Store'

/**
 * Record ONE skill invocation.
 *
 * Gated behind Config.usageLogsEnabled (default OFF), the single GDPR opt-in
 * shared by all three append-only event tables (usage, activity, skills). Only
 * the skill name is collected — no prompt, no args, no code — but it is still a
 * record of what a human did, so it must not be the one channel that stays open
 * when the user declined the others.
 *
 * Fire-and-forget: this never throws into the caller, which is a hook-driven HTTP
 * handler. skill_invocations is append-only, so there is no cache to keep
 * consistent and no reportWriteError wiring — a failed write is simply lost.
 */
export async function recordSkillInvocation(input: SkillInvocationInput): Promise<void> {
  if (readConfig().usageLogsEnabled !== true) return
  try {
    await getStore().recordSkillInvocation(input)
  } catch (error) {
    console.error('[skills] Failed to record skill invocation:', error)
  }
}
