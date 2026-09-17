import { Select } from '@ds/desktop'
import { LANGUAGES } from '../languages'

/**
 * Language picker: a flag and a name, on the trigger and on every option.
 *
 * THE DRAWING IS `Select`'S NOW. This file held a trigger and a portalled panel of its
 * own — the app's fourth copy of both — and what it was actually about was never the
 * markup: it is the LIST. A flag inside a native `<option>` is an impossibility rather
 * than a styling problem, and that argument now lives once, in the design system, where
 * every other picker in the app reads it too.
 *
 * THE LIST IS NOT HERE EITHER. It was — and so was a second copy of it in the
 * quick-settings sheet, with the same paragraph above it explaining why the names are not
 * translated. Both read `renderer/languages.ts` now; what is left in this file is a width
 * and a fallback.
 */

/** w-52, the width every settings row's control stands at. */
const WIDTH = 208

export function LanguageSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={LANGUAGES.some((language) => language.value === value) ? value : LANGUAGES[0].value}
      options={LANGUAGES}
      onChange={onChange}
      width={WIDTH}
      disabled={disabled}
    />
  )
}
