import { describe, it, expect } from 'vitest'
import type { Workflow, WorkflowNode } from './model'
import { isWorkflow, nodeForSkill, outgoingLinks, resolveNext, validateWorkflow } from './model'

function node(id: string, overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return { id, skill: `magic-${id}`, mode: 'blocking', required: true, outcomes: [], provides: [], ...overrides }
}

/** A small flow exercising every link shape: unconditional, conditional, auto. */
function flow(): Workflow {
  return {
    id: 'test',
    entry: ['start'],
    nodes: [
      node('start', { outcomes: ['implemented'] }),
      node('commit', { outcomes: ['committed'] }),
      node('pr', { outcomes: ['pr_created', 'review_comments'] }),
      node('review', { mode: 'advisory', outcomes: ['approved'] }),
      node('resolve'),
      node('done'),
    ],
    links: [
      { from: 'start', to: 'commit', kind: 'suggest' },
      { from: 'commit', to: 'pr', kind: 'auto' },
      { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments' },
      { from: 'pr', to: 'review', kind: 'suggest', outcome: 'pr_created' },
      { from: 'pr', to: 'done', kind: 'suggest' },
      { from: 'review', to: 'done', kind: 'auto' },
    ],
  }
}

describe('validateWorkflow', () => {
  it('accepts a well-formed flow', () => {
    expect(validateWorkflow(flow())).toEqual([])
  })

  it('refuses a duplicate node id', () => {
    const f = flow()
    f.nodes.push(node('commit', { skill: 'magic-other' }))
    expect(validateWorkflow(f)).toEqual([expect.stringContaining('duplicate node id "commit"')])
  })

  it('refuses the same skill on two nodes', () => {
    const f = flow()
    f.nodes.push(node('commit-again', { skill: 'magic-commit' }))
    expect(validateWorkflow(f)).toEqual([expect.stringContaining('skill "magic-commit" is on two nodes')])
  })

  it('refuses a link from an unknown node', () => {
    const f = flow()
    f.links.push({ from: 'ghost', to: 'done', kind: 'suggest' })
    expect(validateWorkflow(f)).toEqual([expect.stringContaining('link from unknown node "ghost"')])
  })

  it('refuses a link to an unknown node', () => {
    const f = flow()
    f.links.push({ from: 'done', to: 'ghost', kind: 'suggest' })
    expect(validateWorkflow(f)).toEqual([expect.stringContaining('link to unknown node "ghost"')])
  })

  it('refuses a link on an outcome its source does not declare', () => {
    const f = flow()
    f.links.push({ from: 'commit', to: 'done', kind: 'suggest', outcome: 'merged' })
    expect(validateWorkflow(f)).toEqual([expect.stringContaining('outcome "merged"')])
  })

  it('refuses an unknown entry', () => {
    const f = flow()
    f.entry.push('ghost')
    expect(validateWorkflow(f)).toEqual([expect.stringContaining('entry "ghost"')])
  })

  it('refuses an auto link from plan to start, but not a suggestion', () => {
    const f = flow()
    f.nodes.push(node('plan', { mode: 'advisory', required: false }))
    f.links.push({ from: 'plan', to: 'start', kind: 'suggest' })
    expect(validateWorkflow(f)).toEqual([])

    f.links.push({ from: 'plan', to: 'start', kind: 'auto' })
    expect(validateWorkflow(f)).toEqual([expect.stringContaining('cannot be auto')])
  })

  it('reports every problem, not just the first', () => {
    const f = flow()
    f.entry.push('ghost')
    f.links.push({ from: 'ghost', to: 'phantom', kind: 'suggest' })
    expect(validateWorkflow(f)).toHaveLength(3)
  })
})

describe('nodeForSkill / outgoingLinks', () => {
  it('finds a node by its skill, and null for a skill not in the flow', () => {
    expect(nodeForSkill(flow(), 'magic-pr')?.id).toBe('pr')
    expect(nodeForSkill(flow(), 'magic-plan-change')).toBeNull()
  })

  it('lists a node\'s outgoing links in declaration order', () => {
    expect(outgoingLinks(flow(), 'pr').map((l) => l.to)).toEqual(['resolve', 'review', 'done'])
    expect(outgoingLinks(flow(), 'done')).toEqual([])
  })
})

describe('resolveNext', () => {
  it('suggests an unconditional suggest link', () => {
    expect(resolveNext(flow(), 'magic-start', 'implemented')).toEqual({
      auto: null,
      suggestions: [{ from: 'start', to: 'commit', kind: 'suggest' }],
    })
  })

  it('takes an unconditional auto link, whatever the outcome', () => {
    expect(resolveNext(flow(), 'magic-commit', null).auto?.to).toBe('pr')
  })

  it('follows the links conditioned on the outcome, and the unconditional ones', () => {
    const onComments = resolveNext(flow(), 'magic-pr', 'review_comments')
    expect(onComments.auto?.to).toBe('resolve')
    expect(onComments.suggestions.map((l) => l.to)).toEqual(['done'])

    const onCreated = resolveNext(flow(), 'magic-pr', 'pr_created')
    expect(onCreated.auto).toBeNull()
    expect(onCreated.suggestions.map((l) => l.to)).toEqual(['review', 'done'])
  })

  it('matches only unconditional links when there is no outcome', () => {
    const next = resolveNext(flow(), 'magic-pr', null)
    expect(next.auto).toBeNull()
    expect(next.suggestions.map((l) => l.to)).toEqual(['done'])
  })

  it('takes one auto link at most, and offers any other as a suggestion', () => {
    const f = flow()
    f.links.push({ from: 'commit', to: 'done', kind: 'auto' })
    const next = resolveNext(f, 'magic-commit', 'committed')
    expect(next.auto?.to).toBe('pr')
    expect(next.suggestions.map((l) => l.to)).toEqual(['done'])
  })

  it('breaks the auto chain of a failing blocking node into a suggestion, with the reason', () => {
    const next = resolveNext(flow(), 'magic-commit', null, { failed: true, reason: 'pre-commit hook failed' })
    expect(next).toEqual({
      auto: null,
      suggestions: [{ from: 'commit', to: 'pr', kind: 'auto' }],
      reason: 'pre-commit hook failed',
    })
  })

  it('gives a reason even when the failure came without one', () => {
    expect(resolveNext(flow(), 'magic-commit', null, { failed: true }).reason).toBe('magic-commit failed')
  })

  it('keeps the auto chain of a failing advisory node', () => {
    const next = resolveNext(flow(), 'magic-review', 'approved', { failed: true, reason: 'x' })
    expect(next.auto?.to).toBe('done')
    expect(next.reason).toBeUndefined()
  })

  it('returns nothing for a node without links, or a skill not in the flow', () => {
    expect(resolveNext(flow(), 'magic-done', null)).toEqual({ auto: null, suggestions: [] })
    expect(resolveNext(flow(), 'magic-continue', null)).toEqual({ auto: null, suggestions: [] })
  })
})

describe('isWorkflow', () => {
  it('accepts a workflow and refuses anything else', () => {
    expect(isWorkflow(flow())).toBe(true)
    expect(isWorkflow(null)).toBe(false)
    expect(isWorkflow({ id: 'x', entry: [], nodes: [{ id: 'a' }], links: [] })).toBe(false)
    expect(isWorkflow({ ...flow(), links: [{ from: 'a', to: 'b', kind: 'sometimes' }] })).toBe(false)
  })
})
