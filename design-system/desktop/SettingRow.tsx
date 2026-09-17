import { Select, type SelectProps } from './Select'
import { Switch, type SwitchProps } from './Switch'
import { Text } from './Text'

/**
 * ONE SETTING: what it is called, what it does, the control that changes it, and what
 * the current value means.
 *
 * THE MOST REPEATED SHAPE IN THE WHOLE SETTINGS SURFACE, and until now the one with no
 * owner. Application, Appearance, Claude Code and the repository tabs all stack rows of
 * exactly this — a `text-sm font-medium` name over a `text-xs text-text-secondary/50`
 * help line, a control pushed to the right edge, `gap-6` between them — and every one of
 * them spelled it again. `ToggleRow` in the app was the switch-shaped half of it and
 * stands on this now; the select-shaped half was written out four times.
 *
 * ── THE CONTROL IS DATA, NOT A CHILD ──────────────────────────────────────────────
 *
 * `control` is a tagged union and never a node, which is this folder's rule and is what
 * the rule is FOR: a row that took `children` would let each call site decide the
 * control's size, and a settings page whose pickers are 28px on one tab and 32 on the
 * next is exactly what this component exists to stop. A kind and its props go in; the
 * row draws the control and owns where it sits.
 *
 * A NEW KIND IS A NEW MEMBER OF THE UNION, deliberately. The day a row needs a stepper
 * or an input, that is one line here and a compiler error at every call site that has to
 * care — where a `children` slot would have accepted it silently, at whatever size the
 * call site felt like.
 *
 * ── THE NOTE IS UNDER THE ROW, AND IT IS ABOUT THE VALUE ──────────────────────────
 *
 * `hint` says what the SETTING is; `note` says what it is SET TO. "How agents launch"
 * against "Plan mode asks before every edit" — the first is true whatever you pick, the
 * second changes when you pick. They are two lines because they answer two questions,
 * and the app was drawing the second as a loose `<div>` under the card's own `space-y-4`
 * where it read as a third setting with no control.
 */

export type SettingRowControl =
  | ({ kind: 'select' } & SelectProps)
  | ({ kind: 'switch' } & SwitchProps)

export interface SettingRowProps {
  /** The setting's name. Already translated. */
  label: string
  /** What the setting is, quieter, under the name. It wraps. Translated. */
  hint?: string
  /**
   * What the current value MEANS, under the whole row — see the header. Translated, and
   * the caller's to resolve: which option is in force is a lookup this row does not do.
   */
  note?: string
  /**
   * The control, or the controls — in reading order, left to right.
   *
   * MORE THAN ONE IS RARE AND REAL: the sidebar panels are switched on by a switch and
   * laid out by a picker beside it, and the picker is only offered while the switch is
   * on. A list keeps them in one cluster at one gap; two props ("control" and something
   * trailing it) would be the row deciding which of them is the important one.
   */
  control: SettingRowControl | SettingRowControl[]
  /**
   * Dimmed and inert, for a row a master switch has switched off.
   *
   * The ROW's, and not passed down to the control: a control that were merely disabled
   * would still be at full strength in a row the reader is being told does not apply.
   */
  disabled?: boolean
  /** Margins. Not the gaps, the type or where the control sits. */
  className?: string
}

export function SettingRow({ label, hint, note, control, disabled = false, className = '' }: SettingRowProps) {
  return (
    <div
      className={`flex flex-col gap-3 transition-opacity ${disabled ? 'pointer-events-none opacity-40' : ''} ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-6">
        {/* `min-w-0` so a long help line wraps instead of pushing the control off the
            card — a row may carry more than one of them. */}
        <div className="min-w-0">
          <Text size="sm" weight="medium" className="block">
            {label}
          </Text>
          {hint && (
            <Text size="xs" tone="secondary" className="mt-0.5 block opacity-50">
              {hint}
            </Text>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {(Array.isArray(control) ? control : [control]).map((one, index) =>
            one.kind === 'select' ? (
              // The key is the index because a row's controls are a fixed arrangement
              // and not a list that reorders: the second control of a row is always the
              // second control of that row.
              <Select key={index} {...one} />
            ) : (
              <Switch key={index} {...one} />
            ),
          )}
        </div>
      </div>
      {note && (
        <Text size="xs" tone="secondary" className="block opacity-50">
          {note}
        </Text>
      )}
    </div>
  )
}
