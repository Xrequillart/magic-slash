import { useEffect, useRef } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { FolderGit2, LayoutGrid, Plus } from './icons'
import { Label } from './Label'
import { MenuSidebarItem } from './MenuSidebarItem'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * THE SKILLS PAGE'S LEFT RAIL: every skill the machine can reach, grouped by where it
 * comes from, with "All skills" above them as a destination of its own.
 *
 * IT WAS `SkillsRail` IN `pages/Skills/index.tsx`, and it moved here for `TaskBoard`'s
 * reason: the site draws this window on `/features`, and a drawing that re-spells the rail
 * is a drawing that drifts from it one commit at a time. Both now render this file.
 *
 * WHAT IT HOLDS NOTHING OF is what a row MEANS. Which skills are built in, which are the
 * reader's, which repository carries which: the app's vocabulary, arriving as `groups`.
 * A row is a KEY, and `onSelect` hands it back — the app turns it into its hash route.
 *
 * EVERY ROW IS A `MenuSidebarItem`, the component the app's own sidebar is built from, and
 * A REPOSITORY GROUP IS HEADED BY A `Label` in the repository's hue: a name on a plate is
 * what a repository has instead of a glyph, and the overview beside the rail draws the
 * same object one rung larger.
 */

/** One row: a skill. */
export interface SkillsRailRow {
  /** What `onSelect` hands back, and what `activeKey` is compared with. */
  key: string
  /** The skill's name, as its `SKILL.md` declares it. Capitalised by the rail. */
  label: string
  /** The skill's own picture. `src: null` draws the fallback tile. */
  thumb?: { src: string | null; alt: string }
  /** A glyph instead of a picture — a repository skill has no image of its own. */
  icon?: IconComponent
}

/** One group of rows, under a quiet caps heading. */
export interface SkillsRailGroup {
  id: string
  /** The heading's words, or a repository's name when `repoColor` is set. */
  label: string
  /** The glyph before the heading. Ignored on a repository group, which is a `Label`. */
  icon?: IconComponent
  /**
   * SET, AND THE GROUP IS A REPOSITORY: its heading becomes a `Label` in this colour, with
   * the folder mark, instead of caps beside a glyph. A CSS value.
   */
  repoColor?: string
  rows: SkillsRailRow[]
  /** The sentence drawn when `rows` is empty. Absent draws nothing at all. */
  empty?: string
  /** A control at the right of the heading — the custom group's "new skill". */
  action?: { icon?: IconComponent; title: string; onClick: () => void }
  /**
   * A row that reports rather than navigates: the skill being written, which has no route
   * to go to yet. Drawn lit, after the rows. A `MenuSidebarItem` with a no-op click would be
   * a control that lies about being one.
   */
  draft?: string
}

export interface SkillsRailProps {
  /** "All skills", the overview. Its key is `overviewKey`. */
  overviewLabel: string
  overviewKey?: string
  groups: SkillsRailGroup[]
  activeKey: string
  onSelect: (key: string) => void
  /** The `<nav>`'s name. */
  ariaLabel: string
  className?: string
}

export function SkillsRail({
  overviewLabel,
  overviewKey = 'all',
  groups,
  activeKey,
  onSelect,
  ariaLabel,
  className = '',
}: SkillsRailProps) {
  // The active row can sit far down a long rail — a skill opened from the list would
  // otherwise be selected off-screen.
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [activeKey])

  return (
    <div className={`w-56 shrink-0 flex flex-col border-r border-line-field bg-surface-sunken-soft ${className}`.trim()}>
      <div className="px-2 pt-3 pb-1 border-b border-line-field">
        <MenuSidebarItem
          label={overviewLabel}
          icon={LayoutGrid}
          active={activeKey === overviewKey}
          onClick={() => onSelect(overviewKey)}
          className="mb-2"
        />
      </div>

      {/* No `space-y` here: its `> * + *` rule outranks a plain `mt-*` class, so it would
          flatten every group header's separation back to 2px. */}
      <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label={ariaLabel}>
        {groups.map((group, index) => (
          <div key={group.id}>
            <GroupHeader group={group} first={index === 0} />
            {group.rows.length === 0 && group.empty && (
              <Text size="xs" tone="secondary" className="block px-2.5 py-1 opacity-40">
                {group.empty}
              </Text>
            )}
            {group.rows.map((row) => {
              const isActive = activeKey === row.key
              // Wrapped ONLY to carry the scroll ref: `MenuSidebarItem` forwards none.
              return (
                <div key={row.key} ref={isActive ? activeRef : undefined}>
                  <MenuSidebarItem
                    label={row.label}
                    active={isActive}
                    onClick={() => onSelect(row.key)}
                    className="capitalize"
                    {...(row.thumb ? { thumb: row.thumb } : {})}
                    {...(row.icon ? { icon: row.icon } : {})}
                  />
                </div>
              )
            })}
            {group.draft && (
              <div className="w-full flex items-center gap-2 px-2 py-2 rounded-lg bg-accent/15 text-ink text-xs font-medium">
                <Icon glyph={Plus} tone="inherit" className="flex-shrink-0" />
                <Text tone="inherit" className="truncate">{group.draft}</Text>
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  )
}

/**
 * A group heading. NOT A `SectionHeader`: that is 14px beside a 16px glyph, the scale of a
 * heading over a page's section; this is the quiet 11px caps of a rail, under which the
 * rows are the content — the rung that keeps 40 rows readable in 224px.
 *
 * `first` rather than a `first:` variant, so the top group opens at `mt-3` and every one
 * after it at `mt-7` whatever wraps them.
 */
function GroupHeader({ group, first }: { group: SkillsRailGroup; first: boolean }) {
  const count = (
    <Text size="2xs" tone="inherit" className="flex-shrink-0 opacity-60">
      {String(group.rows.length)}
    </Text>
  )

  if (group.repoColor) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 mb-1.5 ${first ? 'mt-3' : 'mt-7'} text-text-secondary/50`}>
        <Label size="xs" icon={FolderGit2} color={group.repoColor} truncate title={group.label}>
          {group.label}
        </Label>
        {count}
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 mb-1.5 ${first ? 'mt-3' : 'mt-7'} text-text-secondary/50`}>
      {group.icon && <Icon glyph={group.icon} size="2xs" tone="inherit" />}
      <Text size="2xs" tone="inherit" className="truncate uppercase tracking-wider">
        {group.label}
      </Text>
      {count}
      {group.action && (
        <span className="ml-auto flex items-center">
          {/* `neutral` and not `ghost`: a group header is bare ground, where a plateless
              control is a control with nothing to say it is one until the pointer
              arrives. `sm`, because it is the one thing in the rail somebody comes looking
              for rather than reads past. */}
          <ButtonIcon
            icon={group.action.icon ?? Plus}
            title={group.action.title}
            size="sm"
            tone="neutral"
            onClick={group.action.onClick}
          />
        </span>
      )}
    </div>
  )
}
