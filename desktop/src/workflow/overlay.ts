import type { Workflow, WorkflowLink, WorkflowLinkKind, WorkflowMode, WorkflowNode } from './model'
import { validateWorkflow } from './model'
import { DEFAULT_LINKS, DEFAULT_WORKFLOW, nodeIdForSkill } from './defaultFlow'

/**
 * What a repository stores of its workflow: only what the admin ADDED to the default
 * flow. The built-in steps and their links are never stored, so no write, from the UI
 * or straight to the database, can remove or replace one: they come from
 * DEFAULT_WORKFLOW, and the stored overlay is composed onto them (composeWorkflow).
 *
 * VERSION 2 IS A GRAPH, not a line. `steps` are the custom steps, in the order they
 * were added; `links` the links drawn on the canvas, between any two steps, built-in
 * ones included; `kinds` overrides the kind of a DEFAULT link, keyed `from>to` by node
 * id (the only thing about a default link the admin may change); `positions` where
 * each card was left on the canvas, shared with the whole team. A custom step with no
 * link into it is allowed: it is never reached, and the editor says so
 * (`unreachableSteps`).
 *
 * VERSION 1 (a line: each step placed `before` a built-in, its links derived from its
 * place) is still read, and upgraded on the way in (`toOverlay`): its composed links
 * become explicit ones. The one thing that does not survive is a SPLIT default link
 * (`start → X → commit` had no `start → commit`): default links are always there now.
 * Nothing writes a v1 any more.
 *
 * Pure, like model.ts: the main process composes it for `GET /workflow`, the
 * renderer edits it, and both run the same code.
 */

export interface WorkflowOverlayStep {
  skill: string
  mode: WorkflowMode
}

export interface WorkflowOverlayLink {
  from: string
  to: string
  kind: WorkflowLinkKind
  /** Taken only when `from` ended on this outcome. Absent: whatever the outcome. */
  outcome?: string
}

export interface WorkflowPosition {
  x: number
  y: number
}

export interface WorkflowOverlay {
  version: 2
  steps: WorkflowOverlayStep[]
  links: WorkflowOverlayLink[]
  kinds: Record<string, WorkflowLinkKind>
  /** Top-left corner of a card on the canvas, by node id. A card without one is laid out. */
  positions: Record<string, WorkflowPosition>
}

export const EMPTY_OVERLAY: WorkflowOverlay = { version: 2, steps: [], links: [], kinds: {}, positions: {} }

/** The line of before, as stored until the canvas became a graph. Read, never written. */
interface WorkflowOverlayV1 {
  version: 1
  steps: { skill: string; mode: WorkflowMode; before: string | null }[]
  kinds: Record<string, WorkflowLinkKind>
}

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

/** The ids /magic:start and /magic:plan have in the flow. */
export const START_NODE_ID = nodeIdForSkill('magic-start')
export const PLAN_NODE_ID = nodeIdForSkill('magic-plan')

/** Whether the model refuses `auto` on this link: starting a ticket always opens a new agent. */
export function isLinkIntoStart(link: Pick<WorkflowLink, 'to'>): boolean {
  return link.to === START_NODE_ID
}

/** The default link `from → to`, if the default flow has one. Locked: never removed, only its kind changes. */
function defaultLink(from: string, to: string): WorkflowLink | undefined {
  return DEFAULT_LINKS.find((link) => link.from === from && link.to === to)
}

export function isDefaultLink(from: string, to: string): boolean {
  return defaultLink(from, to) !== undefined
}

function customNode(step: WorkflowOverlayStep): WorkflowNode {
  return { id: customNodeId(step.skill), skill: step.skill, mode: step.mode, required: false, outcomes: [], provides: [] }
}

function toLink({ from, to, kind, outcome }: WorkflowOverlayLink): WorkflowLink {
  return outcome === undefined ? { from, to, kind } : { from, to, kind, outcome }
}

/**
 * The full workflow a repository follows: the default flow, with the overlay's custom
 * steps and links added and its kinds applied. The entry is always the default's:
 * a ticket starts at plan or start, and a custom step is reached from there or not
 * at all.
 */
export function composeWorkflow(overlay: WorkflowOverlay): Workflow {
  const links = DEFAULT_LINKS.map((link) => {
    const kind = overlay.kinds[linkKey(link.from, link.to)]
    return kind ? { ...link, kind } : link
  })
  return {
    id: 'repository',
    entry: DEFAULT_WORKFLOW.entry,
    // A skill placed twice is reported by problems(), not dropped here.
    nodes: [...DEFAULT_WORKFLOW.nodes, ...overlay.steps.map(customNode)],
    links: [...links, ...overlay.links.map(toLink)],
  }
}

// ---------------------------------------------------------------------------
// Shapes, and the upgrade from v1.
// ---------------------------------------------------------------------------

const isMode = (value: unknown): value is WorkflowMode => value === 'blocking' || value === 'advisory'
const isKind = (value: unknown): value is WorkflowLinkKind => value === 'auto' || value === 'suggest'
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

function kindsOk(kinds: unknown): boolean {
  return isRecord(kinds) && Object.values(kinds).every(isKind)
}

function isOverlayV1(value: unknown): value is WorkflowOverlayV1 {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.steps)) return false
  const stepsOk = value.steps.every((step) =>
    isRecord(step) &&
    typeof step.skill === 'string' &&
    step.skill.length > 0 &&
    isMode(step.mode) &&
    (step.before === null || (typeof step.before === 'string' && isBuiltInNodeId(step.before))),
  )
  return stepsOk && kindsOk(value.kinds)
}

/**
 * Whether an untrusted value (a stored definition, or what the editor sends) is shaped
 * like a v2 overlay. Shape only: problems() decides whether it makes sense.
 */
export function isOverlay(value: unknown): value is WorkflowOverlay {
  if (!isRecord(value) || value.version !== 2) return false
  if (!Array.isArray(value.steps) || !Array.isArray(value.links)) return false
  const stepsOk = value.steps.every((step) =>
    isRecord(step) && typeof step.skill === 'string' && step.skill.length > 0 && isMode(step.mode),
  )
  const linksOk = value.links.every((link) =>
    isRecord(link) &&
    typeof link.from === 'string' &&
    typeof link.to === 'string' &&
    isKind(link.kind) &&
    (link.outcome === undefined || typeof link.outcome === 'string'),
  )
  const positionsOk = isRecord(value.positions) && Object.values(value.positions).every((position) =>
    isRecord(position) && Number.isFinite(position.x) && Number.isFinite(position.y),
  )
  return stepsOk && linksOk && kindsOk(value.kinds) && positionsOk
}

/** The node ids of a v1 overlay's line, in order. */
function lineOfV1(overlay: WorkflowOverlayV1): string[] {
  const line: string[] = []
  for (const builtIn of BUILT_IN_LINE) {
    for (const step of overlay.steps) if (step.before === builtIn) line.push(customNodeId(step.skill))
    line.push(builtIn)
  }
  for (const step of overlay.steps) if (step.before === null) line.push(customNodeId(step.skill))
  return line
}

/**
 * The links a v1 line composed to. Splitting a default link `A → B` with custom steps
 * kept its kind on every hop and its outcome on the FIRST hop only; before the first
 * built-in and after the last, a hop was a suggestion. `kinds` applied on top.
 */
function linksOfV1(overlay: WorkflowOverlayV1): WorkflowLink[] {
  const line = lineOfV1(overlay)
  const links: WorkflowLink[] = []
  let opener: string | null = null
  let split: WorkflowLink | undefined
  for (let i = 0; i < line.length - 1; i++) {
    const from = line[i]
    const to = line[i + 1]
    if (isBuiltInNodeId(from)) {
      opener = from
      const next = line.slice(i + 1).find(isBuiltInNodeId)
      split = next ? defaultLink(from, next) : undefined
    }
    const inherited = opener !== null ? split : undefined
    const link: WorkflowLink = { from, to, kind: overlay.kinds[linkKey(from, to)] ?? inherited?.kind ?? 'suggest' }
    if (inherited?.outcome !== undefined && from === opener) link.outcome = inherited.outcome
    links.push(link)
  }
  return links
}

/** A v1 line as a v2 graph: its composed links made explicit. No positions: it is laid out. */
function upgradeV1(overlay: WorkflowOverlayV1): WorkflowOverlay {
  const links: WorkflowOverlayLink[] = []
  const kinds: Record<string, WorkflowLinkKind> = {}
  for (const link of linksOfV1(overlay)) {
    const base = defaultLink(link.from, link.to)
    if (!base) links.push(link)
    else if (base.kind !== link.kind) kinds[linkKey(link.from, link.to)] = link.kind
  }
  return {
    version: 2,
    steps: overlay.steps.map(({ skill, mode }) => ({ skill, mode })),
    links,
    kinds,
    positions: {},
  }
}

/** A stored definition as a v2 overlay (a v1 upgraded), or null when it is neither. */
export function toOverlay(value: unknown): WorkflowOverlay | null {
  if (isOverlay(value)) return value
  if (isOverlayV1(value)) return upgradeV1(value)
  return null
}

// ---------------------------------------------------------------------------
// Judging.
// ---------------------------------------------------------------------------

export type WorkflowProblem =
  /** The same skill is on two steps (a built-in one included). `nodeId` is the second. */
  | { code: 'duplicate-skill'; nodeId: string; skill: string }
  /** A link into /magic:start is auto: starting a ticket always opens a new agent. */
  | { code: 'auto-into-start'; nodeId: string }
  /** A step linked to itself. */
  | { code: 'self-link'; nodeId: string }
  /** Two links between the same two steps. `nodeId` is where they leave from. */
  | { code: 'duplicate-link'; nodeId: string; to: string }
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
  const pairs = new Set<string>()
  for (const link of workflow.links) {
    if (link.from === link.to) found.push({ code: 'self-link', nodeId: link.from })
    const key = linkKey(link.from, link.to)
    if (pairs.has(key)) found.push({ code: 'duplicate-link', nodeId: link.from, to: link.to })
    pairs.add(key)
    if (isLinkIntoStart(link) && link.kind === 'auto') found.push({ code: 'auto-into-start', nodeId: link.from })
  }
  if (found.length > 0) return found
  // The editor's own terms come first; the model's rules catch the rest.
  return validateWorkflow(workflow).map((message) => ({ code: 'invalid' as const, message }))
}

/**
 * A stored definition, upgraded and composed, or an error when it cannot be used (the
 * default is then served).
 */
export function resolveOverlay(value: unknown): { overlay: WorkflowOverlay; workflow: Workflow } | { error: string } {
  const overlay = toOverlay(value)
  if (!overlay) return { error: 'unknown shape' }
  const workflow = composeWorkflow(overlay)
  const found = problemsOf(workflow)
  if (found.length > 0) return { error: found.map((p) => (p.code === 'invalid' ? p.message : `${p.code} ${p.nodeId}`)).join('; ') }
  return { overlay, workflow }
}

/**
 * The custom steps nothing links into: never reached, so never run. Allowed (a step
 * just added has no link yet), and the editor says so on its card.
 */
export function unreachableSteps(overlay: WorkflowOverlay): string[] {
  const reached = new Set(composeWorkflow(overlay).links.filter((l) => l.from !== l.to).map((l) => l.to))
  return overlay.steps.map((step) => customNodeId(step.skill)).filter((id) => !reached.has(id))
}

const samePosition = (a: WorkflowPosition | undefined, b: WorkflowPosition | undefined) =>
  !!a && !!b && a.x === b.x && a.y === b.y

/**
 * Whether two overlays say the same thing, whatever the order `kinds` and `positions`
 * keys were written in: "is there anything to save", and "did a reload change this flow".
 */
export function sameOverlay(a: WorkflowOverlay, b: WorkflowOverlay): boolean {
  if (a.steps.length !== b.steps.length || a.links.length !== b.links.length) return false
  const stepsSame = a.steps.every((step, i) => step.skill === b.steps[i].skill && step.mode === b.steps[i].mode)
  const linksSame = a.links.every((link, i) => {
    const other = b.links[i]
    return link.from === other.from && link.to === other.to && link.kind === other.kind && link.outcome === other.outcome
  })
  if (!stepsSame || !linksSame) return false
  const kinds = Object.keys(a.kinds)
  if (kinds.length !== Object.keys(b.kinds).length || !kinds.every((key) => a.kinds[key] === b.kinds[key])) return false
  const ids = Object.keys(a.positions)
  return ids.length === Object.keys(b.positions).length && ids.every((id) => samePosition(a.positions[id], b.positions[id]))
}

// ---------------------------------------------------------------------------
// Editing. Each function returns a new overlay and never mutates its input.
// ---------------------------------------------------------------------------

/** Positions are whole canvas pixels: a drag's fractions are noise in a diff. */
function rounded({ x, y }: WorkflowPosition): WorkflowPosition {
  return { x: Math.round(x), y: Math.round(y) }
}

/** Add a custom step, linked to nothing yet, with its card at `position`. */
export function addStep(overlay: WorkflowOverlay, skill: string, position: WorkflowPosition, mode: WorkflowMode = 'advisory'): WorkflowOverlay {
  return {
    ...overlay,
    steps: [...overlay.steps, { skill, mode }],
    positions: { ...overlay.positions, [customNodeId(skill)]: rounded(position) },
  }
}

/** Remove a custom step, its links and its place (built-in ones are not in the overlay, so they cannot be). */
export function removeStep(overlay: WorkflowOverlay, skill: string): WorkflowOverlay {
  const id = customNodeId(skill)
  const { [id]: _gone, ...positions } = overlay.positions
  return {
    ...overlay,
    steps: overlay.steps.filter((s) => s.skill !== skill),
    links: overlay.links.filter((link) => link.from !== id && link.to !== id),
    positions,
  }
}

export function setStepMode(overlay: WorkflowOverlay, skill: string, mode: WorkflowMode): WorkflowOverlay {
  return { ...overlay, steps: overlay.steps.map((s) => (s.skill === skill ? { ...s, mode } : s)) }
}

/** Point a custom step at another skill, keeping its place and its links. */
export function setStepSkill(overlay: WorkflowOverlay, skill: string, next: string): WorkflowOverlay {
  if (skill === next) return overlay
  const from = customNodeId(skill)
  const to = customNodeId(next)
  const rename = (id: string) => (id === from ? to : id)
  const positions = Object.fromEntries(Object.entries(overlay.positions).map(([id, at]) => [rename(id), at]))
  return {
    ...overlay,
    steps: overlay.steps.map((s) => (s.skill === skill ? { ...s, skill: next } : s)),
    links: overlay.links.map((link) => ({ ...link, from: rename(link.from), to: rename(link.to) })),
    positions,
  }
}

/**
 * Link `from` to `to`, a suggestion until the admin says otherwise, taken on `outcome`
 * when one is given. A link that already exists between the two, default or drawn,
 * and a step linked to itself are not added: the overlay comes back unchanged.
 */
export function addLink(overlay: WorkflowOverlay, from: string, to: string, outcome?: string): WorkflowOverlay {
  if (from === to || isDefaultLink(from, to)) return overlay
  if (overlay.links.some((link) => link.from === from && link.to === to)) return overlay
  const link: WorkflowOverlayLink = outcome === undefined ? { from, to, kind: 'suggest' } : { from, to, kind: 'suggest', outcome }
  return { ...overlay, links: [...overlay.links, link] }
}

/** Remove a drawn link. A default link is locked: the overlay comes back unchanged. */
export function removeLink(overlay: WorkflowOverlay, from: string, to: string): WorkflowOverlay {
  return { ...overlay, links: overlay.links.filter((link) => link.from !== from || link.to !== to) }
}

/** The kind of a link: a default one's as an override (dropped when back to its own), a drawn one's in place. */
export function setLinkKind(overlay: WorkflowOverlay, from: string, to: string, kind: WorkflowLinkKind): WorkflowOverlay {
  const base = defaultLink(from, to)
  if (base) {
    const { [linkKey(from, to)]: _was, ...kinds } = overlay.kinds
    return { ...overlay, kinds: base.kind === kind ? kinds : { ...kinds, [linkKey(from, to)]: kind } }
  }
  return { ...overlay, links: overlay.links.map((link) => (link.from === from && link.to === to ? { ...link, kind } : link)) }
}

/** The outcome a drawn link is taken on, or none (`undefined`). A default link keeps its own. */
export function setLinkOutcome(overlay: WorkflowOverlay, from: string, to: string, outcome: string | undefined): WorkflowOverlay {
  return {
    ...overlay,
    links: overlay.links.map((link) => {
      if (link.from !== from || link.to !== to) return link
      const { outcome: _was, ...rest } = link
      return outcome === undefined ? rest : { ...rest, outcome }
    }),
  }
}

/** Leave a card at `position`. Any step, built-in ones included: where a card sits is not what it does. */
export function moveNode(overlay: WorkflowOverlay, id: string, position: WorkflowPosition): WorkflowOverlay {
  return { ...overlay, positions: { ...overlay.positions, [id]: rounded(position) } }
}

/**
 * Pin every card of the flow that has no position yet at the one it is drawn at. A
 * card without a position is laid out from the links, so an edit to the links would
 * move it: the editor pins them all before one, and a card stays where the admin saw it.
 */
export function pinPositions(overlay: WorkflowOverlay, drawn: Readonly<Record<string, WorkflowPosition>>): WorkflowOverlay {
  const positions = { ...overlay.positions }
  let changed = false
  for (const node of composeWorkflow(overlay).nodes) {
    if (positions[node.id] || !drawn[node.id]) continue
    positions[node.id] = rounded(drawn[node.id])
    changed = true
  }
  return changed ? { ...overlay, positions } : overlay
}

/** What is stored: the overlay's own fields only, positions of steps it still has. */
export function cleanOverlay(overlay: WorkflowOverlay): WorkflowOverlay {
  const ids = new Set(composeWorkflow(overlay).nodes.map((node) => node.id))
  return {
    version: 2,
    steps: overlay.steps.map(({ skill, mode }) => ({ skill, mode })),
    links: overlay.links.map(({ from, to, kind, outcome }) => (outcome === undefined ? { from, to, kind } : { from, to, kind, outcome })),
    kinds: { ...overlay.kinds },
    positions: Object.fromEntries(Object.entries(overlay.positions).filter(([id]) => ids.has(id)).map(([id, at]) => [id, rounded(at)])),
  }
}
