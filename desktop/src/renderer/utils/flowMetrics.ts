import type { HistoryAction, OrgActivityEvent, OrgAgent } from '../../types'

/**
 * Flow metrics for the Team page: "where is it stuck right now?".
 *
 * Two properties of the underlying data drive every design decision here, and
 * both are easy to get wrong in a way that silently flatters the numbers:
 *
 * 1. `activity_events.agent_id` is NOT durable. The DB nulls it when the agent row
 *    is deleted, and closing an agent deletes its row — so every event of a
 *    FINISHED ticket has `agentId === null`. Correlating on agentId would measure
 *    only unfinished work, i.e. pure survivorship bias. `ticketId` is the durable
 *    key, so `flowKeyOf` prefers it and agent-keyed flows are a live-only fallback.
 *
 * 2. `occurred_at` is written client-side, by whichever machine ran the skill. Two
 *    people on one ticket (via pickUpTask) means two clocks, so negative durations
 *    are a real outcome, not a theoretical one. They are dropped and counted.
 *
 * Everything in this module is pure: no React, no `window`, no `Date.now()` except
 * where a caller passes `now` in explicitly.
 */

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

/** A cycle longer than this is a forgotten ticket, not a measurement. */
const MAX_PLAUSIBLE_DURATION_MS = 60 * 24 * 60 * 60 * 1000

/**
 * Two events of the same kind closer together than this are one occurrence. A
 * multi-repo ticket emits one review verdict per PR, so its two `changes
 * requested` events would otherwise read as two rounds of rework.
 */
const SAME_OCCURRENCE_WINDOW_MS = 60_000

/** Below this many samples a median is noise; see `summarizeSamples`. */
const MIN_SAMPLES_FOR_MEDIAN = 3
const MIN_SAMPLES_FOR_TREND = 6

/** How long an item may sit in a stage before it counts as stalled. */
export const STALL_THRESHOLDS_MS: Record<FlowStage, number> = {
  coding: 5 * 24 * 60 * 60 * 1000,
  awaiting_review: 48 * 60 * 60 * 1000,
  changes_requested: 24 * 60 * 60 * 1000,
  ready_to_merge: 24 * 60 * 60 * 1000,
}

/**
 * Canonical pipeline order, used ONLY to break ties between events sharing a
 * timestamp. A single skill run can write two statuses in the same millisecond
 * (e.g. `in progress` then `PR created`); without this the sort order is
 * arbitrary and the resulting duration can come out negative.
 */
const STAGE_RANK: Record<string, number> = {
  agent_created: 0,
  started: 1,
  pr_created: 2,
  review: 3,
  review_approved: 4,
  review_changes_requested: 4,
  review_addressed: 5,
  merged: 6,
  agent_closed: 7,
}

const VERDICT_ACTIONS: readonly HistoryAction[] = ['review_approved', 'review_changes_requested']

/** Workflow statuses that mean the author is still writing code. */
const CODING_STATUSES: ReadonlySet<string> = new Set([
  'in progress',
  'committed',
  'ready for PR',
  'Review addressed',
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlowStage = 'coding' | 'awaiting_review' | 'changes_requested' | 'ready_to_merge'

export const FLOW_STAGES: readonly FlowStage[] = ['coding', 'awaiting_review', 'changes_requested', 'ready_to_merge']

/** One pass through the workflow for one ticket. A reopened ticket yields several. */
export interface TicketFlow {
  key: string
  startedAt: number | null
  prCreatedAt: number | null
  firstResponseAt: number | null
  /**
   * True when `firstResponseAt` came from a bare `review` event instead of a
   * verdict. Historic rows collapsed 'in review' and 'Review addressed' into one
   * action, so such a sample may actually be the author re-pushing — it is
   * counted, but callers can surface it as lower-confidence.
   */
  firstResponseWeak: boolean
  approvedAt: number | null
  mergedAt: number | null
  reworkRounds: number
}

export interface FlowSamples {
  coding: number[]
  reviewWait: number[]
  prToMerge: number[]
  leadTime: number[]
  /** Cycles that reached a PR, the denominator of the rework rate. */
  cyclesWithPr: number
  cyclesWithRework: number
  /** Review-wait samples inferred from a bare `review` event. */
  weakReviewWait: number
  /** PR opened, no verdict and no merge yet — excluded from every median. */
  inFlight: number
  /** PR exists but no `started`: excluded from coding and lead time. */
  leftCensored: number
  clockSkewDropped: number
  outliersExcluded: number
}

export type Confidence = 'none' | 'raw' | 'weak' | 'ok'

export interface MetricSummary {
  n: number
  confidence: Confidence
  medianMs: number | null
  p25Ms: number | null
  p75Ms: number | null
  /** Populated only at confidence 'raw' (n of 1-2), where a median would mislead. */
  raw: number[]
  /** Relative change vs the previous window. Only at confidence 'ok'. */
  deltaRatio: number | null
}

export interface WeekBucket {
  weekStartMs: number
  count: number
  /**
   * False when the week predates the oldest event the read could return, so the
   * UI can render "unknown" instead of a zero that looks like a real result.
   */
  trusted: boolean
}

export interface PipelineEntry {
  agent: OrgAgent
  stage: FlowStage
  enteredAt: number | null
  ageMs: number | null
  stalled: boolean
}

export interface PipelineStageSummary {
  stage: FlowStage
  count: number
  /** Age of the longest-waiting item in this stage, null when no age is knowable. */
  oldestAgeMs: number | null
  stalledCount: number
}

// ---------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Linear-interpolated percentile; `p` in [0, 1]. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const idx = (sorted.length - 1) * Math.min(Math.max(p, 0), 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

// ---------------------------------------------------------------------------
// Local-time bucketing
// ---------------------------------------------------------------------------

/**
 * `YYYY-MM-DD` in LOCAL time. Bucketing is local so "when was this stuck" reads
 * in the viewer's own days; durations are always computed in epoch ms, never from
 * these keys, so a 25-hour DST day still yields an exact 25-hour duration.
 */
export function toLocalDateKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Midnight local time on the Monday of this timestamp's week. */
export function startOfLocalWeek(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  // getDay(): 0 = Sunday. Shift so Monday is the first day.
  const dayFromMonday = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dayFromMonday)
  return d.getTime()
}

// ---------------------------------------------------------------------------
// Grouping events into cycles
// ---------------------------------------------------------------------------

/**
 * The durable correlation key. `ticketId` first: it survives the agent row being
 * deleted, which is what makes finished tickets measurable at all. The `agent:`
 * fallback only ever matches still-live agents.
 */
export function flowKeyOf(event: Pick<OrgActivityEvent, 'ticketId' | 'agentId'>): string | null {
  if (event.ticketId) return event.ticketId
  if (event.agentId) return `agent:${event.agentId}`
  return null
}

export interface GroupedEvents {
  byKey: Map<string, OrgActivityEvent[]>
  /** Events with neither a ticket nor a live agent — permanently unmeasurable. */
  unattributed: number
}

/**
 * Group by flow key, sort ascending, and collapse duplicates. Sorting is by
 * timestamp then by canonical stage rank, so same-millisecond writes land in
 * pipeline order rather than arbitrary order.
 */
export function groupEventsByFlowKey(events: OrgActivityEvent[]): GroupedEvents {
  const byKey = new Map<string, OrgActivityEvent[]>()
  let unattributed = 0

  for (const event of events) {
    const key = flowKeyOf(event)
    if (!key) {
      unattributed += 1
      continue
    }
    const list = byKey.get(key)
    if (list) list.push(event)
    else byKey.set(key, [event])
  }

  for (const [key, list] of byKey) {
    list.sort((a, b) => {
      const ta = Date.parse(a.occurredAt)
      const tb = Date.parse(b.occurredAt)
      if (ta !== tb) return ta - tb
      return (STAGE_RANK[a.action] ?? 3) - (STAGE_RANK[b.action] ?? 3)
    })

    // Dedupe at one-second resolution: guards double metadata writes, and the
    // case where both a skill and the PR watcher report the same verdict.
    const seen = new Set<string>()
    const deduped = list.filter((e) => {
      const bucket = `${e.action}|${Math.floor(Date.parse(e.occurredAt) / 1000)}`
      if (seen.has(bucket)) return false
      seen.add(bucket)
      return true
    })
    byKey.set(key, deduped)
  }

  return { byKey, unattributed }
}

/**
 * Split one key's events into independent passes. A `merged` closes a cycle; a
 * later `started`/`pr_created` opens the next one. Without this, a ticket reopened
 * a month after merging would read as a single three-month cycle.
 */
export function splitIntoCycles(sorted: OrgActivityEvent[]): OrgActivityEvent[][] {
  const cycles: OrgActivityEvent[][] = []
  let current: OrgActivityEvent[] = []
  let closed = false

  for (const event of sorted) {
    if (closed) {
      if (event.action === 'started' || event.action === 'pr_created') {
        cycles.push(current)
        current = [event]
        closed = false
      }
      // Trailing noise after a merge (agent_closed…) belongs to no cycle.
      continue
    }
    current.push(event)
    if (event.action === 'merged') closed = true
  }

  if (current.length > 0) cycles.push(current)
  return cycles
}

/** Resolve one cycle's anchors. `events` must be sorted ascending. */
export function resolveCycle(key: string, events: OrgActivityEvent[]): TicketFlow {
  const at = (e: OrgActivityEvent) => Date.parse(e.occurredAt)

  const firstOf = (actions: readonly HistoryAction[], from: number | null, strict = false): number | null => {
    for (const e of events) {
      if (!actions.includes(e.action)) continue
      const t = at(e)
      if (Number.isNaN(t)) continue
      if (from === null) return t
      if (strict ? t > from : t >= from) return t
    }
    return null
  }

  // Earliest `started`, not the latest: a ticket parked for a week between two
  // /magic:continue runs really did take that long, and taking the latest would
  // quietly forgive it.
  const startedAt = firstOf(['started'], null)

  // `pr_created` and `merged` are taken unconditionally within the cycle rather
  // than gated on the previous anchor. Gating them on `startedAt` looks tidier but
  // is worse: with two machines on one ticket, a `pr_created` timestamped before
  // `started` would fail the gate and the PR would vanish entirely — taking the
  // review wait, the merge and the rework count down with it. Instead the anchors
  // stand and only the DURATIONS that come out negative are rejected as skew,
  // which loses exactly one number instead of the whole cycle.
  const prCreatedAt = firstOf(['pr_created'], null)

  // Prefer an explicit verdict. A bare `review` is only a fallback because
  // historic rows collapsed 'in review' with the author's own 'Review addressed'.
  let firstResponseAt: number | null = null
  let firstResponseWeak = false
  if (prCreatedAt !== null) {
    firstResponseAt = firstOf(VERDICT_ACTIONS, prCreatedAt, true)
    if (firstResponseAt === null) {
      firstResponseAt = firstOf(['review'], prCreatedAt, true)
      firstResponseWeak = firstResponseAt !== null
    }
  }

  // A verdict recorded before the PR existed belongs to another cycle or is noise,
  // and yields no meaningful duration — so these two stay gated.
  const approvedAt = prCreatedAt === null ? null : firstOf(['review_approved'], prCreatedAt, true)
  const mergedAt = firstOf(['merged'], null)

  // Count rework rounds, collapsing same-occurrence bursts from multi-repo PRs.
  let reworkRounds = 0
  let lastReworkAt: number | null = null
  for (const e of events) {
    if (e.action !== 'review_changes_requested') continue
    const t = at(e)
    if (Number.isNaN(t)) continue
    if (prCreatedAt !== null && t < prCreatedAt) continue
    if (lastReworkAt !== null && t - lastReworkAt < SAME_OCCURRENCE_WINDOW_MS) continue
    reworkRounds += 1
    lastReworkAt = t
  }

  return { key, startedAt, prCreatedAt, firstResponseAt, firstResponseWeak, approvedAt, mergedAt, reworkRounds }
}

/** Every measurable pass through the workflow, across every ticket. */
export function buildTicketFlows(events: OrgActivityEvent[]): { flows: TicketFlow[]; unattributed: number } {
  const { byKey, unattributed } = groupEventsByFlowKey(events)
  const flows: TicketFlow[] = []
  for (const [key, list] of byKey) {
    for (const cycle of splitIntoCycles(list)) {
      flows.push(resolveCycle(key, cycle))
    }
  }
  return { flows, unattributed }
}

// ---------------------------------------------------------------------------
// Durations
// ---------------------------------------------------------------------------

/**
 * Turn flows into duration samples.
 *
 * A sample belongs to the window when the duration's END anchor falls inside it —
 * not its start. A ticket opened 40 days ago and merged yesterday genuinely is
 * yesterday's lead time, and filtering on the start anchor would hide exactly the
 * slow tickets the page exists to reveal.
 */
export function collectStageDurations(flows: TicketFlow[], fromMs: number, toMs: number): FlowSamples {
  const s: FlowSamples = {
    coding: [], reviewWait: [], prToMerge: [], leadTime: [],
    cyclesWithPr: 0, cyclesWithRework: 0, weakReviewWait: 0,
    inFlight: 0, leftCensored: 0, clockSkewDropped: 0, outliersExcluded: 0,
  }

  const inWindow = (endAnchor: number) => endAnchor >= fromMs && endAnchor < toMs

  /** Push a duration, or account for why it was rejected. Returns nothing. */
  const push = (bucket: number[], start: number | null, end: number | null) => {
    if (start === null || end === null) return
    if (!inWindow(end)) return
    const d = end - start
    if (d < 0) { s.clockSkewDropped += 1; return }
    if (d > MAX_PLAUSIBLE_DURATION_MS) { s.outliersExcluded += 1; return }
    bucket.push(d)
  }

  for (const f of flows) {
    if (f.prCreatedAt !== null && inWindow(f.prCreatedAt)) {
      s.cyclesWithPr += 1
      if (f.reworkRounds > 0) s.cyclesWithRework += 1
    }

    // Left-censored: a PR with no recorded start. The review-wait sample below is
    // still valid, only coding and lead time are unmeasurable.
    if (f.prCreatedAt !== null && f.startedAt === null && inWindow(f.prCreatedAt)) {
      s.leftCensored += 1
    }

    // Right-censored: still open. Excluded from every median — counting only
    // finished work would make the numbers look better the more things stall.
    if (f.prCreatedAt !== null && f.firstResponseAt === null && f.mergedAt === null) {
      s.inFlight += 1
    }

    push(s.coding, f.startedAt, f.prCreatedAt)

    const before = s.reviewWait.length
    push(s.reviewWait, f.prCreatedAt, f.firstResponseAt)
    if (s.reviewWait.length > before && f.firstResponseWeak) s.weakReviewWait += 1

    push(s.prToMerge, f.prCreatedAt, f.mergedAt)
    push(s.leadTime, f.startedAt, f.mergedAt)
  }

  return s
}

/**
 * Wrap a sample set in an honest summary. The confidence ladder is the whole
 * point: a small team produces a handful of cycles a month, and a median of two
 * values presented as a headline number is worse than no number at all.
 */
export function summarizeSamples(samples: number[], previous?: number[]): MetricSummary {
  const n = samples.length
  if (n === 0) {
    return { n: 0, confidence: 'none', medianMs: null, p25Ms: null, p75Ms: null, raw: [], deltaRatio: null }
  }
  if (n < MIN_SAMPLES_FOR_MEDIAN) {
    return {
      n,
      confidence: 'raw',
      medianMs: null,
      p25Ms: null,
      p75Ms: null,
      raw: [...samples].sort((a, b) => a - b),
      deltaRatio: null,
    }
  }

  const medianMs = median(samples)
  if (n < MIN_SAMPLES_FOR_TREND) {
    // Enough for a median, not enough for a spread or a trend.
    return { n, confidence: 'weak', medianMs, p25Ms: null, p75Ms: null, raw: [], deltaRatio: null }
  }

  const prevMedian = previous && previous.length >= MIN_SAMPLES_FOR_MEDIAN ? median(previous) : null
  const deltaRatio = prevMedian !== null && prevMedian > 0 && medianMs !== null
    ? (medianMs - prevMedian) / prevMedian
    : null

  return {
    n,
    confidence: 'ok',
    medianMs,
    p25Ms: percentile(samples, 0.25),
    p75Ms: percentile(samples, 0.75),
    raw: [],
    deltaRatio,
  }
}

/**
 * How the median lead time splits across stages.
 *
 * Three segments, not four: rework is a COUNT, not a duration — we know how many
 * times changes were requested, never how long each round took. Inventing a
 * rework segment would mean inventing data, so it stays a separate rate.
 */
export function stageTimeBreakdown(samples: FlowSamples): { coding: number; reviewWait: number; toMerge: number } | null {
  const coding = median(samples.coding) ?? 0
  const reviewWait = median(samples.reviewWait) ?? 0
  const prToMerge = median(samples.prToMerge) ?? 0
  // The tail after the first response. Clamped: these are independent medians, so
  // nothing guarantees prToMerge exceeds reviewWait on small samples.
  const toMerge = Math.max(prToMerge - reviewWait, 0)
  if (coding + reviewWait + toMerge === 0) return null
  return { coding, reviewWait, toMerge }
}

/**
 * Merged cycles per local week, newest week last. `trustedFromMs` is the oldest
 * event the read could return: weeks before it are marked untrusted so the UI can
 * distinguish "nothing shipped" from "we cannot see that far back".
 */
export function computeThroughputByWeek(
  flows: TicketFlow[],
  nowMs: number,
  weeks: number,
  trustedFromMs: number,
): WeekBucket[] {
  const currentWeekStart = startOfLocalWeek(nowMs)
  const buckets: WeekBucket[] = []
  const counts = new Map<number, number>()

  for (const f of flows) {
    if (f.mergedAt === null) continue
    const weekStart = startOfLocalWeek(f.mergedAt)
    counts.set(weekStart, (counts.get(weekStart) ?? 0) + 1)
  }

  for (let i = weeks - 1; i >= 0; i -= 1) {
    // Step back by whole days rather than subtracting 7×86400e3, so a DST shift
    // inside the range cannot slide a bucket boundary off midnight.
    const d = new Date(currentWeekStart)
    d.setDate(d.getDate() - i * 7)
    const weekStartMs = d.getTime()
    buckets.push({
      weekStartMs,
      count: counts.get(weekStartMs) ?? 0,
      trusted: weekStartMs >= startOfLocalWeek(trustedFromMs),
    })
  }

  return buckets
}

// ---------------------------------------------------------------------------
// The live board
// ---------------------------------------------------------------------------

/**
 * Which stage an agent is in right now, from the realtime org roster.
 *
 * The priority order is load-bearing, and multi-repo tickets are what make it so.
 * A ticket is only as advanced as its LEAST advanced PR:
 *
 * - One repo asking for changes blocks the ticket, whatever the others say.
 * - `ready_to_merge` therefore requires EVERY live review to be approved. Accepting
 *   "any approved" would call a ticket mergeable while a second PR still waits for
 *   its first look — and then flag it as "approved, not merged" 24h later, which is
 *   both wrong and noisy.
 *
 * Returns null for work that is finished or cannot be classified.
 */
export function classifyAgentStage(agent: OrgAgent): FlowStage | null {
  const live = (agent.prReviews ?? []).filter((r) => !r.merged && !r.closed)

  if (agent.status === 'changes requested' || live.some((r) => r.status === 'changes-requested')) {
    return 'changes_requested'
  }
  if (live.length > 0 && live.every((r) => r.status === 'approved')) return 'ready_to_merge'
  if (live.some((r) => r.status === 'pending' || r.status === 'commented' || !!r.prUrl)) {
    return 'awaiting_review'
  }
  if (agent.status && CODING_STATUSES.has(agent.status)) return 'coding'
  return null
}

/** Entry actions per stage, most-recent occurrence wins. */
const STAGE_ENTRY_ACTIONS: Record<FlowStage, readonly HistoryAction[]> = {
  coding: ['started', 'agent_created'],
  awaiting_review: ['pr_created', 'review'],
  changes_requested: ['review_changes_requested'],
  ready_to_merge: ['review_approved'],
}

/**
 * When this agent entered its current stage.
 *
 * Falls back to `agent.updatedAt`, which is coarse — it moves on ANY write, so it
 * under-reports age. Returns null when neither source knows: rendering `0m` there
 * would make a long-forgotten item look freshly arrived.
 */
export function stageEnteredAt(
  agent: OrgAgent,
  stage: FlowStage,
  eventsByKey: Map<string, OrgActivityEvent[]>,
): number | null {
  const key = agent.ticketId || `agent:${agent.id}`
  const events = eventsByKey.get(key)
  const wanted = STAGE_ENTRY_ACTIONS[stage]

  if (events) {
    let best: number | null = null
    for (const e of events) {
      if (!wanted.includes(e.action)) continue
      const t = Date.parse(e.occurredAt)
      if (Number.isNaN(t)) continue
      if (best === null || t > best) best = t
    }
    if (best !== null) return best
  }

  const fallback = agent.updatedAt ? Date.parse(agent.updatedAt) : NaN
  return Number.isNaN(fallback) ? null : fallback
}

/** Classify the whole roster into the four stages, with ages and stall flags. */
export function buildPipeline(
  agents: OrgAgent[],
  eventsByKey: Map<string, OrgActivityEvent[]>,
  nowMs: number,
): { entries: PipelineEntry[]; stages: PipelineStageSummary[]; unknown: number } {
  const entries: PipelineEntry[] = []
  let unknown = 0

  for (const agent of agents) {
    const stage = classifyAgentStage(agent)
    if (!stage) {
      // Only count work that looks active but unclassifiable, so finished tickets
      // do not inflate an "unknown" figure that suggests a bug.
      if (agent.status && agent.status !== 'PR merged') unknown += 1
      continue
    }
    const enteredAt = stageEnteredAt(agent, stage, eventsByKey)
    const ageMs = enteredAt === null ? null : Math.max(nowMs - enteredAt, 0)
    entries.push({
      agent,
      stage,
      enteredAt,
      ageMs,
      stalled: ageMs !== null && ageMs > STALL_THRESHOLDS_MS[stage],
    })
  }

  const stages = FLOW_STAGES.map((stage) => {
    const inStage = entries.filter((e) => e.stage === stage)
    const ages = inStage.map((e) => e.ageMs).filter((a): a is number => a !== null)
    return {
      stage,
      count: inStage.length,
      oldestAgeMs: ages.length > 0 ? Math.max(...ages) : null,
      stalledCount: inStage.filter((e) => e.stalled).length,
    }
  })

  return { entries, stages, unknown }
}

/**
 * Stalled items worth surfacing by name.
 *
 * Deliberately narrow. The Team page already lists PRs awaiting review and blocked
 * work in their own widgets, so this covers only the two stalls nothing else
 * shows: code that never became a PR, and an approved PR nobody merged. Anything
 * already rendered elsewhere is excluded by agent id, so one PR is never listed
 * three times.
 */
export function collectStalled(
  entries: PipelineEntry[],
  excludeAgentIds: ReadonlySet<string>,
  eventsByKey: Map<string, OrgActivityEvent[]>,
): PipelineEntry[] {
  return entries
    .filter((e) => {
      if (!e.stalled) return false
      if (excludeAgentIds.has(e.agent.id)) return false
      if (e.stage === 'ready_to_merge') return true
      if (e.stage === 'coding') {
        // Only when no PR exists yet — otherwise the awaiting-review widget owns it.
        const key = e.agent.ticketId || `agent:${e.agent.id}`
        const events = eventsByKey.get(key) ?? []
        return !events.some((ev) => ev.action === 'pr_created')
      }
      return false
    })
    .sort((a, b) => (b.ageMs ?? 0) - (a.ageMs ?? 0))
}
