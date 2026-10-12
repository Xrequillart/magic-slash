/**
 * THIRTY DRAWN FACES, SIX TO A LINE, THE ONE IN FORCE RINGED — the half of "change my
 * avatar" that is not a file dialog.
 *
 * IT KNOWS NO FACES, the way `ThemeGrid` knows no themes. The pictures arrive as
 * `{ id, src, label }` and this draws them: the catalogue is the app's, because the
 * bytes are also its upload payload (see `renderer/avatars/portraits.ts`) and a design
 * system holding a quarter of a megabyte of base64 would be a design system that a
 * webapp compiles and never uses.
 *
 * A RADIOGROUP AND NOT A LIST OF BUTTONS. Thirty faces are one question with thirty
 * answers, and the semantics are what make that reach a screen reader: arrow keys move
 * the selection, `aria-checked` says which one it is, and the group carries the
 * question. Thirty `<button>`s would be thirty unrelated actions to a reader, and
 * thirty stops on the way past.
 *
 * ROUND, AND AT THE SIZE A FACE READS AT. The tiles are `Avatar`'s own drawing — the
 * same `rounded-full object-cover` a real photo gets — so what is chosen here looks
 * exactly like what lands on the card afterwards. The box is the grid's rather than a
 * rung of `AVATAR_SIZES`: those rungs describe where the app draws ONE face, and a
 * picker's tile is sized by how many fit on a line.
 *
 * NO CONFIRM, NO CANCEL, NO UPLOAD BUTTON. Pressing a face reports the face; what the
 * dialog does about it, what else it offers and when it closes are the app's, and a
 * footer here would be a design system deciding how a dialog ends.
 */

export interface AvatarPickerOption {
  /** What `onSelect` hands back. */
  id: string
  /** The `data:` URL of the portrait, drawn as-is. */
  src: string
  /**
   * The tile's accessible name and its tooltip — "Portrait 7". Translated.
   *
   * REQUIRED, and with no default, for `Avatar`'s reason: these faces are anonymous
   * drawings with nothing to derive a name from, and this folder cannot read a
   * catalogue. A grid of thirty images with no names is thirty identical stops.
   */
  label: string
}

export interface AvatarPickerProps {
  options: readonly AvatarPickerOption[]
  /**
   * The `id` in force, ringed in the accent — or `null` for none of them, which is what
   * an account wearing an uploaded PHOTOGRAPH looks like: the photo is the avatar and
   * no tile in this grid is it.
   */
  value: string | null
  /** Pressing the one already in force does nothing; this fires for the others. */
  onSelect: (id: string) => void
  /** The question the thirty answers belong to, for a screen reader. Translated. */
  ariaLabel: string
  /** Nothing can be pressed while something is being saved. */
  disabled?: boolean
  /** Margins and placement. Not the columns, the gap or the radius. */
  className?: string
}

export function AvatarPicker({
  options,
  value,
  onSelect,
  ariaLabel,
  disabled = false,
  className = '',
}: AvatarPickerProps) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={`grid grid-cols-6 gap-2 ${className}`}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            title={option.label}
            aria-label={option.label}
            onClick={() => { if (!active) onSelect(option.id) }}
            // `ring-offset` and not a thicker ring: the faces sit on a pale plate of
            // their own, so a ring drawn flush against one reads as part of the
            // drawing. The offset takes its colour from the dialog behind it.
            className={`rounded-full transition-[box-shadow,transform] active:scale-95 disabled:opacity-50 ${
              active
                ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary'
                : 'hover:ring-2 hover:ring-ink/20'
            }`}
          >
            {/* Not `Avatar`, and that is deliberate: `Avatar` answers "this person, or
                the default face when there is none", which is a question about an
                ACCOUNT. Every tile here has bytes, so the fallback could never fire —
                and routing through it would mean a grid of thirty faces silently
                turning into a grid of thirty default faces the day a src went missing,
                instead of the broken image that says so. The classes are `Avatar`'s to
                the letter, so the tile and the result are one drawing. */}
            <img
              src={option.src}
              alt=""
              className="aspect-square w-full rounded-full object-cover"
            />
          </button>
        )
      })}
    </div>
  )
}
