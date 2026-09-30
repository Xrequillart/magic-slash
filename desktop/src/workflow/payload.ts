import type { ResolvedWorkflow, Workflow, WorkflowLinkKind, WorkflowNode } from './model'
import { nodeForSkill, outgoingLinks } from './model'
import { isCustomNodeId } from './overlay'

/**
 * The body of `GET /workflow`, as the skills read it at Step 0.
 *
 * The skills depend on this shape exactly, so it is built here, pure and tested,
 * rather than inline in the route. `links` spares a skill the join it would otherwise
 * do in prose: each outgoing link carries the SKILL it leads to, and `outcome` is an
 * explicit null when the link applies whatever the outcome (a JSON reader cannot
 * tell an absent key from a forgotten one).
 */
export interface WorkflowPayloadLink {
  from: string
  to: string
  kind: WorkflowLinkKind
  outcome: string | null
  skill: string | null
  /**
   * What follows the target when it is a custom step, empty otherwise. A custom skill
   * does not read `/workflow`, so the magic skill before it carries its hand-offs,
   * through any further custom steps, down to the next built-in one. A custom step
   * already on the way there is not walked again: custom steps can loop now.
   */
  then: WorkflowPayloadLink[]
}

export interface WorkflowPayload {
  /** The repository's key in the config, or null when the path matches none. */
  repository: string | null
  source: ResolvedWorkflow['source']
  workflow: Workflow
  /** The node of the calling skill, or null when it is not in the flow (or none was named). */
  node: WorkflowNode | null
  links: WorkflowPayloadLink[]
}

function payloadLinks(workflow: Workflow, nodeId: string, walked: ReadonlySet<string> = new Set([nodeId])): WorkflowPayloadLink[] {
  return outgoingLinks(workflow, nodeId).map((link) => ({
    from: link.from,
    to: link.to,
    kind: link.kind,
    outcome: link.outcome ?? null,
    skill: workflow.nodes.find((n) => n.id === link.to)?.skill ?? null,
    // The walk ends at a built-in step, a dead end, or a custom step it already went through.
    then: isCustomNodeId(link.to) && !walked.has(link.to) ? payloadLinks(workflow, link.to, new Set([...walked, link.to])) : [],
  }))
}

export function buildWorkflowPayload(
  repository: string | null,
  resolved: ResolvedWorkflow,
  skill: string | null,
): WorkflowPayload {
  const { workflow, source } = resolved
  const node = skill ? nodeForSkill(workflow, skill) : null
  const links = node ? payloadLinks(workflow, node.id) : []
  return { repository, source, workflow, node, links }
}
