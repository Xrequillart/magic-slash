import { useCallback } from 'react'
import { Activity, ArrowDownUp, Clock, FolderGit2 } from '@ds/desktop/icons'
import type { SelectIconItem, SidebarSelectAction } from '@ds/desktop'
import { useConfig } from '../hooks/useConfig'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { AGENT_SORT_MODES, DEFAULT_AGENT_SORT, isValidAgentSort, type AgentSortMode } from '../../types'

// Catalogue keys, not labels — same reason as ROLE_OPTIONS and THEMES: module scope is
// evaluated once at import, so a literal would freeze at the boot language.
//
// ONE MARK PER MODE, and they are the rows' own rather than the trigger's: the three
// options are three KINDS of order — a clock, a pulse, a repository — and repeating
// the sort glyph on all three would say they do the same thing.
const SORT_OPTIONS: Record<AgentSortMode, { labelKey: MessageKey; icon: typeof Clock }> = {
  recent: { labelKey: 'sidebar.sort.recent', icon: Clock },
  status: { labelKey: 'sidebar.sort.status', icon: Activity },
  repository: { labelKey: 'sidebar.sort.repository', icon: FolderGit2 },
}

/**
 * How the agent list is ordered, picked from the AGENTS header — immediately left of
 * the button that adds to that list, because both act on the list beside them.
 *
 * A SELECT AND NOT A BUTTON. It was a `ButtonIcon` with a panel this file drew,
 * positioned and portalled by hand: some seventy lines of markup, a `useAnchoredPanel`
 * call, and a `ref` travelling inside the action so the column's button could be found
 * again. All of it is `SelectIcon` now — the chevron that says the mark opens a list
 * before anyone presses it, the panel, the portal, the flip when the room below runs
 * out, and the dismissal rules.
 *
 * A HOOK AND NOT A COMPONENT, for the reason `useAccountMenuEntry` is one: `Sidebar`
 * draws its own header controls, so what this hands over is an ACTION — everything the
 * column needs to draw the select — rather than a control of its own.
 *
 * NO DESCRIPTIONS UNDER THE OPTIONS. The three labels say what they do ("Newest
 * first", "By status", "By repository"), and a menu opened from a 230px column is
 * read in a glance rather than studied; the check says which one is in force.
 *
 * The choice is written to the cloud config, so it follows the account rather than the
 * window: the same person's other machine opens on the order they left.
 */
export function useAgentSortAction(): SidebarSelectAction {
  const t = useT()
  const { config, updateAgentSort } = useConfig()

  const current = config?.agentSort ?? DEFAULT_AGENT_SORT

  // The row's id IS the mode — the menu has one group and three fixed rows, so there
  // is nothing to disambiguate the way the scripts menu's index pairs are. Guarded on
  // the way back all the same: `onSelect` hands over a string, and the type is what
  // says this one is still a sort mode.
  const handleSelect = useCallback((item: SelectIconItem) => {
    if (!isValidAgentSort(item.id)) return
    // Writing the mode already in force would be a round trip to the cloud for
    // nothing, and a config broadcast to every other window with it.
    if (item.id !== current) updateAgentSort(item.id)
  }, [current, updateAgentSort])

  return {
    id: 'sort',
    icon: ArrowDownUp,
    // NARROWER THAN A SCRIPTS MENU, and it is the rows that decide: three short
    // phrases and no trailing hint, where a script row carries its command as well.
    // The default 280 beside a 230px column reads as a panel that overhangs the very
    // list it belongs to; 190 sits well inside it.
    //
    // THE LABELS WERE CUT TO FIT IT, not truncated by it: `sidebar.sort.recent` read
    // "Du plus récent au plus ancien" in French and is "Plus récent" now. A width is
    // only honest if the longest row still reads whole at it — the row in force
    // carries a check as well, and that is the one with the least room.
    panelWidth: 190,
    title: t('sidebar.sort.title', { mode: t(SORT_OPTIONS[current].labelKey) }),
    groups: [{
      label: t('sidebar.sort.group'),
      items: AGENT_SORT_MODES.map((mode) => ({
        id: mode,
        label: t(SORT_OPTIONS[mode].labelKey),
        icon: SORT_OPTIONS[mode].icon,
        selected: mode === current,
      })),
    }],
    onSelect: handleSelect,
  }
}
