import { describe, it, expect } from 'vitest'
import type { PlanLinkEvent, PlanRevision } from '../../types'
import { buildPlanTimeline, revisionPair, toggleRevision } from './planHistory'

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

  it('is nothing without a selection', () => {
    expect(revisionPair(revisions, [])).toBeNull()
  })

  it('compares one revision with the one before it', () => {
    expect(revisionPair(revisions, ['r2'])).toEqual({ from: 'r1', to: 'r2' })
  })

  it('compares the first revision with nothing', () => {
    expect(revisionPair(revisions, ['r1'])).toEqual({ from: null, to: 'r1' })
  })

  it('does not call the oldest shown the first when older revisions were not read', () => {
    expect(revisionPair(revisions, ['r1'], true)).toEqual({ from: null, to: 'r1', olderHidden: true })
    expect(revisionPair(revisions, ['r2'], true)).toEqual({ from: 'r1', to: 'r2' })
  })

  it('orders two revisions by when they happened, not by the clicks', () => {
    expect(revisionPair(revisions, ['r3', 'r1'])).toEqual({ from: 'r1', to: 'r3' })
    expect(revisionPair(revisions, ['r1', 'r3'])).toEqual({ from: 'r1', to: 'r3' })
  })

  it('ignores an id the history no longer holds', () => {
    expect(revisionPair(revisions, ['gone', 'r2'])).toEqual({ from: 'r1', to: 'r2' })
  })
})

describe('toggleRevision', () => {
  it('adds, removes, and keeps the last two clicks', () => {
    expect(toggleRevision([], 'a')).toEqual(['a'])
    expect(toggleRevision(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleRevision(['a', 'b'], 'c')).toEqual(['b', 'c'])
    expect(toggleRevision(['a', 'b'], 'a')).toEqual(['b'])
  })
})
