import { describe, it, expect } from 'vitest'
import type { PlanLinkEvent, PlanRevision } from '../../types'
import { buildPlanTimeline, revisionPair } from './planHistory'

function revision(id: string, updatedAt: string): PlanRevision {
  return { id, source: 'human', createdAt: updatedAt, updatedAt }
}

function event(id: string, createdAt: string): PlanLinkEvent {
  return { id, linkId: `link-${id}`, action: 'added', url: 'https://example.com', kind: 'other', createdAt }
}

describe('buildPlanTimeline', () => {
  it('interleaves revisions and link events, newest first', () => {
    const timeline = buildPlanTimeline({
      revisions: [revision('r2', '2026-09-23T12:00:00Z'), revision('r1', '2026-09-23T10:00:00Z')],
      linkEvents: [event('e1', '2026-09-23T11:00:00Z'), event('e0', '2026-09-23T09:00:00Z')],
    })
    expect(timeline.map((entry) => entry.id)).toEqual(['r2', 'e1', 'r1', 'e0'])
  })

  it('interleaves the status changes too', () => {
    const timeline = buildPlanTimeline({
      revisions: [revision('r1', '2026-09-23T10:00:00Z')],
      linkEvents: [],
      statusEvents: [{ id: 's1', from: 'planned', to: 'done', source: 'human', createdAt: '2026-09-23T11:00:00Z' }],
    })
    expect(timeline.map((entry) => entry.id)).toEqual(['s1', 'r1'])
  })

  it('puts the revision first on a tie, so the order holds between two reads', () => {
    const timeline = buildPlanTimeline({
      revisions: [revision('r1', '2026-09-23T10:00:00Z')],
      linkEvents: [event('e1', '2026-09-23T10:00:00Z')],
    })
    expect(timeline.map((entry) => entry.kind)).toEqual(['revision', 'link'])
  })
})

describe('revisionPair', () => {
  const revisions = [revision('r3', '3'), revision('r2', '2'), revision('r1', '1')]

  it('is nothing with nothing selected', () => {
    expect(revisionPair(revisions, null)).toBeNull()
  })

  it('compares the selected revision with the one before it', () => {
    expect(revisionPair(revisions, 'r2')).toEqual({ from: 'r1', to: 'r2' })
  })

  it('compares the first revision with nothing', () => {
    expect(revisionPair(revisions, 'r1')).toEqual({ from: null, to: 'r1' })
  })

  it('does not call the oldest shown the first when older revisions were not read', () => {
    expect(revisionPair(revisions, 'r1', true)).toEqual({ from: null, to: 'r1', olderHidden: true })
    expect(revisionPair(revisions, 'r2', true)).toEqual({ from: 'r1', to: 'r2' })
  })

  it('ignores an id the history no longer holds', () => {
    expect(revisionPair(revisions, 'gone')).toBeNull()
  })
})
