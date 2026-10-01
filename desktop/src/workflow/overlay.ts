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
 * A STEP CAN BE TURNED OFF (`disabled`, node ids), built-in or custom, and stays on
 * the canvas, greyed, with its links: turning it back on restores the flow as it was.
 * The skills are served the flow WITHOUT it (`servedWorkflow`): its node is dropped,
 * and a link into it leads to whatever it led to instead, so turning commit off makes
 * start suggest pr. Start is the one step that cannot be turned off: a ticket is
 * started by it, and every other step runs in the worktree it opens. The field is
 * optional, and left out when empty: a row written before it reads as all steps on.
 *
 * A BUILT-IN STEP CAN BE TAKEN OFF THE CANVAS (`removed`, node ids), start excepted, and so
 * can a default link (`removedLinks`, `from>to` keys). The default flow itself never
 * changes: the overlay only says what of it this repository left out, so a reset (the empty
 * overlay) brings every built-in step and default link back. A built-in step taken off goes
 * with every link it had, and comes back through the dock's "+" on its own, unlinked, like
 * any step added: its default links stay in `removedLinks` until drawn again.
 *
 * Pure, like model.ts: the main process composes it for `GET /workflow`, the
 * renderer edits it, and both run the same code.
 */

export interface WorkflowOverlayStep {
  skill: string
  mode: WorkflowMode
  /**
   * Its card's ground on the canvas, a `#RRGGBB`: display only, the skills never see it.
   * Which colours are offered is the design system's (`WORKFLOW_STEP_COLORS`, none of them
   * the built-in steps' plain ground); a step without one is handed one by the editor.
   */
  color?: string
  /**
   * What the skill can end on (`tests_passed`, `tests_failed`), declared by the admin or
   * read off its SKILL.md's `outcomes:` frontmatter when the step was added. A link out of
   * the step may be taken on one of them only. Absent or empty: the step ends on nothing
   * in particular, and every link leaving it applies.
   */
  outcomes?: string[]
}

/**
 * AN END NOTE: a card of the canvas that is not a skill, a line to show the user when a
 * link reaches it ("Create the ticket in Jira"). What to do next when no skill does it.
 * Any step's link, on any outcome, may lead to one, several may lead to the same, and
 * nothing leaves one: it is where that way through the flow ends. Shown, never followed:
 * it cannot chain anything, whatever the kind of the link into it.
 */
export interface WorkflowOverlayNote {
  /** Unique among the notes (`n1`, `n2`…). Its node id is `note:<id>`. */
  id: string
  text: string
  /** Its card's ground, as a custom step's. */
  color?: string
}

/**
 * A drawn link: ONE outcome of `from` (or none, whatever it ended on) leading to `to`.
 * Two outcomes of a step leading to the same step are two links, each with its own kind:
 * turning one `auto` leaves the other as it was.
 */
export interface WorkflowOverlayLink {
  from: string
  to: string
  kind: WorkflowLinkKind
  /** Taken only when `from` ended on this. Absent: whatever the outcome. */
  outcome?: string
  /**
   * READ ONLY: a link taken on several outcomes, as 0.105.6 to 0.105.8 stored it. No row
   * holds one any more, but past revisions in the history do, and can be restored. Split
   * into one link per outcome on the way in (`toOverlay`) and on the way out (`cleanOverlay`),
   * so the editor never holds one.
   */
  outcomes?: string[]
}

/** The outcomes a link is taken on, whichever field holds them. Empty: whatever the outcome. */
export function linkOutcomesOf(link: Pick<WorkflowOverlayLink, 'outcome' | 'outcomes'>): string[] {
  if (link.outcomes && link.outcomes.length > 0) return link.outcomes
  return link.outcome === undefined ? [] : [link.outcome]
}

/** A link on `outcome` (none: whatever the outcome), its other fields kept. */
function withLinkOutcome(link: WorkflowOverlayLink, outcome: string | undefined): WorkflowOverlayLink {
  const { outcome: _one, outcomes: _many, ...rest } = link
  return outcome === undefined ? rest : { ...rest, outcome }
}

/** Every link on one outcome at most: one taken on several becomes one per outcome, in order. */
function splitLinks(links: readonly WorkflowOverlayLink[]): WorkflowOverlayLink[] {
  const out: WorkflowOverlayLink[] = []
  for (const link of links) {
    const { from, to, kind } = link
    const outcomes = linkOutcomesOf(link)
    if (outcomes.length === 0) out.push({ from, to, kind })
    for (const outcome of outcomes) {
      if (!out.some((l) => l.from === from && l.to === to && l.outcome === outcome)) out.push({ from, to, kind, outcome })
    }
  }
  return out
}

/** Whether `link` is the one drawn `from → to` on `outcome` (none: the one taken whatever the outcome). */
function isLink(link: WorkflowOverlayLink, from: string, to: string, outcome: string | undefined): boolean {
  return link.from === from && link.to === to && link.outcome === outcome
}

/** The longest end note: a few lines, read at the end of a run. */
export const NOTE_MAX_LENGTH = 500

/**
 * A note's text as it is stored: its lines kept, each trimmed and its spaces collapsed,
 * no more than one blank line in a row, the whole trimmed and capped. Empty when there is
 * nothing left.
 */
export function normalizeNote(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, NOTE_MAX_LENGTH)
}

export interface WorkflowPosition {
  x: number
  y: number
}

/**
 * A FRAME: a titled box drawn on the canvas around cards, to group them ("Checks before
 * the PR"). Display only, like a card's place: the skills never see it, and it holds
 * nothing. What sits inside its box is what moves with it, judged when it is dragged.
 * Its own colours, a border and a ground, are the admin's.
 */
export interface WorkflowOverlayFrame {
  /** Unique among the frames (`f1`, `f2`…). Its node id on the canvas is `frame:<id>`. */
  id: string
  title: string
  /** `#RRGGBB`, its border and title. */
  border: string
  /** `#RRGGBB`, its ground, drawn tinted. */
  background: string
  x: number
  y: number
  width: number
  height: number
}

/**
 * A STICKY NOTE: a card of free text on the canvas, written on the card itself. Display only,
 * like a frame: no port, no link, nothing the skills read. A frame carries it like a card.
 */
export interface WorkflowOverlaySticky {
  /** Unique among the stickies (`s1`, `s2`…). Its node id on the canvas is `sticky:<id>`. */
  id: string
  text: string
  /** `#RRGGBB`, its paper, drawn tinted. */
  color: string
  x: number
  y: number
  width: number
  height: number
}

/** The longest sticky note: a few paragraphs. */
export const STICKY_TEXT_MAX_LENGTH = 2000

/** A sticky note's smallest box, and the one it is added with. */
export const STICKY_MIN_SIZE = { width: 140, height: 90 }
export const STICKY_SIZE = { width: 240, height: 180 }

/** The longest frame title: a heading, not a note. */
export const FRAME_TITLE_MAX_LENGTH = 80

/** A frame's smallest box: room for its title, and for a card. */
export const FRAME_MIN_SIZE = { width: 160, height: 100 }

export interface WorkflowOverlay {
  version: 2
  steps: WorkflowOverlayStep[]
  /** The end notes, in the order they were added. Absent: none. */
  notes?: WorkflowOverlayNote[]
  links: WorkflowOverlayLink[]
  kinds: Record<string, WorkflowLinkKind>
  /** Top-left corner of a card on the canvas, by node id. A card without one is laid out. */
  positions: Record<string, WorkflowPosition>
  /** The steps turned off, by node id, in the order they were. Absent: none. */
  disabled?: string[]
  /** The built-in steps taken off the canvas, by node id. Absent: none. Never start. */
  removed?: string[]
  /** The default links taken off, by `linkKey`. Absent: none. */
  removedLinks?: string[]
  /** The frames drawn on the canvas, bottom first. Absent: none. */
  frames?: WorkflowOverlayFrame[]
  /** The sticky notes on the canvas, bottom first. Absent: none. */
  stickies?: WorkflowOverlaySticky[]
}

export const EMPTY_OVERLAY: WorkflowOverlay = { version: 2, steps: [], links: [], kinds: {}, positions: {} }

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

/** End notes have their own id space too: `note:n1` is never a step. */
const NOTE_PREFIX = 'note:'

export function noteNodeId(id: string): string {
  return `${NOTE_PREFIX}${id}`
}

export function isNoteNodeId(id: string): boolean {
  return id.startsWith(NOTE_PREFIX)
}

/** Frames have their own id space too: `frame:f1` is never a card. */
const FRAME_PREFIX = 'frame:'

export function frameNodeId(id: string): string {
  return `${FRAME_PREFIX}${id}`
}

export function isFrameNodeId(id: string): boolean {
  return id.startsWith(FRAME_PREFIX)
}

/** The id the next frame added gets: the first `f<k>` no frame has. */
export function nextFrameId(overlay: WorkflowOverlay): string {
  const taken = new Set((overlay.frames ?? []).map((frame) => frame.id))
  let k = 1
  while (taken.has(`f${k}`)) k++
  return `f${k}`
}

/** Sticky notes have their own id space too: `sticky:s1`. */
const STICKY_PREFIX = 'sticky:'

export function stickyNodeId(id: string): string {
  return `${STICKY_PREFIX}${id}`
}

export function isStickyNodeId(id: string): boolean {
  return id.startsWith(STICKY_PREFIX)
}

/** The id the next sticky note added gets: the first `s<k>` none has. */
export function nextStickyId(overlay: WorkflowOverlay): string {
  const taken = new Set((overlay.stickies ?? []).map((sticky) => sticky.id))
  let k = 1
  while (taken.has(`s${k}`)) k++
  return `s${k}`
}

/** The id the next note added gets: the first `n<k>` no note has. */
export function nextNoteId(overlay: WorkflowOverlay): string {
  const taken = new Set((overlay.notes ?? []).map((note) => note.id))
  let k = 1
  while (taken.has(`n${k}`)) k++
  return `n${k}`
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

/** Whether a step may be turned off: any step but start, which the whole flow runs from. */
export function canDisable(id: string): boolean {
  // A note runs nothing, so there is nothing to turn off: remove it instead.
  return id !== START_NODE_ID && !isNoteNodeId(id)
}

/** The steps an overlay turns off, as a set. */
function disabledOf(overlay: WorkflowOverlay): Set<string> {
  return new Set(overlay.disabled ?? [])
}

export function isStepDisabled(overlay: WorkflowOverlay, id: string): boolean {
  return disabledOf(overlay).has(id)
}

/** Whether the model refuses `auto` on this link: starting a ticket always opens a new agent. */
export function isLinkIntoStart(link: Pick<WorkflowLink, 'to'>): boolean {
  return link.to === START_NODE_ID
}

/** The default link `from → to`, if the default flow has one. Its outcome is the product's; it may be taken off. */
function defaultLink(from: string, to: string): WorkflowLink | undefined {
  return DEFAULT_LINKS.find((link) => link.from === from && link.to === to)
}

export function isDefaultLink(from: string, to: string): boolean {
  return defaultLink(from, to) !== undefined
}

/** The built-in steps an overlay takes off the canvas, as a set. */
function removedOf(overlay: WorkflowOverlay): Set<string> {
  return new Set(overlay.removed ?? [])
}

/** Whether a step may be taken off the canvas: any custom one, any built-in one but start. */
export function canRemoveStep(id: string): boolean {
  return isCustomNodeId(id) || (isBuiltInNodeId(id) && id !== START_NODE_ID)
}

/**
 * The default link `from → to` as this overlay keeps it: absent when it was taken off, or
 * when one of its two steps was. A drawn link between the same two steps is then the
 * overlay's own, like any other.
 */
function liveDefaultLink(overlay: WorkflowOverlay, from: string, to: string): WorkflowLink | undefined {
  const base = defaultLink(from, to)
  if (!base || (overlay.removedLinks ?? []).includes(linkKey(from, to))) return undefined
  const removed = removedOf(overlay)
  return removed.has(from) || removed.has(to) ? undefined : base
}

/** Whether `from → to` is a default link this overlay still has: its outcome is the product's, not the admin's. */
export function isLiveDefaultLink(overlay: WorkflowOverlay, from: string, to: string): boolean {
  return liveDefaultLink(overlay, from, to) !== undefined
}

function customNode(step: WorkflowOverlayStep): WorkflowNode {
  return { id: customNodeId(step.skill), skill: step.skill, mode: step.mode, required: false, outcomes: step.outcomes ?? [], provides: [] }
}

/**
 * The one outcome a custom step may not declare: a skill that stopped on an error ends on
 * `failed` whatever it declares, and its step's mode decides what that does to the chain.
 */
export const FAILED_OUTCOME = 'failed'

/** Whether a string may name an outcome: the skills' own spelling, `snake_case`, a word or a few. */
export function isOutcomeName(value: unknown): value is string {
  return typeof value === 'string' && value !== FAILED_OUTCOME && /^[a-z][a-z0-9_-]{0,39}$/.test(value)
}

/** The longest name an outcome may have, `isOutcomeName`'s `{0,39}` plus its first letter. */
export const OUTCOME_MAX_LENGTH = 40

/** An outcome as typed, spelled the way a step stores it. */
function outcomeSpelling(raw: string): string {
  // `Tests passed` is meant as `tests_passed`: the skills' spelling, not a refusal.
  return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

/** Why a typed outcome cannot be added, the first rule it breaks; undefined when it can. */
export type OutcomeProblem = 'start' | 'chars' | 'length' | 'failed' | 'duplicate'

/**
 * What stops `raw` from joining `declared`, read after the spelling a step stores, so
 * `Tests passed` is no problem: `normalizeOutcomes` would keep it. The editor says it
 * before adding, where `normalizeOutcomes` would only drop it without a word.
 */
export function outcomeProblem(raw: string, declared: readonly string[]): OutcomeProblem | undefined {
  const value = outcomeSpelling(raw)
  if (!value) return undefined
  if (value === FAILED_OUTCOME) return 'failed'
  if (!/^[a-z]/.test(value)) return 'start'
  if (!/^[a-z0-9_-]*$/.test(value)) return 'chars'
  if (value.length > OUTCOME_MAX_LENGTH) return 'length'
  if (declared.includes(value)) return 'duplicate'
  return undefined
}

/**
 * A list of outcomes as a step stores it: trimmed and lower-cased, the unusable ones
 * dropped, each once, in the order given.
 */
export function normalizeOutcomes(values: readonly string[]): string[] {
  const out: string[] = []
  for (const raw of values) {
    const value = outcomeSpelling(raw)
    if (isOutcomeName(value) && !out.includes(value)) out.push(value)
  }
  return out
}

/**
 * The `outcomes:` of a SKILL.md's frontmatter, as `parseFrontmatterFields` hands it over:
 * a flow list (`[tests_passed, tests_failed]`), a block list (its `- ` items joined on one
 * line) or a bare comma-separated line. Undefined when it names no usable outcome.
 */
export function parseOutcomesField(raw: string | undefined): string[] | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  const parts = value.startsWith('[') && value.endsWith(']')
    ? value.slice(1, -1).split(',')
    : value.startsWith('-') ? value.split(/(?:^|\s)-\s+/) : value.split(',')
  const outcomes = normalizeOutcomes(parts.map((part) => part.trim().replace(/^(['"])(.*)\1$/, '$2')))
  return outcomes.length > 0 ? outcomes : undefined
}


/** One link of the flow: its two ends and the outcome it is taken on. */
function outcomeKey(link: Pick<WorkflowLink, 'from' | 'to' | 'outcome'>): string {
  return `${linkKey(link.from, link.to)}|${link.outcome ?? ''}`
}

/**
 * The full workflow a repository follows: the default flow, with the overlay's custom
 * steps and links added and its kinds applied. The entry is always the default's:
 * a ticket starts at plan or start, and a custom step is reached from there or not
 * at all.
 */
export function composeWorkflow(overlay: WorkflowOverlay): Workflow {
  const removed = removedOf(overlay)
  const links = DEFAULT_LINKS.filter((link) => isLiveDefaultLink(overlay, link.from, link.to)).map((link) => {
    const kind = overlay.kinds[linkKey(link.from, link.to)]
    return kind ? { ...link, kind } : link
  })
  return {
    id: 'repository',
    entry: DEFAULT_WORKFLOW.entry.filter((id) => !removed.has(id)),
    // A skill placed twice is reported by problems(), not dropped here.
    nodes: [...DEFAULT_WORKFLOW.nodes.filter((node) => !removed.has(node.id)), ...overlay.steps.map(customNode)],
    links: [...links, ...splitLinks(overlay.links).map(({ from, to, kind, outcome }) =>
      (outcome === undefined ? { from, to, kind } : { from, to, kind, outcome }))],
    ...((overlay.notes ?? []).length > 0
      ? { notes: (overlay.notes ?? []).map((note) => ({ id: noteNodeId(note.id), text: note.text })) }
      : {}),
  }
}

/** Every card's node id, the notes' included: what a position or a link may name. */
function cardIds(overlay: WorkflowOverlay): Set<string> {
  const flow = composeWorkflow(overlay)
  return new Set([...flow.nodes.map((node) => node.id), ...(flow.notes ?? []).map((note) => note.id)])
}

/**
 * The flow the skills are served: `composeWorkflow`, without the steps turned off.
 *
 * A link into a step that is off is carried through it, to every step that one leads
 * to (through further steps that are off, too), and the links leaving a step that is
 * off go with it. The carried link keeps the outcome it was taken on, since that is
 * about the step it leaves from, and is `auto` only when both the links it replaces
 * were: the admin never said "chain" about the pair. A link the flow already has
 * between the same two steps, or back to the step it leaves from, is not added.
 */
export function servedWorkflow(overlay: WorkflowOverlay): Workflow {
  const flow = composeWorkflow(overlay)
  const off = disabledOf(overlay)
  if (!flow.nodes.some((node) => off.has(node.id))) return flow

  const kept = flow.links.filter((link) => !off.has(link.from) && !off.has(link.to))
  const pairs = new Set(kept.map(outcomeKey))
  const links = [...kept]
  // Where a step that is off leads, as links out of the first live steps past it.
  const through = (id: string, kind: WorkflowLinkKind, walked: Set<string>): { to: string; kind: WorkflowLinkKind }[] =>
    flow.links.filter((link) => link.from === id).flatMap((link) => {
      const joined: WorkflowLinkKind = kind === 'auto' && link.kind === 'auto' ? 'auto' : 'suggest'
      if (!off.has(link.to)) return [{ to: link.to, kind: joined }]
      if (walked.has(link.to)) return []
      return through(link.to, joined, new Set([...walked, link.to]))
    })
  for (const link of flow.links) {
    if (off.has(link.from) || !off.has(link.to)) continue
    for (const next of through(link.to, link.kind, new Set([link.to]))) {
      const key = outcomeKey({ from: link.from, to: next.to, outcome: link.outcome })
      if (next.to === link.from || pairs.has(key)) continue
      pairs.add(key)
      links.push(link.outcome === undefined
        ? { from: link.from, to: next.to, kind: next.kind }
        : { from: link.from, to: next.to, kind: next.kind, outcome: link.outcome })
    }
  }
  return {
    ...flow,
    entry: flow.entry.filter((id) => !off.has(id)),
    nodes: flow.nodes.filter((node) => !off.has(node.id)),
    links,
  }
}

// ---------------------------------------------------------------------------
// Shapes.
// ---------------------------------------------------------------------------

const isMode = (value: unknown): value is WorkflowMode => value === 'blocking' || value === 'advisory'
const isColor = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const isKind = (value: unknown): value is WorkflowLinkKind => value === 'auto' || value === 'suggest'
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

function kindsOk(kinds: unknown): boolean {
  return isRecord(kinds) && Object.values(kinds).every(isKind)
}

/**
 * Whether an untrusted value (a stored definition, or what the editor sends) is shaped
 * like a v2 overlay. Shape only: problems() decides whether it makes sense.
 */
export function isOverlay(value: unknown): value is WorkflowOverlay {
  if (!isRecord(value) || value.version !== 2) return false
  if (!Array.isArray(value.steps) || !Array.isArray(value.links)) return false
  const stepsOk = value.steps.every((step) =>
    isRecord(step) && typeof step.skill === 'string' && step.skill.length > 0 && isMode(step.mode) &&
    (step.color === undefined || isColor(step.color)) &&
    (step.outcomes === undefined || (Array.isArray(step.outcomes) && step.outcomes.every(isOutcomeName))),
  )
  const linksOk = value.links.every((link) =>
    isRecord(link) &&
    typeof link.from === 'string' &&
    typeof link.to === 'string' &&
    isKind(link.kind) &&
    (link.outcome === undefined || typeof link.outcome === 'string') &&
    (link.outcomes === undefined || (Array.isArray(link.outcomes) && link.outcomes.every((o) => typeof o === 'string'))),
  )
  const positionsOk = isRecord(value.positions) && Object.values(value.positions).every((position) =>
    isRecord(position) && Number.isFinite(position.x) && Number.isFinite(position.y),
  )
  const notesOk = value.notes === undefined || (Array.isArray(value.notes) && value.notes.every((note) =>
    isRecord(note) && typeof note.id === 'string' && /^[a-z0-9_-]{1,32}$/i.test(note.id) &&
    typeof note.text === 'string' && note.text.length <= NOTE_MAX_LENGTH &&
    (note.color === undefined || isColor(note.color))))
  const framesOk = value.frames === undefined || (Array.isArray(value.frames) && value.frames.every((frame) =>
    isRecord(frame) && typeof frame.id === 'string' && /^[a-z0-9_-]{1,32}$/i.test(frame.id) &&
    typeof frame.title === 'string' && frame.title.length <= FRAME_TITLE_MAX_LENGTH &&
    isColor(frame.border) && isColor(frame.background) &&
    [frame.x, frame.y, frame.width, frame.height].every(Number.isFinite)))
  const stickiesOk = value.stickies === undefined || (Array.isArray(value.stickies) && value.stickies.every((sticky) =>
    isRecord(sticky) && typeof sticky.id === 'string' && /^[a-z0-9_-]{1,32}$/i.test(sticky.id) &&
    typeof sticky.text === 'string' && sticky.text.length <= STICKY_TEXT_MAX_LENGTH && isColor(sticky.color) &&
    [sticky.x, sticky.y, sticky.width, sticky.height].every(Number.isFinite)))
  const idsOk = (ids: unknown) => ids === undefined || (Array.isArray(ids) && ids.every((id) => typeof id === 'string'))
  return stepsOk && linksOk && notesOk && framesOk && stickiesOk && kindsOk(value.kinds) && positionsOk &&
    idsOk(value.disabled) && idsOk(value.removed) && idsOk(value.removedLinks)
}

/** A stored definition as the editor holds it (one link per outcome), or null when it is not an overlay. */
export function toOverlay(value: unknown): WorkflowOverlay | null {
  return isOverlay(value) ? { ...value, links: splitLinks(value.links) } : null
}

// ---------------------------------------------------------------------------
// Judging.
// ---------------------------------------------------------------------------

export type WorkflowProblem =
  /** The same skill is on two steps (a built-in one included). `nodeId` is the second. */
  | { code: 'duplicate-skill'; nodeId: string; skill: string }
  /** A link into /magic:start is auto: starting a ticket always opens a new agent. */
  | { code: 'auto-into-start'; nodeId: string }
  /**
   * A step linked to itself, `auto` and whatever it ended on: it would run again on its
   * own, every time, forever. Taken on an outcome, or offered, a self link is a retry.
   */
  | { code: 'self-link'; nodeId: string }
  /** Two links between the same two steps. `nodeId` is where they leave from. */
  | { code: 'duplicate-link'; nodeId: string; to: string }
  /** Start turned off: every other step runs from it. */
  | { code: 'start-disabled'; nodeId: string }
  /** An end note with nothing to say. */
  | { code: 'empty-note'; nodeId: string }
  /** Anything else the composed flow fails on (model.ts's own rules). */
  | { code: 'invalid'; message: string }

/**
 * Why an overlay cannot be saved or served, one problem per issue. Empty means it can.
 * Each problem that belongs to a step names it, so the editor can centre the view on it.
 */
export function problems(overlay: WorkflowOverlay): WorkflowProblem[] {
  const found = problemsOf(composeWorkflow(overlay))
  if (found.length > 0) return found
  const off = disabledOf(overlay)
  if (off.has(START_NODE_ID)) return [{ code: 'start-disabled', nodeId: START_NODE_ID }]
  // What the skills get must hold too: a step carried through one that is off is a new link.
  return validateWorkflow(servedWorkflow(overlay)).map((message) => ({ code: 'invalid' as const, message }))
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
    if (link.from === link.to && link.kind === 'auto' && link.outcome === undefined) found.push({ code: 'self-link', nodeId: link.from })
    // Per outcome: one drawn link taken on two outcomes is two links of the flow.
    const key = outcomeKey(link)
    if (pairs.has(key)) found.push({ code: 'duplicate-link', nodeId: link.from, to: link.to })
    pairs.add(key)
    if (isLinkIntoStart(link) && link.kind === 'auto') found.push({ code: 'auto-into-start', nodeId: link.from })
  }
  for (const note of workflow.notes ?? []) {
    if (!note.text.trim()) found.push({ code: 'empty-note', nodeId: note.id })
  }
  if (found.length > 0) return found
  // The editor's own terms come first; the model's rules catch the rest.
  return validateWorkflow(workflow).map((message) => ({ code: 'invalid' as const, message }))
}

/**
 * A stored definition, read and composed, or an error when it cannot be used (the
 * default is then served).
 */
export function resolveOverlay(value: unknown): { overlay: WorkflowOverlay; workflow: Workflow } | { error: string } {
  const overlay = toOverlay(value)
  if (!overlay) return { error: 'unknown shape' }
  const found = problems(overlay)
  if (found.length > 0) return { error: found.map((p) => (p.code === 'invalid' ? p.message : `${p.code} ${p.nodeId}`)).join('; ') }
  return { overlay, workflow: servedWorkflow(overlay) }
}

/**
 * The custom steps nothing links into: never reached, so never run. Allowed (a step
 * just added has no link yet), and the editor says so on its card.
 */
export function unreachableSteps(overlay: WorkflowOverlay): string[] {
  const flow = composeWorkflow(overlay)
  const reached = new Set(flow.links.filter((l) => l.from !== l.to).map((l) => l.to))
  return [
    // A built-in step a ticket starts from is reached by starting it.
    ...flow.nodes.filter((node) => isBuiltInNodeId(node.id) && !flow.entry.includes(node.id)).map((node) => node.id),
    ...overlay.steps.map((step) => customNodeId(step.skill)),
    ...(overlay.notes ?? []).map((note) => noteNodeId(note.id)),
  ].filter((id) => !reached.has(id))
}

/** Two id lists that say the same, in any order: "are the same steps off". */
function sameIds(a: readonly string[] = [], b: readonly string[] = []): boolean {
  const one = new Set(a)
  const other = new Set(b)
  return one.size === other.size && [...one].every((id) => other.has(id))
}

function sameDisabled(a: WorkflowOverlay, b: WorkflowOverlay): boolean {
  return sameIds(a.disabled, b.disabled) && sameIds(a.removed, b.removed) && sameIds(a.removedLinks, b.removedLinks)
}

const samePosition = (a: WorkflowPosition | undefined, b: WorkflowPosition | undefined) =>
  !!a && !!b && a.x === b.x && a.y === b.y

/**
 * Whether two overlays say the same thing, whatever the order `kinds` and `positions`
 * keys were written in: "is there anything to save", and "did a reload change this flow".
 */
export function sameOverlay(a: WorkflowOverlay, b: WorkflowOverlay): boolean {
  if (a.steps.length !== b.steps.length || a.links.length !== b.links.length) return false
  const sameOutcomes = (x: string[] = [], y: string[] = []) => x.length === y.length && x.every((o, i) => o === y[i])
  const stepsSame = a.steps.every((step, i) =>
    step.skill === b.steps[i].skill && step.mode === b.steps[i].mode && step.color === b.steps[i].color &&
    sameOutcomes(step.outcomes, b.steps[i].outcomes))
  const notesA = a.notes ?? []
  const notesB = b.notes ?? []
  const notesSame = notesA.length === notesB.length &&
    notesA.every((note, i) => note.id === notesB[i].id && note.text === notesB[i].text && note.color === notesB[i].color)
  const linksSame = a.links.every((link, i) => {
    const other = b.links[i]
    return link.from === other.from && link.to === other.to && link.kind === other.kind &&
      sameOutcomes(linkOutcomesOf(link), linkOutcomesOf(other))
  })
  const framesA = a.frames ?? []
  const framesB = b.frames ?? []
  const framesSame = framesA.length === framesB.length && framesA.every((frame, i) => {
    const other = framesB[i]
    return frame.id === other.id && frame.title === other.title && frame.border === other.border &&
      frame.background === other.background && frame.x === other.x && frame.y === other.y &&
      frame.width === other.width && frame.height === other.height
  })
  const stickiesA = a.stickies ?? []
  const stickiesB = b.stickies ?? []
  const stickiesSame = stickiesA.length === stickiesB.length && stickiesA.every((sticky, i) => {
    const other = stickiesB[i]
    return sticky.id === other.id && sticky.text === other.text && sticky.color === other.color &&
      sticky.x === other.x && sticky.y === other.y && sticky.width === other.width && sticky.height === other.height
  })
  if (!stepsSame || !linksSame || !notesSame || !framesSame || !stickiesSame || !sameDisabled(a, b)) return false
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

/**
 * Add a custom step, linked to nothing yet, with its card at `position`, wearing `color` if
 * given, and ending on `outcomes` if any (what its SKILL.md declares).
 */
export function addStep(
  overlay: WorkflowOverlay, skill: string, position: WorkflowPosition, mode: WorkflowMode = 'advisory', color?: string,
  outcomes: readonly string[] = [],
): WorkflowOverlay {
  const declared = normalizeOutcomes(outcomes)
  const step: WorkflowOverlayStep = color === undefined ? { skill, mode } : { skill, mode, color }
  if (declared.length > 0) step.outcomes = declared
  return {
    ...overlay,
    steps: [...overlay.steps, step],
    positions: { ...overlay.positions, [customNodeId(skill)]: rounded(position) },
  }
}

/** A `disabled` list, left out of the overlay when it is empty. */
function withDisabled(overlay: WorkflowOverlay, disabled: string[]): WorkflowOverlay {
  const { disabled: _was, ...rest } = overlay
  return disabled.length > 0 ? { ...rest, disabled } : rest
}

/**
 * Take a step off the canvas, by node id: a custom one is removed (`removeStep`), a built-in
 * one is `removed`, with every link it had, its default ones included, and its place. Start
 * stays: the overlay comes back unchanged.
 */
export function removeNode(overlay: WorkflowOverlay, id: string): WorkflowOverlay {
  if (!canRemoveStep(id)) return overlay
  if (isCustomNodeId(id)) return removeStep(overlay, id.slice(CUSTOM_PREFIX.length))
  if (removedOf(overlay).has(id)) return overlay
  const { [id]: _gone, ...positions } = overlay.positions
  const touching = DEFAULT_LINKS.filter((link) => link.from === id || link.to === id).map((link) => linkKey(link.from, link.to))
  const kinds = Object.fromEntries(Object.entries(overlay.kinds).filter(([key]) => !touching.includes(key)))
  return withDisabled({
    ...overlay,
    links: overlay.links.filter((link) => link.from !== id && link.to !== id),
    kinds,
    positions,
    removed: [...(overlay.removed ?? []), id],
    removedLinks: [...new Set([...(overlay.removedLinks ?? []), ...touching])],
  }, (overlay.disabled ?? []).filter((off) => off !== id))
}

/** Put a built-in step taken off back on the canvas, at `position`, unlinked: see the header. */
export function restoreStep(overlay: WorkflowOverlay, id: string, position: WorkflowPosition): WorkflowOverlay {
  if (!removedOf(overlay).has(id)) return overlay
  const { removed: _was, ...rest } = overlay
  const removed = (overlay.removed ?? []).filter((one) => one !== id)
  return {
    ...rest,
    ...(removed.length > 0 ? { removed } : {}),
    positions: { ...overlay.positions, [id]: rounded(position) },
  }
}

/** Remove a custom step, its links and its place. */
export function removeStep(overlay: WorkflowOverlay, skill: string): WorkflowOverlay {
  const id = customNodeId(skill)
  const { [id]: _gone, ...positions } = overlay.positions
  return withDisabled({
    ...overlay,
    steps: overlay.steps.filter((s) => s.skill !== skill),
    links: overlay.links.filter((link) => link.from !== id && link.to !== id),
    positions,
  }, (overlay.disabled ?? []).filter((off) => off !== id))
}

/** Turn a step on or off, built-in or custom. Start stays on: the overlay comes back unchanged. */
export function setStepEnabled(overlay: WorkflowOverlay, id: string, enabled: boolean): WorkflowOverlay {
  if (!canDisable(id) || isStepDisabled(overlay, id) === !enabled) return overlay
  const disabled = overlay.disabled ?? []
  return withDisabled(overlay, enabled ? disabled.filter((off) => off !== id) : [...disabled, id])
}

export function setStepMode(overlay: WorkflowOverlay, skill: string, mode: WorkflowMode): WorkflowOverlay {
  return { ...overlay, steps: overlay.steps.map((s) => (s.skill === skill ? { ...s, mode } : s)) }
}

/** Its card's ground. Which colours are allowed is the editor's to offer, not this module's. */
export function setStepColor(overlay: WorkflowOverlay, skill: string, color: string): WorkflowOverlay {
  return { ...overlay, steps: overlay.steps.map((s) => (s.skill === skill ? { ...s, color } : s)) }
}

/**
 * What a custom step can end on. Adding one changes no link. A link on an outcome no
 * longer declared is kept, taken whatever the outcome from now on (the admin removed an
 * outcome, not a link), unless its two steps are linked otherwise already: it then goes.
 */
export function setStepOutcomes(overlay: WorkflowOverlay, skill: string, outcomes: readonly string[]): WorkflowOverlay {
  const declared = normalizeOutcomes(outcomes)
  const id = customNodeId(skill)
  const kept = overlay.links.filter((link) => link.from !== id || link.outcome === undefined || declared.includes(link.outcome))
  const links: WorkflowOverlayLink[] = []
  for (const link of overlay.links) {
    if (kept.includes(link)) links.push(link)
    else if (!kept.some((other) => other.from === link.from && other.to === link.to) &&
      !links.some((other) => other.from === link.from && other.to === link.to)) links.push(withLinkOutcome(link, undefined))
  }
  return {
    ...overlay,
    steps: overlay.steps.map((s) => {
      if (s.skill !== skill) return s
      const { outcomes: _was, ...rest } = s
      return declared.length > 0 ? { ...rest, outcomes: declared } : rest
    }),
    links,
  }
}

/** Add an end note with its card at `position`. Its id is `nextNoteId`'s: the caller can select it. */
export function addNote(overlay: WorkflowOverlay, position: WorkflowPosition, text = '', color?: string): WorkflowOverlay {
  const id = nextNoteId(overlay)
  const note: WorkflowOverlayNote = color === undefined ? { id, text: normalizeNote(text) } : { id, text: normalizeNote(text), color }
  return {
    ...overlay,
    notes: [...(overlay.notes ?? []), note],
    positions: { ...overlay.positions, [noteNodeId(id)]: rounded(position) },
  }
}

/** A `notes` list, left out of the overlay when it is empty. */
function withNotes(overlay: WorkflowOverlay, notes: WorkflowOverlayNote[]): WorkflowOverlay {
  const { notes: _was, ...rest } = overlay
  return notes.length > 0 ? { ...rest, notes } : rest
}

/** Remove a note (by its node id), the links into it and its place. */
export function removeNote(overlay: WorkflowOverlay, nodeId: string): WorkflowOverlay {
  const { [nodeId]: _gone, ...positions } = overlay.positions
  return withNotes({
    ...overlay,
    links: overlay.links.filter((link) => link.from !== nodeId && link.to !== nodeId),
    positions,
  }, (overlay.notes ?? []).filter((note) => noteNodeId(note.id) !== nodeId))
}

/** What a note says, one trimmed line. */
export function setNoteText(overlay: WorkflowOverlay, nodeId: string, text: string): WorkflowOverlay {
  return withNotes(overlay, (overlay.notes ?? []).map((note) => (noteNodeId(note.id) === nodeId ? { ...note, text: normalizeNote(text) } : note)))
}

export function setNoteColor(overlay: WorkflowOverlay, nodeId: string, color: string): WorkflowOverlay {
  return withNotes(overlay, (overlay.notes ?? []).map((note) => (noteNodeId(note.id) === nodeId ? { ...note, color } : note)))
}

/**
 * Whether a link `from → to` on `outcome` may be drawn: not a default pair, nothing out
 * of a note, not the same link twice, and never beside one taken whatever the outcome,
 * since that one already applies on every outcome.
 */
export function canAddLink(links: readonly Pick<WorkflowLink, 'from' | 'to' | 'outcome'>[], from: string, to: string, outcome?: string): boolean {
  if (isNoteNodeId(from)) return false
  const between = links.filter((link) => link.from === from && link.to === to)
  return outcome === undefined ? between.length === 0 : !between.some((link) => link.outcome === undefined || link.outcome === outcome)
}

/**
 * Link `from` to `to`, a suggestion until the admin says otherwise, taken on `outcome`
 * when one is given. Each outcome is a link of its own, with its own kind. A link
 * `canAddLink` refuses is not added: the overlay comes back unchanged. A step may be
 * linked to itself, to run again (a check retried on `tests_failed`, say).
 */
export function addLink(overlay: WorkflowOverlay, from: string, to: string, outcome?: string): WorkflowOverlay {
  // Judged against the whole flow: a default link still there counts as one drawn.
  if (!canAddLink(composeWorkflow(overlay).links, from, to, outcome)) return overlay
  const link: WorkflowOverlayLink = outcome === undefined ? { from, to, kind: 'suggest' } : { from, to, kind: 'suggest', outcome }
  return { ...overlay, links: [...overlay.links, link] }
}

/**
 * Remove the link `from → to` on `outcome` (none: the one taken whatever the outcome). A
 * default one is taken off (`removedLinks`), its kind override with it.
 */
export function removeLink(overlay: WorkflowOverlay, from: string, to: string, outcome?: string): WorkflowOverlay {
  const base = liveDefaultLink(overlay, from, to)
  if (base && base.outcome === outcome) {
    const key = linkKey(from, to)
    const { [key]: _was, ...kinds } = overlay.kinds
    return { ...overlay, kinds, removedLinks: [...(overlay.removedLinks ?? []), key] }
  }
  return { ...overlay, links: overlay.links.filter((link) => !isLink(link, from, to, outcome)) }
}

/**
 * The kind of a link: a default one's as an override (dropped when back to its own), a
 * drawn one's in place, that link's alone (`outcome`, none: the one taken whatever the outcome).
 */
export function setLinkKind(overlay: WorkflowOverlay, from: string, to: string, kind: WorkflowLinkKind, outcome?: string): WorkflowOverlay {
  const base = liveDefaultLink(overlay, from, to)
  if (base && base.outcome === outcome) {
    const { [linkKey(from, to)]: _was, ...kinds } = overlay.kinds
    return { ...overlay, kinds: base.kind === kind ? kinds : { ...kinds, [linkKey(from, to)]: kind } }
  }
  return { ...overlay, links: overlay.links.map((link) => (isLink(link, from, to, outcome) ? { ...link, kind } : link)) }
}

/**
 * Move a drawn link from outcome `was` to `now` (either none: whatever the outcome). A
 * default link keeps its own, and a move onto a link that `canAddLink` would refuse is not
 * made: the overlay comes back unchanged.
 */
export function setLinkOutcome(
  overlay: WorkflowOverlay, from: string, to: string, was: string | undefined, now: string | undefined,
): WorkflowOverlay {
  if (was === now) return overlay
  const others = composeWorkflow(overlay).links.filter((link) => !isLink(link, from, to, was))
  if (!overlay.links.some((link) => isLink(link, from, to, was)) || !canAddLink(others, from, to, now)) return overlay
  return { ...overlay, links: overlay.links.map((link) => (isLink(link, from, to, was) ? withLinkOutcome(link, now) : link)) }
}

/** A frame's title as stored: one line, its spaces collapsed, trimmed and capped. */
export function normalizeFrameTitle(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, FRAME_TITLE_MAX_LENGTH)
}

/** A `frames` list, left out of the overlay when it is empty. */
function withFrames(overlay: WorkflowOverlay, frames: WorkflowOverlayFrame[]): WorkflowOverlay {
  const { frames: _was, ...rest } = overlay
  return frames.length > 0 ? { ...rest, frames } : rest
}

type Box = WorkflowPosition & { width: number; height: number }

/** A box in whole pixels, never under `min`. */
function boxed(box: Box, min: { width: number; height: number }): Box {
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.max(min.width, Math.round(box.width)),
    height: Math.max(min.height, Math.round(box.height)),
  }
}

/** A frame's box, never under `FRAME_MIN_SIZE`. */
function framedBox(box: Box): Box {
  return boxed(box, FRAME_MIN_SIZE)
}

/** A sticky note's text as stored: its lines kept, trailing spaces and extra blank lines gone, capped. */
export function normalizeStickyText(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, STICKY_TEXT_MAX_LENGTH)
}

/** A `stickies` list, left out of the overlay when it is empty. */
function withStickies(overlay: WorkflowOverlay, stickies: WorkflowOverlaySticky[]): WorkflowOverlay {
  const { stickies: _was, ...rest } = overlay
  return stickies.length > 0 ? { ...rest, stickies } : rest
}

/** Add a sticky note with its top-left corner at `position`, on top of the others. Its id is `nextStickyId`'s. */
export function addSticky(overlay: WorkflowOverlay, position: WorkflowPosition, color: string, text = ''): WorkflowOverlay {
  const sticky: WorkflowOverlaySticky = {
    id: nextStickyId(overlay), text: normalizeStickyText(text), color, ...boxed({ ...position, ...STICKY_SIZE }, STICKY_MIN_SIZE),
  }
  return withStickies(overlay, [...(overlay.stickies ?? []), sticky])
}

/** Remove a sticky note, by its node id. */
export function removeSticky(overlay: WorkflowOverlay, nodeId: string): WorkflowOverlay {
  return withStickies(overlay, (overlay.stickies ?? []).filter((sticky) => stickyNodeId(sticky.id) !== nodeId))
}

/** Change a sticky note, by its node id: its text, colour or box. */
export function setSticky(
  overlay: WorkflowOverlay, nodeId: string,
  change: Partial<Pick<WorkflowOverlaySticky, 'text' | 'color' | 'x' | 'y' | 'width' | 'height'>>,
): WorkflowOverlay {
  return withStickies(overlay, (overlay.stickies ?? []).map((sticky) => {
    if (stickyNodeId(sticky.id) !== nodeId) return sticky
    const next = { ...sticky, ...change }
    return { ...next, text: normalizeStickyText(next.text), ...boxed(next, STICKY_MIN_SIZE) }
  }))
}

/** Add a frame over `box`, on top of the others. Its id is `nextFrameId`'s: the caller can select it. */
export function addFrame(
  overlay: WorkflowOverlay, box: WorkflowPosition & { width: number; height: number }, border: string, background: string, title = '',
): WorkflowOverlay {
  const frame: WorkflowOverlayFrame = { id: nextFrameId(overlay), title: normalizeFrameTitle(title), border, background, ...framedBox(box) }
  return withFrames(overlay, [...(overlay.frames ?? []), frame])
}

/** Remove a frame, by its node id. The cards inside stay where they are. */
export function removeFrame(overlay: WorkflowOverlay, nodeId: string): WorkflowOverlay {
  return withFrames(overlay, (overlay.frames ?? []).filter((frame) => frameNodeId(frame.id) !== nodeId))
}

/** Change a frame, by its node id: its title, colours or box. */
export function setFrame(
  overlay: WorkflowOverlay, nodeId: string,
  change: Partial<Pick<WorkflowOverlayFrame, 'title' | 'border' | 'background' | 'x' | 'y' | 'width' | 'height'>>,
): WorkflowOverlay {
  return withFrames(overlay, (overlay.frames ?? []).map((frame) => {
    if (frameNodeId(frame.id) !== nodeId) return frame
    const next = { ...frame, ...change }
    return { ...next, title: normalizeFrameTitle(next.title), ...framedBox(next) }
  }))
}

/** Leave a card at `position`. Any step, built-in ones included: where a card sits is not what it does. */
export function moveNode(overlay: WorkflowOverlay, id: string, position: WorkflowPosition): WorkflowOverlay {
  if (isFrameNodeId(id)) return setFrame(overlay, id, position)
  if (isStickyNodeId(id)) return setSticky(overlay, id, position)
  return { ...overlay, positions: { ...overlay.positions, [id]: rounded(position) } }
}

/** Leave several cards (frames included) where they were let go, as one edit: a frame and what it carried. */
export function moveNodes(overlay: WorkflowOverlay, moves: Readonly<Record<string, WorkflowPosition>>): WorkflowOverlay {
  return Object.entries(moves).reduce((was, [id, position]) => moveNode(was, id, position), overlay)
}

/**
 * Pin every card of the flow that has no position yet at the one it is drawn at. A
 * card without a position is laid out from the links, so an edit to the links would
 * move it: the editor pins them all before one, and a card stays where the admin saw it.
 */
export function pinPositions(overlay: WorkflowOverlay, drawn: Readonly<Record<string, WorkflowPosition>>): WorkflowOverlay {
  const positions = { ...overlay.positions }
  let changed = false
  for (const id of cardIds(overlay)) {
    if (positions[id] || !drawn[id]) continue
    positions[id] = rounded(drawn[id])
    changed = true
  }
  return changed ? { ...overlay, positions } : overlay
}

/** What is stored: the overlay's own fields only, positions and switches of steps it still has. */
export function cleanOverlay(overlay: WorkflowOverlay): WorkflowOverlay {
  const ids = cardIds(overlay)
  const removed = [...removedOf(overlay)].filter((id) => isBuiltInNodeId(id) && id !== START_NODE_ID)
  const removedLinks = [...new Set(overlay.removedLinks ?? [])].filter((key) => DEFAULT_LINKS.some((link) => linkKey(link.from, link.to) === key))
  const kinds = Object.fromEntries(Object.entries(overlay.kinds).filter(([key]) => !removedLinks.includes(key)))
  const notes = (overlay.notes ?? []).map(({ id, text, color }) => (color === undefined ? { id, text: normalizeNote(text) } : { id, text: normalizeNote(text), color }))
  const frames = (overlay.frames ?? []).map(({ id, title, border, background, x, y, width, height }) =>
    ({ id, title: normalizeFrameTitle(title), border, background, ...framedBox({ x, y, width, height }) }))
  const stickies = (overlay.stickies ?? []).map(({ id, text, color, x, y, width, height }) =>
    ({ id, text: normalizeStickyText(text), color, ...boxed({ x, y, width, height }, STICKY_MIN_SIZE) }))
  return withDisabled(withNotes({
    version: 2,
    ...(frames.length > 0 ? { frames } : {}),
    ...(stickies.length > 0 ? { stickies } : {}),
    ...(removed.length > 0 ? { removed } : {}),
    ...(removedLinks.length > 0 ? { removedLinks } : {}),
    steps: overlay.steps.map(({ skill, mode, color, outcomes }) => {
      const step: WorkflowOverlayStep = color === undefined ? { skill, mode } : { skill, mode, color }
      if (outcomes && outcomes.length > 0) step.outcomes = [...outcomes]
      return step
    }),
    // One link per outcome, written as `outcome`: the field every build reads.
    links: splitLinks(overlay.links),
    kinds,
    positions: Object.fromEntries(Object.entries(overlay.positions).filter(([id]) => ids.has(id)).map(([id, at]) => [id, rounded(at)])),
  }, notes), [...disabledOf(overlay)].filter((id) => ids.has(id) && canDisable(id)))
}
