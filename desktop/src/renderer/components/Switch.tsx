/**
 * The app's only switch.
 *
 * It exists because there were two: this one, and a hand-rolled
 * `<label><input class="sr-only peer">` pair repeated seven times on the
 * repository page, two pixels taller and with a knob a size up. Two switches on
 * two settings pages that did not match is exactly the kind of drift a shared
 * component prevents.
 *
 * A `<button role="switch">` rather than a checkbox: the checkbox version had to
 * be hidden and repainted with sibling divs, which put it out of reach of the
 * `fieldset:disabled` rule that greys every other control on a read-only page —
 * so it needed a CSS rule of its own to stay in step.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  /** Names the control for assistive tech — the visible label sits outside it. */
  label: string
  disabled?: boolean
}) {
  return (
    <button
      // Explicit: a bare <button> inside a <form> defaults to submit.
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? 'bg-accent' : 'bg-ink/20'
      }`}
    >
      <div
        className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-on-brand transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}
