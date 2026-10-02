/**
 * The workflow model: which skill follows which, and how.
 *
 * A workflow is a graph of skills. Each node is ONE skill; each link says what may
 * run after it, and whether that happens on its own (`auto`) or is only offered to
 * the user (`suggest`). The skills read their repository's workflow at Step 0 (over
 * the app's `GET /workflow`) and compute their closing "next steps" from it, so a
 * repository without a custom flow gets exactly today's suggestions — see
 * defaultFlow.ts.
 *
 * Deliberately free of any node or electron import, like repoMatch.ts: the main
 * process serves it, and nothing stops a renderer (or the webapp, one day) from
 * validating the same definitions with the same code.
 */

import { isActionType, type WorkflowActionType } from './actions'

export type WorkflowMode = 'blocking' | 'advisory'
export type WorkflowLinkKind = 'auto' | 'suggest'

export interface WorkflowNode {
  /** Unique within the flow. The default flow uses the skill without its `magic-` prefix. */
  id: string
  /** The skill folder this node runs (`magic-commit`). At most one node per skill. */
  skill: string
  /**
   * `blocking`: if this skill fails, an outgoing `auto` chain is broken — the next
   * skill is only suggested, with the reason. `advisory`: a failure is reported but
   * the chain carries on.
   */
  mode: WorkflowMode
  /**
   * The node cannot be skipped on the way to the next one. Informational in v1: it
   * is surfaced to the skills, nothing enforces it.
   */
  required: boolean
  /** What this skill can end on (`pr_created`, `review_comments`…). Links may be conditioned on one. */
  outcomes: string[]
  /** What the skill hands to the next one (`branch`, `commits`, `pr`), shown to skills at Step 0. */
  provides: string[]
}

/**
 * An end note: a line shown to the user when a link reaches it, for what no skill does.
 * Not a node: no skill runs it, nothing leaves it, and a skill never finds itself in one.
 */
export interface WorkflowNote {
  /** `note:<id>`, in its own id space, so a link names it like a node. */
  id: string
  text: string
}

/**
 * An action: something done through an MCP server once a step is done (actions.ts). Like an
 * end note, not a node: no skill of the flow is it, and nothing leaves it.
 */
export interface WorkflowAction {
  /** `action:<id>`, in its own id space, so a link names it like a node. */
  id: string
  type: WorkflowActionType
  /** Where it posts: a Slack channel (`#dev`). Empty: the prompt says where. */
  channel: string
  /** The admin's instruction to the agent, `{pr_url}` and its siblings unfilled. */
  prompt: string
}

export interface WorkflowLink {
  from: string
  to: string
  kind: WorkflowLinkKind
  /** Taken only when the source skill ended on this outcome. Absent = whatever the outcome. */
  outcome?: string
}

export interface Workflow {
  id: string
  /** Node ids a ticket may start from (the default flow: plan and start). */
  entry: string[]
  nodes: WorkflowNode[]
  links: WorkflowLink[]
  /** The end notes links may lead to. Absent: none. */
  notes?: WorkflowNote[]
  /** The actions links may lead to. Absent: none. */
  actions?: WorkflowAction[]
}

/** A repository's flow, and whether it is the repository's own or the default. */
export interface ResolvedWorkflow {
  workflow: Workflow
  source: 'repository' | 'default'
}

/**
 * Planning never chains into starting on its own. /magic:start opens a NEW agent in a
 * worktree, and doing that behind the user's back, once per story the plan filed, is
 * not a step a flow gets to automate.
 */
const PLAN_SKILL = 'magic-plan'
const START_SKILL = 'magic-start'

/**
 * Why a flow cannot be used, one message per problem. Empty means valid.
 *
 * Every rule is about the flow being UNAMBIGUOUS for the skills reading it: a skill
 * finds its node by name, so two nodes on one skill would leave it guessing which
 * one it is; a link to nowhere or on an outcome the skill never reports would be a
 * suggestion that can never be made.
 */
export function validateWorkflow(flow: Workflow): string[] {
  const errors: string[] = []
  const nodes = new Map<string, WorkflowNode>()
  const skills = new Map<string, string>()

  for (const node of flow.nodes) {
    if (nodes.has(node.id)) errors.push(`duplicate node id "${node.id}"`)
    else nodes.set(node.id, node)

    const other = skills.get(node.skill)
    if (other !== undefined) errors.push(`skill "${node.skill}" is on two nodes ("${other}" and "${node.id}")`)
    else skills.set(node.skill, node.id)
  }

  for (const id of flow.entry) {
    if (!nodes.has(id)) errors.push(`entry "${id}" is not a node`)
  }

  const notes = new Set<string>()
  for (const note of flow.notes ?? []) {
    if (nodes.has(note.id) || notes.has(note.id)) errors.push(`duplicate note id "${note.id}"`)
    else notes.add(note.id)
  }
  // An action ends a way through the flow as a note does: same rules, its own ids.
  for (const action of flow.actions ?? []) {
    if (nodes.has(action.id) || notes.has(action.id)) errors.push(`duplicate action id "${action.id}"`)
    else notes.add(action.id)
  }

  for (const link of flow.links) {
    const from = nodes.get(link.from)
    const to = nodes.get(link.to)
    if (notes.has(link.from)) errors.push(`link from "${link.from}": nothing leaves an end note or an action`)
    else if (!from) errors.push(`link from unknown node "${link.from}"`)
    if (!to && !notes.has(link.to)) errors.push(`link to unknown node "${link.to}"`)
    if (from && link.outcome !== undefined && !from.outcomes.includes(link.outcome)) {
      errors.push(`link ${link.from} → ${link.to} is on outcome "${link.outcome}", which "${link.from}" does not declare`)
    }
    if (from?.skill === PLAN_SKILL && to?.skill === START_SKILL && link.kind === 'auto') {
      errors.push(`link ${link.from} → ${link.to} cannot be auto: starting a ticket always opens a new agent`)
    }
  }

  return errors
}

export function nodeForSkill(flow: Workflow, skill: string): WorkflowNode | null {
  return flow.nodes.find((node) => node.skill === skill) ?? null
}

export function outgoingLinks(flow: Workflow, nodeId: string): WorkflowLink[] {
  return flow.links.filter((link) => link.from === nodeId)
}

export interface NextSteps {
  /** The one link to follow on its own, if any. */
  auto: WorkflowLink | null
  /** Everything else that applies, to offer the user, in declaration order. */
  suggestions: WorkflowLink[]
  /** Set when a failure downgraded the auto link into a suggestion. */
  reason?: string
}

/**
 * What comes after `skill`, given how it ended.
 *
 * A link applies when it carries no outcome or the one the skill ended on (a null
 * outcome only matches unconditional links). At most ONE auto link is taken — the
 * first that applies — since two agents chaining off one run is not something a
 * user can follow; any further auto link is offered as a suggestion instead.
 *
 * A failing `blocking` node breaks the chain: its auto link becomes the first
 * suggestion and `reason` says why. A failing `advisory` node keeps it — that is
 * what advisory means.
 */
export function resolveNext(
  flow: Workflow,
  skill: string,
  outcome: string | null,
  { failed = false, reason }: { failed?: boolean; reason?: string } = {},
): NextSteps {
  const node = nodeForSkill(flow, skill)
  if (!node) return { auto: null, suggestions: [] }

  const applicable = outgoingLinks(flow, node.id).filter(
    (link) => link.outcome === undefined || link.outcome === outcome,
  )

  let auto: WorkflowLink | null = null
  const suggestions: WorkflowLink[] = []
  for (const link of applicable) {
    if (link.kind === 'auto' && auto === null) auto = link
    else suggestions.push(link)
  }

  if (auto && failed && node.mode === 'blocking') {
    return {
      auto: null,
      suggestions: [auto, ...suggestions],
      reason: reason ?? `${skill} failed`,
    }
  }
  return { auto, suggestions }
}

/**
 * Whether an untrusted value (a stored definition) is shaped like a Workflow. Shape
 * only — validateWorkflow decides whether it makes sense.
 */
export function isWorkflow(value: unknown): value is Workflow {
  if (!value || typeof value !== 'object') return false
  const flow = value as Record<string, unknown>
  const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string')
  return (
    typeof flow.id === 'string' &&
    isStrings(flow.entry) &&
    Array.isArray(flow.nodes) &&
    flow.nodes.every((n) => {
      const node = n as Record<string, unknown> | null
      return (
        !!node &&
        typeof node.id === 'string' &&
        typeof node.skill === 'string' &&
        (node.mode === 'blocking' || node.mode === 'advisory') &&
        typeof node.required === 'boolean' &&
        isStrings(node.outcomes) &&
        isStrings(node.provides)
      )
    }) &&
    Array.isArray(flow.links) &&
    flow.links.every((l) => {
      const link = l as Record<string, unknown> | null
      return (
        !!link &&
        typeof link.from === 'string' &&
        typeof link.to === 'string' &&
        (link.kind === 'auto' || link.kind === 'suggest') &&
        (link.outcome === undefined || typeof link.outcome === 'string')
      )
    }) &&
    (flow.notes === undefined || (Array.isArray(flow.notes) && flow.notes.every((n) => {
      const note = n as Record<string, unknown> | null
      return !!note && typeof note.id === 'string' && typeof note.text === 'string'
    }))) &&
    (flow.actions === undefined || (Array.isArray(flow.actions) && flow.actions.every((a) => {
      const action = a as Record<string, unknown> | null
      return !!action && typeof action.id === 'string' && isActionType(action.type) &&
        typeof action.channel === 'string' && typeof action.prompt === 'string'
    })))
  )
}
