import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'
import type { WorkflowOverlay } from './overlay'
import {
  EMPTY_OVERLAY, addLink, addStep, cleanOverlay, composeWorkflow, customNodeId, isDefaultLink, isOverlay, moveNode, pinPositions,
  normalizeOutcomes, parseOutcomesField, problems, removeLink, removeStep, resolveOverlay, sameOverlay, servedWorkflow, setLinkKind, setLinkOutcome,
  setStepColor, setStepEnabled, setStepMode, setStepOutcomes, toOverlay, unreachableSteps,
} from './overlay'

const CHECK = customNodeId('check')
const AT = { x: 10, y: 20 }

/** A check step between start and commit: start → check → commit. */
function withCheck(): WorkflowOverlay {
  return addLink(addLink(addStep(EMPTY_OVERLAY, 'check', AT), 'start', CHECK), CHECK, 'commit')
}

describe('composeWorkflow', () => {
  it('composes the empty overlay into the default flow', () => {
    const flow = composeWorkflow(EMPTY_OVERLAY)
    expect(flow.nodes).toEqual(DEFAULT_WORKFLOW.nodes)
    expect(flow.links).toEqual(DEFAULT_WORKFLOW.links)
    expect(flow.entry).toEqual(DEFAULT_WORKFLOW.entry)
  })

  it('adds a custom step and its drawn links, keeping every default link', () => {
    const flow = composeWorkflow(withCheck())
    expect(flow.nodes.map((node) => node.id)).toContain(CHECK)
    expect(flow.links).toContainEqual({ from: 'start', to: CHECK, kind: 'suggest' })
    expect(flow.links).toContainEqual({ from: CHECK, to: 'commit', kind: 'suggest' })
    // Default links are locked: drawing around one does not remove it.
    expect(flow.links).toContainEqual({ from: 'start', to: 'commit', kind: 'suggest' })
    expect(flow.entry).toEqual(DEFAULT_WORKFLOW.entry)
    expect(problems(withCheck())).toEqual([])
  })

  it('switches a default link, commit → pr, to auto, and drops the override once back to its kind', () => {
    const overlay = setLinkKind(EMPTY_OVERLAY, 'commit', 'pr', 'auto')
    expect(composeWorkflow(overlay).links).toContainEqual({ from: 'commit', to: 'pr', kind: 'auto' })
    expect(setLinkKind(overlay, 'commit', 'pr', 'suggest').kinds).toEqual({})
  })
})

describe('editing', () => {
  it('adds a step linked to nothing, where it was dropped', () => {
    const overlay = addStep(EMPTY_OVERLAY, 'check', { x: 10.4, y: 19.6 })
    expect(overlay.steps).toEqual([{ skill: 'check', mode: 'advisory' }])
    expect(overlay.links).toEqual([])
    expect(overlay.positions[CHECK]).toEqual(AT)
    expect(unreachableSteps(overlay)).toEqual([CHECK])
  })

  it('draws a link from an outcome\'s port, and changes or drops its outcome', () => {
    let overlay = addLink(addStep(EMPTY_OVERLAY, 'check', AT), 'pr', CHECK, 'ci_green')
    expect(overlay.links).toEqual([{ from: 'pr', to: CHECK, kind: 'suggest', outcome: 'ci_green' }])
    overlay = setLinkOutcome(overlay, 'pr', CHECK, 'pr_created')
    expect(overlay.links[0].outcome).toBe('pr_created')
    overlay = setLinkOutcome(overlay, 'pr', CHECK, undefined)
    expect(overlay.links).toEqual([{ from: 'pr', to: CHECK, kind: 'suggest' }])
  })

  it('draws no second link between two steps, no default one again, and none from a step to itself', () => {
    const overlay = withCheck()
    expect(addLink(overlay, 'start', CHECK)).toBe(overlay)
    expect(addLink(overlay, 'commit', 'pr')).toBe(overlay)
    expect(addLink(overlay, CHECK, CHECK)).toBe(overlay)
  })

  it('removes a drawn link, never a default one', () => {
    const overlay = removeLink(withCheck(), 'start', CHECK)
    expect(overlay.links).toEqual([{ from: CHECK, to: 'commit', kind: 'suggest' }])
    expect(isDefaultLink('start', 'commit')).toBe(true)
    expect(composeWorkflow(removeLink(overlay, 'start', 'commit')).links).toContainEqual({ from: 'start', to: 'commit', kind: 'suggest' })
  })

  it('sets a drawn link\'s kind in place', () => {
    const overlay = setLinkKind(withCheck(), 'start', CHECK, 'auto')
    expect(overlay.links[0]).toEqual({ from: 'start', to: CHECK, kind: 'auto' })
    expect(overlay.kinds).toEqual({})
  })

  it('removes a step with its links and its place', () => {
    const overlay = removeStep(withCheck(), 'check')
    expect(overlay).toEqual(EMPTY_OVERLAY)
  })

  it('changes a step\'s mode, keeping its links and its place', () => {
    const overlay = setStepMode(withCheck(), 'check', 'blocking')
    expect(overlay.steps).toEqual([{ skill: 'check', mode: 'blocking' }])
    expect(overlay.links).toEqual(withCheck().links)
    expect(overlay.positions).toEqual({ [CHECK]: AT })
  })

  it('moves any card, a built-in one included, to whole pixels', () => {
    expect(moveNode(EMPTY_OVERLAY, 'commit', { x: 1.2, y: 3.7 }).positions).toEqual({ commit: { x: 1, y: 4 } })
  })

  it('pins the cards still laid out, and leaves the placed ones where they are', () => {
    const drawn = { plan: { x: 0, y: 0 }, start: { x: 300, y: 0 }, [CHECK]: { x: 999, y: 999 } }
    const overlay = pinPositions(addStep(EMPTY_OVERLAY, 'check', AT), drawn)
    expect(overlay.positions).toEqual({ [CHECK]: AT, plan: { x: 0, y: 0 }, start: { x: 300, y: 0 } })
    expect(pinPositions(overlay, drawn)).toBe(overlay)
  })

  it('never mutates its input', () => {
    const frozen = structuredClone(withCheck())
    const copy = structuredClone(frozen)
    removeStep(moveNode(setLinkKind(frozen, 'start', CHECK, 'auto'), CHECK, AT), 'check')
    expect(frozen).toEqual(copy)
  })
})

describe('problems', () => {
  it('lists the same skill on two steps, naming the second one', () => {
    const overlay = addStep(addStep(EMPTY_OVERLAY, 'check', AT), 'check', AT)
    expect(problems(overlay)).toContainEqual({ code: 'duplicate-skill', nodeId: CHECK, skill: 'check' })
  })

  it('lists a custom step that repeats a built-in skill', () => {
    const overlay = addStep(EMPTY_OVERLAY, 'magic-commit', AT)
    expect(problems(overlay)).toEqual([{ code: 'duplicate-skill', nodeId: customNodeId('magic-commit'), skill: 'magic-commit' }])
  })

  it('refuses an auto link into start, drawn or default', () => {
    const overlay = setLinkKind(addLink(addStep(EMPTY_OVERLAY, 'check', AT), CHECK, 'start'), CHECK, 'start', 'auto')
    expect(problems(overlay)).toEqual([{ code: 'auto-into-start', nodeId: CHECK }])
    expect(problems(setLinkKind(EMPTY_OVERLAY, 'plan', 'start', 'auto'))).toEqual([{ code: 'auto-into-start', nodeId: 'plan' }])
  })

  it('refuses what only a hand-written overlay can hold: a self link, two links between the same steps', () => {
    const base = addStep(EMPTY_OVERLAY, 'check', AT)
    expect(problems({ ...base, links: [{ from: CHECK, to: CHECK, kind: 'suggest' }] })).toEqual([{ code: 'self-link', nodeId: CHECK }])
    expect(problems({ ...base, links: [{ from: 'commit', to: 'pr', kind: 'auto' }] }))
      .toEqual([{ code: 'duplicate-link', nodeId: 'commit', to: 'pr' }])
  })

  it('allows a step nothing links into: it is a warning, not a problem', () => {
    expect(problems(addStep(EMPTY_OVERLAY, 'check', AT))).toEqual([])
  })
})

describe('shapes', () => {
  it('accepts a v2 overlay and refuses a full workflow or a v2 without its links', () => {
    expect(isOverlay(EMPTY_OVERLAY)).toBe(true)
    expect(isOverlay(withCheck())).toBe(true)
    expect(isOverlay(DEFAULT_WORKFLOW)).toBe(false)
    expect(isOverlay({ version: 2, steps: [], kinds: {}, positions: {} })).toBe(false)
    expect(isOverlay({ ...EMPTY_OVERLAY, positions: { plan: { x: 'a', y: 0 } } })).toBe(false)
  })

  it('upgrades a v1 line: its composed links made explicit, a split default link back', () => {
    const v1 = { version: 1, steps: [{ skill: 'check', mode: 'blocking', before: 'resolve' }], kinds: { 'pr>custom:check': 'suggest' } }
    expect(toOverlay(v1)).toEqual({
      version: 2,
      steps: [{ skill: 'check', mode: 'blocking' }],
      links: [
        { from: 'pr', to: CHECK, kind: 'suggest', outcome: 'review_comments' },
        { from: CHECK, to: 'resolve', kind: 'auto' },
      ],
      kinds: {},
      positions: {},
    })
    expect(toOverlay({ version: 1, steps: [{ skill: 'x', mode: 'advisory', before: 'nowhere' }], kinds: {} })).toBeNull()
  })

  it('resolves a usable overlay, v1 or v2, and reports an unusable one', () => {
    expect('workflow' in resolveOverlay(withCheck())).toBe(true)
    expect('workflow' in resolveOverlay({ version: 1, steps: [], kinds: {} })).toBe(true)
    expect('error' in resolveOverlay(addStep(EMPTY_OVERLAY, 'magic-pr', AT))).toBe(true)
    expect('error' in resolveOverlay({ nope: true })).toBe(true)
  })

  it('compares positions whatever their key order, and cleans those of steps it no longer has', () => {
    const a = moveNode(moveNode(EMPTY_OVERLAY, 'plan', AT), 'done', AT)
    const b = moveNode(moveNode(EMPTY_OVERLAY, 'done', AT), 'plan', AT)
    expect(sameOverlay(a, b)).toBe(true)
    expect(sameOverlay(a, moveNode(a, 'plan', { x: 11, y: 20 }))).toBe(false)
    expect(cleanOverlay({ ...a, positions: { ...a.positions, [CHECK]: AT } }).positions).toEqual(a.positions)
  })
})

describe('payload then', () => {
  it('carries what follows consecutive custom steps down to the next built-in one', () => {
    const a = customNodeId('a')
    const b = customNodeId('b')
    let overlay = addStep(addStep(EMPTY_OVERLAY, 'a', AT), 'b', AT)
    overlay = addLink(addLink(addLink(overlay, 'start', a), a, b), b, 'commit')
    const payload = buildWorkflowPayload('r', { workflow: composeWorkflow(overlay), source: 'repository' }, 'magic-start')
    expect(payload.links).toContainEqual({
      from: 'start', to: a, kind: 'suggest', outcome: null, skill: 'a',
      then: [{
        from: a, to: b, kind: 'suggest', outcome: null, skill: 'b',
        then: [{ from: b, to: 'commit', kind: 'suggest', outcome: null, skill: 'magic-commit', then: [] }],
      }],
    })
  })

  it('stops at a custom step already on the way, so a loop of custom steps ends', () => {
    const a = customNodeId('a')
    const b = customNodeId('b')
    let overlay = addStep(addStep(EMPTY_OVERLAY, 'a', AT), 'b', AT)
    overlay = addLink(addLink(addLink(overlay, 'commit', a), a, b), b, a)
    const payload = buildWorkflowPayload('r', { workflow: composeWorkflow(overlay), source: 'repository' }, 'magic-commit')
    expect(payload.links).toContainEqual({
      from: 'commit', to: a, kind: 'suggest', outcome: null, skill: 'a',
      then: [{
        from: a, to: b, kind: 'suggest', outcome: null, skill: 'b',
        then: [{ from: b, to: a, kind: 'suggest', outcome: null, skill: 'a', then: [] }],
      }],
    })
  })
})

describe('turning a step off', () => {
  it('serves the flow without it, its links carried through to what it led to', () => {
    const overlay = setStepEnabled(EMPTY_OVERLAY, 'commit', false)
    expect(overlay.disabled).toEqual(['commit'])
    const flow = servedWorkflow(overlay)
    expect(flow.nodes.map((node) => node.id)).not.toContain('commit')
    expect(flow.links).toContainEqual({ from: 'start', to: 'pr', kind: 'suggest' })
    expect(flow.links.some((link) => link.from === 'commit' || link.to === 'commit')).toBe(false)
    // The editor still draws it, with its links.
    expect(composeWorkflow(overlay).nodes.map((node) => node.id)).toContain('commit')
    expect(problems(overlay)).toEqual([])
  })

  it('keeps the outcome of the link carried, and chains only when both links did', () => {
    let overlay = setStepEnabled(EMPTY_OVERLAY, 'resolve', false)
    expect(servedWorkflow(overlay).links).toContainEqual({ from: 'pr', to: 'done', kind: 'suggest', outcome: 'review_comments' })
    overlay = setLinkKind(overlay, 'resolve', 'done', 'auto')
    expect(servedWorkflow(overlay).links).toContainEqual({ from: 'pr', to: 'done', kind: 'auto', outcome: 'review_comments' })
  })

  it('walks through several steps that are off, custom ones included', () => {
    let overlay = setStepEnabled(withCheck(), CHECK, false)
    overlay = setStepEnabled(overlay, 'commit', false)
    const links = servedWorkflow(overlay).links
    expect(links).toContainEqual({ from: 'start', to: 'pr', kind: 'suggest' })
    expect(links.filter((link) => link.from === 'start' && link.to === 'pr')).toHaveLength(1)
  })

  it('drops plan from the entry, and never turns start off', () => {
    expect(servedWorkflow(setStepEnabled(EMPTY_OVERLAY, 'plan', false)).entry).toEqual(['start'])
    expect(setStepEnabled(EMPTY_OVERLAY, 'start', false)).toBe(EMPTY_OVERLAY)
    expect(problems({ ...EMPTY_OVERLAY, disabled: ['start'] })).toEqual([{ code: 'start-disabled', nodeId: 'start' }])
  })

  it('turns back on to the overlay it was, and follows a step removed', () => {
    const off = setStepEnabled(withCheck(), CHECK, false)
    expect(setStepEnabled(off, CHECK, true)).toEqual(withCheck())
    expect(removeStep(off, 'check').disabled).toBeUndefined()
  })

  it('is part of what is saved, and compared', () => {
    const off = setStepEnabled(EMPTY_OVERLAY, 'done', false)
    expect(sameOverlay(off, EMPTY_OVERLAY)).toBe(false)
    expect(sameOverlay({ ...EMPTY_OVERLAY, disabled: [] }, EMPTY_OVERLAY)).toBe(true)
    expect(cleanOverlay(off).disabled).toEqual(['done'])
    expect(cleanOverlay({ ...EMPTY_OVERLAY, disabled: ['nope'] }).disabled).toBeUndefined()
    expect(isOverlay(off)).toBe(true)
    expect(isOverlay({ ...EMPTY_OVERLAY, disabled: [1] })).toBe(false)
    const resolved = resolveOverlay(off)
    expect('workflow' in resolved && resolved.workflow.nodes.map((node) => node.id)).not.toContain('done')
  })

  it('gives a skill that is off no node in the payload', () => {
    const flow = servedWorkflow(setStepEnabled(EMPTY_OVERLAY, 'commit', false))
    expect(buildWorkflowPayload('r', { workflow: flow, source: 'repository' }, 'magic-commit').node).toBeNull()
    expect(buildWorkflowPayload('r', { workflow: flow, source: 'repository' }, 'magic-start').links.map((link) => link.skill)).toEqual(['magic-pr'])
  })
})

describe('a step\'s colour', () => {
  it('is kept, saved and compared, and never reaches the skills', () => {
    const coloured = setStepColor(withCheck(), 'check', '#6366F1')
    expect(coloured.steps[0].color).toBe('#6366F1')
    expect(sameOverlay(coloured, withCheck())).toBe(false)
    expect(cleanOverlay(coloured).steps[0]).toEqual({ skill: 'check', mode: 'advisory', color: '#6366F1' })
    expect(addStep(EMPTY_OVERLAY, 'lint', AT, 'advisory', '#EF4444').steps[0].color).toBe('#EF4444')
    expect(isOverlay(coloured)).toBe(true)
    expect(isOverlay(setStepColor(withCheck(), 'check', 'red'))).toBe(false)
    expect(JSON.stringify(servedWorkflow(coloured))).not.toContain('#6366F1')
  })
})

describe('a custom step\'s outcomes', () => {
  it('reach the composed node, so a link out of it may be taken on one', () => {
    const o = setStepOutcomes(withCheck(), 'check', ['tests_passed', 'tests_failed'])
    expect(composeWorkflow(o).nodes.find((node) => node.id === CHECK)?.outcomes).toEqual(['tests_passed', 'tests_failed'])
    const conditioned = setLinkOutcome(o, CHECK, 'commit', 'tests_passed')
    expect(problems(conditioned)).toEqual([])
    // Without the declaration, the same link is on an outcome the step does not have.
    expect(problems(setLinkOutcome(withCheck(), CHECK, 'commit', 'tests_passed'))).not.toEqual([])
  })

  it('are kept, saved, compared and checked for shape', () => {
    const o = setStepOutcomes(withCheck(), 'check', ['ok'])
    expect(sameOverlay(o, withCheck())).toBe(false)
    expect(cleanOverlay(o).steps[0]).toEqual({ skill: 'check', mode: 'advisory', outcomes: ['ok'] })
    expect(isOverlay(o)).toBe(true)
    expect(isOverlay({ ...o, steps: [{ ...o.steps[0], outcomes: ['Not Valid'] }] })).toBe(false)
    expect(isOverlay({ ...o, steps: [{ ...o.steps[0], outcomes: ['failed'] }] })).toBe(false)
    // Back to none: the field goes, and the overlay reads as it did.
    expect(sameOverlay(setStepOutcomes(o, 'check', []), withCheck())).toBe(true)
    expect(setStepOutcomes(o, 'check', []).steps[0]).not.toHaveProperty('outcomes')
  })

  it('start with what addStep is given', () => {
    expect(addStep(EMPTY_OVERLAY, 'lint', AT, 'advisory', undefined, ['clean', 'dirty']).steps[0].outcomes).toEqual(['clean', 'dirty'])
    expect(addStep(EMPTY_OVERLAY, 'lint', AT).steps[0]).not.toHaveProperty('outcomes')
  })

  it('keep a link whose outcome is withdrawn, taken whatever the outcome', () => {
    const o = setLinkOutcome(setStepOutcomes(withCheck(), 'check', ['ok', 'ko']), CHECK, 'commit', 'ko')
    const after = setStepOutcomes(o, 'check', ['ok'])
    expect(after.links.find((link) => link.from === CHECK && link.to === 'commit')).toEqual({ from: CHECK, to: 'commit', kind: 'suggest' })
    expect(problems(after)).toEqual([])
  })

  it('are spelled the skills\' way: lower snake_case, each once, never `failed`', () => {
    expect(normalizeOutcomes([' Tests Passed ', 'tests_passed', 'failed', '', '1st', 'ok-ish'])).toEqual(['tests_passed', 'ok-ish'])
  })
})

describe('parseOutcomesField', () => {
  it('reads a flow list, a block list and a bare line', () => {
    expect(parseOutcomesField('[tests_passed, "tests_failed"]')).toEqual(['tests_passed', 'tests_failed'])
    expect(parseOutcomesField('- clean - dirty')).toEqual(['clean', 'dirty'])
    expect(parseOutcomesField('clean, dirty')).toEqual(['clean', 'dirty'])
  })

  it('is undefined when nothing usable is declared', () => {
    expect(parseOutcomesField(undefined)).toBeUndefined()
    expect(parseOutcomesField('')).toBeUndefined()
    expect(parseOutcomesField('[failed]')).toBeUndefined()
  })
})
