import { BrowserWindow } from 'electron'
import { readConfig } from '../config/config'
import { getAllTerminals, updateTerminalMetadataFromHook } from '../pty/terminal-manager'
import { addHistoryEntry } from '../config/activity-history'
import { fetchPRStatus, type AggregatedReviewStatus } from '../github'
import type { RepositoryMetadata } from '../../types'
import { t } from '../i18n'

const DEFAULT_POLL_INTERVAL_MS = 60_000
const MIN_POLL_INTERVAL_MS = 30_000
const MAX_POLL_INTERVAL_MS = 600_000
const RATE_LIMIT_SAFETY_FLOOR = 500
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000

interface LastKnown {
  status: AggregatedReviewStatus
  updatedAt: number
  /** Tracked so a merge is emitted once per PR, not on every subsequent tick. */
  merged: boolean
}

/**
 * Whether this tick should append a `merged` activity event.
 *
 * Extracted and pure because a silent double-count would live exactly here, and
 * the two guards defend against different things:
 *
 * - `existing.prMerged` is the DURABLE marker. It is persisted in the terminal's
 *   repositoryMetadata alongside the emission, so it survives an app restart —
 *   which the in-memory map does not.
 * - `previous.merged` covers repeat ticks inside a single run.
 *
 * Note the caller must NOT gate this on a review-status transition: a PR that is
 * approved and then merged keeps `status === 'approved'`, so a status-change
 * guard would drop the merge event entirely.
 */
export function shouldEmitMerged(
  previous: { merged: boolean } | undefined,
  snapshot: { merged: boolean },
  existing: Pick<RepositoryMetadata, 'prMerged'>,
): boolean {
  if (!snapshot.merged) return false
  if (existing.prMerged === true) return false
  if (previous?.merged === true) return false
  return true
}

export class PRReviewWatcher {
  private intervalId: ReturnType<typeof setInterval> | null = null
  private pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  private lastTickAt: number | null = null
  private watchingCount: number = 0
  private lastNotifiedAt = new Map<string, number>()
  private lastKnownStatus = new Map<string, LastKnown>()
  private getMainWindow: () => BrowserWindow | null
  private showNotification: (title: string, body: string) => void

  constructor(
    getMainWindow: () => BrowserWindow | null,
    showNotification: (title: string, body: string) => void,
  ) {
    this.getMainWindow = getMainWindow
    this.showNotification = showNotification

    const cfg = readConfig().prReviews
    if (cfg?.pollIntervalMs && cfg.pollIntervalMs >= MIN_POLL_INTERVAL_MS && cfg.pollIntervalMs <= MAX_POLL_INTERVAL_MS) {
      this.pollIntervalMs = cfg.pollIntervalMs
    }
  }

  start(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => { void this.tick() }, this.pollIntervalMs)
    void this.tick()
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  setEnabled(enabled: boolean): void {
    if (enabled) this.start()
    else this.stop()
  }

  setInterval(ms: number): void {
    this.pollIntervalMs = ms
    if (this.intervalId) {
      this.stop()
      this.start()
    }
  }

  getStatus() {
    const config = readConfig()
    return {
      enabled: config.prReviews?.enabled !== false,
      pollIntervalMs: this.pollIntervalMs,
      watchingCount: this.watchingCount,
      lastTickAt: this.lastTickAt,
    }
  }

  onResume(): void {
    void this.tick()
  }

  async tick(): Promise<void> {
    this.lastTickAt = Date.now()

    const config = readConfig()
    if (config.prReviews?.enabled === false) return

    const terminals = getAllTerminals()
    type Target = { terminalId: string; repoPath: string; prUrl: string; existing: RepositoryMetadata }
    const targets: Target[] = []

    for (const terminal of terminals) {
      const repoMap = terminal.metadata?.repositoryMetadata || {}
      for (const [repoPath, repoMeta] of Object.entries(repoMap)) {
        const prUrl = repoMeta?.prUrl
        if (!prUrl) continue
        // Stop polling closed-but-unmerged PRs
        if (repoMeta.prClosed === true && repoMeta.prMerged !== true) continue
        // A merge is terminal: the status cannot change again and the `merged`
        // activity event has already been emitted (prMerged is written with it).
        // Polling on would only burn GitHub rate limit.
        if (repoMeta.prMerged === true) continue
        targets.push({ terminalId: terminal.id, repoPath, prUrl, existing: repoMeta })
      }
    }

    this.watchingCount = targets.length

    for (const target of targets) {
      try {
        const snapshot = await fetchPRStatus(target.prUrl)
        if (!snapshot) continue

        if (snapshot.rateLimitRemaining < RATE_LIMIT_SAFETY_FLOOR) {
          console.warn(`[PRReviewWatcher] Rate limit low (${snapshot.rateLimitRemaining}), skipping remaining PRs this tick`)
          return
        }

        const previous = this.lastKnownStatus.get(target.prUrl)
        if (previous && previous.updatedAt === snapshot.updatedAt) continue

        const mergedRepoMeta: RepositoryMetadata = {
          ...target.existing,
          prReviewStatus: snapshot.status,
          prReviewCommentCount: snapshot.commentCount,
          prReviewers: snapshot.reviewers,
          prReviewUpdatedAt: snapshot.updatedAt,
          prMerged: snapshot.merged,
          prClosed: snapshot.closed,
        }

        updateTerminalMetadataFromHook(target.terminalId, {
          repositoryMetadata: { [target.repoPath]: mergedRepoMeta },
        })

        // History entry on transition
        const prevStatus = previous?.status
        if (prevStatus !== snapshot.status) {
          if (snapshot.status === 'approved' || snapshot.status === 'changes-requested') {
            const terminal = terminals.find(t => t.id === target.terminalId)
            addHistoryEntry({
              agentId: target.terminalId,
              agentName: terminal?.metadata?.title || terminal?.name || target.terminalId,
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
        if (shouldEmitMerged(previous, snapshot, target.existing)) {
          const terminal = terminals.find(t => t.id === target.terminalId)
          addHistoryEntry({
            agentId: target.terminalId,
            agentName: terminal?.metadata?.title || terminal?.name || target.terminalId,
            action: 'merged',
            ticketId: terminal?.metadata?.ticketId,
            description: terminal?.metadata?.description,
            repositories: terminal?.repositories || [],
          })
        }

        // Notify only if window is not focused, on a real transition, respecting cooldown
        const mainWindow = this.getMainWindow()
        const windowFocused = mainWindow?.isFocused() ?? false
        const now = Date.now()
        const lastNotified = this.lastNotifiedAt.get(target.prUrl) || 0
        if (!windowFocused && now - lastNotified > NOTIFICATION_COOLDOWN_MS && prevStatus !== snapshot.status) {
          this.lastNotifiedAt.set(target.prUrl, now)
          this.showNotification(
            t('notification.prReview.title'),
            t('notification.prReview.body', { url: target.prUrl, status: snapshot.status }),
          )
        }

        this.lastKnownStatus.set(target.prUrl, {
          status: snapshot.status,
          updatedAt: snapshot.updatedAt,
          merged: snapshot.merged,
        })

        if (mainWindow) {
          mainWindow.webContents.send('prWatcher:updated', {
            terminalId: target.terminalId,
            repoPath: target.repoPath,
            prUrl: target.prUrl,
            status: snapshot.status,
            commentCount: snapshot.commentCount,
            reviewers: snapshot.reviewers,
            merged: snapshot.merged,
            closed: snapshot.closed,
          })
        }
      } catch (err) {
        console.error(`[PRReviewWatcher] Failed to refresh ${target.prUrl}:`, err)
      }
    }
  }
}
