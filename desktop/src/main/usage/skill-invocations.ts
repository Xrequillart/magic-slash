import type { SkillInvocationInput, SkillRunEndInput } from '../../types'
import { readConfig } from '../config/config'
import { getStore } from '../store/Store'
import { enqueue, newClientEventId } from '../store/outbox'

/**
 * Skills whose runs are recorded, by prefix.
 *
 * The PreToolUse hook that feeds this is installed user-globally and fires on EVERY
 * skill Claude Code runs, which is not what this product measures. Left unfiltered it
 * collected the names of skills we have nothing to do with — a user's own, their
 * employer's internal ones — and stored them in a table other members of their org
 * can read, while the dashboards only ever plot the seven magic ones. Collecting what
 * is never displayed is the definition of what the recording opt-in promises not to
 * do, so the filter belongs here, at the write.
 *
 * A PREFIX and not a fixed list of seven: a list would silently stop counting the
 * next skill this project ships, and a stat that quietly goes missing is the failure
 * mode this whole area is being fixed for. The cost is that our own internal skills
 * (magic-plan, magic-audit, magic-release) are counted too, which is accurate — they
 * are magic-slash runs — and they simply have no tile.
 *
 * Folds the plugin prefix exactly as the rollup RPCs do (regexp_replace(skill,
 * '^.*:', '')), so a plugin install reporting "magic-slash:magic-pr" is the same
 * skill as a script install reporting "magic-pr".
 */
function isMagicSkill(skill: string): boolean {
  return skill.replace(/^.*:/, '').startsWith('magic-')
}

/**
 * Record ONE skill invocation, OPEN — closed later by closeSkillRun.
 *
 * Gated behind Config.usageLogsEnabled (ON by default), the single switch shared
 * by all three append-only event tables (usage, activity, skills). Only the skill
 * name is collected — no prompt, no args, no code — but it is still a record of
 * what a human did, so it must not be the one channel that stays open when the
 * user turned the others off.
 *
 * Never throws into the caller, which is a hook-driven HTTP handler. A write that
 * fails is no longer lost, though: it goes to the on-disk outbox and is replayed
 * when the backend is reachable again, carrying the same clientEventId so the
 * replay cannot double-count.
 */
export async function recordSkillInvocation(input: SkillInvocationInput): Promise<void> {
  if (readConfig().usageLogsEnabled === false) return
  if (!isMagicSkill(input.skill)) return

  // Minted here, before the first attempt, so the attempt and every later replay are
  // the same row to the database. See store/outbox.ts.
  const event: SkillInvocationInput = {
    ...input,
    occurredAt: input.occurredAt ?? Date.now(),
    clientEventId: input.clientEventId ?? newClientEventId(),
  }

  try {
    await getStore().recordSkillInvocation(event)
  } catch (error) {
    console.error('[skills] Queued a skill invocation after a failed write:', error)
    enqueue({ kind: 'skill', payload: event })
  }
}

/**
 * Close a skill run that reported it had finished.
 *
 * Same gates as the opening half, for the same reason: a user who turned recording
 * off must not have the end of a run recorded either, and a skill that is not ours
 * has no run to close.
 *
 * A failed close is queued rather than dropped. Losing it would leave the run open,
 * which reads as ABANDONED — so dropping closes offline would systematically report
 * people who work on the move as people who never finish anything, which is the exact
 * bias this whole area is being fixed for.
 */
export async function closeSkillRun(input: SkillRunEndInput): Promise<void> {
  if (readConfig().usageLogsEnabled === false) return
  if (!isMagicSkill(input.skill)) return

  try {
    await getStore().closeSkillRun(input)
  } catch (error) {
    console.error('[skills] Queued a skill run closure after a failed write:', error)
    enqueue({ kind: 'skillEnd', payload: input })
  }
}
