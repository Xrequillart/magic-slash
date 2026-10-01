import { DEFAULT_LINKS, DEFAULT_WORKFLOW } from '../../workflow/defaultFlow'
import type { WorkflowLinkKind, WorkflowMode } from '../../workflow/model'
import { EMPTY_OVERLAY, customNodeId, isCustomNodeId, linkKey, toOverlay, type WorkflowOverlay, type WorkflowOverlayLink } from '../../workflow/overlay'
import type { WorkflowHistoryEvent } from '../../types'

/**
 * A repository's workflow history as what CHANGED, save by save. Pure, so the editor's
 * panel stays a drawing and this stays testable.
 *
 * THE DATABASE KEEPS WHOLE VALUES, the overlay before and after a save, the `start`
 * settings before and after a change (`settings_events`). Nobody reads a jsonb diff, so
 * each save is turned into the edits the editor would have made to get there: a step
 * added, a link turned automatic, a phase of /magic:start switched off.
 *
 * A SAVE THAT CHANGED NOTHING VISIBLE IS DROPPED. Cards pinned where they were already
 * drawn, `{}` replaced by the defaults it stood for: the row is real, the change is not.
 */

export type WorkflowHistoryChange =
  | { kind: 'step-added'; node: string }
  | { kind: 'step-removed'; node: string }
  | { kind: 'step-mode'; node: string; mode: WorkflowMode }
  | { kind: 'step-color'; node: string }
  | { kind: 'step-outcomes'; node: string; outcomes: string[] }
  | { kind: 'step-enabled'; node: string; enabled: boolean }
  | { kind: 'link-added'; from: string; to: string; linkKind: WorkflowLinkKind }
  | { kind: 'link-removed'; from: string; to: string }
  | { kind: 'link-kind'; from: string; to: string; linkKind: WorkflowLinkKind }
  | { kind: 'link-outcome'; from: string; to: string; outcome?: string }
  | { kind: 'moved'; count: number }
  /** A stored value this build cannot read: something changed, what is not known. */
  | { kind: 'unreadable' }
  | { kind: 'start'; setting: StartSettingKey; from: StartSettingValue; to: StartSettingValue }

export interface WorkflowHistoryEntry {
  id: string
  at: number
  actorId?: string
  scope: WorkflowHistoryEvent['scope']
  changes: WorkflowHistoryChange[]
}

/**
 * /magic:start's settings, in the order the editor's inspector lists them, with the values
 * a missing key stands for. The main process's `defaults.ts` and RepoPage's reading of
 * `repo.start` hold the same ones: an unset key is today's behaviour.
 */
export const START_DEFAULTS = {
  exploration: 'auto',
  plan: true,
  planReview: true,
  planApproval: true,
  execution: 'auto',
  simplify: true,
  criticIterations: 3,
  criticMinScore: 8,
} as const

export type StartSettingKey = keyof typeof START_DEFAULTS
export type StartSettingValue = string | number | boolean

const START_KEYS = Object.keys(START_DEFAULTS) as StartSettingKey[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A setting's value, the default standing in for a missing or mistyped one. */
function startValue(settings: Record<string, unknown>, key: StartSettingKey): StartSettingValue {
  const value = settings[key]
  return typeof value === typeof START_DEFAULTS[key] ? (value as StartSettingValue) : START_DEFAULTS[key]
}

export function diffStart(before: unknown, after: unknown): WorkflowHistoryChange[] {
  const old = isRecord(before) ? before : {}
  const next = isRecord(after) ? after : {}
  return START_KEYS.flatMap((setting): WorkflowHistoryChange[] => {
    const from = startValue(old, setting)
    const to = startValue(next, setting)
    return from === to ? [] : [{ kind: 'start', setting, from, to }]
  })
}

/** A node's skill: a custom step's own, a built-in's from the default flow. */
export function skillOfNode(id: string): string {
  if (isCustomNodeId(id)) return id.slice(customNodeId('').length)
  return DEFAULT_WORKFLOW.nodes.find((node) => node.id === id)?.skill ?? id
}

/** No row is the default flow, which is the empty overlay. Null: a value this build cannot read. */
function overlayOf(value: unknown): WorkflowOverlay | null {
  return value === null || value === undefined ? EMPTY_OVERLAY : toOverlay(value)
}

export function diffOverlays(before: WorkflowOverlay, after: WorkflowOverlay): WorkflowHistoryChange[] {
  const changes: WorkflowHistoryChange[] = []
  const oldSteps = new Map(before.steps.map((step) => [step.skill, step]))
  const newSteps = new Map(after.steps.map((step) => [step.skill, step]))
  // The nodes that came or went: their links and their card go with them, and saying
  // so again line by line would bury the one change that was made.
  const gone = new Set<string>()

  for (const [skill, step] of newSteps) {
    const was = oldSteps.get(skill)
    if (!was) {
      changes.push({ kind: 'step-added', node: skill })
      gone.add(customNodeId(skill))
      continue
    }
    if (was.mode !== step.mode) changes.push({ kind: 'step-mode', node: skill, mode: step.mode })
    if (was.color !== step.color && was.color !== undefined && step.color !== undefined) {
      changes.push({ kind: 'step-color', node: skill })
    }
    const outcomesBefore = was.outcomes ?? []
    const outcomesAfter = step.outcomes ?? []
    if (outcomesBefore.length !== outcomesAfter.length || outcomesBefore.some((outcome, i) => outcome !== outcomesAfter[i])) {
      changes.push({ kind: 'step-outcomes', node: skill, outcomes: outcomesAfter })
    }
  }
  for (const skill of oldSteps.keys()) {
    if (!newSteps.has(skill)) {
      changes.push({ kind: 'step-removed', node: skill })
      gone.add(customNodeId(skill))
    }
  }

  const wasOff = new Set(before.disabled ?? [])
  const isOff = new Set(after.disabled ?? [])
  for (const id of isOff) if (!wasOff.has(id) && !gone.has(id)) changes.push({ kind: 'step-enabled', node: skillOfNode(id), enabled: false })
  for (const id of wasOff) if (!isOff.has(id) && !gone.has(id)) changes.push({ kind: 'step-enabled', node: skillOfNode(id), enabled: true })

  const touchesGone = (link: Pick<WorkflowOverlayLink, 'from' | 'to'>) => gone.has(link.from) || gone.has(link.to)
  const oldLinks = new Map(before.links.map((link) => [linkKey(link.from, link.to), link]))
  const newLinks = new Map(after.links.map((link) => [linkKey(link.from, link.to), link]))
  for (const [key, link] of newLinks) {
    const was = oldLinks.get(key)
    const ends = { from: skillOfNode(link.from), to: skillOfNode(link.to) }
    if (!was) {
      if (!touchesGone(link)) changes.push({ kind: 'link-added', ...ends, linkKind: link.kind })
      continue
    }
    if (was.kind !== link.kind) changes.push({ kind: 'link-kind', ...ends, linkKind: link.kind })
    if (was.outcome !== link.outcome) changes.push({ kind: 'link-outcome', ...ends, outcome: link.outcome })
  }
  for (const [key, link] of oldLinks) {
    if (!newLinks.has(key) && !touchesGone(link)) changes.push({ kind: 'link-removed', from: skillOfNode(link.from), to: skillOfNode(link.to) })
  }

  // A default link's kind. Absent from `kinds` is the default's own kind, which the
  // overlay does not repeat, so only a key present on the new side says what it became.
  const [kindsBefore, kindsAfter] = [before.kinds, after.kinds]
  for (const key of new Set([...Object.keys(kindsBefore), ...Object.keys(kindsAfter)])) {
    if (kindsBefore[key] === kindsAfter[key]) continue
    const [from, to] = key.split('>')
    const kind = kindsAfter[key] ?? DEFAULT_LINKS.find((link) => link.from === from && link.to === to)?.kind
    if (kind) changes.push({ kind: 'link-kind', from: skillOfNode(from), to: skillOfNode(to), linkKind: kind })
  }

  // Cards MOVED: pinned on both sides, somewhere else now. A card pinned for the first
  // time was pinned where it was already drawn, which moves nothing on screen.
  let moved = 0
  for (const [id, position] of Object.entries(after.positions)) {
    const was = before.positions[id]
    if (was && !gone.has(id) && (was.x !== position.x || was.y !== position.y)) moved++
  }
  if (moved > 0) changes.push({ kind: 'moved', count: moved })

  return changes
}

export function diffWorkflowEvent(event: WorkflowHistoryEvent): WorkflowHistoryChange[] {
  if (event.scope === 'start') return diffStart(event.before, event.after)
  const before = overlayOf(event.before)
  const after = overlayOf(event.after)
  if (!before || !after) return [{ kind: 'unreadable' }]
  return diffOverlays(before, after)
}

/** The events as entries, newest first, each with what it changed. Saves that changed nothing are left out. */
export function buildWorkflowHistory(events: readonly WorkflowHistoryEvent[]): WorkflowHistoryEntry[] {
  return events
    .map((event) => {
      const at = Date.parse(event.occurredAt)
      return {
        id: event.id,
        at: Number.isFinite(at) ? at : 0,
        actorId: event.actorId,
        scope: event.scope,
        changes: diffWorkflowEvent(event),
      }
    })
    .filter((entry) => entry.changes.length > 0)
    .sort((a, b) => b.at - a.at)
}
