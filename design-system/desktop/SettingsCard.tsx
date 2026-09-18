import { Banner } from './Banner'
import { Card } from './Card'
import type { CardAlert } from './cardAlert'
import { SettingRow, type SettingRowProps } from './SettingRow'
import { Text } from './Text'

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
 * that sits OUTSIDE the plate either — the line about where a value is stored belongs to
 * the whole section, and the page draws it under the card with a `Text`.
 *
 * ── AND TWO THINGS THAT ARE NOT ROWS ──────────────────────────────────────────────
 *
 * `alert` and `note`, both on `AccountCard`'s model and for its reasons. A row is a thing
 * with a value you can change; "the system refused this shortcut" has no value and nothing
 * to set, and "your agents keep syncing regardless" is a fact about the card rather than
 * about any one row in it. Drawn under the rows, in that order — what is wrong first,
 * because it is the reason the reader stopped.
 */

/**
 * SOMETHING IS WRONG WITH WHAT IS SET HERE — one strip under the rows.
 *
 * `CardAlert`, which is the one shape the cards in this folder share, and `Banner` draws
 * it: that is what the app's hand-rolled `bg-red/10 border border-red/20 rounded-lg
 * text-xs text-red` strips were each approximating. The one on the Application tab is the
 * shape in a sentence — you picked a chord, the OS refused to register it, and the picker
 * above still shows what you picked, so the strip is the only thing saying it did not
 * take.
 */
export type SettingsCardAlert = CardAlert

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
  /**
   * A write that did not land, or a setting the system is refusing — see
   * `SettingsCardAlert`. Absent is the ordinary case and draws nothing.
   */
  alert?: SettingsCardAlert
  /**
   * THE SMALL PRINT, under everything: what holds true of the whole card.
   *
   * Where the recording goes and who can read it; that agents keep syncing whatever this
   * switch says. It is not a row — it names no setting — and it is not a row's `note`,
   * which is about that row's value. Translated.
   *
   * A LIST IS TWO PARAGRAPHS AND NOT TWO CARDS: the Application tab has a card whose
   * second line holds true in both states of the switch while the first only applies when
   * it is on, so the caller drops one and keeps the other.
   */
  note?: string | string[]
  /** Margins and width. Not the ground, the padding, the radius or the gaps. */
  className?: string
}

export function SettingsCard({ rows, alert, note, className = '' }: SettingsCardProps) {
  const shown = rows.filter((row): row is SettingsCardRow => Boolean(row))
  const notes = note === undefined ? [] : Array.isArray(note) ? note : [note]
  // A card with no rows but something to say is still a card: the caller dropped every
  // row behind a switch and kept the line explaining why. Empty of everything draws
  // nothing — an empty plate is a card promising settings it does not have.
  if (shown.length === 0 && !alert && notes.length === 0) return null

  return (
    <Card className={`flex flex-col gap-4 ${className}`.trim()}>
      {shown.map(({ id, ...row }, index) => (
        // The rule belongs to the row BELOW it, not to the one above: written that way
        // the last row cannot trail one, and a card of one row never draws one.
        <div key={id} className={index > 0 ? 'border-t border-line-subtle pt-4' : ''}>
          <SettingRow {...row} />
        </div>
      ))}
      {alert && (
        <Banner
          variant={alert.variant ?? 'danger'}
          icon={alert.icon}
          hint={alert.hint}
          actions={alert.actions}
          bordered
        >
          {alert.message}
        </Banner>
      )}
      {notes.map((line) => (
        <Text key={line} size="xs" tone="secondary" className="block leading-snug opacity-50">
          {line}
        </Text>
      ))}
    </Card>
  )
}
