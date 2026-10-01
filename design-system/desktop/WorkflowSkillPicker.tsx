import { Menu, type MenuGroup, type MenuItem } from './Menu'
import { FolderGit2, Plus, Puzzle, Sparkles, StickyNote } from './icons'
import { skillIcon } from './skillIcons'
import type { IconComponent } from './types'

/**
 * WHICH SKILL A NEW STEP RUNS: the menu the workflow editor drops from a "+" on the
 * canvas.
 *
 * `Menu` underneath, so it is anchored, portalled, flips, and closes on Escape, an
 * outside press, a scroll or a pick, exactly like every other menu in the app. The caller
 * owns `open` and hands over the element to hang from: the "+" the canvas passes back to
 * `onInsert`.
 *
 * GROUPED BY WHERE THE SKILL COMES FROM, in a fixed order: the built-in steps (the product's
 * own, each with its glyph, offered once taken off the canvas), the user's own skills, then
 * the repository's, then the plugins'. A group with nothing in it is not drawn. Within a
 * group, the order given.
 *
 * A SKILL ALREADY IN THE WORKFLOW IS SHOWN AND GREYED, with `labels.inWorkflow` as its
 * quiet note, rather than left out. A list that silently lost the one skill the user came
 * for would read as the skill being missing, not as it being used already. `disabled` is
 * the caller's: this component does not know the line.
 *
 * EMPTY, the header says so (`labels.empty`) and there are no rows. A disabled row
 * reading "No skills" would be a choice that refuses, where there is no choice at all.
 */

export type WorkflowSkillSource = 'builtin' | 'custom' | 'repo' | 'plugin'

/** One skill a step may run. Shared with `WorkflowInspector`, whose picker lists the same. */
export interface WorkflowSkillOption {
  /** The skill's name as the skills spell it: `lint`, `plugin:x`. What `onPick` hands back. */
  name: string
  source: WorkflowSkillSource
  /** What the row reads, when not the name: a built-in step's display name ("Commit"). */
  label?: string
  /** Already on the line: drawn greyed, and it cannot be picked. */
  disabled?: boolean
}

export interface WorkflowSkillPickerLabels {
  /** The menu's accessible name and its header: "Add a step". */
  title: string
  /** The header's second line when there is no skill to offer. */
  empty: string
  /** The quiet note on a skill already in the workflow: "In the workflow". */
  inWorkflow: string
  /** Each group's heading. The built-in group is not drawn without its own. */
  sources: Record<Exclude<WorkflowSkillSource, 'builtin'>, string> & { builtin?: string }
  /** The row that adds an end note instead of a step, and its quiet hint. Not drawn without `onPickNote`. */
  note?: string
  noteHint?: string
}

export interface WorkflowSkillPickerProps {
  open: boolean
  onClose: () => void
  /** The element the menu hangs from: the "+" pressed. Null while there is none. */
  anchor: HTMLElement | null
  skills: WorkflowSkillOption[]
  onPick: (name: string) => void
  /** The end note row was picked. Without it, the menu offers skills only. */
  onPickNote?: () => void
  labels: WorkflowSkillPickerLabels
  /** Where to portal. `document.body` unless the theme is scoped, see `Menu`. */
  portalTo?: HTMLElement | null
}

/** The groups' order, and the mark each row wears. */
const SOURCES: WorkflowSkillSource[] = ['builtin', 'custom', 'repo', 'plugin']
const SOURCE_ICONS: Record<Exclude<WorkflowSkillSource, 'builtin'>, IconComponent> = {
  custom: Sparkles,
  repo: FolderGit2,
  plugin: Puzzle,
}

/** Wide enough for a plugin's `name:skill` and the note beside it. */
const WIDTH = 280

/** The end note row's id: no skill is called that, since a skill name has no space. */
const NOTE_ROW = 'end note'

export function WorkflowSkillPicker({ open, onClose, anchor, skills, onPick, onPickNote, labels, portalTo }: WorkflowSkillPickerProps) {
  // First, and on its own: a note is not a skill, and is always there to add.
  const noteGroup: MenuGroup[] = onPickNote && labels.note
    ? [{ items: [{ id: NOTE_ROW, label: labels.note, icon: StickyNote, hint: labels.noteHint }] }]
    : []
  const groups: MenuGroup[] = [...noteGroup, ...SOURCES.map((source) => ({
    label: labels.sources[source],
    items: skills
      .filter((skill) => skill.source === source)
      .map((skill): MenuItem => ({
        id: skill.name,
        label: skill.label ?? skill.name,
        icon: source === 'builtin' ? skillIcon(skill.name) : SOURCE_ICONS[source],
        disabled: skill.disabled,
        hint: skill.disabled ? labels.inWorkflow : undefined,
      })),
  })).filter((group) => group.items.length > 0 && group.label !== undefined)]

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchor={anchor}
      label={labels.title}
      header={{ title: labels.title, subtitle: skills.length === 0 ? labels.empty : undefined, icon: Plus }}
      groups={groups}
      onSelect={(item) => (item.id === NOTE_ROW ? onPickNote?.() : onPick(item.id))}
      width={WIDTH}
      portalTo={portalTo}
    />
  )
}
