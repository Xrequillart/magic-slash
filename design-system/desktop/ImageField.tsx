import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { ImagePlus, X } from './icons'
import { Text } from './Text'

/**
 * A PICTURE A THING WILL WEAR, and the two gestures around it: choose one, or take the
 * one there away.
 *
 * `AvatarPicker` IS THE OTHER ONE. That offers THIRTY DRAWN FACES to pick from — a
 * closed set the app ships, for a person who has no photograph. This takes a file off
 * the reader's disk, which is an open set of one, and the two share nothing but the
 * word "picker".
 *
 * IT DRAWS THREE STATES AND THEY ARE NOT THE SAME SHAPE. A picture already saved is
 * shown as itself, square, with a cross on its corner. A file just chosen has nothing to
 * show yet — the bytes are on disk and nothing has read them — so it is a chip naming
 * the file. Neither, and the button stands alone. The middle state is the one a
 * hand-built version forgets, and the skills editor's did not: it is why this is a
 * component rather than an `<img>` and a button.
 */

export interface ImageFieldProps {
  /**
   * The picture as it is now, a `data:` URL — `Avatar.src`'s contract and for its
   * reason. Wins over `filename`.
   */
  src?: string | null
  /**
   * A file CHOSEN BUT NOT YET READ, named rather than shown. The caller passes the
   * basename: which separator a platform spells is not this folder's question.
   */
  filename?: string | null
  /** The word on the button when there is nothing yet. Translated. */
  pickLabel: string
  /** The word on it once there is. Translated. */
  changeLabel: string
  /** What the cross does for a screen reader — "Remove the picture". Translated. */
  removeLabel: string
  onPick: () => void
  onRemove: () => void
  /** Margins and width. Not the plate, the sizes or the gaps. */
  className?: string
}

export function ImageField({
  src,
  filename,
  pickLabel,
  changeLabel,
  removeLabel,
  onPick,
  onRemove,
  className = '',
}: ImageFieldProps) {
  const has = Boolean(src || filename)

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      {src ? (
        // 64px, `rounded-lg`, and NO OUTLINE: the picture is its own edge, and a hairline
        // round an image is a frame the image did not ask for.
        <span className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-surface-subtle">
          <img src={src} alt="" className="h-full w-full object-cover" />
        </span>
      ) : filename ? (
        <span className="flex min-w-0 items-center gap-2 rounded-lg bg-surface-subtle px-3 py-2">
          <Icon glyph={ImagePlus} size="sm" tone="inherit" className="flex-shrink-0 text-accent" />
          <Text tone="secondary" className="min-w-0 truncate" title={filename}>
            {filename}
          </Text>
        </span>
      ) : null}

      {/* The cross is a CONTROL IN THE ROW and not a badge on the corner of the picture.
          A 20px target floating half off a thumbnail is the smallest thing on the form
          and the only one that destroys anything; beside the button that replaces it,
          the two gestures read as the pair they are. */}
      {has && <ButtonIcon icon={X} title={removeLabel} size="sm" tone="danger" onClick={onRemove} />}

      <Button size="sm" tone="neutral" icon={ImagePlus} onClick={onPick}>
        {has ? changeLabel : pickLabel}
      </Button>
    </div>
  )
}
