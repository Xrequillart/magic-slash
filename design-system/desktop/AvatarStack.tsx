import { Avatar } from './Avatar'
import { AVATAR_SIZES } from './avatarSizes'
import { splitAvatarStack } from './avatarStackOverflow'
import { Text } from './Text'

/**
 * A few people, as overlapping faces: who else is here right now.
 *
 * Made for the plan page's header (#306), where it lists the colleagues who have the same
 * plan open, and drawn from DATA rather than from faces handed in: the stack owns the
 * overlap, the ring that separates two faces and the `+N` chip, and a caller passing
 * `Avatar`s of their own could break all three by accident of a size or a class.
 *
 * NO PHOTO IS AN INITIAL, not the default portrait. A stack of three people with no photo
 * uploaded would otherwise be three copies of the same drawn stranger — the one thing a
 * stack exists to tell apart. See `Avatar`'s `initials` fallback.
 *
 * THE RING IS THE PANEL'S GROUND (`bg-secondary`, the plan modal's and the sticky bar's),
 * so each face reads as cut out of the one behind it rather than outlined in a colour.
 */

export interface AvatarStackPerson {
  /** Stable across renders: the stack keys its faces by it. */
  id: string
  /** Shown on hover, read by a screen reader, and the source of the initial. */
  name: string
  /** A `data:` URL, as `Avatar` takes it. Absent or null draws the initial. */
  src?: string | null
}

export type AvatarStackSize = 'sm' | 'md'

export interface AvatarStackProps {
  people: AvatarStackPerson[]
  /**
   * The most slots the stack takes, the `+N` chip included: past it, the last slot is the
   * chip and the people it stands for are named in its tooltip. See `splitAvatarStack`.
   */
  max?: number
  /** 20px or 24px, two of `Avatar`'s rungs: a stack lives in a bar or a row, never alone. */
  size?: AvatarStackSize
  /**
   * What the group is, translated ("Also on this plan"). The stack's tooltip and its
   * accessible name: faces alone do not say why they are there.
   */
  label: string
  /** Margins and layout. Not the overlap or the ring, which the stack owns. */
  className?: string
}

/** How far each face slides under the one before it, per size. Literals, for Tailwind. */
const OVERLAP: Record<AvatarStackSize, string> = {
  sm: '-ml-1.5',
  md: '-ml-2',
}

export function AvatarStack({ people, max = 4, size = 'md', label, className = '' }: AvatarStackProps) {
  if (people.length === 0) return null
  const { shown, rest } = splitAvatarStack(people, max)
  const { box, initial } = AVATAR_SIZES[size]
  const ring = 'ring-2 ring-bg-secondary rounded-full'

  return (
    <div role="group" aria-label={label} title={label} className={`flex shrink-0 items-center ${className}`.trim()}>
      {shown.map((person, index) => (
        // The name on the wrapper as well as on the image: `Avatar` gives a photo an `alt`
        // but no tooltip, and hovering a face is how a reader asks whose it is.
        <span key={person.id} title={person.name} className={`flex ${index > 0 ? OVERLAP[size] : ''}`}>
          <Avatar src={person.src ?? null} alt={person.name} name={person.name} size={size} fallback="initials" className={ring} />
        </span>
      ))}
      {rest.length > 0 && (
        <span
          title={rest.map((person) => person.name).join(', ')}
          className={`${box} ${shown.length > 0 ? OVERLAP[size] : ''} ${ring} flex shrink-0 items-center justify-center bg-bg-tertiary text-text-secondary`}
        >
          <Text size={initial} weight="bold" tone="inherit">{`+${rest.length}`}</Text>
        </span>
      )}
    </div>
  )
}
