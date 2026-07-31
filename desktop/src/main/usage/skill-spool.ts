import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { SkillRunOutcome } from '../../types'
import { closeSkillRun, recordSkillInvocation } from './skill-invocations'

/**
 * Drains the skill-invocation spool written by the PreToolUse hook.
 *
 * WHY A SPOOL AT ALL
 * ---------------------------------------------------------------------------
 * The hook used to POST each run to the local status server, which only exists while
 * the desktop app is open. Claude Code is routinely used with the app closed, and
 * every one of those runs was discarded silently — the dashboards then reported an
 * absence of work rather than an absence of listening. Writing to a file removes the
 * precondition: the hook always succeeds, and the count is settled later.
 *
 * The hook already filters to magic-* skills, so nothing else is ever written here
 * (see claude-hooks-config.ts). This module re-checks nothing: recordSkillInvocation
 * applies the same filter and the recording opt-in on the way out, which is where
 * both belong.
 *
 * WHY IT READS THE FILE BEFORE DELETING IT
 * ---------------------------------------------------------------------------
 * The hook appends concurrently, from any number of Claude Code sessions. Reading
 * then truncating would drop whatever landed in between, so the file is RENAMED to a
 * private working copy first: appends after the rename recreate the original and are
 * picked up by the next drain. rename(2) is atomic within a filesystem, so no record
 * is ever visible in both files or in neither.
 */

const CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash')
const SPOOL_FILE = path.join(CONFIG_DIR, 'pending-skills.ndjson')
/** Where a drain moves the spool to work on it, out of the hook's way. */
const DRAINING_FILE = `${SPOOL_FILE}.draining`

/** Refuse to parse a spool larger than this — it is runaway, not a backlog. */
const MAX_SPOOL_BYTES = 8 * 1024 * 1024

/**
 * One spooled record.
 *
 * Two producers write here, both without needing the app to be running:
 *  - `start`, from the PreToolUse hook (claude-hooks-config.ts) — guaranteed;
 *  - `end`, from the last step of each SKILL.md — voluntary, and legitimately absent
 *    when a run is interrupted, which is what makes a run read as abandoned.
 */
interface SpooledRun {
  /**
   * Written explicitly so the record is self-describing. Absent in records spooled
   * before the field existed, which are all starts.
   */
  type?: 'start' | 'end'
  skill: string
  /** Empty string when the session ran outside the app; normalised to undefined. */
  agentId?: string
  occurredAt?: number
  /** Present on `end` only. An unrecognised value is rejected rather than guessed. */
  outcome?: SkillRunOutcome
}

const OUTCOMES: readonly string[] = ['success', 'failed', 'cancelled']

function parse(line: string): SpooledRun | null {
  try {
    const value = JSON.parse(line) as SpooledRun
    if (typeof value?.skill !== 'string' || value.skill === '') return null

    // An unknown type comes from a NEWER app version that spooled something this one
    // cannot interpret. The record is DISCARDED, not kept for later: the alternative
    // is treating it as a start, which would invent runs that never happened, and
    // under-reporting a downgrade is the safer of the two.
    if (value.type !== undefined && value.type !== 'start' && value.type !== 'end') return null

    // An `end` is only actionable with both an outcome and a moment: the moment is
    // what the run's duration is measured against, and defaulting it to now() would
    // silently turn every drain delay into recorded work.
    if (value.type === 'end') {
      if (!OUTCOMES.includes(value.outcome ?? '')) return null
      if (typeof value.occurredAt !== 'number') return null
    }

    return value
  } catch {
    return null
  }
}

/**
 * Claim the current spool, if any, by moving it aside. Returns the records it held.
 *
 * A leftover `.draining` file means a previous drain died midway (the app was killed
 * between the rename and the last record). Its contents are prepended so those runs
 * are retried rather than stranded — a replay is harmless because recordSkillInvocation
 * mints an idempotence key per attempt and the outbox is what guards against loss,
 * not against a second attempt at a row that never landed.
 */
function claim(): SpooledRun[] {
  const lines: string[] = []

  for (const file of [DRAINING_FILE, SPOOL_FILE]) {
    try {
      if (!fs.existsSync(file)) continue
      if (fs.statSync(file).size > MAX_SPOOL_BYTES) {
        console.warn(`[skill-spool] ${file} is oversized, discarding it`)
        fs.rmSync(file, { force: true })
        continue
      }
      if (file === SPOOL_FILE) {
        // Atomic hand-off: concurrent hooks recreate SPOOL_FILE and are drained next
        // time. Appended to DRAINING_FILE rather than replacing it, so a leftover
        // from a previous crash is not overwritten.
        const pending = fs.readFileSync(file, 'utf-8')
        fs.appendFileSync(DRAINING_FILE, pending, { encoding: 'utf-8', mode: 0o600 })
        fs.rmSync(file, { force: true })
        lines.push(...pending.split('\n'))
      } else {
        lines.push(...fs.readFileSync(file, 'utf-8').split('\n'))
      }
    } catch (error) {
      console.error('[skill-spool] Failed to claim the spool:', error)
    }
  }

  return lines
    .filter((line) => line.trim() !== '')
    .map(parse)
    .filter((run): run is SpooledRun => run !== null)
}

let draining: Promise<number> | null = null

/**
 * Record every spooled run, then clear the working copy. Returns how many were read.
 *
 * Failures are NOT retried here: recordSkillInvocation already queues a failed write
 * in the outbox, which owns retrying. Draining twice into that queue would be the one
 * way to double-count, so the working copy is cleared unconditionally once every
 * record has been handed over.
 *
 * Concurrent calls share one run — the connectivity gate ticks every 20 seconds and
 * launch also drains, so overlap is expected rather than exceptional.
 */
export function drainSkillSpool(): Promise<number> {
  if (draining) return draining

  draining = (async () => {
    const runs = claim()
    if (runs.length === 0) return 0

    for (const run of runs) {
      // The hook writes an empty string when MAGIC_SLASH_TERMINAL_ID is unset.
      const agentId = run.agentId || undefined

      // Sequential, not parallel: a run's close must be applied after its start, or
      // close_skill_run finds no open run to attach to and the run stays abandoned.
      // The file preserves that order; this loop must not undo it.
      if (run.type === 'end') {
        await closeSkillRun({
          skill: run.skill,
          agentId,
          outcome: run.outcome!,
          occurredAt: run.occurredAt!,
        })
      } else {
        await recordSkillInvocation({ skill: run.skill, agentId, occurredAt: run.occurredAt })
      }
    }

    fs.rmSync(DRAINING_FILE, { force: true })
    console.log(`[skill-spool] Recorded ${runs.length} spooled skill run(s)`)
    return runs.length
  })()
    .catch((error) => {
      console.error('[skill-spool] Drain failed:', error)
      return 0
    })
    .finally(() => {
      draining = null
    })

  return draining
}

/** How many runs are waiting to be drained, for the telemetry health check. */
export function spooledSkillRunCount(): number {
  try {
    if (!fs.existsSync(SPOOL_FILE)) return 0
    return fs.readFileSync(SPOOL_FILE, 'utf-8').split('\n').filter((l) => l.trim() !== '').length
  } catch {
    return 0
  }
}
