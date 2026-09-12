import { MagicSlashIcon } from '../../components/icons/MagicSlash'

/**
 * A plan's id, as the badge a ticket wears — our mark instead of a tracker's.
 *
 * `#7`, THE DATABASE'S OWN NUMBER, sequential within the organization the plan is
 * visible in. It briefly showed the `slug` instead — the spec's filename — which reads
 * as a name and not an id, runs to sixty characters, and is explicitly not an identity:
 * two repositories can hold the same one and renaming the file changes it. A number is
 * short, permanent, and sayable, which is the whole job of the thing a badge carries.
 * Where it comes from and the one case where it moves: migration 20260912100000.
 *
 * GITHUB'S GREY, `bg-ink/5`, because that is what `TrackerBadge` gives an id with no
 * brand colour of its own, and this badge sits in lists beside those. Magic Slash has a
 * brand colour, but spending it here would make our own plans the loudest rows in a list
 * that also carries Jira's blue and the repositories' sixteen.
 *
 * NOTHING RENDERS WITHOUT A NUMBER, which is a row written before the migration and read
 * by a build that has it. A badge reading `#` or `#0` would be worse than the row simply
 * not having one yet: it would look like a plan that exists at position zero.
 */
/**
 * The two scales, and they are `TrackerBadge`'s own — same box, same radius, same mark
 * size — because a plan's badge and a ticket's stand in the same places and must be the
 * same object at each of them.
 *
 * `sm` is a list row and the pinned bar: rows of 12px type where the badge is the tallest
 * thing on the line. `md` is a page heading, beside `text-2xl`, where the small one read
 * as a caption that had come adrift from a title twice its size.
 */
const BADGE_SIZES = {
  sm: { box: 'h-6 gap-1.5 px-2 rounded-lg text-xs', mark: 'w-3.5 h-3.5' },
  md: { box: 'h-8 gap-2 px-2.5 rounded-xl text-sm', mark: 'w-4 h-4' },
} as const

export function PlanIdBadge({ number, size = 'sm' }: { number?: number; size?: keyof typeof BADGE_SIZES }) {
  if (typeof number !== 'number') return null

  const { box, mark } = BADGE_SIZES[size]

  return (
    <span className={`${box} font-medium inline-flex items-center flex-shrink-0 bg-ink/5 text-ink tabular-nums`}>
      <MagicSlashIcon className={`${mark} shrink-0`} />
      #{number}
    </span>
  )
}
