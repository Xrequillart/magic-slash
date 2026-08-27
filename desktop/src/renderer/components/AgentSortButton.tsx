import { useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Activity, ArrowDownUp, Check, Clock, FolderGit2 } from 'lucide-react'
import { useAnchoredPanel } from './useAnchoredPanel'
import { useConfig } from '../hooks/useConfig'
import { useT } from '../i18n'
import type { MessageKey } from '../i18n'
import { AGENT_SORT_MODES, DEFAULT_AGENT_SORT, type AgentSortMode } from '../../types'

// Catalogue keys, not labels — same reason as ROLE_OPTIONS and THEMES: module scope is
// evaluated once at import, so a literal would freeze at the boot language.
const SORT_OPTIONS: Record<AgentSortMode, { labelKey: MessageKey; descriptionKey: MessageKey; icon: typeof Clock }> = {
  recent: { labelKey: 'sidebar.sort.recent', descriptionKey: 'sidebar.sort.recent.help', icon: Clock },
  status: { labelKey: 'sidebar.sort.status', descriptionKey: 'sidebar.sort.status.help', icon: Activity },
  repository: { labelKey: 'sidebar.sort.repository', descriptionKey: 'sidebar.sort.repository.help', icon: FolderGit2 },
}

/**
 * A number rather than a Tailwind width, because `useAnchoredPanel` measures with it.
 * Wider than the 230px sidebar on purpose: the panel is portalled to <body> and only
 * anchored to the trigger, so it is free to be readable rather than to fit the column
 * it is opened from.
 */
const PANEL_WIDTH = 248

/**
 * How the agent list is ordered, picked from the AGENTS header — immediately left of
 * the button that adds to that list, because both act on the list beside them.
 *
 * Icon only, like its neighbour: at 230px a label costs more width than it explains,
 * so the affordance is the icon and the wording lives in the title/aria-label and in
 * the panel itself. The panel is portalled and positioned `fixed` for the reason
 * `useAnchoredPanel` gives — inline it would be clipped by the scrolling `<nav>` the
 * header sits in.
 *
 * The choice is written to the cloud config, so it follows the account rather than the
 * window: the same person's other machine opens on the order they left.
 */
export function AgentSortButton() {
  const t = useT()
  const { config, updateAgentSort } = useConfig()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const { triggerRef, panelRef, style } = useAnchoredPanel(open, close, PANEL_WIDTH)

  const current = config?.agentSort ?? DEFAULT_AGENT_SORT

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={t('sidebar.sort.title', { mode: t(SORT_OPTIONS[current].labelKey) })}
        aria-label={t('sidebar.sort.title', { mode: t(SORT_OPTIONS[current].labelKey) })}
        // Tinted once the order is no longer the default one, so a list that is not in
        // the order it was learned in says so from the header rather than only from its
        // contents.
        className={`p-1.5 rounded transition-all flex-shrink-0 ${
          open || current !== DEFAULT_AGENT_SORT
            ? 'text-accent bg-accent/10 hover:bg-accent/20'
            : 'text-icon hover:bg-text-secondary/10 hover:text-ink'
        }`}
      >
        <ArrowDownUp className="w-4 h-4" />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={style()}
          className="bg-bg-secondary border border-line rounded-xl shadow-2xl overflow-hidden z-[60]"
        >
          {AGENT_SORT_MODES.map((mode) => {
            const option = SORT_OPTIONS[mode]
            const Icon = option.icon
            const isSelected = mode === current
            return (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setOpen(false)
                  // Writing the mode already in force would be a round trip to the cloud
                  // for nothing, and a config broadcast to every other window with it.
                  if (!isSelected) updateAgentSort(mode)
                }}
                className={`w-full flex items-start gap-2 px-3 py-2 text-left transition-colors ${
                  isSelected ? 'bg-surface' : 'hover:bg-surface'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-accent' : 'text-text-secondary/60'}`} />
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-ink'}`}>{t(option.labelKey)}</div>
                  <div className="text-[11px] text-text-secondary/50 mt-0.5">{t(option.descriptionKey)}</div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />}
              </button>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
