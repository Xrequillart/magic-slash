import { BrowserWindow } from 'electron'
import { readConfig } from '../config/config'
import { getAllTerminals, updateTerminalMetadataFromHook } from '../pty/terminal-manager'
import { addHistoryEntry } from '../config/activity-history'
import { fetchPRStatus } from '../github'
import { shouldEmitMerged } from './merge-detection'
import {
  nextInterval,
  nextBackoff,
  snapshotKey,
  isTerminalPR,
  clampPollInterval,
  DEFAULT_POLL_INTERVAL_MS,
  MAX_POLL_INTERVAL_MS,
} from './scheduling'
import type {
  AggregatedReviewStatus,
  PRCheck,
  PRStatusError,
  PRStatusSnapshot,
  PRWatchError,
  RepositoryMetadata,
} from '../../types'
import { isPRStatusError } from '../../types'
import { t } from '../i18n'

/**
 * Remaining GraphQL budget below which the watcher stops writing this tick.
 *
 * Expressed in GraphQL POINTS, not REST requests: the GraphQL API has its own
 * 5000 points/hour pool, entirely separate from the REST pool the old code read.
 * 500 points is 10 % of that hourly budget, which leaves room for the things the
 * user actually triggers (skills shelling out to `gh`) after the watcher has
 * decided to stand down.
 */
const RATE_LIMIT_SAFETY_FLOOR = 500
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000

/**
 * Minimum spacing between two user-triggered ticks (window focus, manual
 * refresh). Alt-tabbing is not a request for fresh data, and without this an
 * alt-tab-heavy minute would issue a GraphQL query per PR per switch.
 */
const USER_TICK_THROTTLE_MS = 15_000

/** Names shown on the card are a preview, not a list — the full set lives on GitHub. */
const CHECK_NAMES_CAP = 5

interface LastKnown {
  status: AggregatedReviewStatus
  /** Tracked so a merge is emitted once per PR, not on every subsequent tick. */
  merged: boolean
  /** Composite identity (head SHA + updatedAt + rollup + check/comment counts) — see `snapshotKey`. */
  key: string
}

/** One card to keep up to date: a repository entry, on a terminal, carrying a PR URL. */
interface Target {
  terminalId: string
  repoPath: string
  prUrl: string
  existing: RepositoryMetadata
}

/** Backoff bookkeeping for a PR whose last read failed. */
interface RetryState {
  /** Consecutive failures, feeding the backoff ladder. */
  attempt: number
  /** Epoch ms before which this PR must not be read again. */
  notBefore: number
}

interface TickOptions {
  /**
   * Run even when `prReviews.enabled` is false, and ignore the per-PR backoff.
   * Set only by an explicit user action: the card stays visible when the watcher
   * is switched off, so its refresh button must not silently no-op.
   */
  force?: boolean
  /** Restrict the tick to a single PR (manual refresh of one card). */
  prUrl?: string
}

export class PRReviewWatcher {
  /**
   * A self-rescheduling timeout, NOT a fixed interval: the cadence is recomputed
   * after every tick from what the PRs actually look like (see `scheduleNext`).
   */
  private timeoutId: ReturnType<typeof setTimeout> | null = null
  /** Whether the watcher is supposed to keep polling — survives an in-flight tick. */
  private active = false
  /** Guards against overlapping ticks (a slow tick + a focus tick). */
  private ticking = false
  private pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  private lastTickAt: number | null = null
  private watchingCount: number = 0
  private lastNotifiedAt = new Map<string, number>()
  private lastKnownStatus = new Map<string, LastKnown>()
  /** Attempt count + earliest next read, per failing PR. Always written and cleared together. */
  private retries = new Map<string, RetryState>()
  private getMainWindow: () => BrowserWindow | null
  private showNotification: (title: string, body: string) => void

  constructor(
    getMainWindow: () => BrowserWindow | null,
    showNotification: (title: string, body: string) => void,
  ) {
    this.getMainWindow = getMainWindow
    this.showNotification = showNotification

    // Same clamping as `setInterval()`: one rule for "what cadence is allowed",
    // wherever the value comes from.
    this.pollIntervalMs = clampPollInterval(readConfig().prReviews?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS)
  }

  start(): void {
    if (this.active) return
    this.active = true
    void this.tick()
  }

  stop(): void {
    this.active = false
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  setEnabled(enabled: boolean): void {
    if (enabled) this.start()
    else this.stop()
  }

  setInterval(ms: number): void {
    // Clamped here as well as at the IPC boundary: this method is also reached
    // from the remote-sync mirror, and a row carrying a bad value must not be
    // able to drive the timer.
    this.pollIntervalMs = clampPollInterval(ms)
    if (this.active) {
      this.stop()
      this.start()
    }
  }

  getStatus() {
    const config = readConfig()
    return {
      // Absent means ON — the same reading as tick(), and as pr-review-handlers.ts.
      enabled: config.prReviews?.enabled !== false,
      pollIntervalMs: this.pollIntervalMs,
      watchingCount: this.watchingCount,
      lastTickAt: this.lastTickAt,
    }
  }

  onResume(): void {
    void this.tick()
  }

  /**
   * `/magic:pr` just attached a PR URL to a repository (via the `/metadata` hook).
   * Nothing used to wake the watcher on that, so a freshly created PR showed an
   * empty card for up to a full poll interval. Scoped to the announced URL: one
   * new PR is one query, not a sweep of every PR on the machine, and a single-PR
   * tick deliberately leaves the shared timer alone.
   */
  onPRUrlAnnounced(prUrl: string): void {
    void this.tick({ prUrl })
  }

  /**
   * The window came to the front. Throttled, because alt-tabbing through the app
   * a dozen times is not a dozen requests for fresh data.
   */
  onFocus(): void {
    if (this.isThrottled()) return
    void this.tick()
  }

  /**
   * Explicit user refresh, from the card's button.
   *
   * Shares the focus throttle rather than tracking an in-flight request per PR:
   * one clock, one rule, and a double-click cannot double the GraphQL cost.
   * Returns whether a read was actually issued so the UI can keep the spinner
   * honest.
   */
  async refresh(prUrl?: string): Promise<{ refreshed: boolean }> {
    if (this.isThrottled()) return { refreshed: false }
    // Report what `tick` actually did, not what we asked it to do: it also bails
    // on the concurrency guard, and claiming success there stops the card's
    // spinner with no fresh data and no explanation.
    const refreshed = await this.tick({ force: true, prUrl })
    return { refreshed }
  }

  private isThrottled(): boolean {
    return this.lastTickAt !== null && Date.now() - this.lastTickAt < USER_TICK_THROTTLE_MS
  }

  /** Arms the next tick, unless the watcher has been switched off meanwhile. */
  private scheduleNext(delayMs: number): void {
    if (!this.active) return
    if (this.timeoutId) clearTimeout(this.timeoutId)
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null
      void this.tick()
    }, clampPollInterval(delayMs))
  }

  /** Resolves to whether this call actually performed a read pass. */
  async tick(options: TickOptions = {}): Promise<boolean> {
    if (this.ticking) return false
    this.ticking = true
    this.lastTickAt = Date.now()

    // A single-PR refresh must not re-arm the shared timer: the cadence it would
    // compute describes one PR, and applying it would delay all the others.
    const reschedule = !options.prUrl
    // Seed with the configured cadence so a tick that finds nothing to poll still
    // comes back to discover newly created PRs.
    const candidateDelays: number[] = [this.pollIntervalMs]
    // Overrides the min above: a low GraphQL budget is a reason to slow EVERYTHING
    // down, and a min() over per-PR cadences could never express that.
    let budgetLow = false

    try {
      const config = readConfig()
      // Absent means ENABLED. An explicit refresh bypasses the setting entirely.
      if (!options.force && config.prReviews?.enabled === false) return false

      const terminals = getAllTerminals()
      const targets: Target[] = []

      for (const terminal of terminals) {
        const repoMap = terminal.metadata?.repositoryMetadata || {}
        for (const [repoPath, repoMeta] of Object.entries(repoMap)) {
          const prUrl = repoMeta?.prUrl
          if (!prUrl) continue
          if (options.prUrl && prUrl !== options.prUrl) continue
          // Merged or closed is terminal: the status cannot change again, the
          // `merged` activity event has already been emitted (prMerged is written
          // with it), and polling on would only burn GraphQL budget. Same
          // predicate as the post-read cadence decision below.
          if (isTerminalPR({
            state: repoMeta.prState,
            merged: repoMeta.prMerged === true,
            closed: repoMeta.prClosed === true,
          })) continue
          targets.push({ terminalId: terminal.id, repoPath, prUrl, existing: repoMeta })
        }
      }

      this.watchingCount = targets.length

      // The SAME PR can be attached to several targets — two agents on one repo,
      // or one agent with the repo mounted twice. Reading it once per target would
      // spend N queries where one suffices, and would let the first target's
      // change-detection entry make the others look unchanged. Group first, read
      // once, then fan the single result out to every target that shares the URL.
      const byUrl = new Map<string, Target[]>()
      for (const target of targets) {
        const group = byUrl.get(target.prUrl)
        if (group) group.push(target)
        else byUrl.set(target.prUrl, [target])
      }

      for (const [prUrl, group] of byUrl) {
        const now = Date.now()
        const notBefore = this.retries.get(prUrl)?.notBefore ?? 0
        if (!options.force && notBefore > now) {
          // Still in backoff. Keep the timer aware of when it becomes readable again.
          candidateDelays.push(notBefore - now)
          continue
        }

        try {
          const result: PRStatusSnapshot | PRStatusError | null = await fetchPRStatus(prUrl)
          // null means the URL never parsed as a PR — nothing to report, nothing to retry.
          if (result === null) continue

          if (isPRStatusError(result)) {
            candidateDelays.push(this.noteFailure(group, result.error, result.retryAtMs))
            continue
          }

          this.retries.delete(prUrl)
          for (const target of group) {
            this.applySnapshot(target.terminalId, target.repoPath, prUrl, target.existing, result, terminals)
          }

          if (result.rateLimitRemaining < RATE_LIMIT_SAFETY_FLOOR) {
            // `continue`, not `return`: bailing out of the whole tick always
            // starved the SAME PRs, since the loop order follows the terminal
            // list. The snapshot in hand is applied regardless — its points are
            // already spent — and the budget is protected by stretching the
            // cadence to the ceiling instead of by dropping PRs.
            console.warn(`[PRReviewWatcher] GraphQL budget low (${result.rateLimitRemaining} points), backing off`)
            budgetLow = true
            continue
          }

          const interval = nextInterval({
            hasRunningChecks: result.checksSummary.running > 0,
            isTerminal: isTerminalPR({ state: result.state, merged: result.merged, closed: result.closed }),
            configuredMs: this.pollIntervalMs,
          })
          if (interval !== null) candidateDelays.push(interval)
        } catch (err) {
          console.error(`[PRReviewWatcher] Failed to refresh ${prUrl}:`, err)
          candidateDelays.push(this.noteFailure(group, 'network'))
        }
      }
      return true
    } finally {
      this.ticking = false
      if (reschedule) {
        this.scheduleNext(budgetLow ? MAX_POLL_INTERVAL_MS : Math.min(...candidateDelays))
      } else if (this.active && this.timeoutId === null) {
        // A single-PR tick must not re-arm the shared cadence with a delay computed
        // from one PR — but it must not leave the watcher unarmed either. That is
        // exactly what happened when the periodic timer fired mid-refresh: it nulled
        // `timeoutId`, its own `tick()` bailed on the `ticking` guard, and this
        // `finally` skipped rescheduling, so polling stopped until the next focus
        // event or restart. Re-arm at the configured cadence instead.
        this.scheduleNext(this.pollIntervalMs)
      }
    }
  }

  /**
   * Records a failed read: advances the backoff ladder and persists the error so
   * the card can name it. Returns the backoff delay, for the tick's cadence maths.
   *
   * The persist is gated on the error VALUE moving, and `prLastCheckedAt` is
   * deliberately OUTSIDE that comparison: it changes on every single tick, so
   * letting it decide would make the gate meaningless and put a Supabase agent
   * write on the queue every 60 s per agent for as long as `gh` stays logged out.
   * It rides along with the writes that happen for another reason instead, which
   * is why the card's freshness stamp freezes during a sustained outage — the
   * error message beside it is the live signal.
   *
   * Written BEFORE any change-detection guard: routing failures through the same
   * `continue` as an unchanged snapshot is what kept them mute.
   */
  private noteFailure(group: Target[], error: PRWatchError, retryAtMs?: number): number {
    const prUrl = group[0].prUrl
    const attempt = (this.retries.get(prUrl)?.attempt ?? 0) + 1
    const now = Date.now()
    // `retryAtMs` is an absolute deadline, not a duration — `nextBackoff`
    // converts it against the same `now` used to arm `notBefore` below.
    const backoff = nextBackoff(attempt, retryAtMs, now)
    this.retries.set(prUrl, { attempt, notBefore: now + backoff })

    // Every card showing this PR must name the failure, not just the first one:
    // the backoff is per URL, but the error is rendered per target.
    for (const target of group) {
      // `existing` is re-read from the terminal metadata on every tick, so it is
      // the authoritative record of what was last persisted.
      if (target.existing.prWatchError === error) continue
      updateTerminalMetadataFromHook(target.terminalId, {
        repositoryMetadata: {
          [target.repoPath]: { ...target.existing, prWatchError: error, prLastCheckedAt: now },
        },
      })
    }

    return backoff
  }

  private applySnapshot(
    terminalId: string,
    repoPath: string,
    prUrl: string,
    existing: RepositoryMetadata,
    snapshot: PRStatusSnapshot,
    terminals: ReturnType<typeof getAllTerminals>,
  ): void {
    const now = Date.now()
    const key = snapshotKey(
      snapshot.headSha,
      snapshot.updatedAt,
      snapshot.rollupState,
      snapshot.checksSummary,
      snapshot.commentCounts,
      {
        status: snapshot.status,
        state: snapshot.state,
        mergeable: snapshot.mergeable,
        reviewers: snapshot.reviewers,
      },
    )
    // Keyed by TARGET, not by URL: one PR can feed several cards, and a URL-wide
    // entry would let the first card mark the snapshot "seen" and leave every
    // other card empty. History entries and the merge event are per agent too, so
    // per-target state is the correct scope for all three.
    const targetKey = `${terminalId}|${repoPath}|${prUrl}`
    const previous = this.lastKnownStatus.get(targetKey)
    // A stale error must be cleared even when nothing else moved, otherwise a
    // transient failure stays on the card forever.
    if (previous && previous.key === key && existing.prWatchError === undefined) return

    const checkNames = (state: PRCheck['state']): string[] =>
      snapshot.checks.filter(c => c.state === state).map(c => c.name).slice(0, CHECK_NAMES_CAP)

    const repoMeta: RepositoryMetadata = {
      ...existing,
      // Legacy fields, still read by RepositoryCard and by the Team page.
      prReviewStatus: snapshot.status,
      prReviewCommentCount: snapshot.commentCount,
      prReviewers: snapshot.reviewers,
      prReviewUpdatedAt: snapshot.updatedAt,
      prMerged: snapshot.merged,
      prClosed: snapshot.closed,
      prState: snapshot.state,
      prChecks: snapshot.checksSummary,
      prRunningChecks: checkNames('running'),
      prFailedChecks: checkNames('failed'),
      prCommentCounts: snapshot.commentCounts,
      // Already deduped and capped by `mapPullRequestToSnapshot`.
      prCommentAuthors: snapshot.commentAuthors,
      prLastCheckedAt: now,
    }
    // Absent, not `undefined`: GitHub reporting UNKNOWN must render as "unknown",
    // and the metadata merge only strips undefined at the top level.
    if (snapshot.mergeable === undefined) delete repoMeta.prMergeable
    else repoMeta.prMergeable = snapshot.mergeable
    // A successful read clears any previous failure.
    delete repoMeta.prWatchError

    updateTerminalMetadataFromHook(terminalId, {
      repositoryMetadata: { [repoPath]: repoMeta },
    })

    // History entry on transition
    const prevStatus = previous?.status
    if (prevStatus !== snapshot.status) {
      if (snapshot.status === 'approved' || snapshot.status === 'changes-requested') {
        const terminal = terminals.find(t => t.id === terminalId)
        addHistoryEntry({
          agentId: terminalId,
          agentName: terminal?.metadata?.title || terminal?.name || terminalId,
          action: snapshot.status === 'approved' ? 'review_approved' : 'review_changes_requested',
          ticketId: terminal?.metadata?.ticketId,
          description: terminal?.metadata?.description,
          repositories: terminal?.repositories || [],
        })
      }
    }

    // Merge is GitHub-sourced, so the flow metrics get a reliable cycle end
    // even when nobody runs /magic:done. Deliberately OUTSIDE the status
    // transition above: merging an approved PR leaves `status` at 'approved',
    // so gating on a status change would drop this event.
    if (shouldEmitMerged(previous, snapshot, existing)) {
      const terminal = terminals.find(t => t.id === terminalId)
      addHistoryEntry({
        agentId: terminalId,
        agentName: terminal?.metadata?.title || terminal?.name || terminalId,
        action: 'merged',
        ticketId: terminal?.metadata?.ticketId,
        description: terminal?.metadata?.description,
        repositories: terminal?.repositories || [],
      })
    }

    // Notify only if window is not focused, on a real transition, respecting cooldown
    const mainWindow = this.getMainWindow()
    const windowFocused = mainWindow?.isFocused() ?? false
    const lastNotified = this.lastNotifiedAt.get(prUrl) || 0
    if (!windowFocused && now - lastNotified > NOTIFICATION_COOLDOWN_MS && prevStatus !== snapshot.status) {
      this.lastNotifiedAt.set(prUrl, now)
      this.showNotification(
        t('notification.prReview.title'),
        t('notification.prReview.body', { url: prUrl, status: snapshot.status }),
      )
    }

    this.lastKnownStatus.set(targetKey, {
      status: snapshot.status,
      merged: snapshot.merged,
      key,
    })

    // A nudge, not the data source: the authoritative copy of the whole snapshot
    // reaches the renderer through `terminal:metadata` (repositoryMetadata), so
    // this payload deliberately stays at what it has always carried.
    if (mainWindow) {
      mainWindow.webContents.send('prWatcher:updated', {
        terminalId,
        repoPath,
        prUrl,
        status: snapshot.status,
        commentCount: snapshot.commentCount,
        reviewers: snapshot.reviewers,
        merged: snapshot.merged,
        closed: snapshot.closed,
      })
    }
  }
}
