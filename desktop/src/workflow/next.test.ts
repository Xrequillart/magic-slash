import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'
import type { WorkflowOverlay } from './overlay'
import { EMPTY_OVERLAY, addLink, addNote, addStep, customNodeId, noteNodeId, servedWorkflow, setLinkKind, setLinkOutcome, setNoteText, setStepMode, setStepOutcomes } from './overlay'
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

describe('buildWorkflowNext from a custom step', () => {
  const LINT = customNodeId('plugin:lint')
  /** commit → check-types; check-types → pr (suggest), check-types → lint (suggest). */
  const fromCheck = () => {
    const o = addStep(addStep(EMPTY_OVERLAY, 'check-types', AT), 'plugin:lint', AT)
    return addLink(addLink(addLink(o, 'commit', CHECK), CHECK, 'pr'), CHECK, LINT)
  }
  const nextFrom = (o: WorkflowOverlay, outcome: string, lang: 'en' | 'fr' = 'en') => nextOf('check-types', outcome, { lang }, served(o))

  it('takes only the unconditional links on an empty outcome', () => {
    let o = setStepOutcomes(fromCheck(), 'check-types', ['clean'])
    o = setLinkOutcome(o, CHECK, 'pr', undefined, 'clean')
    expect(nextFrom(o, '').lines.map((l) => l.command)).toEqual(['/plugin:lint'])
    expect(nextFrom(o, 'clean').lines.map((l) => l.command)).toEqual(['/magic:pr', '/plugin:lint'])
  })

  it('names a custom step by its own command, even when it is called magic-something', () => {
    const o = addLink(addStep(fromCheck(), 'magic-foo', AT), CHECK, customNodeId('magic-foo'))
    const line = nextFrom(o, '').lines.find((l) => l.skill === 'magic-foo')
    expect(line?.text).toBe("   • Run /magic-foo to run this repository's custom step")
  })

  it('says which outcome a `then` line waits for, several joined', () => {
    let o = addLink(fromCheck(), LINT, 'pr')
    o = setStepOutcomes(o, 'plugin:lint', ['clean', 'fixed'])
    o = addLink(setLinkOutcome(o, LINT, 'pr', undefined, 'clean'), LINT, 'pr', 'fixed')
    expect(nextFrom(o, '').lines.find((l) => l.skill === 'plugin:lint')?.text)
      .toBe("   • Run /plugin:lint to run this repository's custom step\n     ↳ on clean or fixed, then run /magic:pr to create a Pull Request")
    expect(nextFrom(o, '', 'fr').lines.find((l) => l.skill === 'plugin:lint')?.text)
      .toContain('     ↳ sur clean ou fixed, puis lance /magic:pr pour créer une Pull Request')
  })

  it('keeps the lines of a note, and shows a note under a suggested custom target', () => {
    let o = addNote(fromCheck(), AT, 'Create the ticket\nthen tell the PO')
    o = addLink(o, CHECK, noteNodeId('n1'))
    expect(nextFrom(o, '').lines[0].text).toBe('   📝 Create the ticket\n      then tell the PO')

    let p = addNote(setStepOutcomes(fromCheck(), 'plugin:lint', ['dirty']), AT, 'Fix by hand')
    p = addLink(p, LINT, noteNodeId('n1'), 'dirty')
    expect(nextFrom(p, '').lines.find((l) => l.skill === 'plugin:lint')?.text)
      .toBe("   • Run /plugin:lint to run this repository's custom step\n     ↳ on dirty, 📝 Fix by hand")
  })
})

