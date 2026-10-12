import { DEFAULT_LINKS, DEFAULT_WORKFLOW } from '../../workflow/defaultFlow'
import type { WorkflowLinkKind, WorkflowMode } from '../../workflow/model'
import { EMPTY_OVERLAY, actionNodeId, customNodeId, isActionNodeId, isCustomNodeId, isNoteNodeId, linkKey, linkOutcomesOf, noteNodeId, toOverlay, type WorkflowOverlay, type WorkflowOverlayLink } from '../../workflow/overlay'
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
  /** `outcome`: the outcomes it is now taken on, comma-separated; absent for whatever the outcome. */
  | { kind: 'link-outcome'; from: string; to: string; outcome?: string }
  /** An end note, by what it says: a note has no other name. */
  | { kind: 'note-added'; text: string }
  | { kind: 'note-removed'; text: string }
  | { kind: 'note-text'; before: string; after: string }
  /** An action, by where it posts and its instruction's first line (`actionText`). */
  | { kind: 'action-added'; text: string }
  | { kind: 'action-removed'; text: string }
  | { kind: 'action-changed'; before: string; after: string }
  /** A frame, by its title: empty when it has none. Its moves and colours are not told. */
  | { kind: 'frame-added'; title: string }
  | { kind: 'frame-removed'; title: string }
  | { kind: 'frame-title'; before: string; after: string }
  /** A sticky note, by its first line. Its moves and colour are not told. */
  | { kind: 'sticky-added' }
  | { kind: 'sticky-removed'; text: string }
  | { kind: 'sticky-text'; text: string }
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

/** How the history names an action: where it posts, then its instruction's first line. */
function actionText(action: { channel: string; prompt: string }): string {
  return [action.channel, action.prompt.split('\n')[0].trim()].filter(Boolean).join(' · ')
}

export function diffOverlays(stored: WorkflowOverlay, next: WorkflowOverlay): WorkflowHistoryChange[] {
  // As the editor reads them: a link stored on several outcomes is one link per outcome.
  const before = toOverlay(stored) ?? stored
  const after = toOverlay(next) ?? next
  const changes: WorkflowHistoryChange[] = []
  // A link's end that is a note is named by what it says (`note:<text>`, see `endOf`).
  const texts = new Map([...(before.notes ?? []), ...(after.notes ?? [])].map((note) => [noteNodeId(note.id), note.text]))
  // An action's, by `actionText` (`action:<text>`).
  const actionTexts = new Map([...(before.actions ?? []), ...(after.actions ?? [])].map((action) => [actionNodeId(action.id), actionText(action)]))
  const endOf = (id: string) => (isNoteNodeId(id) ? `note:${texts.get(id) ?? ''}`
    : isActionNodeId(id) ? `action:${actionTexts.get(id) ?? ''}` : skillOfNode(id))
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

  const oldNotes = new Map((before.notes ?? []).map((note) => [note.id, note]))
  const newNotes = new Map((after.notes ?? []).map((note) => [note.id, note]))
  for (const [id, note] of newNotes) {
    const was = oldNotes.get(id)
    if (!was) {
      changes.push({ kind: 'note-added', text: note.text })
      gone.add(noteNodeId(id))
    } else if (was.text !== note.text) changes.push({ kind: 'note-text', before: was.text, after: note.text })
  }
  for (const [id, note] of oldNotes) {
    if (!newNotes.has(id)) {
      changes.push({ kind: 'note-removed', text: note.text })
      gone.add(noteNodeId(id))
    }
  }

  const oldActions = new Map((before.actions ?? []).map((action) => [action.id, action]))
  const newActions = new Map((after.actions ?? []).map((action) => [action.id, action]))
  for (const [id, action] of newActions) {
    const was = oldActions.get(id)
    if (!was) {
      changes.push({ kind: 'action-added', text: actionText(action) })
      gone.add(actionNodeId(id))
    } else if (was.channel !== action.channel || was.prompt !== action.prompt) {
      changes.push({ kind: 'action-changed', before: actionText(was), after: actionText(action) })
    }
  }
  for (const [id, action] of oldActions) {
    if (!newActions.has(id)) {
      changes.push({ kind: 'action-removed', text: actionText(action) })
      gone.add(actionNodeId(id))
    }
  }

  // Built-in steps taken off the canvas, or put back: by their skill, like a custom one.
  const wasRemoved = new Set(before.removed ?? [])
  const isRemoved = new Set(after.removed ?? [])
  for (const id of isRemoved) if (!wasRemoved.has(id)) { changes.push({ kind: 'step-removed', node: skillOfNode(id) }); gone.add(id) }
  for (const id of wasRemoved) if (!isRemoved.has(id)) { changes.push({ kind: 'step-added', node: skillOfNode(id) }); gone.add(id) }

  const oldFrames = new Map((before.frames ?? []).map((frame) => [frame.id, frame]))
  const newFrames = new Map((after.frames ?? []).map((frame) => [frame.id, frame]))
  for (const [id, frame] of newFrames) {
    const was = oldFrames.get(id)
    if (!was) changes.push({ kind: 'frame-added', title: frame.title })
    else if (was.title !== frame.title) changes.push({ kind: 'frame-title', before: was.title, after: frame.title })
  }
  for (const [id, frame] of oldFrames) if (!newFrames.has(id)) changes.push({ kind: 'frame-removed', title: frame.title })

  const firstLine = (text: string) => text.split('\n')[0].slice(0, 60)
  const oldStickies = new Map((before.stickies ?? []).map((sticky) => [sticky.id, sticky]))
  const newStickies = new Map((after.stickies ?? []).map((sticky) => [sticky.id, sticky]))
  for (const [id, sticky] of newStickies) {
    const was = oldStickies.get(id)
    if (!was) changes.push({ kind: 'sticky-added' })
    else if (was.text !== sticky.text) changes.push({ kind: 'sticky-text', text: firstLine(sticky.text) })
  }
  for (const [id, sticky] of oldStickies) if (!newStickies.has(id)) changes.push({ kind: 'sticky-removed', text: firstLine(sticky.text) })

  const wasOff = new Set(before.disabled ?? [])
  const isOff = new Set(after.disabled ?? [])
  for (const id of isOff) if (!wasOff.has(id) && !gone.has(id)) changes.push({ kind: 'step-enabled', node: skillOfNode(id), enabled: false })
  for (const id of wasOff) if (!isOff.has(id) && !gone.has(id)) changes.push({ kind: 'step-enabled', node: skillOfNode(id), enabled: true })

  const touchesGone = (link: Pick<WorkflowOverlayLink, 'from' | 'to'>) => gone.has(link.from) || gone.has(link.to)
  // One link per outcome: two outcomes leading to the same step are two links. A pair
  // linked once before and once after, on another outcome, is that link given an outcome.
  const keyOf = (link: WorkflowOverlayLink) => `${linkKey(link.from, link.to)}|${linkOutcomesOf(link).join(',')}`
  const oldLinks = new Map(before.links.map((link) => [keyOf(link), link]))
  const newLinks = new Map(after.links.map((link) => [keyOf(link), link]))
  const added = [...newLinks].filter(([key, link]) => !oldLinks.has(key) && !touchesGone(link)).map(([, link]) => link)
  const dropped = [...oldLinks].filter(([key, link]) => !newLinks.has(key) && !touchesGone(link)).map(([, link]) => link)
  const samePair = (a: WorkflowOverlayLink, b: WorkflowOverlayLink) => a.from === b.from && a.to === b.to
  const rekeyed = new Set<WorkflowOverlayLink>()
  for (const [key, link] of newLinks) {
    const ends = { from: endOf(link.from), to: endOf(link.to) }
    const was = oldLinks.get(key)
    if (was) {
      if (was.kind !== link.kind) changes.push({ kind: 'link-kind', ...ends, linkKind: link.kind })
      continue
    }
    if (touchesGone(link)) continue
    const from = dropped.filter((other) => samePair(other, link))
    if (from.length === 1 && added.filter((other) => samePair(other, link)).length === 1) {
      rekeyed.add(from[0])
      if (from[0].kind !== link.kind) changes.push({ kind: 'link-kind', ...ends, linkKind: link.kind })
      const outcome = linkOutcomesOf(link).join(', ')
      changes.push({ kind: 'link-outcome', ...ends, ...(outcome ? { outcome } : {}) })
      continue
    }
    changes.push({ kind: 'link-added', ...ends, linkKind: link.kind })
  }
  for (const link of dropped) {
    if (!rekeyed.has(link)) changes.push({ kind: 'link-removed', from: endOf(link.from), to: endOf(link.to) })
  }

  // Default links taken off, or back, when not with a step that came or went.
  const linksWere = new Set(before.removedLinks ?? [])
  const linksAre = new Set(after.removedLinks ?? [])
  const defaultEnds = (key: string) => {
    const [from, to] = key.split('>')
    return { from, to }
  }
  for (const key of linksAre) {
    const ends = defaultEnds(key)
    if (!linksWere.has(key) && !touchesGone(ends)) changes.push({ kind: 'link-removed', from: skillOfNode(ends.from), to: skillOfNode(ends.to) })
  }
  for (const key of linksWere) {
    const ends = defaultEnds(key)
    const kind = DEFAULT_LINKS.find((link) => linkKey(link.from, link.to) === key)?.kind
    if (!linksAre.has(key) && !touchesGone(ends) && kind) changes.push({ kind: 'link-added', from: skillOfNode(ends.from), to: skillOfNode(ends.to), linkKind: kind })
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
