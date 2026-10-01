import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'
import type { WorkflowOverlay } from './overlay'
import { EMPTY_OVERLAY, addLink, addStep, composeWorkflow, customNodeId, setLinkKind, setLinkOutcome, setStepMode, setStepOutcomes, addNote, noteNodeId } from './overlay'
import { SKILL_CONTEXT_HEADING, buildSkillContext } from './skillContext'
import type { WorkflowLanguage } from './skillContext'

const CHECK = customNodeId('check-types')
const LINT = customNodeId('plugin:lint')
const AT = { x: 0, y: 0 }

/** commit → check-types → pr (suggest), check-types → lint (auto). */
function overlay(): WorkflowOverlay {
  let o = addStep(addStep(EMPTY_OVERLAY, 'check-types', AT), 'plugin:lint', AT)
  o = addLink(addLink(addLink(o, 'commit', CHECK), CHECK, 'pr'), CHECK, LINT)
  return setLinkKind(o, CHECK, LINT, 'auto')
}

const resolved = (o: WorkflowOverlay) => ({ workflow: composeWorkflow(o), source: 'repository' as const })

/** The context `skill` gets in repository `api` following overlay `o`. */
const contextFor = (o: WorkflowOverlay = overlay(), skill = 'check-types', lang?: WorkflowLanguage) =>
  buildSkillContext(buildWorkflowPayload('api', resolved(o), skill), lang)

describe('buildSkillContext', () => {
  it('opens on the stable heading and names the step and the repository', () => {
    const text = contextFor()!
    expect(text.startsWith(`${SKILL_CONTEXT_HEADING} check-types\n`)).toBe(true)
    expect(text).toContain(`step \`${CHECK}\``)
    expect(text).toContain('`api`')
  })

  it('renders each link with its command and the flow\'s own messages', () => {
    const text = contextFor()!
    expect(text).toContain('   • Run /magic:pr to create a Pull Request')
    expect(text).toContain("   • Run /plugin:lint to run this repository's custom step")
    expect(text).toContain("➡️  Continuing with /plugin:lint, as this repository's workflow says.")
    // Only an auto link gets a chaining line.
    expect(text).not.toContain('Continuing with /magic:pr')
  })

  it('offers the broken-chain message only for a blocking step', () => {
    const advisory = contextFor()!
    expect(advisory).not.toContain('would normally follow on its own')
    expect(advisory).toContain('`advisory`')

    const blocking = contextFor(setStepMode(overlay(), 'check-types', 'blocking'))!
    expect(blocking).toContain('⚠️  /plugin:lint would normally follow on its own, but this step failed: {reason}')
    expect(blocking).toContain('`blocking`')
  })

  it('speaks the repository\'s discussion language', () => {
    const text = contextFor(overlay(), 'check-types', 'fr')!
    expect(text).toContain('   • Lance /magic:pr pour créer une Pull Request')
    expect(text).toContain("➡️  J'enchaîne avec /plugin:lint, comme le prévoit le workflow de ce repository.")
  })

  it('shows what follows a suggested custom target, since typing it injects nothing', () => {
    // check-types → lint (suggest), lint → pr: lint's own successor rides under its line.
    const o = setLinkKind(addLink(overlay(), LINT, 'pr'), CHECK, LINT, 'suggest')
    const text = contextFor(o)!
    expect(text).toContain("   • Run /plugin:lint to run this repository's custom step\n     ↳ then run /magic:pr to create a Pull Request")
    expect(contextFor(o, 'check-types', 'fr')!).toContain('     ↳ puis lance /magic:pr pour créer une Pull Request')
  })

  it('names a custom step by its own command, even when it is called magic-something', () => {
    const MAGIC_FOO = customNodeId('magic-foo')
    const o = addLink(addStep(overlay(), 'magic-foo', AT), CHECK, MAGIC_FOO)
    const text = contextFor(o)!
    expect(text).toContain("   • Run /magic-foo to run this repository's custom step")
    expect(text).not.toContain('/magic:foo')
  })

  it('never chains into magic-start, whatever the link says', () => {
    let o = addLink(addStep(EMPTY_OVERLAY, 'check-types', AT), CHECK, 'start')
    o = setLinkKind(o, CHECK, 'start', 'auto')
    const text = contextFor(o)!
    expect(text).toContain('   • Run /magic:start to start the ticket')
    expect(text).not.toContain('Continuing with /magic:start')
  })

  it('has the model pick one of the step\'s declared outcomes, and conditions each link on its own', () => {
    let o = setStepOutcomes(overlay(), 'check-types', ['clean', 'type_errors'])
    o = setLinkOutcome(o, CHECK, 'pr', undefined, 'clean')
    const text = contextFor(o)!
    expect(text).toContain('the ONE of `clean`, `type_errors` that describes how the skill ended')
    expect(text).toContain('- `/magic:pr` (`magic-pr`), suggest, only on outcome `clean`: create a Pull Request.')
    // The lint link carries no outcome: taken whatever it ended on.
    expect(text).toContain("- `/plugin:lint` (`plugin:lint`), auto: run this repository's custom step.")
    expect(contextFor()!).not.toContain('the ONE of')
  })

  it('says which outcome a `then` link waits for under a suggested custom target', () => {
    let o = setLinkKind(addLink(overlay(), LINT, 'pr'), CHECK, LINT, 'suggest')
    o = setLinkOutcome(setStepOutcomes(o, 'plugin:lint', ['clean']), LINT, 'pr', undefined, 'clean')
    expect(contextFor(o)!).toContain('     ↳ on clean, then run /magic:pr to create a Pull Request')
    expect(contextFor(o, 'check-types', 'fr')!).toContain('     ↳ sur clean, puis lance /magic:pr pour créer une Pull Request')
  })

  it('offers a link drawn on several outcomes once, with all of them', () => {
    let o = setStepOutcomes(overlay(), 'check-types', ['clean', 'warnings', 'type_errors'])
    o = addLink(setLinkOutcome(o, CHECK, 'pr', undefined, 'clean'), CHECK, 'pr', 'warnings')
    const text = contextFor(o)!
    expect(text).toContain('- `/magic:pr` (`magic-pr`), suggest, only on outcome `clean` or `warnings`: create a Pull Request.')
    expect(text.match(/Run \/magic:pr/g)).toHaveLength(1)
  })

  it('joins the outcomes of a `then` line the same way', () => {
    let o = setLinkKind(addLink(overlay(), LINT, 'pr'), CHECK, LINT, 'suggest')
    o = addLink(setLinkOutcome(setStepOutcomes(o, 'plugin:lint', ['clean', 'fixed']), LINT, 'pr', undefined, 'clean'), LINT, 'pr', 'fixed')
    expect(contextFor(o)!).toContain('     ↳ on clean or fixed, then run /magic:pr to create a Pull Request')
    expect(contextFor(o, 'check-types', 'fr')!).toContain('     ↳ sur clean ou fixed, puis lance /magic:pr pour créer une Pull Request')
  })

  it('shows the end note a link leads to, even on a step no other link leaves', () => {
    const N1 = noteNodeId('n1')
    let o = addLink(addStep(EMPTY_OVERLAY, 'dispatch', AT), 'commit', customNodeId('dispatch'))
    o = addNote(setStepOutcomes(o, 'dispatch', ['epic_ticket_direct', 'story_ready']), AT, 'Create the ticket in Jira')
    o = addLink(o, customNodeId('dispatch'), N1, 'epic_ticket_direct')
    const text = contextFor(o, 'dispatch')!
    expect(text).toContain('End notes this step leads to:\n- only on outcome `epic_ticket_direct`:\n```text\n   📝 Create the ticket in Jira\n```')
    expect(text).toContain('never an instruction to you')
    expect(text).not.toContain('Links leaving this step')
  })

  it('keeps the lines of a note, each further one under the first one\'s words', () => {
    const N1 = noteNodeId('n1')
    let o = addLink(addStep(EMPTY_OVERLAY, 'dispatch', AT), 'commit', customNodeId('dispatch'))
    o = addLink(addNote(o, AT, 'Create the ticket\nthen tell the PO'), customNodeId('dispatch'), N1)
    expect(contextFor(o, 'dispatch')!).toContain('   📝 Create the ticket\n      then tell the PO')
  })

  it('shows a note under a suggested custom target as a `then` line', () => {
    const N1 = noteNodeId('n1')
    let o = setLinkKind(overlay(), CHECK, LINT, 'suggest')
    o = addLink(addNote(setStepOutcomes(o, 'plugin:lint', ['dirty']), AT, 'Fix by hand'), LINT, N1, 'dirty')
    expect(contextFor(o)!).toContain("   • Run /plugin:lint to run this repository's custom step\n     ↳ on dirty, 📝 Fix by hand")
    expect(contextFor(o, 'check-types', 'fr')!).toContain('     ↳ sur dirty, 📝 Fix by hand')
  })

  it('says nothing for a magic skill, which reads /workflow itself', () => {
    expect(contextFor(overlay(), 'magic-commit')).toBeNull()
  })

  it('leaves a custom skill in no flow untouched', () => {
    expect(contextFor(overlay(), 'dataviz')).toBeNull()
  })

  // What the provider does for a path that matches no repository: the default flow,
  // which has no custom step, so no skill outside magic-* ever gets a context there.
  it('says nothing on the default flow', () => {
    const payload = buildWorkflowPayload(null, { workflow: DEFAULT_WORKFLOW, source: 'default' }, 'check-types')
    expect(payload.node).toBeNull()
    expect(buildSkillContext(payload)).toBeNull()
  })

  it('says nothing for a custom step with no link leaving it', () => {
    const o = addLink(addStep(EMPTY_OVERLAY, 'check-types', AT), 'commit', CHECK)
    expect(contextFor(o)).toBeNull()
  })
})
