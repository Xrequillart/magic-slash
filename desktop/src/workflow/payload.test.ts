import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'

const DEFAULT = { workflow: DEFAULT_WORKFLOW, source: 'default' as const }

describe('buildWorkflowPayload', () => {
  it('gives the calling skill its node and its outgoing links, each with the skill it leads to', () => {
    const payload = buildWorkflowPayload('magic-slash', DEFAULT, 'magic-pr')
    expect(payload.repository).toBe('magic-slash')
    expect(payload.source).toBe('default')
    expect(payload.workflow.id).toBe('default')
    expect(payload.node?.id).toBe('pr')
    expect(payload.links).toEqual([
      { from: 'pr', to: 'resolve', kind: 'auto', outcome: 'review_comments', skill: 'magic-resolve' },
    ])
  })

  it('spells an unconditional link\'s outcome as null', () => {
    const payload = buildWorkflowPayload(null, DEFAULT, 'magic-commit')
    expect(payload.links).toEqual([{ from: 'commit', to: 'pr', kind: 'suggest', outcome: null, skill: 'magic-pr' }])
  })

  it('has no node and no links for a skill outside the flow, or none named', () => {
    for (const skill of ['magic-continue', null]) {
      const payload = buildWorkflowPayload(null, DEFAULT, skill)
      expect(payload.node).toBeNull()
      expect(payload.links).toEqual([])
      expect(payload.workflow).toBe(DEFAULT_WORKFLOW)
    }
  })

  it('has no node and no links for /magic:review, now a side door', () => {
    // An installed /magic:review that predates the change still asks for its flow,
    // and must find nothing to suggest.
    const payload = buildWorkflowPayload(null, DEFAULT, 'magic-review')
    expect(payload.node).toBeNull()
    expect(payload.links).toEqual([])
  })
})
