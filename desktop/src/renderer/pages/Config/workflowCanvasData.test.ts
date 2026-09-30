import { describe, expect, it } from 'vitest'

import { DEFAULT_WORKFLOW } from '../../../workflow/defaultFlow'
import {
  EMPTY_OVERLAY, addLink, addStep, composeWorkflow, customNodeId, isLinkIntoStart, problems, sameOverlay, setLinkKind,
} from '../../../workflow/overlay'
import type { ListingEntry } from '../../hooks/useSkills'
import {
  folderSkillsOf, problemNodeIds, skillDisplayName, skillOptions, stepHints, workflowCanvasData,
} from './workflowCanvasData'

/**
 * The Workflow tab draws whatever this mapping hands the canvas, so it is held to the
 * flow every repository shows today: every node and link through, every outcome
 * still naming the port and the label of its link.
 */
describe('workflowCanvasData', () => {
  const data = workflowCanvasData(DEFAULT_WORKFLOW)

  it('keeps every node, link and entry of the default flow, in order', () => {
    expect(data.nodes.map((node) => node.id)).toEqual(DEFAULT_WORKFLOW.nodes.map((node) => node.id))
    expect(data.links).toHaveLength(DEFAULT_WORKFLOW.links.length)
    expect(data.entry).toEqual(DEFAULT_WORKFLOW.entry)
  })

  it('names each node after its skill', () => {
    const labels = Object.fromEntries(data.nodes.map((node) => [node.id, node.label]))
    expect(labels).toMatchObject({ plan: 'Plan', commit: 'Commit', pr: 'PR', resolve: 'Resolve', done: 'Done' })
  })

  it('draws no review node, /magic:review being a side door', () => {
    expect(data.nodes.map((node) => node.id)).not.toContain('review')
  })

  it('carries each conditional link on an outcome its source node has a port for', () => {
    const conditional = data.links.filter((link) => link.outcome !== undefined)
    expect(conditional.length).toBeGreaterThan(0)
    for (const link of conditional) {
      const from = data.nodes.find((node) => node.id === link.from)!
      expect(from.outcomes, `${link.from} → ${link.to}`).toContain(link.outcome)
    }
  })

  it('keeps the auto link auto and the suggestions suggestions', () => {
    const kinds = data.links.map((link) => link.kind)
    expect(kinds).toEqual(DEFAULT_WORKFLOW.links.map((link) => link.kind))
    expect(kinds).toContain('auto')
    expect(kinds).toContain('suggest')
  })
})

describe('skillDisplayName', () => {
  it('drops the magic- prefix and title-cases what is left', () => {
    expect(skillDisplayName('magic-plan-change')).toBe('Plan Change')
    expect(skillDisplayName('magic-pr')).toBe('PR')
  })

  it('names a custom skill after its folder', () => {
    expect(skillDisplayName('design-check')).toBe('Design Check')
  })
})

/**
 * The editor's marks: what the Workflow tab draws on a card once it can be edited. The
 * overlay is built the way the editor builds it: a step dropped, then linked.
 */
describe('workflowCanvasData, editing', () => {
  const AT = { x: 0, y: 0 }
  const lint = customNodeId('lint')
  const withLint = addLink(addLink(addStep(EMPTY_OVERLAY, 'lint', AT, 'blocking'), 'start', lint), lint, 'commit')

  it('locks every built-in step and gives a custom one its mode', () => {
    const data = workflowCanvasData(composeWorkflow(withLint))
    for (const node of data.nodes) {
      if (node.id === lint) {
        expect(node.locked).toBeUndefined()
        expect(node.mode).toBe('blocking')
      } else {
        expect(node.locked, node.id).toBe(true)
        expect(node.mode, node.id).toBeUndefined()
      }
    }
  })

  it('marks the steps a problem names, and warns the ones it is told to', () => {
    const twice = addStep(withLint, 'magic-commit', AT)
    const found = problems(twice)
    const data = workflowCanvasData(composeWorkflow(twice), {
      problems: problemNodeIds(found),
      warnings: { [lint]: 'only here' },
    })
    const byId = Object.fromEntries(data.nodes.map((node) => [node.id, node]))
    expect(byId[customNodeId('magic-commit')].problem).toBe(true)
    expect(byId.commit.problem).toBeUndefined()
    expect(byId[lint].warning).toBe('only here')
    expect(byId[lint].problem).toBeUndefined()
  })

  it('names no step for a problem about the whole flow', () => {
    expect(problemNodeIds([{ code: 'invalid', message: 'x' }])).toEqual([])
  })

  it('says a step reached on review comments runs only then', () => {
    const triage = customNodeId('triage')
    const overlay = addLink(addStep(EMPTY_OVERLAY, 'triage', AT), 'pr', triage, 'review_comments')
    expect(stepHints(composeWorkflow(overlay), triage)).toEqual(['on-review-comments'])
  })

  it('says a step reached from plan, never from start, is skipped from start', () => {
    const refine = customNodeId('refine')
    const overlay = addLink(addStep(EMPTY_OVERLAY, 'refine', AT), 'plan', refine)
    expect(stepHints(composeWorkflow(overlay), refine)).toEqual(['skipped-from-start'])
    // Reached from start as well, it is not skipped.
    expect(stepHints(composeWorkflow(addLink(overlay, 'commit', refine)), refine)).toEqual([])
  })

  it('says nothing of a plain step, nor of a built-in one', () => {
    const flow = composeWorkflow(withLint)
    expect(stepHints(flow, lint)).toEqual([])
    expect(stepHints(flow, 'resolve')).toEqual([])
  })

  it('knows a link into start', () => {
    expect(isLinkIntoStart({ to: 'start' })).toBe(true)
    expect(isLinkIntoStart({ to: 'commit' })).toBe(false)
  })
})

describe('skillOptions', () => {
  const entry = (name: string, source: ListingEntry['source'], extra: Partial<ListingEntry> = {}): ListingEntry =>
    ({ name, text: '', source, mode: 'full', ...extra })
  const entries: ListingEntry[] = [
    entry('magic-commit', 'built-in'),
    entry('lint', 'custom'),
    entry('shared', 'custom'),
    entry('shared', 'repo', { origin: 'web' }),
    entry('other-repo', 'repo', { origin: 'api' }),
    entry('secret', 'custom', { mode: 'hidden' }),
    entry('plug:check', 'plugin', { origin: 'plug' }),
  ]

  it('lists the custom, repository and plugin skills, never a built-in, another repo\'s or a hidden one', () => {
    expect(skillOptions(entries, 'web', []).map((o) => [o.name, o.source])).toEqual([
      ['lint', 'custom'],
      ['shared', 'repo'],
      ['plug:check', 'plugin'],
    ])
  })

  it('greys the skills already in the workflow', () => {
    const options = skillOptions(entries, 'web', ['lint'])
    expect(options.find((o) => o.name === 'lint')?.disabled).toBe(true)
    expect(options.find((o) => o.name === 'plug:check')?.disabled).toBe(false)
  })
})

describe('folderSkillsOf and sameOverlay', () => {
  it('leaves plugin skills out of the ones a teammate may miss', () => {
    const overlay = addStep(addStep(EMPTY_OVERLAY, 'lint', { x: 0, y: 0 }), 'plug:check', { x: 0, y: 0 })
    expect(folderSkillsOf(overlay)).toEqual(['lint'])
  })

  it('ignores the order kinds were written in', () => {
    const a = setLinkKind(setLinkKind(EMPTY_OVERLAY, 'start', 'commit', 'auto'), 'commit', 'pr', 'auto')
    const b = setLinkKind(setLinkKind(EMPTY_OVERLAY, 'commit', 'pr', 'auto'), 'start', 'commit', 'auto')
    expect(sameOverlay(a, b)).toBe(true)
    expect(sameOverlay(a, EMPTY_OVERLAY)).toBe(false)
    const at = { x: 0, y: 0 }
    expect(sameOverlay(addStep(EMPTY_OVERLAY, 'lint', at), addStep(EMPTY_OVERLAY, 'lint', at, 'blocking'))).toBe(false)
  })
})
