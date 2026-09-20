import { Banner, type BannerAction, type BannerVariant } from './Banner'
import { Card } from './Card'
import { Label } from './Label'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * A FACT ABOUT A SET OF THINGS, AND THE THINGS — a `Banner` across the top of a card
 * and, under the hairline, one row per thing it counts.
 *
 * IT EXISTS BECAUSE A BANNER COUNTS BUT CANNOT NAME. "3 skills have descriptions
 * longer than 110 words" is a banner's whole sentence, and the reader's next question
 * is always *which three*. `Banner.children` is a string on purpose — a strip that
 * took a node would be a strip every call site could put its own chrome on — so the
 * naming is somebody else's job, and that somebody was two hand-built boxes on the
 * skills page: `rounded-lg bg-orange/10 border border-orange/20 px-3 py-2.5`, written
 * out twice, each with its own pair of buttons spelled `text-orange border
 * border-orange/20` by hand. This is the shape they were both reaching for.
 *
 * THE DIVISION OF LABOUR IS THE POINT. The band is a `Banner` and takes everything a
 * banner takes, including its actions — so the fix button is the variant's colour and
 * the ranking is the banner's, not the caller's. The body is rows of DATA, so the card
 * draws them and no call site gets to decide what a row looks like. Between them, the
 * card's hairline: an `inset` banner is defined as sitting between two of them, and
 * this is the one that is not the card's own edge.
 *
 * WHAT IT IS NOT: `RepairList` is the other way round — a list of faults where each row
 * has its OWN fix, and no headline over them because there is no single fact to state.
 * Reach for that one when the rows disagree about what to do; reach for this one when
 * one sentence covers all of them and the rows are only the evidence.
 */

/**
 * WHERE A ROW WAS FOUND, or whatever else it wears at its end — a `Label` at the
 * scale of a chip inside a row.
 *
 * A LIST AND NOT A SINGLE ONE, because the thing that makes a row worth listing is
 * sometimes that it is in two places at once: a skill name used by both a plugin and
 * the repository is a duplicate precisely because it has two of these.
 */
export interface NoticeCardTag {
  /** The word on the plate, already translated. */
  label: string
  /**
   * The plate's hue, as a CSS VALUE — `Label.color`'s contract exactly, so
   * `rgb(var(--c-blue, 59 130 246))` rather than a class.
   *
   * THE CALLER'S AND NOT THIS FILE'S. What a colour MEANS here is a fact about the
   * caller's domain — the skills page decides that built-in is the accent and a
   * repository is blue — and a table of those meanings in a design system would be
   * the app's vocabulary stored in the shared folder. Left out, the label wears its
   * neutral ground.
   */
  color?: string
}

export interface NoticeCardRow {
  /** Stable across renders. The name is usually it; it is separate because it need not be. */
  id: string
  /**
   * THE THING NAMED. Truncates, with the full string as its tooltip — a row is
   * evidence and a card is not always wide.
   *
   * DRAWN IN SENTENCE CASE, which is the one typographic decision this card makes
   * about its own rows: what goes here is an identifier the caller reads off a file
   * — `brand-designer`, `magic-commit` — and an identifier set flush in lower case
   * among sentences reads as a symbol rather than as a name.
   */
  name: string
  /**
   * The measurement behind it, quiet at the row's end — "142 words", "3x".
   *
   * SECONDARY INK AND NOT THE VARIANT'S COLOUR. A warning's rows are not each a
   * warning; the band above them already carries the severity, and a column of orange
   * figures under an orange band is the same statement made twice.
   */
  detail?: string
  tags?: NoticeCardTag[]
}

export interface NoticeCardProps {
  /** The band's tone. `Banner`'s own default — `info` — when left out. */
  variant?: BannerVariant
  /** Overrides the variant's mark. See `Banner.icon`. */
  icon?: IconComponent
  /** The sentence, already translated. A string, for `Banner.children`'s reason. */
  children: string
  /** The quieter second line under it. See `Banner.hint`. */
  hint?: string
  /**
   * What can be done about ALL of them, in the band — as data, ranked, drawn by the
   * banner in the variant's colour.
   *
   * IN THE BAND AND NOT IN THE ROWS, and that is the choice that separates this card
   * from `RepairList`. These buttons act on the whole set: "Fix with agent" hands the
   * agent every row at once. A fix that differs per row is a different card.
   */
  actions?: BannerAction[]
  /**
   * The evidence. EMPTY DRAWS NO BODY AND NO HAIRLINE — the card is then the band
   * alone, which is the right shape for a fact with nothing to enumerate rather than
   * an empty plate under it.
   *
   * WHETHER TO RENDER AT ALL IS THE CALLER'S. A card with no rows is legitimate; a
   * card with nothing to say is a card the caller should not have asked for, and this
   * folder cannot tell the two apart.
   */
  rows?: NoticeCardRow[]
  /** Margins and width. Not the ground, the radius or the padding — those are the card. */
  className?: string
}

export function NoticeCard({
  variant,
  icon,
  children,
  hint,
  actions,
  rows = [],
  className = '',
}: NoticeCardProps) {
  return (
    // `padding="none"` AND `overflow-hidden`, and both are load-bearing. The band is
    // full-bleed: an `inset` banner spans its card edge to edge and is square-cornered
    // for it, so a card that paid its own `p-4` would leave a frame of surface showing
    // around the tint, and one that did not clip would square off its own top corners.
    <Card padding="none" className={`overflow-hidden ${className}`.trim()}>
      <Banner variant={variant} icon={icon} layout="inset" hint={hint} actions={actions}>
        {children}
      </Banner>
      {rows.length > 0 && (
        // The second of the two hairlines an `inset` band sits between; the card's own
        // edge is the first. `px-3` is the band's own gutter, so a row's name starts on
        // the same x as the sentence above it.
        <ul className="flex flex-col gap-1.5 border-t border-line px-3 py-2.5">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2">
              {/* `min-w-0 flex-1` so the NAME is what gives way when the card narrows:
                  the detail and the tags are short and fixed, and a truncated "142
                  words" is not a measurement. */}
              <Text className="min-w-0 flex-1 truncate capitalize" title={row.name}>
                {row.name}
              </Text>
              {row.detail && (
                <Text size="2xs" tone="secondary" className="flex-shrink-0">
                  {row.detail}
                </Text>
              )}
              {row.tags?.map((tag, i) => (
                // `2xs` — 16px, the rung `Label` calls a chip inside a chip, which is
                // what a plate at the end of a 20px row is. Keyed on the word plus its
                // place because two tags on one row can legitimately read the same:
                // a skill in two repositories is named by two chips saying "repo".
                <Label key={`${tag.label}-${i}`} size="2xs" color={tag.color} className="flex-shrink-0">
                  {tag.label}
                </Label>
              ))}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
