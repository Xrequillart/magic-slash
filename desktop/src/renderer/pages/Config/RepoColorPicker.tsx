import { useState } from 'react'
import { FolderGit2, Palette } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { REPO_COLOR_CHOICES, REPO_QUICK_COLORS } from '../../utils/projectColors'
import { useT } from '../../i18n'


/* The selected mark, at both sizes. An `outline` rather than a `ring`, because the
   2px gap has to be see-through: a ring offset paints the gap with a colour you have
   to name, and behind these tiles is a row that changes colour on hover, so the gap
   would be a stale patch of the resting background the moment the pointer arrived.
   An outline offset paints nothing. */
const SELECTED_RING = 'outline outline-2 outline-offset-2 outline-ink'

/**
 * The repository tile, at the one place it is not a read-out but a control.
 *
 * Deliberately the SAME mark as everywhere else — the glyph tinted on its own
 * backdrop, exactly what RepoMark draws in the sidebar and what the page header
 * shows at title scale. A colour swatch is an abstraction of the thing; the thing
 * itself is the tile, so the setting picks tiles.
 */
function RepoTile({
  color,
  size,
  selected = false,
}: {
  color: string
  size: 'preview' | 'grid'
  selected?: boolean
}) {
  const box = size === 'preview' ? 'w-7 h-7 rounded-lg' : 'w-10 h-10 rounded-xl'
  const glyph = size === 'preview' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  return (
    <span
      className={`flex items-center justify-center flex-shrink-0 ${box} ${selected ? SELECTED_RING : ''}`}
      /* The tint is the colour itself at 12% (`1f`), the alpha every other repo
         mark in the app uses. Kept as a hex suffix rather than a colour-mix so the
         tile stays one style object and matches RepoMark byte for byte. */
      style={{ backgroundColor: `${color}1f`, color }}
    >
      <FolderGit2 className={glyph} />
    </span>
  )
}

export function RepoColorPicker({
  color,
  onChange,
  disabled = false,
}: {
  color: string
  onChange: (color: string) => void
  disabled?: boolean
}) {
  const t = useT()
  const [isOpen, setIsOpen] = useState(false)
  // The palette chip wears the selected mark whenever the repo's colour is not one
  // of the six in the row. Without it the row would show no selection at all for
  // the thirty other colours, and read as if the repo had never chosen one.
  const inRow = REPO_QUICK_COLORS.includes(color)

  // Same hit area for the six swatches and the chip, so the row is one strip of
  // buttons rather than six of one kind and one of another.
  const cell = 'rounded-lg transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:cursor-not-allowed'

  return (
    <>
      {/* `gap-2.5`: the selected outline stands 4px off its tile, so a tighter row
          would have it crowding the neighbour it is meant to be distinguished from. */}
      <div className={`flex items-center gap-2.5 ${disabled ? 'opacity-60' : ''}`}>
        {REPO_QUICK_COLORS.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={disabled}
            /* Re-picking the colour it already has does nothing at all: every pick
               is a save and a toast, and the one pick that cannot change anything
               should not spend either. */
            onClick={() => { if (choice !== color) onChange(choice) }}
            title={choice}
            aria-label={t('repo.general.setColor', { color: choice })}
            aria-pressed={color === choice}
            className={`${cell} ${color === choice || disabled ? '' : 'hover:scale-110'}`}
          >
            <RepoTile color={choice} size="preview" selected={color === choice} />
          </button>
        ))}

        {/* The door to the other thirty. Grey from the surface tokens rather than a
            fixed light grey: the same chip has to read as "more colours" on a white
            window and on a black one. */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(true)}
          aria-label={t('repo.general.colorChange')}
          title={inRow ? undefined : color}
          className={`${cell} ${disabled ? '' : 'hover:scale-110'}`}
        >
          <span
            className={`flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-lg bg-surface-strong text-icon ${
              inRow ? '' : SELECTED_RING
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
          </span>
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('repo.general.colorModalTitle')}
      >
        <p className="mb-4 text-xs text-text-secondary/70">{t('repo.general.colorModalHelp')}</p>
        {/* Six fixed columns, not `flex-wrap`: thirty-six tiles that reflow with the
            dialog width would put the two tones of a hue in the same column at one
            size and three columns apart at another, and the whole point of the order
            is that a column means something. */}
        <div className="grid grid-cols-6 gap-3 justify-items-center">
          {REPO_COLOR_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              /* Stays open on purpose. Picking a colour is a thing you compare, and
                 a dialog that shuts on the first click makes you reopen it to see
                 the one you nearly chose. The tile behind the dialog repaints as
                 you go, so the choice is already visible while the grid is still up. */
              onClick={() => { if (choice !== color) onChange(choice) }}
              title={choice}
              aria-label={t('repo.general.setColor', { color: choice })}
              aria-pressed={color === choice}
              className={`rounded-xl transition-transform ${color === choice ? '' : 'hover:scale-110'}`}
            >
              <RepoTile color={choice} size="grid" selected={color === choice} />
            </button>
          ))}
        </div>
      </Modal>
    </>
  )
}
