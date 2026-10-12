import { Avatar } from './Avatar'
import { AVATAR_SIZES } from './avatarSizes'
import { splitAvatarStack } from './avatarStackOverflow'
import { Label } from './Label'
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
    // No `title` on the group: every face has its own pill, and a native tooltip in the
    // gaps between them would be a second, slower answer. The label stays the group's
    // accessible name.
    <div role="group" aria-label={label} className={`flex shrink-0 items-center ${className}`.trim()}>
      {shown.map((person, index) => (
        <span key={person.id} className={`relative flex group ${index > 0 ? OVERLAP[size] : ''}`}>
          <Avatar
            src={person.src ?? null}
            alt={person.name}
            name={person.name}
            size={size}
            fallback="initials"
            nativeTitle={false}
            className={ring}
          />
          <HoverPill text={person.name} />
        </span>
      ))}
      {rest.length > 0 && (
        <span className={`relative flex group ${shown.length > 0 ? OVERLAP[size] : ''}`}>
          <span
            className={`${box} ${ring} flex shrink-0 items-center justify-center bg-bg-tertiary text-text-secondary`}
          >
            <Text size={initial} weight="bold" tone="inherit">{`+${rest.length}`}</Text>
          </span>
          <HoverPill text={rest.map((person) => person.name).join(', ')} />
        </span>
      )}
    </div>
  )
}

/**
 * WHOSE FACE, the moment the pointer is on it: `ToggleButton`'s tooltip, to the class — a
 * `raised` `Label` under the mark, faded in on hover. The native `title` it replaces came
 * up a second late and in the platform's dress, where the quick settings' tiles already
 * answer at once in the app's own. Hover only, for that tooltip's reason (a pill left up
 * by the focus after the pointer has gone), out of the pointer's way, above the faces it
 * overlaps, and `aria-hidden` because the face's `alt` already says the name.
 */
function HoverPill({ text }: { text: string }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-full z-10 mt-1.5 -translate-x-1/2
        opacity-0 transition-opacity duration-150 group-hover:opacity-100"
    >
      <Label raised size="sm" className="whitespace-nowrap shadow-lg">{text}</Label>
    </span>
  )
}
