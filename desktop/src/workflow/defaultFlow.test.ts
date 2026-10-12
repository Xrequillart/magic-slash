import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { DEFAULT_LINKS, DEFAULT_WORKFLOW, nodeIdForSkill } from './defaultFlow'
import { resolveNext, validateWorkflow } from './model'
import { HIDDEN_SKILLS, SIDE_SKILLS, SKILLS } from './skills'

const REPO_ROOT = join(__dirname, '..', '..', '..')

describe('DEFAULT_WORKFLOW', () => {
  it('is a valid flow', () => {
    expect(validateWorkflow(DEFAULT_WORKFLOW)).toEqual([])
  })

  it('has a node for every skill of the cycle — none dropped for want of traits', () => {
    const cycle = SKILLS.filter((skill) => !SIDE_SKILLS.includes(skill) && !HIDDEN_SKILLS.includes(skill))
    expect(DEFAULT_WORKFLOW.nodes.map((n) => n.skill)).toEqual(cycle)
  })

  it('only links skills of the shipped list', () => {
    // The link table names nodes by id; a skill renamed in SKILLS would leave it
    // pointing at nothing. Checked here rather than at runtime, on purpose.
    const ids = SKILLS.map(nodeIdForSkill)
    for (const link of DEFAULT_LINKS) {
      expect(ids).toContain(link.from)
      expect(ids).toContain(link.to)
    }
  })

  it('runs only skills that actually ship', () => {
    for (const { skill } of DEFAULT_WORKFLOW.nodes) {
      expect(existsSync(join(REPO_ROOT, 'skills', skill, 'SKILL.md'))).toBe(true)
    }
  })

  it('runs the cycle plan, start, commit, pr, resolve, done', () => {
    expect(DEFAULT_WORKFLOW.nodes.map((n) => n.id)).toEqual(['plan', 'start', 'commit', 'pr', 'resolve', 'done'])
  })

  it('leaves plan-change, continue and review out', () => {
    const skills = DEFAULT_WORKFLOW.nodes.map((n) => n.skill)
    expect(skills).not.toContain('magic-plan-change')
    expect(skills).not.toContain('magic-continue')
    expect(skills).not.toContain('magic-review')
  })

  it('starts a ticket from plan or start', () => {
    expect(DEFAULT_WORKFLOW.entry).toEqual(['plan', 'start'])
  })

  it('reproduces today\'s suggestions', () => {
    const next = (skill: string, outcome: string | null) => {
      const { auto, suggestions } = resolveNext(DEFAULT_WORKFLOW, skill, outcome)
      return { auto: auto?.to ?? null, suggest: suggestions.map((l) => l.to) }
    }
    expect(next('magic-plan', 'planned')).toEqual({ auto: null, suggest: ['start'] })
    expect(next('magic-start', 'implemented')).toEqual({ auto: null, suggest: ['commit'] })
    expect(next('magic-commit', 'committed')).toEqual({ auto: null, suggest: ['pr'] })
    expect(next('magic-pr', 'pr_created')).toEqual({ auto: null, suggest: [] })
    expect(next('magic-pr', 'review_comments')).toEqual({ auto: 'resolve', suggest: [] })
    expect(next('magic-pr', 'ci_green')).toEqual({ auto: null, suggest: [] })
    expect(next('magic-resolve', 'resolved')).toEqual({ auto: null, suggest: ['done'] })
    expect(next('magic-done', 'done')).toEqual({ auto: null, suggest: [] })
  })

  it('breaks the pr → resolve chain when /magic:pr fails', () => {
    const next = resolveNext(DEFAULT_WORKFLOW, 'magic-pr', 'review_comments', { failed: true, reason: 'push rejected' })
    expect(next.auto).toBeNull()
    expect(next.suggestions.map((l) => l.to)).toEqual(['resolve'])
    expect(next.reason).toBe('push rejected')
  })

  it('is refused once a skill is duplicated onto a second node', () => {
    const copy = { ...DEFAULT_WORKFLOW, nodes: [...DEFAULT_WORKFLOW.nodes, { ...DEFAULT_WORKFLOW.nodes[2], id: 'commit-2' }] }
    expect(validateWorkflow(copy)).toEqual([expect.stringContaining('is on two nodes')])
  })
})
