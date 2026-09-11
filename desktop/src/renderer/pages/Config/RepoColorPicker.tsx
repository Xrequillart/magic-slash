import { useState } from 'react'
import { FolderGit2, Palette } from 'lucide-react'
import { Modal } from '../../components/Modal'
import { REPO_COLOR_CHOICES, repoColorPreview } from '../../utils/projectColors'
import { useT } from '../../i18n'


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
      /* The ring hugs the tile instead of standing off it. An offset ring has to
         name the colour BEHIND the gap, and behind this one is a row that changes
         colour on hover — so the gap would be a stale patch of the resting
         background every time the pointer arrived. */
      className={`flex items-center justify-center flex-shrink-0 ${box} ${
        selected ? 'ring-2 ring-ink' : ''
      }`}
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
  const preview = repoColorPreview(color)

  return (
    <>
      {/* One button, not five. The three extra tiles and the palette chip are a
          picture of what is behind the click, so making any of them separately
          clickable would promise four shortcuts this row does not have. `-mr-1.5`
          pulls the hover padding back out of the layout, so the row still aligns
          with the controls above it and only the hover fill is wider. */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        aria-label={t('repo.general.colorChange')}
        title={color}
        className="flex items-center gap-1.5 p-1.5 -mr-1.5 rounded-xl transition-colors hover:bg-surface disabled:hover:bg-transparent disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {preview.map((choice, i) => (
          <RepoTile key={`${i}-${choice}`} color={choice} size="preview" selected={i === 0} />
        ))}
        {/* The neutral chip that says the row is a door. Grey from the surface
            tokens rather than a fixed light grey: the same chip has to read as
            "no colour" on a white window and on a black one. */}
        <span className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-lg bg-surface-strong text-icon">
          <Palette className="w-3.5 h-3.5" />
        </span>
      </button>

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
                 you go, so the choice is already visible while the grid is still up.
                 Re-picking the colour it already has does nothing at all, though:
                 every pick is a save and a toast, and the one pick that cannot
                 change anything should not spend either. */
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
