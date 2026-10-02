import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'
import type { WorkflowOverlay } from './overlay'
import {
  EMPTY_OVERLAY, addLink, addStep, cleanOverlay, composeWorkflow, customNodeId, isDefaultLink, isOverlay, moveNode, pinPositions,
  addFrame, addSticky, isStickyNodeId, nextStickyId, removeSticky, setSticky, stickyNodeId, STICKY_MIN_SIZE, STICKY_SIZE, canRemoveStep, frameNodeId, FRAME_MIN_SIZE, isFrameNodeId, moveNodes, nextFrameId, removeFrame, setFrame, normalizeOutcomes, outcomeProblem, removeNode, restoreStep, parseOutcomesField, problems, removeLink, removeStep, resolveOverlay, sameOverlay, servedWorkflow, setLinkKind, setLinkOutcome,
  setStepColor, setStepEnabled, setStepMode, setStepOutcomes,
  addNote, nextNoteId, noteNodeId, removeNote, setNoteText, toOverlay, unreachableSteps,
  copyCard, pasteCard, PASTE_OFFSET,
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
    overlay = setLinkOutcome(overlay, 'pr', CHECK, 'ci_green', 'pr_created')
    expect(overlay.links[0].outcome).toEqual('pr_created')
    overlay = setLinkOutcome(overlay, 'pr', CHECK, 'pr_created', undefined)
    expect(overlay.links).toEqual([{ from: 'pr', to: CHECK, kind: 'suggest' }])
  })

  it('draws no second link between two steps, nor a default one again', () => {
    const overlay = withCheck()
    expect(addLink(overlay, 'start', CHECK)).toBe(overlay)
    expect(addLink(overlay, 'commit', 'pr')).toBe(overlay)
  })

  it('links a step to itself, to run it again', () => {
    const overlay = addLink(setStepOutcomes(withCheck(), 'check', ['tests_failed']), CHECK, CHECK, 'tests_failed')
    expect(overlay.links).toContainEqual({ from: CHECK, to: CHECK, kind: 'suggest', outcome: 'tests_failed' })
    expect(problems(overlay)).toEqual([])
    expect(problems(setLinkKind(overlay, CHECK, CHECK, 'auto', 'tests_failed'))).toEqual([])
    expect(problems(addLink(withCheck(), 'commit', 'commit'))).toEqual([])
  })

  it('removes a drawn link, and takes a default one off', () => {
    const overlay = removeLink(withCheck(), 'start', CHECK)
    expect(overlay.links).toEqual([{ from: CHECK, to: 'commit', kind: 'suggest' }])
    expect(isDefaultLink('start', 'commit')).toBe(true)
    const off = removeLink(setLinkKind(overlay, 'start', 'commit', 'auto'), 'start', 'commit')
    expect(composeWorkflow(off).links).not.toContainEqual(expect.objectContaining({ from: 'start', to: 'commit' }))
    expect(off.kinds).toEqual({})
    expect(cleanOverlay(off).removedLinks).toEqual(['start>commit'])
    // A default link on an outcome is that outcome's: pr → resolve on review_comments.
    expect(removeLink(EMPTY_OVERLAY, 'pr', 'resolve').removedLinks).toBeUndefined()
    expect(removeLink(EMPTY_OVERLAY, 'pr', 'resolve', 'review_comments').removedLinks).toEqual(['pr>resolve'])
    // Taken off, the pair may be drawn again, as a link of the overlay's own.
    const redrawn = addLink(off, 'start', 'commit')
    expect(redrawn.links).toContainEqual({ from: 'start', to: 'commit', kind: 'suggest' })
    expect(problems(redrawn)).toEqual([])
    expect(setLinkKind(redrawn, 'start', 'commit', 'auto').kinds).toEqual({})
  })

  it('takes a built-in step off the canvas with all its links, and puts it back unlinked', () => {
    const overlay = removeNode(addLink(withCheck(), 'commit', CHECK), 'commit')
    const flow = composeWorkflow(overlay)
    expect(flow.nodes.map((node) => node.id)).not.toContain('commit')
    expect(flow.links.some((link) => link.from === 'commit' || link.to === 'commit')).toBe(false)
    expect(problems(overlay)).toEqual([])
    expect(overlay.positions).not.toHaveProperty('commit')
    const back = restoreStep(overlay, 'commit', { x: 400.4, y: 100 })
    expect(composeWorkflow(back).nodes.map((node) => node.id)).toContain('commit')
    expect(composeWorkflow(back).links.some((link) => link.from === 'commit' || link.to === 'commit')).toBe(false)
    expect(back.positions.commit).toEqual({ x: 400, y: 100 })
    expect(unreachableSteps(back)).toContain('commit')
    // Its default links can be drawn again, by hand.
    expect(composeWorkflow(addLink(back, 'start', 'commit')).links).toContainEqual({ from: 'start', to: 'commit', kind: 'suggest' })
  })

  it('never takes start off, and resets to every built-in step and default link', () => {
    expect(canRemoveStep('start')).toBe(false)
    expect(removeNode(EMPTY_OVERLAY, 'start')).toBe(EMPTY_OVERLAY)
    const plan = removeNode(EMPTY_OVERLAY, 'plan')
    expect(composeWorkflow(plan).entry).toEqual(['start'])
    expect(problems(plan)).toEqual([])
    expect(composeWorkflow(EMPTY_OVERLAY)).toEqual(composeWorkflow(cleanOverlay(EMPTY_OVERLAY)))
    expect(sameOverlay(plan, EMPTY_OVERLAY)).toBe(false)
    expect(isOverlay(cleanOverlay(plan))).toBe(true)
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

  it('refuses a step that reruns itself on its own whatever it ended on, and two links between the same steps', () => {
    const base = addStep(EMPTY_OVERLAY, 'check', AT)
    expect(problems({ ...base, links: [{ from: CHECK, to: CHECK, kind: 'suggest' }] })).toEqual([])
    expect(problems({ ...base, links: [{ from: CHECK, to: CHECK, kind: 'auto' }] })).toEqual([{ code: 'self-link', nodeId: CHECK }])
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

  it('refuses a v1 line: no build writes one, none is stored', () => {
    expect(toOverlay({ version: 1, steps: [{ skill: 'check', mode: 'blocking', before: 'resolve' }], kinds: {} })).toBeNull()
  })

  it('resolves a usable overlay and reports an unusable one', () => {
    expect('workflow' in resolveOverlay(withCheck())).toBe(true)
    expect('error' in resolveOverlay({ version: 1, steps: [], kinds: {} })).toBe(true)
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
      from: 'start', to: a, kind: 'suggest', outcome: null, skill: 'a', note: null,
      then: [{
        from: a, to: b, kind: 'suggest', outcome: null, skill: 'b', note: null,
        then: [{ from: b, to: 'commit', kind: 'suggest', outcome: null, skill: 'magic-commit', note: null, then: [] }],
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
      from: 'commit', to: a, kind: 'suggest', outcome: null, skill: 'a', note: null,
      then: [{
        from: a, to: b, kind: 'suggest', outcome: null, skill: 'b', note: null,
        then: [{ from: b, to: a, kind: 'suggest', outcome: null, skill: 'a', note: null, then: [] }],
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
    const conditioned = setLinkOutcome(o, CHECK, 'commit', undefined, 'tests_passed')
    expect(problems(conditioned)).toEqual([])
    // Without the declaration, the same link is on an outcome the step does not have.
    expect(problems(setLinkOutcome(withCheck(), CHECK, 'commit', undefined, 'tests_passed'))).not.toEqual([])
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
    const o = setLinkOutcome(setStepOutcomes(withCheck(), 'check', ['ok', 'ko']), CHECK, 'commit', undefined, 'ko')
    const after = setStepOutcomes(o, 'check', ['ok'])
    expect(after.links.find((link) => link.from === CHECK && link.to === 'commit')).toEqual({ from: CHECK, to: 'commit', kind: 'suggest' })
    expect(problems(after)).toEqual([])
  })

  it('are spelled the skills\' way: lower snake_case, each once, never `failed`', () => {
    expect(normalizeOutcomes([' Tests Passed ', 'tests_passed', 'failed', '', '1st', 'ok-ish'])).toEqual(['tests_passed', 'ok-ish'])
  })

  it('say why a typed one cannot be added, after the spelling a step stores', () => {
    expect(outcomeProblem(' Tests Passed ', [])).toBeUndefined()
    expect(outcomeProblem('', [])).toBeUndefined()
    expect(outcomeProblem('Failed', [])).toBe('failed')
    expect(outcomeProblem('1st', [])).toBe('start')
    expect(outcomeProblem('_ok', [])).toBe('start')
    expect(outcomeProblem('ok!', [])).toBe('chars')
    expect(outcomeProblem('é', [])).toBe('start')
    expect(outcomeProblem(`a${'b'.repeat(40)}`, [])).toBe('length')
    expect(outcomeProblem('tests passed', ['tests_passed'])).toBe('duplicate')
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

describe('several outcomes leading to the same step', () => {
  const ready = () => setStepOutcomes(withCheck(), 'check', ['ok', 'warn', 'ko'])
  // check → commit on `ok` and on `warn`: two links.
  const two = () => addLink(setLinkOutcome(ready(), CHECK, 'commit', undefined, 'ok'), CHECK, 'commit', 'warn')

  it('are a link each, served as they are, with no duplicate', () => {
    const o = two()
    expect(o.links.filter((link) => link.from === CHECK)).toEqual([
      { from: CHECK, to: 'commit', kind: 'suggest', outcome: 'ok' },
      { from: CHECK, to: 'commit', kind: 'suggest', outcome: 'warn' },
    ])
    expect(composeWorkflow(o).links.filter((link) => link.from === CHECK && link.to === 'commit')).toEqual([
      { from: CHECK, to: 'commit', kind: 'suggest', outcome: 'ok' },
      { from: CHECK, to: 'commit', kind: 'suggest', outcome: 'warn' },
    ])
    expect(problems(o)).toEqual([])
    // Not the same outcome twice, nor one beside a link taken whatever the outcome.
    expect(addLink(o, CHECK, 'commit', 'ok')).toBe(o)
    expect(addLink(o, CHECK, 'commit')).toBe(o)
    const whatever = withCheck()
    expect(addLink(whatever, CHECK, 'commit', 'ok')).toBe(whatever)
  })

  it('each have their own kind, and are removed one at a time', () => {
    const o = setLinkKind(two(), CHECK, 'commit', 'auto', 'warn')
    expect(o.links.filter((link) => link.from === CHECK).map((link) => link.kind)).toEqual(['suggest', 'auto'])
    expect(removeLink(o, CHECK, 'commit', 'ok').links.filter((link) => link.from === CHECK)).toEqual([
      { from: CHECK, to: 'commit', kind: 'auto', outcome: 'warn' },
    ])
  })

  it('move from one outcome to another free one only', () => {
    const o = two()
    expect(setLinkOutcome(o, CHECK, 'commit', 'warn', 'ok')).toBe(o)
    expect(setLinkOutcome(o, CHECK, 'commit', 'warn', undefined)).toBe(o)
    expect(setLinkOutcome(o, CHECK, 'commit', 'warn', 'ko').links.map((link) => link.outcome)).toContain('ko')
  })

  it('read a link of before taken on several outcomes as one link per outcome, each with its kind', () => {
    const stored = { ...ready(), links: [{ from: CHECK, to: 'commit', kind: 'auto', outcomes: ['ok', 'ko'] }] }
    expect(isOverlay(stored)).toBe(true)
    const read = toOverlay(stored)!
    expect(read.links).toEqual([
      { from: CHECK, to: 'commit', kind: 'auto', outcome: 'ok' },
      { from: CHECK, to: 'commit', kind: 'auto', outcome: 'ko' },
    ])
    expect(cleanOverlay(stored as WorkflowOverlay).links).toEqual(read.links)
  })

  it('are untouched when the step gains an outcome', () => {
    const o = two()
    expect(setStepOutcomes(o, 'check', ['ok', 'warn', 'ko', 'skipped']).links).toEqual(o.links)
  })

  it('lose the link on an outcome withdrawn when the two steps stay linked otherwise', () => {
    const o = setStepOutcomes(two(), 'check', ['ok', 'ko'])
    expect(o.links.filter((link) => link.from === CHECK)).toEqual([{ from: CHECK, to: 'commit', kind: 'suggest', outcome: 'ok' }])
  })
})

describe('an end note', () => {
  const N1 = noteNodeId('n1')
  const withNote = () => addLink(addNote(setStepOutcomes(withCheck(), 'check', ['ok', 'ko']), AT, 'Open a ticket'), CHECK, N1, 'ko')

  it('is a card of its own a link may lead to, never a node of the flow', () => {
    const o = withNote()
    expect(o.notes).toEqual([{ id: 'n1', text: 'Open a ticket' }])
    const flow = composeWorkflow(o)
    expect(flow.notes).toEqual([{ id: N1, text: 'Open a ticket' }])
    expect(flow.nodes.map((node) => node.id)).not.toContain(N1)
    expect(flow.links).toContainEqual({ from: CHECK, to: N1, kind: 'suggest', outcome: 'ko' })
    expect(problems(o)).toEqual([])
    expect(isOverlay(cleanOverlay(o))).toBe(true)
  })

  it('has nothing leaving it, cannot be turned off, and must say something', () => {
    const o = withNote()
    expect(addLink(o, N1, 'pr')).toBe(o)
    expect(setStepEnabled(o, N1, false)).toBe(o)
    expect(problems(setNoteText(o, N1, '  '))).toEqual([{ code: 'empty-note', nodeId: N1 }])
  })

  it('is one trimmed line, takes the next free id, and goes with its links and place', () => {
    let o = setNoteText(withNote(), N1, '  Open a   ticket\n\n\n\n in Jira  ')
    expect(o.notes?.[0].text).toBe('Open a ticket\n\nin Jira')
    expect(nextNoteId(o)).toBe('n2')
    o = removeNote(o, N1)
    expect(o).not.toHaveProperty('notes')
    expect(o.links.some((link) => link.to === N1)).toBe(false)
    expect(o.positions[N1]).toBeUndefined()
  })

  it('is reached or warned about, and compared', () => {
    const lonely = addNote(withCheck(), AT, 'Nobody reads me')
    expect(unreachableSteps(lonely)).toContain(N1)
    expect(unreachableSteps(withNote())).not.toContain(N1)
    expect(sameOverlay(withNote(), setNoteText(withNote(), N1, 'Other'))).toBe(false)
  })

  it('reaches the skills as the link\'s note, with no skill and no then', () => {
    const payload = buildWorkflowPayload('r', { workflow: servedWorkflow(withNote()), source: 'repository' }, 'check')
    expect(payload.links).toContainEqual({ from: CHECK, to: N1, kind: 'suggest', outcome: 'ko', skill: null, note: 'Open a ticket', then: [] })
  })
})

describe('a frame', () => {
  const box = { x: 10.4, y: 20, width: 400, height: 260 }
  const framed = () => addFrame(withCheck(), box, '#6366F1', '#22C55E', '  Checks   before the PR ')

  it('is added with its own id, a whole box and a one-line title', () => {
    const o = framed()
    expect(o.frames).toEqual([{ id: 'f1', title: 'Checks before the PR', border: '#6366F1', background: '#22C55E', x: 10, y: 20, width: 400, height: 260 }])
    expect(nextFrameId(o)).toBe('f2')
    expect(isFrameNodeId(frameNodeId('f1'))).toBe(true)
    expect(isOverlay(cleanOverlay(o))).toBe(true)
    expect(sameOverlay(cleanOverlay(o), o)).toBe(true)
  })

  it('is never seen by the skills', () => {
    expect(composeWorkflow(framed())).toEqual(composeWorkflow(withCheck()))
    expect(JSON.stringify(servedWorkflow(framed()))).not.toContain('f1')
  })

  it('is renamed, recoloured, resized never under its smallest, moved and removed', () => {
    const id = frameNodeId('f1')
    let o = setFrame(framed(), id, { title: 'Lint', border: '#EF4444', width: 10, height: 10 })
    expect(o.frames![0]).toMatchObject({ title: 'Lint', border: '#EF4444', width: FRAME_MIN_SIZE.width, height: FRAME_MIN_SIZE.height })
    // Moved with the cards it carried, as one edit.
    o = moveNodes(o, { [id]: { x: 100, y: 200 }, [CHECK]: { x: 120.6, y: 240 } })
    expect(o.frames![0]).toMatchObject({ x: 100, y: 200 })
    expect(o.positions[CHECK]).toEqual({ x: 121, y: 240 })
    expect(sameOverlay(o, framed())).toBe(false)
    // Removed, the cards inside stay.
    const gone = removeFrame(o, id)
    expect(gone).not.toHaveProperty('frames')
    expect(gone.positions[CHECK]).toEqual({ x: 121, y: 240 })
  })

  it('is refused for a malformed shape', () => {
    const o = framed()
    expect(isOverlay({ ...o, frames: [{ ...o.frames![0], border: 'red' }] })).toBe(false)
    expect(isOverlay({ ...o, frames: [{ ...o.frames![0], width: 'wide' }] })).toBe(false)
  })
})

describe('a sticky note', () => {
  const stuck = () => addSticky(withCheck(), { x: 10.6, y: 20 }, '#F59E0B', 'Ask QA  \n\n\n\nbefore merging ')

  it('is added at its size, with its lines kept and tidied', () => {
    const o = stuck()
    expect(o.stickies).toEqual([{ id: 's1', text: 'Ask QA\n\nbefore merging', color: '#F59E0B', x: 11, y: 20, ...STICKY_SIZE }])
    expect(nextStickyId(o)).toBe('s2')
    expect(isStickyNodeId(stickyNodeId('s1'))).toBe(true)
    expect(isOverlay(cleanOverlay(o))).toBe(true)
    expect(sameOverlay(cleanOverlay(o), o)).toBe(true)
    expect(composeWorkflow(o)).toEqual(composeWorkflow(withCheck()))
  })

  it('is rewritten, recoloured, resized never under its smallest, moved and removed', () => {
    const id = stickyNodeId('s1')
    let o = setSticky(stuck(), id, { text: 'Done', color: '#22C55E', width: 1, height: 1 })
    expect(o.stickies![0]).toMatchObject({ text: 'Done', color: '#22C55E', ...STICKY_MIN_SIZE })
    o = moveNodes(o, { [id]: { x: 300, y: 400 } })
    expect(o.stickies![0]).toMatchObject({ x: 300, y: 400 })
    expect(removeSticky(o, id)).not.toHaveProperty('stickies')
    expect(isOverlay({ ...o, stickies: [{ ...o.stickies![0], color: 'yellow' }] })).toBe(false)
  })
})

describe('copyCard / pasteCard', () => {
  it('pastes a frame whole, offset, under a new id, and the next paste one step further', () => {
    const framed = setFrame(addFrame(EMPTY_OVERLAY, { x: 0, y: 0, width: 500, height: 320 }, '#112233', '#445566'), frameNodeId('f1'), { title: 'Checks' })
    const clip = copyCard(framed, frameNodeId('f1'))!
    const first = pasteCard(framed, clip)
    expect(first.id).toBe(frameNodeId('f2'))
    expect(first.overlay.frames?.[1]).toEqual({
      id: 'f2', title: 'Checks', border: '#112233', background: '#445566', x: PASTE_OFFSET, y: PASTE_OFFSET, width: 500, height: 320,
    })
    const second = pasteCard(first.overlay, first.clip)
    expect(second.id).toBe(frameNodeId('f3'))
    expect(second.overlay.frames?.[2]).toMatchObject({ x: 2 * PASTE_OFFSET, y: 2 * PASTE_OFFSET })
  })

  it('pastes a sticky note with its text, colour and size', () => {
    const stuck = setSticky(addSticky(EMPTY_OVERLAY, { x: 10, y: 10 }, '#abcdef'), stickyNodeId('s1'), { text: 'Ask QA', width: 300, height: 200 })
    const pasted = pasteCard(stuck, copyCard(stuck, stickyNodeId('s1'))!)
    expect(pasted.id).toBe(stickyNodeId('s2'))
    expect(pasted.overlay.stickies?.[1]).toEqual({
      id: 's2', text: 'Ask QA', color: '#abcdef', x: 10 + PASTE_OFFSET, y: 10 + PASTE_OFFSET, width: 300, height: 200,
    })
  })

  it('pastes an end note without the links into it', () => {
    const noted = addLink(setNoteText(addNote(EMPTY_OVERLAY, AT, '', '#123456'), noteNodeId('n1'), 'Open the ticket'), 'commit', noteNodeId('n1'))
    const pasted = pasteCard(noted, copyCard(noted, noteNodeId('n1'))!)
    expect(pasted.id).toBe(noteNodeId('n2'))
    expect(pasted.overlay.notes?.[1]).toEqual({ id: 'n2', text: 'Open the ticket', color: '#123456' })
    expect(pasted.overlay.positions[noteNodeId('n2')]).toEqual({ x: AT.x + PASTE_OFFSET, y: AT.y + PASTE_OFFSET })
    expect(pasted.overlay.links.filter((link) => link.to === noteNodeId('n2'))).toEqual([])
  })

  it('copies an end note laid out rather than placed from where it is drawn', () => {
    const { positions: _none, ...rest } = addNote(EMPTY_OVERLAY, AT, 'Done')
    const unplaced = { ...rest, positions: {} }
    expect(copyCard(unplaced, noteNodeId('n1'))).toBeNull()
    expect(copyCard(unplaced, noteNodeId('n1'), { x: 5.4, y: 7.6 })).toEqual({ type: 'note', text: 'Done', position: { x: 5, y: 8 } })
  })

  it('never copies a step, built-in or custom, nor a card that is not there', () => {
    expect(copyCard(withCheck(), CHECK)).toBeNull()
    expect(copyCard(withCheck(), 'commit')).toBeNull()
    expect(copyCard(EMPTY_OVERLAY, frameNodeId('f9'))).toBeNull()
  })
})
