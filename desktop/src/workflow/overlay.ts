import type { Workflow, WorkflowLink, WorkflowLinkKind, WorkflowMode, WorkflowNode } from './model'
import { validateWorkflow } from './model'
import { DEFAULT_LINKS, DEFAULT_WORKFLOW, nodeIdForSkill } from './defaultFlow'

/**
 * What a repository stores of its workflow: only what the admin ADDED to the default
 * line. The built-in steps are never stored, so no write, from the UI or straight to
 * the database, can remove, replace or move one: they come from DEFAULT_WORKFLOW,
 * and the stored overlay is composed onto them (composeWorkflow).
 *
 * `steps` are the custom steps, each placed by the built-in step it sits BEFORE
 * (`before: null` is after the last one), in line order within the same gap.
 * `kinds` overrides the kind of a link of the composed line, keyed `from>to` by node
 * id; a key whose pair is not adjacent on the line is ignored.
 *
 * Pure, like model.ts: the main process composes it for `GET /workflow`, the
 * renderer edits it, and both run the same code.
 */

export interface WorkflowOverlayStep {
  skill: string
  mode: WorkflowMode
  /** The built-in node id this step sits before, or null for after the last one. */
  before: string | null
}

export interface WorkflowOverlay {
  version: 1
  steps: WorkflowOverlayStep[]
  kinds: Record<string, WorkflowLinkKind>
}

export const EMPTY_OVERLAY: WorkflowOverlay = { version: 1, steps: [], kinds: {} }

/**
 * Custom steps live in their own id space, so a skill named `commit`, `magic-foo`
 * or `plugin:x` can never collide with a built-in node id.
 */
const CUSTOM_PREFIX = 'custom:'

export function customNodeId(skill: string): string {
  return `${CUSTOM_PREFIX}${skill}`
}

export function isCustomNodeId(id: string): boolean {
  return id.startsWith(CUSTOM_PREFIX)
}

export function linkKey(from: string, to: string): string {
  return `${from}>${to}`
}

/** The built-in node ids, in line order. */
const BUILT_IN_LINE: string[] = DEFAULT_WORKFLOW.nodes.map((node) => node.id)

export function isBuiltInNodeId(id: string): boolean {
  return BUILT_IN_LINE.includes(id)
}

/** The ids /magic:start and /magic:plan have on the line. */
export const START_NODE_ID = nodeIdForSkill('magic-start')
export const PLAN_NODE_ID = nodeIdForSkill('magic-plan')

/** Whether the model refuses `auto` on this link: starting a ticket always opens a new agent. */
export function isLinkIntoStart(link: Pick<WorkflowLink, 'to'>): boolean {
  return link.to === START_NODE_ID
}

/** The default link joining two consecutive built-in steps. The default line has one per pair. */
function defaultLinkBetween(from: string, to: string): WorkflowLink | undefined {
  return DEFAULT_LINKS.find((link) => link.from === from && link.to === to)
}

/** The node ids of the composed line, in order. */
export function lineOf(overlay: WorkflowOverlay): string[] {
  const line: string[] = []
  for (const builtIn of BUILT_IN_LINE) {
    for (const step of overlay.steps) if (step.before === builtIn) line.push(customNodeId(step.skill))
    line.push(builtIn)
  }
  for (const step of overlay.steps) if (step.before === null) line.push(customNodeId(step.skill))
  return line
}

function customNode(step: WorkflowOverlayStep): WorkflowNode {
  return { id: customNodeId(step.skill), skill: step.skill, mode: step.mode, required: false, outcomes: [], provides: [] }
}

/**
 * The links of the composed line, before any `kinds` override.
 *
 * Splitting a default link `A → B` with custom steps keeps its kind on every hop, and
 * its outcome on the FIRST hop only: `A` still decides whether the gap is entered (a
 * step between `pr` and `resolve` runs only when there are review comments), and a
 * custom node declares no outcome for a later hop to be conditioned on. Before the
 * first built-in and after the last, there is no default link to inherit from: those
 * hops are suggestions.
 */
function baseLinks(line: string[]): WorkflowLink[] {
  const links: WorkflowLink[] = []
  // The built-in each gap opens on, and the default link it splits.
  let opener: string | null = null
  let split: WorkflowLink | undefined
  for (let i = 0; i < line.length - 1; i++) {
    const from = line[i]
    const to = line[i + 1]
    if (isBuiltInNodeId(from)) {
      opener = from
      const next = line.slice(i + 1).find(isBuiltInNodeId)
      split = next ? defaultLinkBetween(from, next) : undefined
    }
    const inherited = opener !== null ? split : undefined
    const link: WorkflowLink = { from, to, kind: inherited?.kind ?? 'suggest' }
    if (inherited?.outcome !== undefined && from === opener) link.outcome = inherited.outcome
    links.push(link)
  }
  return links
}

/** The kind a link has on the line when nothing overrides it. */
function baseKind(line: string[], from: string, to: string): WorkflowLinkKind | undefined {
  return baseLinks(line).find((link) => link.from === from && link.to === to)?.kind
}

/**
 * The full workflow a repository follows: the default line, with the overlay's custom
 * steps inserted and its link kinds applied.
 *
 * Entry: the default enters at `plan` or `start`. A step before `plan` becomes the
 * first entry in `plan`'s place; a step between `plan` and `start` stays out of the
 * entry, so a ticket started straight from `start` skips it.
 */
export function composeWorkflow(overlay: WorkflowOverlay): Workflow {
  const line = lineOf(overlay)
  const byId = new Map<string, WorkflowNode>(DEFAULT_WORKFLOW.nodes.map((node) => [node.id, node]))
  for (const step of overlay.steps) byId.set(customNodeId(step.skill), customNode(step))

  const links = baseLinks(line).map((link) => {
    const kind = overlay.kinds[linkKey(link.from, link.to)]
    return kind ? { ...link, kind } : link
  })

  const first = line[0]
  const entry = DEFAULT_WORKFLOW.entry.map((id) => (id === BUILT_IN_LINE[0] ? first : id))

  return {
    id: 'repository',
    entry,
    // Line order. A skill placed twice is reported by problems(), not dropped here.
    nodes: line.map((id) => byId.get(id) as WorkflowNode),
    links,
  }
}

/**
 * Whether an untrusted value (a stored definition) is shaped like an overlay. Shape
 * only: problems() decides whether it makes sense.
 */
export function isOverlay(value: unknown): value is WorkflowOverlay {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  if (o.version !== 1 || !Array.isArray(o.steps)) return false
  if (!o.kinds || typeof o.kinds !== 'object' || Array.isArray(o.kinds)) return false
  const stepsOk = o.steps.every((s) => {
    const step = s as Record<string, unknown> | null
    return (
      !!step &&
      typeof step.skill === 'string' &&
      step.skill.length > 0 &&
      (step.mode === 'blocking' || step.mode === 'advisory') &&
      (step.before === null || (typeof step.before === 'string' && isBuiltInNodeId(step.before)))
    )
  })
  const kindsOk = Object.values(o.kinds as Record<string, unknown>).every((k) => k === 'auto' || k === 'suggest')
  return stepsOk && kindsOk
}

export type WorkflowProblem =
  /** The same skill is on two steps (a built-in one included). `nodeId` is the second. */
  | { code: 'duplicate-skill'; nodeId: string; skill: string }
  /** A link into /magic:start is auto: starting a ticket always opens a new agent. */
  | { code: 'auto-into-start'; nodeId: string }
  /** Anything else the composed flow fails on (model.ts's own rules). */
  | { code: 'invalid'; message: string }

/**
 * Why an overlay cannot be saved or served, one problem per issue. Empty means it can.
 * Each problem that belongs to a step names it, so the editor can centre the view on it.
 */
export function problems(overlay: WorkflowOverlay): WorkflowProblem[] {
  return problemsOf(composeWorkflow(overlay))
}

function problemsOf(workflow: Workflow): WorkflowProblem[] {
  const found: WorkflowProblem[] = []
  const seen = new Set<string>()
  for (const node of workflow.nodes) {
    if (seen.has(node.skill)) {
      const nodeId = isCustomNodeId(node.id) ? node.id : customNodeId(node.skill)
      found.push({ code: 'duplicate-skill', nodeId, skill: node.skill })
    }
    seen.add(node.skill)
  }
  for (const link of workflow.links) {
    if (isLinkIntoStart(link) && link.kind === 'auto') found.push({ code: 'auto-into-start', nodeId: link.from })
  }
  if (found.length > 0) return found
  // Duplicates are reported above, in the editor's terms; the model's own rules catch the rest.
  return validateWorkflow(workflow).map((message) => ({ code: 'invalid' as const, message }))
}

/** A stored definition, composed, or null when it cannot be used (the default is then served). */
export function resolveOverlay(value: unknown): { workflow: Workflow } | { error: string } {
  if (!isOverlay(value)) return { error: 'unknown shape' }
  const workflow = composeWorkflow(value)
  const found = problemsOf(workflow)
  if (found.length > 0) return { error: found.map((p) => (p.code === 'invalid' ? p.message : `${p.code} ${p.nodeId}`)).join('; ') }
  return { workflow }
}

/**
 * Whether two overlays say the same thing, whatever the order `kinds` keys were
 * written in: "is there anything to save", and "did a reload change this flow".
 */
export function sameOverlay(a: WorkflowOverlay, b: WorkflowOverlay): boolean {
  if (a.steps.length !== b.steps.length) return false
  const stepsSame = a.steps.every((step, i) => {
    const other = b.steps[i]
    return step.skill === other.skill && step.mode === other.mode && step.before === other.before
  })
  if (!stepsSame) return false
  const keys = Object.keys(a.kinds)
  return keys.length === Object.keys(b.kinds).length && keys.every((key) => a.kinds[key] === b.kinds[key])
}

// ---------------------------------------------------------------------------
// Editing. Each function returns a new overlay and never mutates its input.
// ---------------------------------------------------------------------------

/** Drop every `kinds` entry that is no longer an adjacent pair, or equals the line's own kind. */
function pruneKinds(overlay: WorkflowOverlay): WorkflowOverlay {
  const line = lineOf(overlay)
  const kinds: Record<string, WorkflowLinkKind> = {}
  for (const [key, kind] of Object.entries(overlay.kinds)) {
    const [from, to] = key.split('>')
    const base = baseKind(line, from, to)
    if (base !== undefined && base !== kind) kinds[key] = kind
  }
  return { ...overlay, kinds }
}

/** The kind the composed line gives `from → to`, overrides included. */
export function kindOf(overlay: WorkflowOverlay, from: string, to: string): WorkflowLinkKind | undefined {
  return overlay.kinds[linkKey(from, to)] ?? baseKind(lineOf(overlay), from, to)
}

/**
 * Insert a custom step at `slot` of the line: slot 0 is before the first step, slot
 * `line.length` after the last, slot `i` between `line[i-1]` and `line[i]`.
 *
 * The two links the step creates inherit the kind of the link it splits, so turning
 * `start → commit` into `start → X → commit` changes nothing until the admin says so.
 */
export function insertStep(overlay: WorkflowOverlay, slot: number, skill: string, mode: WorkflowMode = 'advisory'): WorkflowOverlay {
  const line = lineOf(overlay)
  const at = Math.max(0, Math.min(slot, line.length))
  const prev = at > 0 ? line[at - 1] : null
  const next = at < line.length ? line[at] : null
  const splitKind = prev && next ? kindOf(overlay, prev, next) : undefined

  // The built-in the new step sits before: the next built-in at or after the slot.
  const before = line.slice(at).find(isBuiltInNodeId) ?? null
  // Its place among the steps of the same gap: after every custom step before the slot.
  const customsBefore = new Set(line.slice(0, at).filter(isCustomNodeId))
  const steps = [...overlay.steps]
  let index = steps.length
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].before === before && !customsBefore.has(customNodeId(steps[i].skill))) { index = i; break }
  }
  steps.splice(index, 0, { skill, mode, before })

  const id = customNodeId(skill)
  const kinds = { ...overlay.kinds }
  if (prev && next) delete kinds[linkKey(prev, next)]
  if (splitKind) {
    if (prev) kinds[linkKey(prev, id)] = splitKind
    if (next) kinds[linkKey(id, next)] = splitKind
  }
  return pruneKinds({ ...overlay, steps, kinds })
}

/** Remove a custom step (built-in ones are not in the overlay, so they cannot be). */
export function removeStep(overlay: WorkflowOverlay, skill: string): WorkflowOverlay {
  const id = customNodeId(skill)
  const kinds = Object.fromEntries(
    Object.entries(overlay.kinds).filter(([key]) => !key.split('>').includes(id)),
  )
  return pruneKinds({ ...overlay, steps: overlay.steps.filter((s) => s.skill !== skill), kinds })
}

export function setStepMode(overlay: WorkflowOverlay, skill: string, mode: WorkflowMode): WorkflowOverlay {
  return { ...overlay, steps: overlay.steps.map((s) => (s.skill === skill ? { ...s, mode } : s)) }
}

/** Point a custom step at another skill, keeping its place and its links' kinds. */
export function setStepSkill(overlay: WorkflowOverlay, skill: string, next: string): WorkflowOverlay {
  if (skill === next) return overlay
  const from = customNodeId(skill)
  const to = customNodeId(next)
  const kinds = Object.fromEntries(
    Object.entries(overlay.kinds).map(([key, kind]) => [key.split('>').map((id) => (id === from ? to : id)).join('>'), kind]),
  )
  return { ...overlay, steps: overlay.steps.map((s) => (s.skill === skill ? { ...s, skill: next } : s)), kinds }
}

export function setLinkKind(overlay: WorkflowOverlay, from: string, to: string, kind: WorkflowLinkKind): WorkflowOverlay {
  return pruneKinds({ ...overlay, kinds: { ...overlay.kinds, [linkKey(from, to)]: kind } })
}
