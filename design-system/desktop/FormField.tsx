import { Input, type InputProps } from './Input'
import { Text } from './Text'

/**
 * A LABEL, THE BOX UNDER IT, AND THE LINE THAT EXPLAINS IT — one entry of a form the
 * reader fills in.
 *
 * `SettingRow` IS THE OTHER SHAPE AND THEY ARE NOT INTERCHANGEABLE. That row is a
 * SETTING: a name on the left, a switch or a picker on the right, and the two read as
 * one sentence because the control is small enough to sit at the end of it. This is a
 * FIELD, whose control is a box the reader types a paragraph into — there is no right
 * edge to put it against, so the label goes above and the box takes the full width. The
 * tell is the control: anything you choose is a row, anything you author is a field.
 *
 * THE INPUT ARRIVES AS DATA and not as a child, which is `SettingRow.control`'s rule and
 * this folder's. A field that received its own box would be a field every call site can
 * give a different height, a different tone and a different rung — which is exactly what
 * the skills editor had: five `<label className="block text-base font-medium
 * text-text-secondary mb-1.5">` written out one after another, and a sixth that had
 * dropped the `mb`.
 */

export interface FormFieldProps {
  /** The field's name. Already translated. */
  label: string
  /**
   * Under the BOX and not under the label: it explains what to type, so it is read after
   * the reader has seen where to type it. `SettingRow.hint` sits under the name for the
   * opposite reason — there, the control is already on the same line.
   */
  hint?: string
  /**
   * The box, as `Input`'s own props — the whole union, so a field is single-line or a
   * textarea depending on nothing but what is passed.
   *
   * `className` IS THE ONE THING THIS OVERRIDES: a field's box is as wide as the field,
   * always, and `Input` sets no width on purpose. A caller that had to remember
   * `w-full` on every one of five boxes is a caller that will forget it on the sixth.
   */
  input: InputProps
  /** Margins and width. Not the gap, the label's type or the box's anything. */
  className?: string
}

export function FormField({ label, hint, input, className = '' }: FormFieldProps) {
  return (
    <div className={className}>
      <Text size="sm" tone="secondary" className="mb-1.5 block">
        {label}
      </Text>
      {/* Spread LAST would let a caller win the width back, which is the one thing this
          component is here to decide. `Input`'s own note explains why appending a second
          width class is not reliable anyway. */}
      <Input {...input} className={`w-full ${input.className ?? ''}`.trim()} />
      {hint && (
        <Text size="xs" tone="secondary" className="mt-1 block opacity-60">
          {hint}
        </Text>
      )}
    </div>
  )
}
