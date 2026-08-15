import { useEffect, useState } from 'react'
import { showToast } from '../../components/Toast'
import { Switch } from '../../components/Switch'

/**
 * One labelled switch: title, help line, switch on the right.
 *
 * Shared rather than re-written per tab because settings rows have to line up
 * across a card — same label size, same help line, same switch position whatever
 * the label's length — and every page that stacks two of them was reproducing
 * the same markup and the same optimistic-write dance.
 *
 * Optimistic, like every other toggle in Settings: the switch moves first and
 * reverts if the write fails, because the visible result of a successful one
 * happens elsewhere (another process, another pane, the OS).
 */
export function ToggleRow({
  label,
  help,
  value,
  onChange,
  errorMessage,
  disabled,
  trailing,
}: {
  label: string
  help: string
  /** The stored flag. `undefined` = never chosen, which reads as ON. */
  value: boolean | undefined
  onChange: (next: boolean) => Promise<unknown>
  errorMessage: string
  /** Rendered inert and dimmed — for a row a master switch has switched off. */
  disabled?: boolean
  /** Extra control left of the switch. Receives the row's current state. */
  trailing?: (enabled: boolean) => React.ReactNode
}) {
  const [enabled, setEnabled] = useState(value ?? true)

  useEffect(() => {
    if (value !== undefined) setEnabled(value)
  }, [value])

  const toggle = async () => {
    const next = !enabled
    setEnabled(next)
    try {
      await onChange(next)
    } catch (error) {
      setEnabled(!next)
      showToast(error instanceof Error ? error.message : errorMessage, 'error')
    }
  }

  return (
    <div className={`flex items-center justify-between gap-6 transition-opacity ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      {/* min-w-0 so a long help line wraps instead of pushing the controls off
          the card — a row may carry more than one of them. */}
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <p className="text-xs text-text-secondary/50 mt-0.5">{help}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {trailing?.(enabled)}
        <Switch checked={enabled} onChange={toggle} label={label} disabled={disabled} />
      </div>
    </div>
  )
}
