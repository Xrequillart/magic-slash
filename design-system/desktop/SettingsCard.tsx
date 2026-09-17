import { Card } from './Card'
import { SettingRow, type SettingRowProps } from './SettingRow'

/**
 * A CARD OF SETTINGS: several rows of the same kind, stacked, with a hairline between
 * each pair.
 *
 * ── THE SHAPE `SettingRow` LEFT BEHIND ────────────────────────────────────────────
 *
 * `SettingRow` settled what ONE setting looks like, and every settings page then went on
 * spelling out what a GROUP of them looks like: `bg-surface border border-line-strong
 * rounded-xl p-4 space-y-4` with a loose `<div className="border-t border-line-subtle" />`
 * pushed between the rows by hand. Fifteen copies across Application, Appearance,
 * Notifications and the repository tabs, and they had already drifted — some carried the
 * border, some had dropped it; some spaced at `space-y-4`, some at `gap-4`; and whether a
 * card ended on a divider depended on which row happened to be last that week.
 *
 * SO THE SEPARATOR IS NOT A ROW. It is what sits BETWEEN two of them, which is the one
 * thing a hand-placed `<div>` can never promise: the last row cannot be followed by a
 * rule, a single-row card cannot draw one at all, and a row that stops being rendered
 * cannot leave its divider behind. That was the actual bug this component removes, and it
 * is why the rows arrive as a LIST rather than as children.
 *
 * ── THE ROWS ARE DATA ─────────────────────────────────────────────────────────────
 *
 * `SettingRowProps` each, and the card draws them — this folder's rule, and here it is
 * what makes the paragraph above true. Children would hand the spacing back to the call
 * site the moment one of them was a fragment, and the card would be counting nodes it
 * cannot see inside.
 *
 * A row that must not appear is a row LEFT OUT of the list, not one rendered inert: the
 * app's notifications tab hides everything under a master switch, and a card of controls
 * that cannot do anything is noise. `false` and `undefined` survive the list so a caller
 * can write `enabled && row` inline; they are dropped before anything is counted, so the
 * hairlines land between what is actually on screen.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────────────
 *
 * Not a section: the heading above these cards is `SectionHeader`, and an icon and a
 * title belong to the region, not to the plate the controls stand on. Not the small print
 * under a card either — that line is about where the value is STORED or what happens when
 * the switch is off, it holds true of the whole section, and it sits outside the plate
 * where the page can put it.
 */

/** One row of the card. `SettingRow`'s own props, plus a key that is not the index. */
export type SettingsCardRow = SettingRowProps & {
  /**
   * Stable across renders — the setting's name in the config, typically.
   *
   * The index will not do: rows come and go (a master switch, a picker offered only
   * while something is on), and React would then carry a row's switch state over to
   * whichever row slid into its place.
   */
  id: string
}

export interface SettingsCardProps {
  /**
   * The rows, top to bottom. `false` and `undefined` are dropped — see the header.
   *
   * Nothing left to draw means nothing is drawn: an empty plate is a card promising
   * settings it does not have.
   */
  rows: (SettingsCardRow | false | null | undefined)[]
  /** Margins and width. Not the ground, the padding, the radius or the gaps. */
  className?: string
}

export function SettingsCard({ rows, className = '' }: SettingsCardProps) {
  const shown = rows.filter((row): row is SettingsCardRow => Boolean(row))
  if (shown.length === 0) return null

  return (
    <Card className={`flex flex-col gap-4 ${className}`.trim()}>
      {shown.map(({ id, ...row }, index) => (
        // The rule belongs to the row BELOW it, not to the one above: written that way
        // the last row cannot trail one, and a card of one row never draws one.
        <div key={id} className={index > 0 ? 'border-t border-line-subtle pt-4' : ''}>
          <SettingRow {...row} />
        </div>
      ))}
    </Card>
  )
}
