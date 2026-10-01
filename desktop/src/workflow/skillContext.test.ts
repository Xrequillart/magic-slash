import { describe, it, expect } from 'vitest'
import { DEFAULT_WORKFLOW } from './defaultFlow'
import { buildWorkflowPayload } from './payload'
import type { WorkflowOverlay } from './overlay'
import { EMPTY_OVERLAY, addLink, addStep, composeWorkflow, customNodeId, setLinkKind, setStepOutcomes, addNote, noteNodeId } from './overlay'
import { SKILL_CONTEXT_HEADING, buildSkillContext } from './skillContext'

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
const contextFor = (o: WorkflowOverlay = overlay(), skill = 'check-types') =>
  buildSkillContext(buildWorkflowPayload('api', resolved(o), skill))

describe('buildSkillContext', () => {
  it('opens on the stable heading and names the step and the repository', () => {
    const text = contextFor()!
    expect(text.startsWith(`${SKILL_CONTEXT_HEADING} check-types\n`)).toBe(true)
    expect(text).toContain(`step \`${CHECK}\``)
    expect(text).toContain('`api`')
  })

  it('has the step ask /workflow/next under its own name, as a magic skill does', () => {
    const text = contextFor()!
    expect(text).toContain('/workflow/next')
    expect(text).toContain('--data-urlencode "skill=check-types"')
    expect(text).toContain('--data-urlencode "outcome=<outcome>"')
  })

  it('leaves the links and their wording to the app', () => {
    const text = contextFor()!
    expect(text).not.toContain('/magic:pr')
    expect(text).not.toContain('/plugin:lint')
  })

  it('has the model pick one of the step\'s declared outcomes, or none', () => {
    const declared = contextFor(setStepOutcomes(overlay(), 'check-types', ['clean', 'type_errors']))!
    expect(declared).toContain('the ONE of `clean`, `type_errors` that describes how the skill ended')
    const none = contextFor()!
    expect(none).not.toContain('the ONE of')
    expect(none).toContain('it has no outcome: leave `<outcome>` empty')
  })

  it('speaks of a step that only leads to an end note', () => {
    let o = addLink(addStep(EMPTY_OVERLAY, 'dispatch', AT), 'commit', customNodeId('dispatch'))
    o = addLink(addNote(o, AT, 'Create the ticket in Jira'), customNodeId('dispatch'), noteNodeId('n1'))
    expect(contextFor(o, 'dispatch')).toContain('workflow/next')
  })

  it('says nothing for a magic skill, which asks /workflow/next itself', () => {
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
