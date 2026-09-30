import { Menu, type MenuGroup, type MenuItem } from './Menu'
import { FolderGit2, Plus, Puzzle, Sparkles } from './icons'
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
 * GROUPED BY WHERE THE SKILL COMES FROM, in a fixed order: the user's own skills, then the
 * repository's, then the plugins'. A group with nothing in it is not drawn. Within a
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

export type WorkflowSkillSource = 'custom' | 'repo' | 'plugin'

/** One skill a step may run. Shared with `WorkflowInspector`, whose picker lists the same. */
export interface WorkflowSkillOption {
  /** The skill's name as the skills spell it: `lint`, `plugin:x`. What `onPick` hands back. */
  name: string
  source: WorkflowSkillSource
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
  /** Each group's heading. */
  sources: Record<WorkflowSkillSource, string>
}

export interface WorkflowSkillPickerProps {
  open: boolean
  onClose: () => void
  /** The element the menu hangs from: the "+" pressed. Null while there is none. */
  anchor: HTMLElement | null
  skills: WorkflowSkillOption[]
  onPick: (name: string) => void
  labels: WorkflowSkillPickerLabels
  /** Where to portal. `document.body` unless the theme is scoped, see `Menu`. */
  portalTo?: HTMLElement | null
}

/** The groups' order, and the mark each row wears. */
const SOURCES: WorkflowSkillSource[] = ['custom', 'repo', 'plugin']
const SOURCE_ICONS: Record<WorkflowSkillSource, IconComponent> = {
  custom: Sparkles,
  repo: FolderGit2,
  plugin: Puzzle,
}

/** Wide enough for a plugin's `name:skill` and the note beside it. */
const WIDTH = 280

export function WorkflowSkillPicker({ open, onClose, anchor, skills, onPick, labels, portalTo }: WorkflowSkillPickerProps) {
  const groups: MenuGroup[] = SOURCES.map((source) => ({
    label: labels.sources[source],
    items: skills
      .filter((skill) => skill.source === source)
      .map((skill): MenuItem => ({
        id: skill.name,
        label: skill.name,
        icon: SOURCE_ICONS[source],
        disabled: skill.disabled,
        hint: skill.disabled ? labels.inWorkflow : undefined,
      })),
  })).filter((group) => group.items.length > 0)

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchor={anchor}
      label={labels.title}
      header={{ title: labels.title, subtitle: skills.length === 0 ? labels.empty : undefined, icon: Plus }}
      groups={groups}
      onSelect={(item) => onPick(item.id)}
      width={WIDTH}
      portalTo={portalTo}
    />
  )
}
