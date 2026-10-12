import { SquareSplitHorizontal } from '@ds/desktop/icons'
import { SectionHeader, SettingsCard } from '@ds/desktop'
import { useEffect, useState } from 'react'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import { showToast } from '../../components/Toast'
import {
  DEFAULT_SPLIT_NEW_AGENT_PANE, SPLIT_NEW_AGENT_PANES, type SplitNewAgentPane,
} from '../../../types'

// Message keys rather than labels: module scope is evaluated once at import, so a
// literal here would pin the select to the boot language.
const PANE_OPTIONS: Record<SplitNewAgentPane, { labelKey: MessageKey; descriptionKey: MessageKey }> = {
  focused: { labelKey: 'settings.split.newAgentPane.focused', descriptionKey: 'settings.split.newAgentPane.focused.help' },
  left: { labelKey: 'settings.split.newAgentPane.left', descriptionKey: 'settings.split.newAgentPane.left.help' },
  right: { labelKey: 'settings.split.newAgentPane.right', descriptionKey: 'settings.split.newAgentPane.right.help' },
}

/**
 * THE SPLIT VIEW: two agents side by side, each pane with its own list.
 *
 * It was a section of Application, a single switch between the machine setup and Quick
 * Launch. A page of its own because a feature with a page has somewhere to grow, and this
 * one will: see the options on it.
 *
 * THE SWITCH IS THE SPLIT ITSELF, the same value the Control Center's tile carries. There
 * used to be a second, wider switch behind it: that one said the feature was allowed, the
 * tile said the window was in two panes, and both had to be on for anything to happen.
 * Nobody could see why a lit switch did nothing, so the permission went and the state
 * stayed.
 */
export function SplitViewPage() {
  const t = useT()
  const splitActive = useStore((s) => s.splitActive)
  const toggleSplitActive = useStore((s) => s.toggleSplitActive)
  const { config, updateSplitNewAgentPane } = useConfig()

  const stored = config?.splitNewAgentPane ?? DEFAULT_SPLIT_NEW_AGENT_PANE
  const [pane, setPane] = useState<SplitNewAgentPane>(stored)
  useEffect(() => setPane(stored), [stored])

  // Optimistic, then reverted on failure: the shape every write in Settings uses.
  const choosePane = async (next: SplitNewAgentPane) => {
    if (next === pane) return
    const previous = pane
    setPane(next)
    try {
      await updateSplitNewAgentPane(next)
    } catch (error) {
      setPane(previous)
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionHeader icon={SquareSplitHorizontal} title={t('settings.application.split.section')} />
        <SettingsCard
          rows={[
            {
              id: 'split',
              label: t('settings.application.split.label'),
              hint: t('settings.application.split.help'),
              control: {
                kind: 'switch',
                checked: splitActive,
                onChange: () => toggleSplitActive(),
                label: t('settings.application.split.label'),
              },
            },
            // Offered only while the window can split: with one pane there is no side to
            // choose, and the choice stays in the config for when the split comes back.
            splitActive && {
              id: 'splitNewAgentPane',
              label: t('settings.split.newAgentPane.label'),
              hint: t('settings.split.newAgentPane.help'),
              note: t(PANE_OPTIONS[pane].descriptionKey),
              control: {
                kind: 'select' as const,
                value: pane,
                options: SPLIT_NEW_AGENT_PANES.map((id) => ({ value: id, label: t(PANE_OPTIONS[id].labelKey) })),
                onChange: (next: string) => choosePane(next as SplitNewAgentPane),
                ariaLabel: t('settings.split.newAgentPane.label'),
                width: SELECT_WIDTH,
              },
            },
          ]}
        />
      </div>
    </div>
  )
}
