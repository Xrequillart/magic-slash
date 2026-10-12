import { Icon } from './Icon'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * ONE THING WORTH KNOWING, on a quiet plate: a mark, a heading, and a paragraph
 * explaining it.
 *
 * IT IS A DEFINITION AND NOT AN ALERT, which is the whole distinction between this and
 * `Banner`. A banner addresses the reader about the surface they are looking at — it is
 * there because something is true right now, and it goes away when that stops being
 * true. A note is there whether or not anything is happening: it answers "how is this
 * number arrived at", "what happens past the cap", "where do I change it". Nothing about
 * it is coloured, because nothing about it is urgent.
 *
 * THEY COME IN GRIDS. One note is a sentence somebody should have put in the sentence
 * above; the shape earns its keep when a page has to explain a mechanism in six parts,
 * each short enough to read in place and none worth a page of its own. The grid is the
 * CALLER'S — how many columns a set of notes wants depends on the column it is in, which
 * this folder cannot know.
 *
 * THE PLATE IS A FIELD'S, for `BudgetMeter`'s reason: `surface-subtle` is the ground
 * the app gives something inert, and `Card`'s `bg-surface` is the raised panel these
 * sit inside.
 *
 * NO OUTLINE, and that is the difference between a grid of these and a grid of boxes.
 * The tint already says where the tile ends; a hairline around it is a second answer to
 * the same question, and six of them in a 2x3 grid draw a table nobody asked for — the
 * eye starts following the rules instead of reading the notes. `BudgetMeter` dropped
 * its own for the same reason, so the two quiet plates in this folder now agree: a tint
 * is an edge, and nothing on `surface-subtle` needs a second one.
 */

export interface NoteCardProps {
  /** The mark in front of the heading. From `@ds/desktop/icons`. */
  icon: IconComponent
  /** What it is about, in two or three words. Translated. */
  title: string
  /**
   * The explanation. A STRING, for `Text`'s reason — a note that needed a link, a list
   * or a second paragraph is a note that has outgrown a tile.
   */
  children: string
  /** Margins and width. Not the plate, the padding, the radius or the gaps. */
  className?: string
}

export function NoteCard({ icon, title, children, className = '' }: NoteCardProps) {
  return (
    <div
      className={`flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-surface-subtle ${className}`.trim()}
    >
      <div className="flex items-center gap-1.5">
        {/* `sm` — 16px — and `muted`: the mark is here to tell one tile from the next in
            a grid of six, not to be read. A `default` glyph would be the loudest thing
            on a plate whose whole job is to be quiet. */}
        <Icon glyph={icon} size="sm" tone="muted" className="flex-shrink-0" />
        <Text weight="bold" tone="secondary" className="min-w-0 truncate">
          {title}
        </Text>
      </div>
      {/* `leading-relaxed` because this is the one place in the folder that draws a
          PARAGRAPH: `Text`'s own leading is set for a row's single line, and three lines
          of explanation at that leading read as a block rather than as prose. */}
      <Text size="2xs" tone="secondary" className="block leading-relaxed opacity-70">
        {children}
      </Text>
    </div>
  )
}
