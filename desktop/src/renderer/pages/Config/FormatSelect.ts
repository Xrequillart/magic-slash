import { useEffect, useState } from 'react'
import type { SettingRowControl } from '@ds/desktop'
import { showToast } from '../../components/Toast'
import { useT } from '../../i18n'

interface FormatSelectProps {
  /** The stored flag. `undefined` = never chosen, which reads as expanded. */
  minimized: boolean | undefined
  onChange: (minimized: boolean) => Promise<unknown>
  ariaLabel: string
  errorMessage?: string
}

/**
 * Expanded or compact, for one card.
 *
 * The same value the card's own ± button writes, so the two never disagree: pick
 * "Compact" here and the card in the sidebar collapses; collapse it there and this
 * follows.
 *
 * A HOOK AND NOT A COMPONENT, which is the shape `SettingRow` asks for: that row draws
 * its own controls, at its own rung, and takes them as DATA rather than as nodes — a
 * node arrives with a size the call site has already decided, which is the whole thing
 * the row exists to stop. So what is this app's stays here (the optimistic write, the
 * toast, the two words) and what comes out is a control the row can draw.
 */
export function useFormatSelect({ minimized, onChange, ariaLabel, errorMessage }: FormatSelectProps): SettingRowControl {
  const t = useT()
  const [value, setValue] = useState(minimized === true)

  useEffect(() => {
    setValue(minimized === true)
  }, [minimized])

  const choose = async (next: boolean) => {
    setValue(next)
    try {
      await onChange(next)
    } catch (error) {
      setValue(!next)
      showToast(error instanceof Error ? error.message : errorMessage ?? '', 'error')
    }
  }

  return {
    kind: 'select',
    value: value ? 'minimized' : 'full',
    options: [
      { value: 'full', label: t('settings.appearance.sidebars.format.full') },
      { value: 'minimized', label: t('settings.appearance.sidebars.format.minimized') },
    ],
    onChange: (next) => choose(next === 'minimized'),
    ariaLabel,
    width: 128,
  }
}
