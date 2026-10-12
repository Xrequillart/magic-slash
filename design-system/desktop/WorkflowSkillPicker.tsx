import { useEffect, useState } from 'react'
import { Menu, type MenuGroup, type MenuItem } from './Menu'
import { ChevronLeft, FolderGit2, Plus, Puzzle, Slack, Sparkles, StickyNote } from './icons'
import { skillIcon } from './skillIcons'
import type { IconComponent } from './types'

/**
 * WHAT A "+" ON THE CANVAS ADDS: the menu the workflow editor drops from it.
 *
 * TWO LEVELS. The first chooses the KIND of card, each row saying what it is for: an end
 * note, a Slack action, or a skill. An end note and an action are added as soon as they are
 * picked. "Skills" opens the second level instead, the skills a step may run, with a row
 * back at its top. Every opening starts on the first level.
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
 * NO SKILL TO OFFER, the skills level's header says so (`labels.empty`) and there are no rows. A disabled row
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
  /** The menu's accessible name and its header: "Add to the workflow". */
  title: string
  /** The skills level's header's second line when there is no skill to offer. */
  empty: string
  /** The quiet note on a skill already in the workflow: "In the workflow". */
  inWorkflow: string
  /** Each group's heading on the skills level. The built-in group is not drawn without its own. */
  sources: Record<Exclude<WorkflowSkillSource, 'builtin'>, string> & { builtin?: string }
  /** The first level's skills row, and what it says it is for: it opens the skills level. */
  skills: string
  skillsDescription: string
  /** The row back to the first level, at the top of the skills level: "Back". */
  back: string
  /** The row that adds an end note, and what it is for. Not drawn without `onPickNote`. */
  note?: string
  noteDescription?: string
  /** The row that adds a Slack action, and what it is for. Not drawn without `onPickAction`. */
  action?: string
  actionDescription?: string
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
  /** The Slack action row was picked. Without it, no such row. */
  onPickAction?: () => void
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

/** Wide enough for a plugin's `name:skill` and the note beside it, and for a description on two lines. */
const WIDTH = 300

/** The first level's rows' ids: no skill is called that, since a skill name has no space. */
const NOTE_ROW = 'end note'
const ACTION_ROW = 'slack action'
const SKILLS_ROW = 'skills level'
const BACK_ROW = 'back to kinds'

export function WorkflowSkillPicker({ open, onClose, anchor, skills, onPick, onPickNote, onPickAction, labels, portalTo }: WorkflowSkillPickerProps) {
  const [level, setLevel] = useState<'kinds' | 'skills'>('kinds')
  // Every opening starts on the first level, wherever the last one was left.
  useEffect(() => {
    if (!open) setLevel('kinds')
  }, [open])

  const kinds: MenuGroup[] = [{
    items: [
      ...(onPickNote && labels.note ? [{ id: NOTE_ROW, label: labels.note, icon: StickyNote, description: labels.noteDescription }] : []),
      ...(onPickAction && labels.action ? [{ id: ACTION_ROW, label: labels.action, icon: Slack, description: labels.actionDescription }] : []),
      { id: SKILLS_ROW, label: labels.skills, icon: Sparkles, description: labels.skillsDescription, submenu: true },
    ],
  }]

  const skillGroups: MenuGroup[] = [
    { items: [{ id: BACK_ROW, label: labels.back, icon: ChevronLeft, keepOpen: true }] },
    ...SOURCES.map((source) => ({
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
    })).filter((group) => group.items.length > 0 && group.label !== undefined),
  ]

  const onSelect = (item: MenuItem) => {
    if (item.id === SKILLS_ROW) setLevel('skills')
    else if (item.id === BACK_ROW) setLevel('kinds')
    else if (item.id === NOTE_ROW) onPickNote?.()
    else if (item.id === ACTION_ROW) onPickAction?.()
    else onPick(item.id)
  }

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchor={anchor}
      label={labels.title}
      header={level === 'kinds'
        ? { title: labels.title, icon: Plus }
        : { title: labels.skills, subtitle: skills.length === 0 ? labels.empty : undefined, icon: Sparkles }}
      groups={level === 'kinds' ? kinds : skillGroups}
      onSelect={onSelect}
      width={WIDTH}
      portalTo={portalTo}
    />
  )
}
