import { describe, expect, it } from 'vitest'
import { EMPTY_OVERLAY, type WorkflowOverlay } from '../../workflow/overlay'
import type { WorkflowHistoryEvent } from '../../types'
import { buildWorkflowHistory, diffOverlays, diffStart, diffWorkflowEvent, skillOfNode } from './workflowHistory'

const overlay = (patch: Partial<WorkflowOverlay>): WorkflowOverlay => ({ ...EMPTY_OVERLAY, ...patch })

const event = (patch: Partial<WorkflowHistoryEvent>): WorkflowHistoryEvent => ({
  id: 'e1', scope: 'workflow', before: null, after: null, occurredAt: '2026-09-30T10:00:00Z', ...patch,
})

describe('skillOfNode', () => {
  it('names a built-in node by its skill, a custom one by its own', () => {
    expect(skillOfNode('commit')).toBe('magic-commit')
    expect(skillOfNode('custom:my-lint')).toBe('my-lint')
  })
})

describe('diffOverlays', () => {
  it('reports an added step alone, not its links and card too', () => {
    const after = overlay({
      steps: [{ skill: 'my-lint', mode: 'advisory', color: '#FFAA00' }],
      links: [{ from: 'commit', to: 'custom:my-lint', kind: 'suggest' }],
      positions: { 'custom:my-lint': { x: 1, y: 2 } },
    })
    expect(diffOverlays(EMPTY_OVERLAY, after)).toEqual([{ kind: 'step-added', node: 'my-lint' }])
  })

  it('reports a removed step alone', () => {
    const before = overlay({
      steps: [{ skill: 'my-lint', mode: 'advisory' }],
      links: [{ from: 'custom:my-lint', to: 'pr', kind: 'auto' }],
    })
    expect(diffOverlays(before, EMPTY_OVERLAY)).toEqual([{ kind: 'step-removed', node: 'my-lint' }])
  })

  it('reports a mode, a colour, a step turned off and on', () => {
    const before = overlay({ steps: [{ skill: 'x', mode: 'advisory', color: '#111111' }], disabled: ['resolve'] })
    const after = overlay({ steps: [{ skill: 'x', mode: 'blocking', color: '#222222' }], disabled: ['custom:x'] })
    expect(diffOverlays(before, after)).toEqual([
      { kind: 'step-mode', node: 'x', mode: 'blocking' },
      { kind: 'step-color', node: 'x' },
      { kind: 'step-enabled', node: 'x', enabled: false },
      { kind: 'step-enabled', node: 'magic-resolve', enabled: true },
    ])
  })

  it('reports links drawn, removed, rekinded and given an outcome', () => {
    const before = overlay({
      steps: [{ skill: 'x', mode: 'advisory' }],
      links: [
        { from: 'commit', to: 'custom:x', kind: 'suggest' },
        { from: 'custom:x', to: 'pr', kind: 'suggest' },
      ],
    })
    const after = overlay({
      steps: [{ skill: 'x', mode: 'advisory' }],
      links: [
        { from: 'commit', to: 'custom:x', kind: 'auto', outcome: 'committed' },
        { from: 'custom:x', to: 'done', kind: 'suggest' },
      ],
    })
    expect(diffOverlays(before, after)).toEqual([
      { kind: 'link-kind', from: 'magic-commit', to: 'x', linkKind: 'auto' },
      { kind: 'link-outcome', from: 'magic-commit', to: 'x', outcome: 'committed' },
      { kind: 'link-added', from: 'x', to: 'magic-done', linkKind: 'suggest' },
      { kind: 'link-removed', from: 'x', to: 'magic-pr' },
    ])
  })

  it('says a second outcome leading to the same step is a link of its own, whichever field holds it', () => {
    const before = overlay({
      steps: [{ skill: 'x', mode: 'advisory', outcomes: ['ok', 'ko'] }],
      links: [{ from: 'custom:x', to: 'pr', kind: 'suggest', outcome: 'ok' }],
    })
    const after = overlay({ ...before, links: [{ from: 'custom:x', to: 'pr', kind: 'suggest', outcomes: ['ok', 'ko'] }] })
    expect(diffOverlays(before, after)).toEqual([{ kind: 'link-added', from: 'x', to: 'magic-pr', linkKind: 'suggest' }])
    // The stored form of the same single outcome is no change.
    const same = overlay({ ...before, links: [{ from: 'custom:x', to: 'pr', kind: 'suggest', outcomes: ['ok'] }] })
    expect(diffOverlays(before, same)).toEqual([])
  })

  it('reports a built-in step taken off and put back, and a default link taken off, without their links', () => {
    const off = overlay({ removed: ['commit'], removedLinks: ['start>commit', 'commit>pr', 'resolve>done'] })
    expect(diffOverlays(overlay({}), off)).toEqual([
      { kind: 'step-removed', node: 'magic-commit' },
      { kind: 'link-removed', from: 'magic-resolve', to: 'magic-done' },
    ])
    expect(diffOverlays(off, overlay({ removedLinks: off.removedLinks }))).toEqual([{ kind: 'step-added', node: 'magic-commit' }])
    expect(diffOverlays(overlay({ removedLinks: ['resolve>done'] }), overlay({}))).toEqual([
      { kind: 'link-added', from: 'magic-resolve', to: 'magic-done', linkKind: 'suggest' },
    ])
  })

  it('reports a frame added, renamed and removed, by its title, and not its moves', () => {
    const frame = { id: 'f1', title: '', border: '#6366F1', background: '#6366F1', x: 0, y: 0, width: 300, height: 200 }
    expect(diffOverlays(overlay({}), overlay({ frames: [frame] }))).toEqual([{ kind: 'frame-added', title: '' }])
    expect(diffOverlays(overlay({ frames: [frame] }), overlay({ frames: [{ ...frame, title: 'Checks', x: 40 }] }))).toEqual([
      { kind: 'frame-title', before: '', after: 'Checks' },
    ])
    expect(diffOverlays(overlay({ frames: [{ ...frame, title: 'Checks' }] }), overlay({}))).toEqual([{ kind: 'frame-removed', title: 'Checks' }])
  })

  it('reports a sticky note added, rewritten and removed, by its first line', () => {
    const sticky = { id: 's1', text: '', color: '#F59E0B', x: 0, y: 0, width: 240, height: 180 }
    expect(diffOverlays(overlay({}), overlay({ stickies: [sticky] }))).toEqual([{ kind: 'sticky-added' }])
    const written = { ...sticky, text: 'Ask QA\nbefore merging' }
    expect(diffOverlays(overlay({ stickies: [sticky] }), overlay({ stickies: [{ ...written, x: 50 }] }))).toEqual([{ kind: 'sticky-text', text: 'Ask QA' }])
    expect(diffOverlays(overlay({ stickies: [written] }), overlay({}))).toEqual([{ kind: 'sticky-removed', text: 'Ask QA' }])
  })

  it('names an end note by what it says, and its links with it', () => {
    const before = overlay({ steps: [{ skill: 'x', mode: 'advisory' }], notes: [{ id: 'n1', text: 'Open a ticket' }] })
    const edited = overlay({ ...before, notes: [{ id: 'n1', text: 'Open a Jira ticket' }], links: [{ from: 'custom:x', to: 'note:n1', kind: 'suggest' }] })
    expect(diffOverlays(before, edited)).toEqual([
      { kind: 'note-text', before: 'Open a ticket', after: 'Open a Jira ticket' },
      { kind: 'link-added', from: 'x', to: 'note:Open a Jira ticket', linkKind: 'suggest' },
    ])
    expect(diffOverlays(before, overlay({ steps: before.steps }))).toEqual([{ kind: 'note-removed', text: 'Open a ticket' }])
  })

  it('reads a default link back to its own kind when its override is dropped', () => {
    const before = overlay({ kinds: { 'commit>pr': 'suggest' } })
    const [change] = diffOverlays(before, EMPTY_OVERLAY)
    expect(change).toMatchObject({ kind: 'link-kind', from: 'magic-commit', to: 'magic-pr' })
  })

  it('counts cards moved, not cards pinned where they were drawn', () => {
    const before = overlay({ positions: { commit: { x: 0, y: 0 }, pr: { x: 5, y: 5 } } })
    const after = overlay({ positions: { commit: { x: 10, y: 0 }, pr: { x: 5, y: 5 }, done: { x: 9, y: 9 } } })
    expect(diffOverlays(before, after)).toEqual([{ kind: 'moved', count: 1 }])
  })
})

describe('diffStart', () => {
  it('compares each setting against its default when unset', () => {
    expect(diffStart({}, { plan: false, criticMinScore: 9, execution: 'auto' })).toEqual([
      { kind: 'start', setting: 'plan', from: true, to: false },
      { kind: 'start', setting: 'criticMinScore', from: 8, to: 9 },
    ])
  })

  it('finds nothing when the defaults were only written out', () => {
    expect(diffStart({}, { plan: true, criticIterations: 3 })).toEqual([])
    expect(diffStart(null, 'nonsense')).toEqual([])
  })
})

describe('diffWorkflowEvent', () => {
  it('reads no row as the default flow, on both ends', () => {
    const steps = [{ skill: 'x', mode: 'advisory' as const }]
    expect(diffWorkflowEvent(event({ before: null, after: overlay({ steps }) }))).toEqual([{ kind: 'step-added', node: 'x' }])
    expect(diffWorkflowEvent(event({ before: overlay({ steps }), after: null }))).toEqual([{ kind: 'step-removed', node: 'x' }])
  })

  it('says a value it cannot read changed, rather than nothing', () => {
    expect(diffWorkflowEvent(event({ before: { id: 'hand-written' }, after: EMPTY_OVERLAY }))).toEqual([{ kind: 'unreadable' }])
  })
})

describe('buildWorkflowHistory', () => {
  it('orders newest first and drops saves that changed nothing', () => {
    const entries = buildWorkflowHistory([
      event({ id: 'old', scope: 'start', before: {}, after: { simplify: false }, occurredAt: '2026-09-01T00:00:00Z' }),
      event({ id: 'noop', scope: 'start', before: {}, after: { simplify: true }, occurredAt: '2026-09-02T00:00:00Z' }),
      event({ id: 'new', before: null, after: overlay({ disabled: ['resolve'] }), occurredAt: '2026-09-03T00:00:00Z' }),
    ])
    expect(entries.map((entry) => entry.id)).toEqual(['new', 'old'])
  })
})
