import { useEffect, useState } from 'react'
import { showToast } from '../../components/Toast'
import { SettingRow, type SettingRowControl } from '@ds/desktop'

/**
 * One labelled switch: title, help line, switch on the right.
 *
 * THE DRAWING IS `SettingRow`'S NOW — the design system's, which is the same row the
 * two pickers on the Claude Code tab stand in. This file had the only copy of it for as
 * long as the only settings control was a switch; the moment a select wanted the same
 * arrangement there were two, and they were already a rung apart on the help line.
 *
 * WHAT STAYS IS THE OPTIMISTIC WRITE, and it is the reason this wrapper still exists:
 * the switch moves first and reverts if the write fails, because the visible result of a
 * successful one happens elsewhere — another process, another pane, the OS. That dance
 * is this app's, and every toggle in Settings gets it by reaching for this rather than
 * for the row underneath.
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
  /**
   * An extra control left of the switch, AS DATA. Receives the row's current state,
   * because the one caller offers it only while the row is on: asking how to lay out a
   * panel that is not on screen is a question with no answer.
   *
   * It was a `ReactNode` and could not stay one: `SettingRow` draws its own controls, at
   * its own rung, which is the whole reason it exists — a node would arrive with a size
   * the call site had already decided.
   */
  trailing?: (enabled: boolean) => SettingRowControl | false | undefined
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

  const extra = trailing?.(enabled) || undefined

  return (
    <SettingRow
      label={label}
      hint={help}
      disabled={disabled}
      // The extra control FIRST, where the switch is the row's answer and goes last —
      // which is the order the sidebar rows already read in.
      control={[
        ...(extra ? [extra] : []),
        { kind: 'switch' as const, checked: enabled, onChange: toggle, label, disabled },
      ]}
    />
  )
}
