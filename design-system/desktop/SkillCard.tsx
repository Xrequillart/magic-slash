import { ChevronRight, Image as ImageGlyph } from './icons'
import { Icon } from './Icon'
import { Label } from './Label'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * ONE SKILL AS A TILE: its picture, its name, what it is for, and the arrow that says
 * the whole thing opens.
 *
 * THE TILE AND NOT THE ROW, which is the split this folder makes everywhere —
 * `CommitLine`/`CommitCard`, `FileModifiedLine`/`UnCommittedChangesCard`. The skills
 * page draws both: this is the three-across grid on the overview, and the rail down the
 * left is the row. They are different objects and neither is the other at a smaller size.
 *
 * NO OUTLINE. It wore `border border-line-strong` and a hover that changed the border to
 * the colour it already was — a rule that did nothing on hover and one more edge on a
 * grid that already has nine of them. The plate is the tile: `surface` against the page's
 * own ground, stepping to `surface-strong` under the cursor, and the radius is the card
 * radius the whole folder uses.
 */

export interface SkillCardProps {
  /**
   * What it is called. Drawn in sentence case — these are directory names off disk
   * (`brand-designer`, `magic-commit`), and an identifier set flush lower-case among
   * sentences reads as a symbol rather than as a name.
   */
  name: string
  /** The one line under it, already translated. Truncates; absent draws nothing. */
  description?: string
  /**
   * The picture, as a `data:` URL — `Avatar.src`'s contract and for its reason. Null or
   * absent draws `icon` on the empty plate instead.
   *
   * NOT AN `Avatar`, which is round and is a FACE. A skill's picture is artwork it
   * shipped with, and a square is what artwork is.
   */
  imageUrl?: string | null
  /** The glyph where there is no picture. `Image` unless the caller has a better one. */
  icon?: IconComponent
  /**
   * A plate beside the name — where the skill came from, usually.
   *
   * `color` is a CSS VALUE, `Label.color`'s contract: what a hue MEANS belongs to the
   * caller. See `NoticeCardTag.color`, which this mirrors.
   */
  badge?: { label: string; color?: string }
  onClick: () => void
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function SkillCard({
  name,
  description,
  imageUrl,
  icon = ImageGlyph,
  badge,
  onClick,
  className = '',
}: SkillCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center gap-3 rounded-xl border-none bg-surface px-2 py-2 text-left
        cursor-pointer transition-colors hover:bg-surface-strong ${className}`.trim()}
    >
      {/* 48px, `rounded-lg` — a radius INSIDE the tile's `rounded-xl`, which is what
          keeps a square plate from fighting the corner it sits next to. `bg-surface-subtle`
          so the plate is still visible once the tile itself steps to `surface-strong`. */}
      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-subtle">
        {imageUrl ? (
          // `alt=""`: the name is drawn beside it, and alternative text repeating the
          // adjacent label makes a screen reader say the skill twice. `Avatar.alt` states
          // the same rule at greater length.
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon glyph={icon} size="md" tone="muted" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {/* `md` + `bold` — the tile's one loud thing, and the only rung above `sm` on
              this page. A grid is scanned by its names. */}
          <Text size="md" weight="bold" className="min-w-0 truncate capitalize" title={name}>
            {name}
          </Text>
          {badge && (
            <Label size="2xs" color={badge.color} className="flex-shrink-0">
              {badge.label}
            </Label>
          )}
        </span>
        {description && (
          <Text size="sm" tone="secondary" className="mt-1 block truncate opacity-60" title={description}>
            {description}
          </Text>
        )}
      </span>

      {/* The arrow is the affordance the plate no longer spells: a tile with no outline
          needs something saying it opens, and it brightens on hover where the border
          used to pretend to. */}
      <Icon
        glyph={ChevronRight}
        size="sm"
        tone="inherit"
        className="flex-shrink-0 text-icon-muted transition-colors group-hover:text-icon"
      />
    </button>
  )
}
