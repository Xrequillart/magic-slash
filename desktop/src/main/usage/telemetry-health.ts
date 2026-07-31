import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { execFileSync } from 'child_process'
import type { TelemetryHealth, TelemetryHealthIssue } from '../../types'
import { readConfig } from '../config/config'
import { loadSession } from '../cloud/session-store'
import { outboxStats } from '../store/outbox'
import { spooledSkillRunCount } from './skill-spool'

/**
 * Answers one question: is anything being recorded right now, and if not, why?
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * Every link in the telemetry chain fails quietly by design — the shell hook ends in
 * `|| true`, the writers swallow their errors so a hook can never break a user's
 * session, the queue drops its oldest entries when full. That is the right behaviour
 * for each part in isolation, and together it produced a system where an empty
 * dashboard and a broken pipeline look exactly alike. Teams read those numbers to
 * judge adoption; "nobody used it" and "we stopped listening" are not the same
 * finding, and there was no way to tell them apart.
 *
 * So the silent failures are collected here and shown. Nothing is repaired
 * automatically: each issue names a cause a human can act on.
 */

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')
const MAGIC_SLASH_HOOK_MARKER = 'magic-slash-desktop'

/**
 * Whether the PreToolUse hook that records skill runs is installed.
 *
 * The app rewrites it at every launch, so a missing hook means the write failed — a
 * read-only or unwritable ~/.claude, most often — and nothing will be counted until
 * that is fixed. Matching on the marker is how configureClaudeHooks recognises its
 * own entries too.
 */
function isSkillHookInstalled(): boolean {
  try {
    if (!fs.existsSync(CLAUDE_SETTINGS_PATH)) return false
    const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'))
    const preToolUse = settings?.hooks?.PreToolUse
    if (!Array.isArray(preToolUse)) return false
    return preToolUse.some(
      (entry: { matcher?: string; hooks?: { command?: string }[] }) =>
        entry?.matcher === 'Skill' &&
        entry?.hooks?.some((h) => typeof h?.command === 'string' && h.command.includes(MAGIC_SLASH_HOOK_MARKER)),
    )
  } catch {
    return false
  }
}

/**
 * Whether `jq` is on PATH.
 *
 * The hook parses Claude Code's payload with it. Without jq the hook produces nothing
 * and exits 0, so the failure is completely invisible from the outside — this is the
 * single most likely reason a machine records nothing while looking perfectly healthy.
 */
function hasJq(): boolean {
  try {
    execFileSync('sh', ['-c', 'command -v jq'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/**
 * Report what is and is not being recorded.
 *
 * `recording: false` for the opt-in is NOT an issue — it is the user's choice, and
 * reporting a deliberate setting as a fault would train people to ignore this panel.
 * It is reported as a state, and the issue list stays empty.
 */
export function telemetryHealth(): TelemetryHealth {
  const issues: TelemetryHealthIssue[] = []

  const recordingEnabled = readConfig().usageLogsEnabled !== false
  const signedIn = loadSession()?.user?.id !== undefined
  const hookInstalled = isSkillHookInstalled()
  const jqInstalled = hasJq()
  const { pending: queued, droppedSinceStart } = outboxStats()
  const spooled = spooledSkillRunCount()

  // Only surface pipeline faults when recording is on: with the opt-in off nothing
  // is meant to be recorded, and a missing hook is then not a problem to solve.
  if (recordingEnabled) {
    if (!hookInstalled) issues.push('hook-missing')
    if (!jqInstalled) issues.push('jq-missing')
    if (!signedIn) issues.push('signed-out')
    if (droppedSinceStart > 0) issues.push('queue-overflowed')
  }

  return {
    recordingEnabled,
    signedIn,
    hookInstalled,
    jqInstalled,
    queuedEvents: queued,
    spooledSkillRuns: spooled,
    droppedEvents: droppedSinceStart,
    issues,
  }
}
