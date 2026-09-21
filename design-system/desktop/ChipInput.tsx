import { useState, type KeyboardEvent } from 'react'
import { Plus, X } from './icons'
import { Button } from './Button'
import { Icon } from './Icon'
import { Input } from './Input'
import { Text } from './Text'

/**
 * A LIST OF SHORT STRINGS THE READER BUILDS: each one a chip that can be taken back off,
 * and a field under them that adds the next.
 *
 * A repository's keywords, the labels a plan puts on every ticket it files, the files a
 * worktree copies over. All of them are the same object — a set of words, unordered, each
 * whole — and the app drew it twice: once here and once on the marketing site's settings
 * form, which is the pairing that made it worth extracting rather than either copy alone.
 *
 * ── A CHIP IS NOT A `Label` ───────────────────────────────────────────────────────
 *
 * It wears `Label`'s geometry to the pixel — the same 24px box, the same `bg-ink/5`, the
 * same radius — because on screen it IS one, and a chip that stood a rung apart from the
 * labels elsewhere in the app would be a second vocabulary for one shape. What it cannot
 * be is that component: `Label.onClick` makes the WHOLE plate a button, and the pressable
 * part here is the cross alone. A label that opened something when you meant to remove a
 * word is the failure that prop exists to prevent, not one to reproduce.
 *
 * ── THE FIELD IS SEPARATE FROM THE CHIPS ──────────────────────────────────────────
 *
 * Enter adds, and so does the button beside it. Both, because they answer different
 * hands: Enter is what somebody typing three keywords in a row will use, and the button
 * is what somebody who has typed one and looked away needs to see in order to know the
 * word has not been taken yet.
 *
 * CONTROLLED, and the draft is React state rather than the DOM's. An earlier copy read
 * `inputRef.current.value` and cleared the field by assigning to it, which works and is
 * the one thing `Input` cannot support: a value the component cannot see is a value it
 * cannot render.
 */

export interface ChipInputProps {
  /** The words, in the order they were added. Duplicates are refused on the way in. */
  items: string[]
  /**
   * Called with the WHOLE new list, on every add and every removal.
   *
   * A chip is a complete value, so there is no half-typed state a Save button would be
   * protecting — which is why the callers here write straight through on each change.
   */
  onChange: (items: string[]) => void
  /** The empty field's prompt. Already translated. */
  placeholder: string
  /** The word on the add button. Already translated. */
  addLabel: string
  /** The cross's accessible name, the same on every chip. Already translated. */
  removeLabel: string
  /**
   * The field's id, so a `<label>` elsewhere can point at it.
   *
   * A PROP precisely so two of these can coexist on one page without colliding — which
   * the repository settings page does, twice over.
   */
  id?: string
  disabled?: boolean
  /** Margins and width. Not the chip's plate, its height or its radius. */
  className?: string
}

export function ChipInput({
  items,
  onChange,
  placeholder,
  addLabel,
  removeLabel,
  id,
  disabled = false,
  className = '',
}: ChipInputProps) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.trim()
    // A word already in the list is not an error worth a message: the chip the reader
    // wanted is on screen, so the field simply clears and the list is unchanged.
    if (!value) return
    if (!items.includes(value)) onChange([...items, value])
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    add()
  }

  return (
    <div className={`flex w-full flex-col gap-3 min-w-0 ${className}`.trim()}>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              // `Label`'s `sm` box, spelled out because this is not one — see the header.
              className="inline-flex h-6 items-center gap-1 rounded-lg bg-ink/5 pl-2 pr-1 text-ink"
            >
              <Text>{item}</Text>
              <button
                type="button"
                onClick={() => onChange(items.filter((one) => one !== item))}
                disabled={disabled}
                title={removeLabel}
                aria-label={`${removeLabel} ${item}`}
                className="flex h-4 w-4 items-center justify-center rounded border-none bg-transparent
                  cursor-pointer text-text-secondary transition-colors hover:text-red
                  disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon glyph={X} size="2xs" tone="inherit" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 min-w-0">
        <Input
          id={id}
          value={draft}
          onChange={setDraft}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-0"
        />
        <Button
          tone="neutral"
          icon={Plus}
          onClick={add}
          // Nothing to add is not a failure either, but a button that accepts the press
          // and does nothing is worse than one that says so.
          disabled={disabled || !draft.trim()}
        >
          {addLabel}
        </Button>
      </div>
    </div>
  )
}
