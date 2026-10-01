import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'
import type { WorkflowOverlay } from './overlay'
import { EMPTY_OVERLAY, addLink, addNote, addStep, customNodeId, noteNodeId, servedWorkflow, setLinkKind, setNoteText, setStepMode } from './overlay'
import { buildWorkflowNext } from './next'

const CHECK = customNodeId('check-types')
const AT = { x: 0, y: 0 }

const nextOf = (skill: string, outcome: string, opts: Parameters<typeof buildWorkflowNext>[2] = {}, flow = DEFAULT_WORKFLOW) =>
  buildWorkflowNext(buildWorkflowPayload('api', { workflow: flow, source: 'default' }, skill), outcome, opts)

const served = (o: WorkflowOverlay) => servedWorkflow(o)

describe('buildWorkflowNext on the default flow', () => {
  it('suggests /magic:pr after a commit', () => {
    expect(nextOf('magic-commit', 'committed')).toEqual({
      lines: [{ kind: 'suggest', skill: 'magic-pr', command: '/magic:pr', broken: null, text: '   • Run /magic:pr to create a Pull Request' }],
      chain: null,
    })
  })

  it('speaks the repository language', () => {
    expect(nextOf('magic-commit', 'committed', { lang: 'fr' }).lines[0].text).toBe('   • Lance /magic:pr pour créer une Pull Request')
  })

  it('chains pr into resolve on review comments, and offers nothing on ci_green', () => {
    expect(nextOf('magic-pr', 'review_comments')).toEqual({
      lines: [],
      chain: { skill: 'magic-resolve', command: '/magic:resolve', text: "➡️  Continuing with /magic:resolve, as this repository's workflow says." },
    })
    expect(nextOf('magic-pr', 'ci_green')).toEqual({ lines: [], chain: null })
  })

  it('drops the suggestions of a failed step', () => {
    expect(nextOf('magic-commit', 'failed', { reason: 'hook refused' })).toEqual({ lines: [], chain: null })
  })

  it('has nothing for a skill outside the flow', () => {
    expect(nextOf('magic-review', 'done')).toEqual({ lines: [], chain: null })
  })

  it('never chains plan into start, whatever the flow says', () => {
    const flow = { ...DEFAULT_WORKFLOW, links: DEFAULT_WORKFLOW.links.map((l) => (l.from === 'plan' ? { ...l, kind: 'auto' as const } : l)) }
    const next = nextOf('magic-plan', 'planned', {}, flow)
    expect(next.chain).toBeNull()
    expect(next.lines.map((l) => l.command)).toEqual(['/magic:start'])
  })
})

describe('buildWorkflowNext on a custom flow', () => {
  /** commit → check-types (auto) → pr. */
  const withCheck = () => {
    let o = addStep(EMPTY_OVERLAY, 'check-types', AT)
    o = addLink(addLink(o, 'commit', CHECK), CHECK, 'pr')
    return setLinkKind(o, 'commit', CHECK, 'auto')
  }

  it('chains into a custom step by its own name', () => {
    const next = nextOf('magic-commit', 'committed', {}, served(withCheck()))
    expect(next.chain).toEqual({ skill: 'check-types', command: '/check-types', text: "➡️  Continuing with /check-types, as this repository's workflow says." })
    expect(next.lines.map((l) => l.command)).toEqual(['/magic:pr'])
  })

  it('breaks the chain of a blocking step that failed, with the reason, and keeps it for an advisory one', () => {
    const blocking = nextOf('magic-commit', 'failed', { reason: 'hook refused' }, served(withCheck()))
    expect(blocking.chain).toBeNull()
    expect(blocking.lines).toHaveLength(1)
    expect(blocking.lines[0].broken).toBe("⚠️  /check-types would normally follow on its own, but this step failed: hook refused\nRun it yourself once the problem is fixed.")
    expect(blocking.lines[0].text).toBe(`${blocking.lines[0].broken}\n   • Run /check-types to run this repository's custom step\n     ↳ then run /magic:pr to create a Pull Request`)

    // done is advisory: its failure still chains.
    let o = addStep(EMPTY_OVERLAY, 'notify', AT)
    o = setLinkKind(addLink(o, 'done', customNodeId('notify')), 'done', customNodeId('notify'), 'auto')
    expect(nextOf('magic-done', 'failed', { reason: 'x' }, served(o)).chain?.skill).toBe('notify')
  })

  it('shows what follows a suggested custom target', () => {
    const o = addLink(addStep(EMPTY_OVERLAY, 'check-types', AT), 'commit', CHECK)
    const line = nextOf('magic-commit', 'committed', {}, served(addLink(o, CHECK, 'pr'))).lines.find((l) => l.skill === 'check-types')
    expect(line?.text).toBe("   • Run /check-types to run this repository's custom step\n     ↳ then run /magic:pr to create a Pull Request")
  })

  it('shows an end note first, and never on a failure', () => {
    let o = addNote(EMPTY_OVERLAY, AT)
    o = setNoteText(o, noteNodeId('n1'), 'Ping the QA channel')
    o = addLink(o, 'commit', noteNodeId('n1'))
    const next = nextOf('magic-commit', 'committed', {}, served(o))
    expect(next.lines.map((l) => [l.kind, l.text])).toEqual([
      ['note', '   📝 Ping the QA channel'],
      ['suggest', '   • Run /magic:pr to create a Pull Request'],
    ])
    expect(nextOf('magic-commit', 'failed', {}, served(o)).lines).toEqual([])
  })

  it('takes a link on an outcome only when the step ended on it', () => {
    let o = addStep(EMPTY_OVERLAY, 'check-types', AT)
    o = addLink(o, 'pr', CHECK, 'ci_green')
    expect(nextOf('magic-pr', 'ci_green', {}, served(o)).lines.map((l) => l.skill)).toEqual(['check-types'])
    expect(nextOf('magic-pr', 'pr_created', {}, served(o)).lines).toEqual([])
  })

  it('follows one auto link and offers the others', () => {
    let o = addStep(addStep(EMPTY_OVERLAY, 'a', AT), 'b', AT)
    o = addLink(addLink(o, 'done', customNodeId('a')), 'done', customNodeId('b'))
    o = setLinkKind(setLinkKind(o, 'done', customNodeId('a'), 'auto'), 'done', customNodeId('b'), 'auto')
    o = setStepMode(o, 'a', 'blocking')
    const next = nextOf('magic-done', 'done', {}, served(o))
    expect(next.chain?.skill).toBe('a')
    expect(next.lines.map((l) => [l.skill, l.broken])).toEqual([['b', null]])
  })
})
