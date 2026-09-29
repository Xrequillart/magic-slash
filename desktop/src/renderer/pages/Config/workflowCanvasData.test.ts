import { describe, expect, it } from 'vitest'

import { DEFAULT_WORKFLOW } from '../../../workflow/defaultFlow'
import { skillDisplayName, workflowCanvasData } from './workflowCanvasData'

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
    expect(labels).toMatchObject({ plan: 'Plan', commit: 'Commit', pr: 'PR', review: 'Review', done: 'Done' })
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
