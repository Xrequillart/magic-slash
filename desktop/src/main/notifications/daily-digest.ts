import { readConfig } from '../config/config'
import { getStore } from '../store/Store'

// ---------------------------------------------------------------------------
// Daily team digest (main process, opt-in — Config.dailyDigest.enabled).
//
// Fires ONE OS notification at 9:00 local summarizing the last ~24h of team
// activity ("Yesterday your team merged N PRs and moved M tickets to Done").
// Skips silently when nothing happened. Self-arming: computes the ms until the
// next 9:00, sleeps, fires, then re-arms for the following day. Re-armed on
// power resume/unlock (a suspended machine's setTimeout does not advance), so a
// laptop that was asleep at 9:00 still gets the digest shortly after waking.
//
// The enabled flag is re-read from config at fire time (not cached), so toggling
// it in Settings takes effect on the next run without restarting the scheduler.
// ---------------------------------------------------------------------------

const DIGEST_HOUR = 9
const DAY_MS = 24 * 60 * 60 * 1000

/** Milliseconds from `now` until the next occurrence of DIGEST_HOUR:00 local. */
export function msUntilNextDigest(now: Date = new Date()): number {
  const next = new Date(now)
  next.setHours(DIGEST_HOUR, 0, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

export class DailyDigestScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null
  // Once stopped (e.g. at app quit), arm() is a no-op. This prevents fire()'s
  // finally block from resurrecting a zombie timer if stop() lands while fire()
  // is mid-await.
  private stopped = false
  private showNotification: (title: string, body: string) => void

  constructor(showNotification: (title: string, body: string) => void) {
    this.showNotification = showNotification
  }

  start(): void {
    this.stopped = false
    this.arm()
  }

  stop(): void {
    this.stopped = true
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  /** Re-arm on wake/unlock (a slept timer may be stale or overdue). */
  onResume(): void {
    this.arm()
  }

  private arm(): void {
    if (this.stopped) return
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.timer = setTimeout(() => {
      void this.fire()
    }, msUntilNextDigest())
  }

  private async fire(): Promise<void> {
    try {
      if (readConfig().dailyDigest?.enabled !== true) return
      const summary = await this.composeSummary()
      if (summary) {
        this.showNotification('Your team yesterday', summary)
      }
    } catch (error) {
      console.error('[daily-digest] failed to compose/fire digest:', error)
    } finally {
      // Always re-arm for the next day, even after an error/skip.
      this.arm()
    }
  }

  /**
   * Build the digest string from genuine TEAM-WIDE data available in the main
   * process — NOT the local user's activity history. The org agents roster
   * (loadOrgAgents: RLS-scoped to the org, so every member's agents) yields the
   * merged-PR count (metadata.repositoryMetadata.prMerged, synced org-wide by the
   * PR-review watcher → OrgAgent.prReviews[].merged) and the tickets-moved-to-Done
   * count (the "Done" workflow column is agent status 'PR merged'). Org usage
   * stats (loadOrgUsageStats, already org-wide) yield the sessions count. Only
   * agents touched within the last ~24h are counted, so "Yesterday your team…"
   * stays honest. Returns null when nothing happened (so we never fire an empty
   * "0 PRs, 0 tickets").
   */
  private async composeSummary(): Promise<string | null> {
    const since = Date.now() - DAY_MS

    let mergedPRs = 0
    let ticketsDone = 0
    try {
      const orgAgents = await getStore().loadOrgAgents()
      for (const agent of orgAgents) {
        // Scope to the digest window via the row's last-write timestamp; an agent
        // with no/older updatedAt is stale roster state, not "yesterday".
        const touched = agent.updatedAt ? Date.parse(agent.updatedAt) : NaN
        if (!Number.isFinite(touched) || touched < since) continue
        // Merged PRs: count every repo whose PR was merged across the team.
        mergedPRs += agent.prReviews?.filter((r) => r.merged === true).length ?? 0
        // Tickets moved to Done: the "Done" workflow column is status 'PR merged'.
        if (agent.status === 'PR merged') ticketsDone += 1
      }
    } catch {
      /* org roster is best-effort — a failure just yields 0 merged/done */
    }

    let sessions = 0
    try {
      const stats = await getStore().loadOrgUsageStats()
      sessions = stats.rows.filter((r) => Date.parse(r.occurredAt) >= since).length
    } catch {
      /* usage is best-effort — a failure just omits the sessions clause */
    }

    if (mergedPRs === 0 && ticketsDone === 0 && sessions === 0) return null

    const parts: string[] = []
    if (mergedPRs > 0) parts.push(`shipped ${mergedPRs} PR${mergedPRs === 1 ? '' : 's'}`)
    if (ticketsDone > 0) parts.push(`moved ${ticketsDone} ticket${ticketsDone === 1 ? '' : 's'} to Done`)
    if (sessions > 0) parts.push(`ran ${sessions} session${sessions === 1 ? '' : 's'}`)

    return `Yesterday your team ${joinParts(parts)}.`
  }
}

/** "a", "a and b", "a, b and c". */
function joinParts(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? ''
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}
