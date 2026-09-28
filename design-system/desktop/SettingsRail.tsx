import { MenuSidebarItem } from './MenuSidebarItem'
import { SETTINGS_RAIL_WIDTH } from './modalSizes'
import type { IconComponent } from './types'

/**
 * The settings window's left column: every page of it, in runs separated by air.
 *
 * IT REPLACED TWO TAB STRIPS. Account and Settings were two overlays with a `TabStrip`
 * each in the header, split along the line the title bar draws — who the app is signed
 * in as, and what it does. Ten pages across two windows meant a reader looking for the
 * language had to know which of the two controls it lived behind first. One window with
 * all ten down the side answers that by showing them.
 *
 * EACH RUN WEARS A CAPTION, in the sidebar's own voice: the small uppercase word the
 * app's left column puts over its agents ("AGENTS"), at the same size, tone and
 * tracking, so the two columns of the app name their lists the same way. The caption
 * is optional per run, and the gap between runs stays either way — it is what says they
 * are different kinds of thing; the word says which.
 *
 * `SkillsRail`'s column — the width and the sunken ground — because the two are the same
 * object in two windows: a list on the left, the page it picks on the right. A reader who
 * has learnt one has learnt the other.
 *
 * NO RULE ON THE RIGHT, on either rail. The sunken ground already says where the column
 * ends, and a hairline beside a tint is a second answer to the same question — the
 * reason `TabStrip`'s track lost its border.
 *
 * ITEMS AND NOT CHILDREN, `MenuSidebar`'s rule: every row is the same row, and a list
 * whose contents arrive as nodes cannot promise that.
 */

export interface SettingsRailRow {
  /** Stable identity, and what `onSelect` reports back. */
  key: string
  /** Translated. */
  label: string
  /** From `@ds/desktop/icons`. */
  icon?: IconComponent
}

export interface SettingsRailGroup {
  /** Stable identity for the run. */
  id: string
  /** The caption over the run, translated. Drawn uppercase; absent, the run has none. */
  label?: string
  rows: SettingsRailRow[]
}

export interface SettingsRailProps {
  /** The runs, in order. A run is drawn as one block; the gap between two is the grouping. */
  groups: SettingsRailGroup[]
  /** The page in force. Controlled — the caller holds which page is open. */
  activeKey: string
  onSelect: (key: string) => void
  /** Names the landmark for a screen reader, translated. */
  ariaLabel: string
  /**
   * Extra room above the first run, in px — the traffic lights' band when the window is
   * full screen and the rail reaches the panel's top edge. Set by `PageModal`, which is
   * the one that knows whether the lights are there.
   */
  topInset?: number
  /** Placement only. */
  className?: string
}

export function SettingsRail({ groups, activeKey, onSelect, ariaLabel, topInset, className = '' }: SettingsRailProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className={`shrink-0 overflow-y-auto bg-surface-sunken-soft px-2 py-3 ${className}`.trim()}
      style={{ width: SETTINGS_RAIL_WIDTH, ...(topInset ? { paddingTop: topInset } : {}) }}
    >
      {groups.map(({ id, label, rows }, index) => (
        <div key={id} role="group" aria-label={label} className={`flex flex-col gap-0.5 ${index === 0 ? '' : 'mt-4'}`}>
          {/* The sidebar's list caption, to the class: `pl-2` puts the word on the same
              line as the rows' own icons, which sit at `px-2` inside this `px-2` column. */}
          {label && (
            <div aria-hidden className="pl-2 pt-1 pb-1.5 text-xs text-text-secondary/50 uppercase tracking-wider">
              {label}
            </div>
          )}
          {rows.map((row) => (
            <MenuSidebarItem
              key={row.key}
              label={row.label}
              icon={row.icon}
              active={row.key === activeKey}
              onClick={() => onSelect(row.key)}
            />
          ))}
        </div>
      ))}
    </nav>
  )
}
