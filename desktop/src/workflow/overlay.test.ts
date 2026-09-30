import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'
import type { WorkflowOverlay } from './overlay'
import {
  EMPTY_OVERLAY, composeWorkflow, customNodeId, insertStep, isOverlay, kindOf, lineOf, problems,
  removeStep, resolveOverlay, setLinkKind, setStepMode, setStepSkill,
} from './overlay'

const CHECK = customNodeId('check')

/** The slot between two consecutive node ids of the line. */
function slotAfter(overlay: WorkflowOverlay, id: string): number {
  return lineOf(overlay).indexOf(id) + 1
}

describe('composeWorkflow', () => {
  it('composes the empty overlay into the default line, links and entry', () => {
    const flow = composeWorkflow(EMPTY_OVERLAY)
    expect(flow.nodes).toEqual(DEFAULT_WORKFLOW.nodes)
    expect(flow.links).toEqual(DEFAULT_WORKFLOW.links)
    expect(flow.entry).toEqual(DEFAULT_WORKFLOW.entry)
  })

  it('inserts a step between start and commit, reached by an auto link from start', () => {
    let overlay = insertStep(EMPTY_OVERLAY, slotAfter(EMPTY_OVERLAY, 'start'), 'check')
    overlay = setLinkKind(overlay, 'start', CHECK, 'auto')
    const flow = composeWorkflow(overlay)
    expect(lineOf(overlay)).toEqual(['plan', 'start', CHECK, 'commit', 'pr', 'resolve', 'done'])
    expect(flow.links).toContainEqual({ from: 'start', to: CHECK, kind: 'auto' })
    expect(flow.links).toContainEqual({ from: CHECK, to: 'commit', kind: 'suggest' })
    expect(flow.links.find((l) => l.from === 'start' && l.to === 'commit')).toBeUndefined()
    expect(problems(overlay)).toEqual([])
  })

  it('puts a step before plan first in the entry, in plan\'s place', () => {
    const overlay = insertStep(EMPTY_OVERLAY, 0, 'check')
    expect(lineOf(overlay)[0]).toBe(CHECK)
    expect(composeWorkflow(overlay).entry).toEqual([CHECK, 'start'])
    expect(composeWorkflow(overlay).links).toContainEqual({ from: CHECK, to: 'plan', kind: 'suggest' })
  })

  it('leaves a step between plan and start out of the entry', () => {
    const overlay = insertStep(EMPTY_OVERLAY, slotAfter(EMPTY_OVERLAY, 'plan'), 'check')
    expect(composeWorkflow(overlay).entry).toEqual(['plan', 'start'])
  })

  it('appends a step after done', () => {
    const overlay = insertStep(EMPTY_OVERLAY, lineOf(EMPTY_OVERLAY).length, 'check')
    expect(lineOf(overlay).at(-1)).toBe(CHECK)
    expect(composeWorkflow(overlay).links.at(-1)).toEqual({ from: 'done', to: CHECK, kind: 'suggest' })
  })

  it('keeps the outcome on the first hop only when splitting pr → resolve', () => {
    const overlay = insertStep(EMPTY_OVERLAY, slotAfter(EMPTY_OVERLAY, 'pr'), 'check')
    const flow = composeWorkflow(overlay)
    expect(flow.links).toContainEqual({ from: 'pr', to: CHECK, kind: 'auto', outcome: 'review_comments' })
    expect(flow.links).toContainEqual({ from: CHECK, to: 'resolve', kind: 'auto' })
    expect(problems(overlay)).toEqual([])
  })

  it('switches a built-in link, commit → pr, to auto', () => {
    const overlay = setLinkKind(EMPTY_OVERLAY, 'commit', 'pr', 'auto')
    expect(composeWorkflow(overlay).links).toContainEqual({ from: 'commit', to: 'pr', kind: 'auto' })
    // Back to its default kind, the override is dropped rather than stored.
    expect(setLinkKind(overlay, 'commit', 'pr', 'suggest').kinds).toEqual({})
  })

  it('keeps several custom steps of one gap in line order', () => {
    let overlay = insertStep(EMPTY_OVERLAY, slotAfter(EMPTY_OVERLAY, 'start'), 'a')
    overlay = insertStep(overlay, slotAfter(overlay, customNodeId('a')), 'b')
    overlay = insertStep(overlay, slotAfter(overlay, 'start'), 'c')
    expect(lineOf(overlay).slice(1, 6)).toEqual(['start', customNodeId('c'), customNodeId('a'), customNodeId('b'), 'commit'])
  })
})

describe('editing', () => {
  it('inherits the split link\'s kind on both new links', () => {
    const auto = setLinkKind(EMPTY_OVERLAY, 'commit', 'pr', 'auto')
    const overlay = insertStep(auto, slotAfter(auto, 'commit'), 'check')
    expect(kindOf(overlay, 'commit', CHECK)).toBe('auto')
    expect(kindOf(overlay, CHECK, 'pr')).toBe('auto')
    expect(overlay.kinds['commit>pr']).toBeUndefined()
  })

  it('removes a step and every kind that named it', () => {
    let overlay = insertStep(EMPTY_OVERLAY, slotAfter(EMPTY_OVERLAY, 'start'), 'check')
    overlay = setLinkKind(overlay, 'start', CHECK, 'auto')
    overlay = removeStep(overlay, 'check')
    expect(overlay).toEqual(EMPTY_OVERLAY)
  })

  it('changes a step\'s mode and skill, keeping its place and its links\' kinds', () => {
    let overlay = insertStep(EMPTY_OVERLAY, slotAfter(EMPTY_OVERLAY, 'start'), 'check')
    overlay = setLinkKind(overlay, 'start', CHECK, 'auto')
    overlay = setStepMode(setStepSkill(overlay, 'check', 'lint'), 'lint', 'blocking')
    expect(overlay.steps).toEqual([{ skill: 'lint', mode: 'blocking', before: 'commit' }])
    expect(kindOf(overlay, 'start', customNodeId('lint'))).toBe('auto')
  })

  it('never mutates its input', () => {
    const frozen = structuredClone(EMPTY_OVERLAY)
    insertStep(frozen, 2, 'check')
    expect(frozen).toEqual(EMPTY_OVERLAY)
  })
})

describe('problems', () => {
  it('lists the same skill on two steps, naming the second one', () => {
    let overlay = insertStep(EMPTY_OVERLAY, 0, 'check')
    overlay = insertStep(overlay, lineOf(overlay).length, 'check')
    expect(problems(overlay)).toContainEqual({ code: 'duplicate-skill', nodeId: CHECK, skill: 'check' })
  })

  it('lists a custom step that repeats a built-in skill', () => {
    const overlay = insertStep(EMPTY_OVERLAY, 0, 'magic-commit')
    expect(problems(overlay)).toEqual([{ code: 'duplicate-skill', nodeId: customNodeId('magic-commit'), skill: 'magic-commit' }])
  })

  it('refuses an auto link into start, custom step or not', () => {
    const overlay = setLinkKind(insertStep(EMPTY_OVERLAY, 1, 'check'), CHECK, 'start', 'auto')
    expect(problems(overlay)).toEqual([{ code: 'auto-into-start', nodeId: CHECK }])
    expect(problems(setLinkKind(EMPTY_OVERLAY, 'plan', 'start', 'auto'))).toEqual([{ code: 'auto-into-start', nodeId: 'plan' }])
  })
})

describe('isOverlay / resolveOverlay', () => {
  it('accepts an overlay and refuses a full workflow or a step before an unknown node', () => {
    expect(isOverlay(EMPTY_OVERLAY)).toBe(true)
    expect(isOverlay(DEFAULT_WORKFLOW)).toBe(false)
    expect(isOverlay({ version: 1, steps: [{ skill: 'x', mode: 'advisory', before: 'nowhere' }], kinds: {} })).toBe(false)
  })

  it('resolves a usable overlay and reports an unusable one', () => {
    expect('workflow' in resolveOverlay(insertStep(EMPTY_OVERLAY, 0, 'check'))).toBe(true)
    expect('error' in resolveOverlay(insertStep(EMPTY_OVERLAY, 0, 'magic-pr'))).toBe(true)
    expect('error' in resolveOverlay({ nope: true })).toBe(true)
  })
})

describe('payload then', () => {
  it('carries what follows consecutive custom steps down to the next built-in one', () => {
    let overlay = insertStep(EMPTY_OVERLAY, slotAfter(EMPTY_OVERLAY, 'start'), 'a')
    overlay = insertStep(overlay, slotAfter(overlay, customNodeId('a')), 'b')
    const payload = buildWorkflowPayload('r', { workflow: composeWorkflow(overlay), source: 'repository' }, 'magic-start')
    expect(payload.links).toEqual([{
      from: 'start', to: customNodeId('a'), kind: 'suggest', outcome: null, skill: 'a',
      then: [{
        from: customNodeId('a'), to: customNodeId('b'), kind: 'suggest', outcome: null, skill: 'b',
        then: [{ from: customNodeId('b'), to: 'commit', kind: 'suggest', outcome: null, skill: 'magic-commit', then: [] }],
      }],
    }])
  })
})
