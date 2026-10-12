import { Label, type LabelSize } from '@ds/desktop'

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
export function PlanIdBadge({ number, size = 'sm' }: { number?: number; size?: LabelSize }) {
  if (typeof number !== 'number') return null

  // `magic-slash` tone: our own mark on the grey plate a tracker with no brand colour
  // gets. The scale, the ground and the mark all live in `Label` now — this file is
  // down to the one decision that is its own, which is what a plan's id actually is.
  //
  // `tabular-nums` so a column of `#7` and `#128` keeps its digits on one grid.
  return (
    <Label tone="magic-slash" size={size} className="tabular-nums">
      {`#${number}`}
    </Label>
  )
}
