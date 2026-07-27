import { describe, it, expect } from 'vitest'
import type { HistoryAction, OrgActivityEvent, OrgAgent, OrgAgentPRReview } from '../../types'
import {
  buildPipeline,
  buildTicketFlows,
  classifyAgentStage,
  collectStageDurations,
  collectStalled,
  computeThroughputByWeek,
  agentFlowKey,
  flowKeyOf,
  groupEventsByFlowKey,
  median,
  percentile,
  resolveCycle,
  splitIntoCycles,
  stageEnteredAt,
  stageTimeBreakdown,
  summarizeSamples,
} from './flowMetrics'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

let seq = 0
function event(action: HistoryAction, occurredAt: number, overrides: Partial<OrgActivityEvent> = {}): OrgActivityEvent {
  seq += 1
  return {
    id: `evt-${seq}`,
    userId: 'user-1',
    agentId: 'agent-uuid-1',
    action,
    ticketId: 'PROJ-1',
    repositories: ['/repo/a'],
    occurredAt: new Date(occurredAt).toISOString(),
    ...overrides,
  }
}

function review(overrides: Partial<OrgAgentPRReview> = {}): OrgAgentPRReview {
  return { repo: '/repo/a', ...overrides }
}

function agent(overrides: Partial<OrgAgent> = {}): OrgAgent {
  return { id: 'agent-uuid-1', ownerId: 'user-1', name: 'Agent', repositories: ['/repo/a'], ...overrides }
}

/** A window wide enough that nothing is filtered out by date. */
const ALL_TIME = { from: 0, to: Date.UTC(2100, 0, 1) }
function durations(events: OrgActivityEvent[]) {
  const { flows } = buildTicketFlows(events)
  return collectStageDurations(flows, ALL_TIME.from, ALL_TIME.to)
}

// ── correlation key ─────────────────────────────────────────────────────────

describe('flowKeyOf', () => {
  it('prefers ticketId, the only key that survives the agent row being deleted', () => {
    expect(flowKeyOf({ ticketId: 'PROJ-9', agentId: 'uuid-1', repositories: ['/repo/a'] })).toBe('PROJ-9')
  })

  it('falls back to the agent uuid when there is no ticket', () => {
    expect(flowKeyOf({ ticketId: null, agentId: 'uuid-1', repositories: [] })).toBe('agent:uuid-1')
  })

  it('returns null when neither is present', () => {
    expect(flowKeyOf({ ticketId: null, agentId: null, repositories: [] })).toBeNull()
  })

  it('correlates a prefixed ticket across repos — a full-stack ticket is one flow', () => {
    // /magic:start opens sibling worktrees for one ticket, so the api and web PRs
    // of PROJ-9 belong to the same cycle. Repo-scoping these would split it.
    const api = flowKeyOf({ ticketId: 'PROJ-9', agentId: null, repositories: ['/work/api'] })
    const web = flowKeyOf({ ticketId: 'PROJ-9', agentId: null, repositories: ['/work/web'] })
    expect(api).toBe(web)
  })

  it('scopes a bare issue number by repo, so #148 in two repos stays two flows', () => {
    // GitHub issue numbers are unique only within a repository, and the worktree
    // parser yields a plain number — without scoping these would merge.
    const a = flowKeyOf({ ticketId: '148', agentId: null, repositories: ['/work/api'] })
    const b = flowKeyOf({ ticketId: '148', agentId: null, repositories: ['/work/web'] })
    expect(a).not.toBe(b)
    expect(a).toBe('api#148')
  })

  it('builds a repo scope independent of path and ordering', () => {
    const one = flowKeyOf({ ticketId: '7', agentId: null, repositories: ['/a/web', '/a/api'] })
    const two = flowKeyOf({ ticketId: '7', agentId: null, repositories: ['/elsewhere/api', '/elsewhere/web'] })
    expect(one).toBe(two)
  })

  it('still keys a bare number with no repositories at all', () => {
    expect(flowKeyOf({ ticketId: '148', agentId: null, repositories: [] })).toBe('#148')
  })
})

describe('agentFlowKey', () => {
  it('matches the key groupEventsByFlowKey produced for the same work', () => {
    // A divergence here is silent: the live board would find no events and fall
    // back to the coarse updatedAt for every age.
    const numeric = event('started', Date.UTC(2026, 5, 1), { ticketId: '148', repositories: ['/work/api'] })
    const { byKey } = groupEventsByFlowKey([numeric])
    const key = agentFlowKey({ id: 'agent-uuid-1', ticketId: '148', repositories: ['/work/api'] })
    expect(byKey.has(key)).toBe(true)
  })
})

describe('groupEventsByFlowKey', () => {
  it('counts events with no ticket and no agent as unattributed instead of crashing', () => {
    const base = Date.UTC(2026, 5, 1)
    const { byKey, unattributed } = groupEventsByFlowKey([
      event('started', base, { ticketId: null, agentId: null }),
      event('pr_created', base + HOUR),
    ])
    expect(unattributed).toBe(1)
    expect(byKey.size).toBe(1)
  })

  it('sorts out-of-order events and collapses same-second duplicates', () => {
    const base = Date.UTC(2026, 5, 1)
    const { byKey } = groupEventsByFlowKey([
      event('pr_created', base + HOUR),
      event('started', base),
      event('pr_created', base + HOUR + 200), // duplicate write, 200ms later
    ])
    const list = byKey.get('PROJ-1')!
    expect(list.map((e) => e.action)).toEqual(['started', 'pr_created'])
  })

  it('breaks same-millisecond ties in canonical pipeline order', () => {
    const base = Date.UTC(2026, 5, 1)
    // Emitted pr_created first, but both share a timestamp: started must sort first.
    const { byKey } = groupEventsByFlowKey([event('pr_created', base), event('started', base)])
    expect(byKey.get('PROJ-1')!.map((e) => e.action)).toEqual(['started', 'pr_created'])
  })
})

// ── cycles ──────────────────────────────────────────────────────────────────

describe('splitIntoCycles', () => {
  it('opens a new cycle after a merge, so a reopened ticket is not one long cycle', () => {
    const base = Date.UTC(2026, 5, 1)
    const events = [
      event('started', base),
      event('pr_created', base + HOUR),
      event('merged', base + 2 * HOUR),
      event('started', base + 20 * DAY),
      event('pr_created', base + 20 * DAY + HOUR),
      event('merged', base + 20 * DAY + 2 * HOUR),
    ]
    const cycles = splitIntoCycles(events)
    expect(cycles).toHaveLength(2)
    expect(cycles[0]).toHaveLength(3)
    expect(cycles[1]).toHaveLength(3)
  })

  it('drops trailing noise after the final merge', () => {
    const base = Date.UTC(2026, 5, 1)
    const cycles = splitIntoCycles([
      event('started', base),
      event('merged', base + HOUR),
      event('agent_closed', base + 2 * HOUR),
    ])
    expect(cycles).toHaveLength(1)
    expect(cycles[0].map((e) => e.action)).toEqual(['started', 'merged'])
  })
})

describe('resolveCycle', () => {
  it('takes the earliest started, so a parked ticket is not forgiven', () => {
    const base = Date.UTC(2026, 5, 1)
    const flow = resolveCycle('PROJ-1', [
      event('started', base),
      event('started', base + 7 * DAY), // /magic:continue after a week off
      event('pr_created', base + 7 * DAY + HOUR),
    ])
    expect(flow.startedAt).toBe(base)
  })

  it('prefers a verdict over a bare review as the first response', () => {
    const base = Date.UTC(2026, 5, 1)
    const flow = resolveCycle('PROJ-1', [
      event('started', base),
      event('pr_created', base + HOUR),
      event('review', base + 2 * HOUR),
      event('review_approved', base + 3 * HOUR),
    ])
    expect(flow.firstResponseAt).toBe(base + 3 * HOUR)
    expect(flow.firstResponseWeak).toBe(false)
  })

  it('falls back to a bare review and marks the sample weak', () => {
    const base = Date.UTC(2026, 5, 1)
    const flow = resolveCycle('PROJ-1', [
      event('started', base),
      event('pr_created', base + HOUR),
      event('review', base + 2 * HOUR),
    ])
    expect(flow.firstResponseAt).toBe(base + 2 * HOUR)
    expect(flow.firstResponseWeak).toBe(true)
  })

  it('collapses a multi-repo rework burst into one round, but counts distant ones separately', () => {
    const base = Date.UTC(2026, 5, 1)
    const burst = resolveCycle('PROJ-1', [
      event('pr_created', base),
      event('review_changes_requested', base + HOUR),
      event('review_changes_requested', base + HOUR + 10_000), // second repo, 10s later
    ])
    expect(burst.reworkRounds).toBe(1)

    const distinct = resolveCycle('PROJ-1', [
      event('pr_created', base),
      event('review_changes_requested', base + HOUR),
      event('review_changes_requested', base + 3 * DAY),
    ])
    expect(distinct.reworkRounds).toBe(2)
  })
})

// ── durations and censoring ─────────────────────────────────────────────────

describe('collectStageDurations', () => {
  it('yields a zero coding time, never a negative one, for same-millisecond writes', () => {
    const base = Date.UTC(2026, 5, 1)
    const s = durations([event('pr_created', base), event('started', base)])
    expect(s.coding).toEqual([0])
  })

  it('excludes an open PR from every median and counts it in flight', () => {
    const base = Date.UTC(2026, 5, 1)
    const s = durations([event('started', base), event('pr_created', base + HOUR)])
    expect(s.reviewWait).toEqual([])
    expect(s.prToMerge).toEqual([])
    expect(s.inFlight).toBe(1)
    expect(s.coding).toEqual([HOUR])
  })

  it('left-censors a PR with no recorded start but keeps its review wait', () => {
    const base = Date.UTC(2026, 5, 1)
    const s = durations([
      event('pr_created', base),
      event('review_approved', base + 4 * HOUR),
    ])
    expect(s.leftCensored).toBe(1)
    expect(s.coding).toEqual([])
    expect(s.leadTime).toEqual([])
    expect(s.reviewWait).toEqual([4 * HOUR])
  })

  it('drops a negative duration caused by two machines with skewed clocks', () => {
    const base = Date.UTC(2026, 5, 1)
    // pr_created recorded BEFORE started, on a different day — not a tie, real skew.
    const s = durations([
      event('started', base + 2 * DAY),
      event('merged', base + 3 * DAY),
      event('pr_created', base),
    ])
    expect(s.clockSkewDropped).toBeGreaterThanOrEqual(1)
    expect(s.coding).toEqual([])
  })

  it('discards an implausibly long cycle as an outlier', () => {
    const base = Date.UTC(2026, 0, 1)
    const s = durations([event('started', base), event('pr_created', base + 90 * DAY)])
    expect(s.outliersExcluded).toBe(1)
    expect(s.coding).toEqual([])
  })

  it('reports the rework rate denominator as cycles that reached a PR', () => {
    const base = Date.UTC(2026, 5, 1)
    const s = durations([
      event('started', base),
      event('pr_created', base + HOUR),
      event('review_changes_requested', base + 2 * HOUR),
      event('merged', base + 3 * HOUR),
      event('started', base + 10 * DAY, { ticketId: 'PROJ-2' }),
      event('pr_created', base + 10 * DAY + HOUR, { ticketId: 'PROJ-2' }),
      event('merged', base + 10 * DAY + 2 * HOUR, { ticketId: 'PROJ-2' }),
    ])
    expect(s.cyclesWithPr).toBe(2)
    expect(s.cyclesWithRework).toBe(1)
  })

  it('keeps a sample whose END anchor is in the window even if it started before', () => {
    const base = Date.UTC(2026, 5, 1)
    const { flows } = buildTicketFlows([
      event('started', base),
      event('pr_created', base + 40 * DAY),
    ])
    // Window covers only the last 7 days around the pr_created anchor.
    const s = collectStageDurations(flows, base + 39 * DAY, base + 41 * DAY)
    expect(s.coding).toEqual([40 * DAY])
  })
})

// ── summaries ───────────────────────────────────────────────────────────────

describe('median / percentile', () => {
  it('handles empty, single and even-length inputs', () => {
    expect(median([])).toBeNull()
    expect(median([5])).toBe(5)
    expect(median([1, 3])).toBe(2)
    expect(median([1, 2, 3])).toBe(2)
  })

  it('interpolates percentiles', () => {
    expect(percentile([], 0.5)).toBeNull()
    expect(percentile([10], 0.25)).toBe(10)
    expect(percentile([0, 100], 0.25)).toBe(25)
  })
})

describe('summarizeSamples', () => {
  it('reports nothing at all with no samples', () => {
    const s = summarizeSamples([])
    expect(s.confidence).toBe('none')
    expect(s.medianMs).toBeNull()
  })

  it('shows raw values instead of a median at one or two samples', () => {
    expect(summarizeSamples([HOUR]).confidence).toBe('raw')
    const two = summarizeSamples([3 * DAY, 4 * HOUR])
    expect(two.confidence).toBe('raw')
    expect(two.medianMs).toBeNull()
    expect(two.raw).toEqual([4 * HOUR, 3 * DAY])
  })

  it('gives a median but no spread or trend between three and five samples', () => {
    const s = summarizeSamples([1, 2, 3, 4, 5], [10, 20, 30])
    expect(s.confidence).toBe('weak')
    expect(s.medianMs).toBe(3)
    expect(s.p25Ms).toBeNull()
    expect(s.deltaRatio).toBeNull()
  })

  it('adds spread and a trend from six samples up', () => {
    const s = summarizeSamples([1, 2, 3, 4, 5, 6], [2, 4, 6, 8, 10, 12])
    expect(s.confidence).toBe('ok')
    expect(s.medianMs).toBe(3.5)
    expect(s.p25Ms).not.toBeNull()
    // Previous median 7 → now 3.5, i.e. halved.
    expect(s.deltaRatio).toBeCloseTo(-0.5)
  })

  it('withholds the trend when the previous window is itself too thin', () => {
    expect(summarizeSamples([1, 2, 3, 4, 5, 6], [5, 5]).deltaRatio).toBeNull()
  })
})

describe('stageTimeBreakdown', () => {
  it('splits the lead time into three segments that never go negative', () => {
    const base = Date.UTC(2026, 5, 1)
    const s = durations([
      event('started', base),
      event('pr_created', base + 2 * HOUR),
      event('review_approved', base + 5 * HOUR),
      event('merged', base + 9 * HOUR),
    ])
    const b = stageTimeBreakdown(s)!
    expect(b.coding).toBe(2 * HOUR)
    expect(b.reviewWait).toBe(3 * HOUR)
    expect(b.toMerge).toBe(4 * HOUR)
  })

  it('returns null when there is nothing to split', () => {
    expect(stageTimeBreakdown(durations([]))).toBeNull()
  })
})

// ── throughput ──────────────────────────────────────────────────────────────

describe('computeThroughputByWeek', () => {
  it('buckets by local week starting Monday', () => {
    // 2026-06-07 is a Sunday, 2026-06-08 a Monday.
    const sundayLate = new Date(2026, 5, 7, 23, 0).getTime()
    const mondayEarly = new Date(2026, 5, 8, 1, 0).getTime()
    const { flows } = buildTicketFlows([
      event('pr_created', sundayLate - HOUR),
      event('merged', sundayLate),
      event('pr_created', mondayEarly - HOUR, { ticketId: 'PROJ-2' }),
      event('merged', mondayEarly, { ticketId: 'PROJ-2' }),
    ])
    const buckets = computeThroughputByWeek(flows, mondayEarly, 3, 0)
    const nonEmpty = buckets.filter((b) => b.count > 0)
    expect(nonEmpty).toHaveLength(2)
    expect(nonEmpty.every((b) => b.count === 1)).toBe(true)
  })

  it('sums several merges landing in the same week', () => {
    const monday = new Date(2026, 5, 8, 9, 0).getTime()
    const { flows } = buildTicketFlows([
      event('pr_created', monday - HOUR),
      event('merged', monday),
      event('pr_created', monday + DAY - HOUR, { ticketId: 'PROJ-2' }),
      event('merged', monday + DAY, { ticketId: 'PROJ-2' }),
    ])
    const buckets = computeThroughputByWeek(flows, monday + DAY, 2, 0)
    expect(buckets[buckets.length - 1].count).toBe(2)
  })

  it('marks weeks older than the readable window as untrusted, not as zero', () => {
    const now = new Date(2026, 5, 8, 9, 0).getTime()
    const buckets = computeThroughputByWeek([], now, 4, now - 8 * DAY)
    expect(buckets[0].trusted).toBe(false)
    expect(buckets[buckets.length - 1].trusted).toBe(true)
  })

  it('keeps week boundaries on local midnight across a DST shift', () => {
    // Late October in Europe/Paris covers the autumn transition.
    const now = new Date(2026, 10, 5, 12, 0).getTime()
    const buckets = computeThroughputByWeek([], now, 4, 0)
    for (const b of buckets) {
      const d = new Date(b.weekStartMs)
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
      expect((d.getDay() + 6) % 7).toBe(0) // Monday
    }
  })

  it('measures a duration spanning a DST shift in exact elapsed time', () => {
    // 2026-03-29 02:00 is the spring-forward in Europe/Paris. Whatever the local
    // wall clock does, the elapsed ms between these two instants is fixed.
    const before = Date.UTC(2026, 2, 28, 12, 0)
    const after = Date.UTC(2026, 2, 30, 12, 0)
    const s = durations([event('started', before), event('pr_created', after)])
    expect(s.coding).toEqual([after - before])
  })
})

// ── the live board ──────────────────────────────────────────────────────────

describe('classifyAgentStage', () => {
  it('treats a mixed multi-repo ticket as blocked, not ready to merge', () => {
    const a = agent({
      status: 'in review',
      prReviews: [
        review({ repo: '/repo/a', status: 'approved' }),
        review({ repo: '/repo/b', status: 'changes-requested' }),
      ],
    })
    expect(classifyAgentStage(a)).toBe('changes_requested')
  })

  it('honours the changes-requested workflow status even with no review data', () => {
    expect(classifyAgentStage(agent({ status: 'changes requested' }))).toBe('changes_requested')
  })

  it('ignores merged and closed reviews when deciding the stage', () => {
    const a = agent({
      status: 'PR merged',
      prReviews: [review({ status: 'approved', merged: true })],
    })
    expect(classifyAgentStage(a)).toBeNull()
  })

  it('reports ready_to_merge for a live approved PR', () => {
    const a = agent({ status: 'in review', prReviews: [review({ status: 'approved' })] })
    expect(classifyAgentStage(a)).toBe('ready_to_merge')
  })

  it('is not ready to merge while a second repo still awaits its first review', () => {
    // A ticket is only as advanced as its least advanced PR. Calling this
    // mergeable would flag it "approved, not merged" 24h later — wrong and noisy.
    const a = agent({
      status: 'in review',
      prReviews: [
        review({ repo: '/repo/a', status: 'approved' }),
        review({ repo: '/repo/b', status: 'pending' }),
      ],
    })
    expect(classifyAgentStage(a)).toBe('awaiting_review')
  })

  it('ignores an already-merged sibling PR when judging readiness', () => {
    const a = agent({
      status: 'in review',
      prReviews: [
        review({ repo: '/repo/a', status: 'approved', merged: true }),
        review({ repo: '/repo/b', status: 'approved' }),
      ],
    })
    expect(classifyAgentStage(a)).toBe('ready_to_merge')
  })

  it('reports awaiting_review for a live PR with no verdict yet', () => {
    const a = agent({ status: 'PR created', prReviews: [review({ status: 'pending', prUrl: 'u' })] })
    expect(classifyAgentStage(a)).toBe('awaiting_review')
  })

  it('reports coding for a working agent with no PR', () => {
    expect(classifyAgentStage(agent({ status: 'in progress' }))).toBe('coding')
  })

  it('returns null for a status it does not recognize', () => {
    expect(classifyAgentStage(agent({ status: 'something new' }))).toBeNull()
  })
})

describe('stageEnteredAt', () => {
  it('prefers the activity anchor over the coarse agent updatedAt', () => {
    const base = Date.UTC(2026, 5, 1)
    const { byKey } = groupEventsByFlowKey([event('pr_created', base)])
    const a = agent({ ticketId: 'PROJ-1', updatedAt: new Date(base + 5 * DAY).toISOString() })
    expect(stageEnteredAt(a, 'awaiting_review', byKey)).toBe(base)
  })

  it('takes the most recent matching event when a stage is re-entered', () => {
    const base = Date.UTC(2026, 5, 1)
    const { byKey } = groupEventsByFlowKey([
      event('review_changes_requested', base),
      event('review_changes_requested', base + 3 * DAY),
    ])
    expect(stageEnteredAt(agent({ ticketId: 'PROJ-1' }), 'changes_requested', byKey)).toBe(base + 3 * DAY)
  })

  it('returns null when neither an event nor updatedAt can date the stage', () => {
    expect(stageEnteredAt(agent({ ticketId: 'PROJ-404' }), 'coding', new Map())).toBeNull()
  })
})

describe('buildPipeline', () => {
  it('flags an item past its stage threshold as stalled', () => {
    const now = Date.UTC(2026, 5, 10)
    const { byKey } = groupEventsByFlowKey([event('review_approved', now - 3 * DAY)])
    const a = agent({ ticketId: 'PROJ-1', status: 'in review', prReviews: [review({ status: 'approved' })] })
    const { entries, stages } = buildPipeline([a], byKey, now)

    expect(entries).toHaveLength(1)
    expect(entries[0].stage).toBe('ready_to_merge')
    expect(entries[0].stalled).toBe(true)
    expect(stages.find((s) => s.stage === 'ready_to_merge')!.stalledCount).toBe(1)
  })

  it('leaves ageMs null rather than pretending an undateable item is fresh', () => {
    const now = Date.UTC(2026, 5, 10)
    const a = agent({ ticketId: 'PROJ-1', status: 'in progress' })
    const { entries } = buildPipeline([a], new Map(), now)
    expect(entries[0].ageMs).toBeNull()
    expect(entries[0].stalled).toBe(false)
  })

  it('does not count finished work as unknown', () => {
    const now = Date.UTC(2026, 5, 10)
    const { unknown } = buildPipeline([agent({ status: 'PR merged' })], new Map(), now)
    expect(unknown).toBe(0)
  })
})

describe('collectStalled', () => {
  it('surfaces an approved PR nobody merged', () => {
    const now = Date.UTC(2026, 5, 10)
    const { byKey } = groupEventsByFlowKey([
      event('pr_created', now - 5 * DAY),
      event('review_approved', now - 3 * DAY),
    ])
    const a = agent({ ticketId: 'PROJ-1', status: 'in review', prReviews: [review({ status: 'approved' })] })
    const { entries } = buildPipeline([a], byKey, now)
    expect(collectStalled(entries, new Set(), byKey)).toHaveLength(1)
  })

  it('surfaces long coding only while no PR exists', () => {
    const now = Date.UTC(2026, 5, 10)
    const withoutPr = groupEventsByFlowKey([event('started', now - 8 * DAY)]).byKey
    const a = agent({ ticketId: 'PROJ-1', status: 'in progress' })
    expect(collectStalled(buildPipeline([a], withoutPr, now).entries, new Set(), withoutPr)).toHaveLength(1)

    // Once a PR exists the awaiting-review widget owns it, so this list stays quiet.
    const withPr = groupEventsByFlowKey([
      event('started', now - 8 * DAY),
      event('pr_created', now - 7 * DAY),
    ]).byKey
    expect(collectStalled(buildPipeline([a], withPr, now).entries, new Set(), withPr)).toHaveLength(0)
  })

  it('excludes agents already rendered by the other widgets', () => {
    const now = Date.UTC(2026, 5, 10)
    const { byKey } = groupEventsByFlowKey([event('review_approved', now - 3 * DAY)])
    const a = agent({ ticketId: 'PROJ-1', status: 'in review', prReviews: [review({ status: 'approved' })] })
    const { entries } = buildPipeline([a], byKey, now)
    expect(collectStalled(entries, new Set(['agent-uuid-1']), byKey)).toHaveLength(0)
  })

  it('orders the worst offenders first', () => {
    const now = Date.UTC(2026, 5, 10)
    const events = [
      event('review_approved', now - 2 * DAY, { ticketId: 'PROJ-1' }),
      event('review_approved', now - 6 * DAY, { ticketId: 'PROJ-2', agentId: 'agent-uuid-2' }),
    ]
    const { byKey } = groupEventsByFlowKey(events)
    const agents = [
      agent({ id: 'agent-uuid-1', ticketId: 'PROJ-1', status: 'in review', prReviews: [review({ status: 'approved' })] }),
      agent({ id: 'agent-uuid-2', ticketId: 'PROJ-2', status: 'in review', prReviews: [review({ status: 'approved' })] }),
    ]
    const { entries } = buildPipeline(agents, byKey, now)
    const stalled = collectStalled(entries, new Set(), byKey)
    expect(stalled.map((s) => s.agent.ticketId)).toEqual(['PROJ-2', 'PROJ-1'])
  })
})
