import { Button, type ButtonProps } from './Button'
import { ButtonIcon, type ButtonIconProps } from './ButtonIcon'
import { Icon } from './Icon'
import { ChipInput, type ChipInputProps } from './ChipInput'
import { Input, type InputProps } from './Input'
import { Kbd } from './Kbd'
import { Select, type SelectProps } from './Select'
import { Stepper, type StepperProps } from './Stepper'
import { Switch, type SwitchProps } from './Switch'
import { Text } from './Text'
import type { IconComponent } from './types'

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
 * SO ARE THE OTHER THREE. The repository settings page is sixty of these rows and only a
 * third of them end in a picker or a switch: a repository is named, pointed at a folder,
 * given a clone address and a project key, and every one of those is a FIELD. They were
 * hand-built rows with a hand-built Save beside them, at three different widths. `input`
 * and `button` are the two kinds that ends, and `chips` is the third shape that page
 * holds — a set of words, which is `ChipInput`.
 *
 * ── A ROW CAN STACK ───────────────────────────────────────────────────────────────
 *
 * `layout` is the second thing that page needed and it is not a preference: a picker is
 * 208px and sits beside its label happily, where a chip list, a textarea or a field with
 * its own Save under it cannot — at the settings measure there is not room for a name, a
 * help line and a full-width control on one line. Stacked, the control takes the whole
 * width under the label, which is how the page was already drawing those four by hand.
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
  | ({ kind: 'input' } & InputProps)
  | ({ kind: 'button' } & ButtonProps)
  /**
   * A MARK WITH NO WORD, for the control whose job is obvious from its glyph and whose
   * word would take width from the field beside it — Browse, Reveal, Open.
   *
   * It is `ButtonIcon` and not `Button` without a label, which is not a thing that
   * component can be: its `children` is a required string, deliberately, and this is the
   * component that exists on the other side of that line.
   */
  | ({ kind: 'buttonIcon' } & ButtonIconProps)
  | ({ kind: 'chips' } & ChipInputProps)

/**
 * WHERE THE CONTROL SITS — beside the label, or under it.
 *
 * `inline` is the settings row as everybody knows it and the default. `stacked` is for a
 * control that has no business being squeezed into the right-hand column: a chip list, a
 * textarea, a field whose Save button sits under it. It is a fact about the CONTROL's
 * shape rather than about the setting, which is why it is a rung here and not a guess the
 * row makes from the kind — a short input is perfectly happy inline, and the same kind
 * stacked is a template editor.
 */
export type SettingRowLayout = 'inline' | 'stacked'

export interface SettingRowProps {
  /** The setting's name. Already translated. */
  label: string
  /**
   * A MARK BEFORE THE NAME, saying what KIND of setting this is before the name says
   * which one.
   *
   * The guard rails are what it was written for: a padlock on "Commits on main branches"
   * says the row is a safety, which neither its name nor its switch could say on their
   * own. A repository that belongs to a team wears the team mark for the same reason.
   *
   * MOST ROWS HAVE NONE, and that is the rule rather than an accident. A mark on every
   * row is decoration, and decoration on every row stops meaning anything — which is
   * exactly what it has to mean here, since the whole job is to make four rows out of
   * sixty look different from the rest.
   */
  icon?: IconComponent
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
  /** Beside the label, or under it. See `SettingRowLayout`. */
  layout?: SettingRowLayout
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
  icon,
  hint,
  hintKeys,
  note,
  control,
  layout = 'inline',
  disabled = false,
  className = '',
}: SettingRowProps) {
  // An absent control and an empty list are the same row: nothing on the right. Resolved
  // once here so the JSX below asks one question rather than two.
  const controls = control ? (Array.isArray(control) ? control : [control]) : []
  const stacked = layout === 'stacked'

  const drawn = controls.map((one, index) =>
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
    ) : one.kind === 'input' ? (
      <Input key={index} {...one} />
    ) : one.kind === 'button' ? (
      // `neutral` before the spread, for `Stepper`'s reason: a control that ends a
      // settings row is the quiet kind unless its caller says otherwise, and a page of
      // accent-filled Save buttons is a page with no primary action at all.
      <Button key={index} tone="neutral" {...one} />
    ) : one.kind === 'buttonIcon' ? (
      // `md` before the spread — 28px, the height a `Select` and an `Input` both stand at
      // their own defaults, so a mark button ending a row lines up with the field it
      // follows rather than sitting a rung under it.
      <ButtonIcon key={index} size="md" {...one} />
    ) : one.kind === 'chips' ? (
      <ChipInput key={index} {...one} />
    ) : (
      <Switch key={index} {...one} />
    ),
  )

  return (
    <div
      className={`flex flex-col gap-3 transition-opacity ${disabled ? 'pointer-events-none opacity-40' : ''} ${className}`.trim()}
    >
      <div className={stacked ? 'flex flex-col gap-3 min-w-0' : 'flex items-center justify-between gap-6'}>
        {/* `min-w-0` so a long help line wraps instead of pushing the control off the
            card — a row may carry more than one of them. */}
        <div className="min-w-0">
          {/* The mark rides ON the name's line rather than in a gutter of its own: a
              settings card has no gutter, and one carved out for the four rows that have
              a mark would indent the other fifty-six for nothing. */}
          <span className="flex items-center gap-1.5">
            {icon && (
              <Icon glyph={icon} size="sm" tone="inherit" className="shrink-0 text-text-secondary/50" />
            )}
            <Text size="sm" weight="medium">
              {label}
            </Text>
          </span>
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
        {/* STACKED PUTS THE CONTROLS ON THEIR OWN ROW and lets them have the width —
            `shrink-0` is exactly wrong there, since the whole reason to stack is that the
            control wanted more room than the right-hand column has. */}
        {drawn.length > 0 && (
          <div className={stacked ? 'flex min-w-0 items-end gap-2' : 'flex shrink-0 items-center gap-3'}>
            {drawn}
          </div>
        )}
      </div>
      {note && (
        <Text size="xs" tone="secondary" className="block opacity-50">
          {note}
        </Text>
      )}
    </div>
  )
}
