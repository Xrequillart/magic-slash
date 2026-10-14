import type { CSSProperties } from 'react'
import { AVATAR_SIZES, type AvatarSize } from './avatarSizes'
import { Icon } from './Icon'
import type { IconComponent } from './types'

/**
 * A MARK ON ITS OWN PLATE: a service's logo, or a glyph saying what a thing is, where a
 * person would get a face.
 *
 * ON `Avatar`'s LADDER, box and glyph read from `AVATAR_SIZES` rather than respelled, so
 * a tile and a face of the same rung are the same size. `AccountCard`'s service tile and
 * `SettingRow`'s device tile are the `lg` square; a tool call in the chat is the `sm`
 * disc.
 *
 * SQUARE BY DEFAULT: every logo is drawn on a square grid and a circle crops it, so a
 * tile that stands alone is the rounded square the repositories and trackers wear. ROUND
 * where it stacks like faces do (`ToolMarkStack`), at a size small enough that the crop
 * does not show.
 *
 * THE PLATE IS THE THEME'S OWN (`surface-strong`, its ink) unless a `tint` is given: a
 * brand's ground (`JIRA_CHIP_GROUND`) or a fixed paper, as a VALUE, because somebody
 * else's colour can never be a token of this palette. A mark that paints itself keeps its
 * colours on either; one drawn in `currentColor` takes `ink`, or the theme's ink.
 */

export type MarkTileShape = 'square' | 'round'

export interface MarkTileProps {
  glyph: IconComponent
  /** A rung of the avatar ladder: the tile is that box, the mark that rung's glyph. */
  size?: AvatarSize
  shape?: MarkTileShape
  /** The plate, as a CSS colour. Absent, the theme's `surface-strong`. */
  tint?: string
  /** What a `currentColor` mark is drawn in, as a CSS colour. Absent, the theme's ink. */
  ink?: string
  /**
   * The tile's accessible name and tooltip, when the mark is content: on a card that
   * says "Not connected" the logo is the only thing naming the service. Absent, the tile
   * is decoration and hidden from assistive technology.
   */
  title?: string
  /** Layout only: a margin, `self-center`. Not the size or the plate, which are props. */
  className?: string
}

/** The square's corner per rung: a 44px tile is the trackers' `rounded-xl`, a chip's less. */
const SQUARE: Record<AvatarSize, string> = {
  '2xs': 'rounded-sm',
  xs: 'rounded',
  sm: 'rounded-md',
  md: 'rounded-md',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  '2xl': 'rounded-2xl',
}

export function MarkTile({ glyph, size = 'lg', shape = 'square', tint, ink, title, className = '' }: MarkTileProps) {
  const { box, glyph: rung } = AVATAR_SIZES[size]
  const style: CSSProperties = {}
  if (tint) style.backgroundColor = tint
  if (ink) style.color = ink
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      title={title}
      className={`${box} flex shrink-0 items-center justify-center ${shape === 'round' ? 'rounded-full' : SQUARE[size]} ${
        tint ? '' : 'bg-surface-strong'
      } ${ink ? '' : 'text-ink'} ${className}`.replace(/\s+/g, ' ').trim()}
      style={tint || ink ? style : undefined}
    >
      <Icon glyph={glyph} size={rung} tone="inherit" />
    </span>
  )
}
