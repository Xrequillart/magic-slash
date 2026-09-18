import { Kbd } from './Kbd'
import { Select, type SelectProps } from './Select'
import { Stepper, type StepperProps } from './Stepper'
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
 * THE STEPPER IS THAT DAY. The Appearance page's interface scale is a value walked up and
 * down — `(−) 100% (+)` — and it was three bordered squares and a number spelled out in
 * the page, four objects a reader had to group by proximity. It is `Stepper` now, and the
 * row hands it the settings rung so it cannot arrive at the sheet's 40px beside a 24px
 * switch.
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
  | ({ kind: 'stepper' } & StepperProps)

export interface SettingRowProps {
  /** The setting's name. Already translated. */
  label: string
  /** What the setting is, quieter, under the name. It wraps. Translated. */
  hint?: string
  /**
   * CHORDS THE SETTING IS ALSO REACHABLE BY, as caps at the end of the help line.
   *
   * One entry per chord, each a list of keys — `[['⌘', '+'], ['⌘', '−']]`. Two gestures
   * are two caps, which is `Kbd`'s own rule and the reason it takes a list rather than a
   * string: the space in `⌃ Space` is a key name and the one in `⌘ N` is a separator, and
   * only the caller knows which.
   *
   * AT THE END, so the sentence has to be written towards them — "Also on" and then the
   * caps. What used to happen instead was a help line split into two catalogue entries
   * with the caps spliced between, which is a sentence no translator can reorder.
   */
  hintKeys?: string[][]
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
   *
   * ── NONE IS ALSO REAL, AND RARER ──────────────────────────────────────────────
   *
   * A row with no control STATES something instead of offering it: "closing the window
   * leaves the app in the menu bar" is a fact about the setting above it, written at the
   * same rung so it reads as part of the same card rather than as a paragraph glued
   * underneath. The app spelled exactly that by hand, twice.
   *
   * IT IS NOT A `note`, which hangs off a row and is about that row's VALUE, and it is
   * not the card's small print, which is about the whole card. This is its own line with
   * its own name — and the empty right-hand side is the whole message: there is nothing
   * to set here.
   */
  control?: SettingRowControl | SettingRowControl[]
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

export function SettingRow({
  label,
  hint,
  hintKeys,
  note,
  control,
  disabled = false,
  className = '',
}: SettingRowProps) {
  // An absent control and an empty list are the same row: nothing on the right. Resolved
  // once here so the JSX below asks one question rather than two.
  const controls = control ? (Array.isArray(control) ? control : [control]) : []
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
            // A wrapping flex rather than a block, so a cap sits ON the line it ends
            // rather than under it, and a long help line still wraps between words.
            <span className="mt-0.5 flex flex-wrap items-center gap-1 opacity-50">
              <Text size="xs" tone="secondary">
                {hint}
              </Text>
              {hintKeys?.map((keys) => (
                // The chord itself is the key: a row does not offer the same gesture twice.
                <Kbd key={keys.join('+')} size="xs" keys={keys} />
              ))}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {controls.map((one, index) =>
            one.kind === 'select' ? (
              // The key is the index because a row's controls are a fixed arrangement
              // and not a list that reorders: the second control of a row is always the
              // second control of that row.
              <Select key={index} {...one} />
            ) : one.kind === 'stepper' ? (
              // `sm` BEFORE the spread: the row's rung by default, and still a caller's
              // to override — the sheet's stepper is `2xl` and this one stands beside a
              // switch.
              <Stepper key={index} size="sm" {...one} />
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
