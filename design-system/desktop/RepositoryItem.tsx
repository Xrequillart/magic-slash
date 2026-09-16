import { AlertTriangle, ChevronRight, FolderGit2 } from './icons'
import { Icon } from './Icon'
import { Item } from './Item'
import { Label } from './Label'
import { PR_COLOR } from './prTones'
import { Text } from './Text'

/**
 * One repository as the settings list shows it: its name, whether it has a remote,
 * where it is on this disk, and how many agents are in it right now.
 *
 * NOT `RepositoryCard`, and the two are worth telling apart. That one is the agent
 * sidebar's panel — a stack of blocks describing the WORK happening in a repository,
 * branch and diff and commits. This is a ROW in a list you scan: four facts and a
 * chevron, and the only thing you can do with it is open it.
 *
 * THE CHROME IS `Item`'S, and that is the change that made this worth extracting twice.
 * The row wore `border-line-strong` all the way round its own plate, and eight of them
 * drew a ladder of hairlines down the panel — a table's rules without a table's columns.
 * Then it wore a plate of its own with a gap either side, which made a list of eight read
 * as eight cards that happened to be near each other.
 *
 * It is FLUSH now, on the ground, the hover, the rule and the radius `PlanItem` stands
 * on: one panel divided into eight. Two lists of rows in one app, reached from the same
 * tab strip, had two answers to what a list of rows looks like, and `Item` is the one
 * answer. Everything below this line is about the CONTENTS of the row and nothing else.
 *
 * WHAT IT IS ON THE LEFT, WHAT IS TRUE OF IT ON THE RIGHT. The name and the path are
 * the repository; the remote and the agent count are states it happens to be in. Those
 * two used to sit on either side of the row — the remote beside the name, the count at
 * the far edge — which put one fact of a pair in the title and the other in the margin.
 * Gathered at the right edge they read as one column of statuses a reader can scan
 * straight down, and the left column is then only ever a name over a path.
 *
 * THE NAME IS A PLATE AND THE PATH IS TEXT, which is the hierarchy inside that left
 * column: the name is what you are scanning FOR, so it is a chip the eye finds at the
 * same height on every row, and the path is what you read once you have found it. A
 * chip around a filesystem path would be a plate around the longest string on the line.
 *
 * THE STATUSES ARE A RUNG UNDER THE NAME, not level with it. They are an aside to the
 * names running down the column, and at the same rung the row had three chips of equal
 * weight and no title.
 *
 * THE MARK IS INSIDE THE NAME'S PLATE, where it used to be a 32px tile of its own in
 * front of the row. The glyph is the same folder on every row and carries nothing by
 * itself — what it does is give the name a left edge that lines up down the column, and
 * pair it with the GitHub mark beside it so the top line reads as two chips rather than
 * as a word and a chip. It is fixed and not a prop, for `HeaderRepoCard`'s reason: a
 * repository has no mark of its own to be recognised by, its COLOUR does that job, and
 * offering a choice of folder would be a prop nobody has a second answer for.
 */

export interface RepositoryItemProps {
  /** The repository's name. What truncates when the row runs out of room. */
  name: string
  /**
   * The repository's hue, one of the sixteen the app assigns at runtime. It tints the
   * name's plate AND paints the folder mark on it — the one place a `Label` draws its
   * glyph in the ground's own colour, because that colour is the only thing telling two
   * of these rows apart. A VALUE and not a class: it is picked while the app is running, so
   * Tailwind never saw it. Without one the name sits on the neutral plate, which is
   * the right answer for a repository nobody has coloured.
   */
  color?: string
  /**
   * The GitHub chip: whether the repository has a remote, and the WORD for it —
   * translated, because a design system has no dictionary.
   *
   * Absent draws nothing, and that is a real state rather than a default: a
   * repository with no local folder bound has not been looked at yet, so "no remote"
   * would be a verdict on a question nobody has asked.
   */
  remote?: { connected: boolean; label: string }
  /** Where it is on this disk. */
  path?: string
  /**
   * Replaces the path when there is no local folder bound, in the warning's own
   * yellow: the translated line saying so, and what to do about it.
   */
  missingPath?: string
  /**
   * How many agents are working in it, ALREADY COUNTED AND ALREADY WORDED — "3
   * agents", not `3`. The plural rule belongs to the app's catalogue and not to a
   * component that cannot know which language it is rendering in.
   */
  agents?: string
  /** Where the row goes. `Item` renders an `<a>` for it, which is what a row of a list is. */
  href: string
  /**
   * Placement. NOT a margin, which is the one thing it used to be for: the rows are
   * flush now, and a gap between two of them breaks the stack the first and last radii
   * are describing. Not the ground, the padding or the order either.
   */
  className?: string
}

export function RepositoryItem({
  name,
  color,
  remote,
  path,
  missingPath,
  agents,
  href,
  className = '',
}: RepositoryItemProps) {
  return (
    <Item href={href} className={className}>
      {/* WHAT THE REPOSITORY IS, and it is the only part of the row that gives way.
          `min-w-0` on the column and on the name inside it: a flex child will not
          shrink below its content without it, so a long name would push the status
          chips off the row instead of ellipsising.

          `gap-2` AND NOT `gap-1`: the name is a plate and the line under it is bare
          12px text, and at 4px the path sat against the bottom of the chip as though
          it belonged to it. The gap is what says the second line is a different KIND
          of thing — a caption under the row's title, not its second field. */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* WRAPPED IN A ROW, and it is not decoration. The column stretches its
            children to its own width, and a `Label` stretched to full width is a plate
            running the length of the row with a short name floating at one end of it.
            A row that is only ever one item long sizes that item to its content, and
            `min-w-0` is what still lets it truncate. */}
        <div className="flex min-w-0 items-center">
          <Label size="md" icon={FolderGit2} color={color} title={path ?? name} truncate>
            {name}
          </Label>
        </div>

        {missingPath ? (
          <span className="flex items-center gap-1 text-yellow">
            <Icon glyph={AlertTriangle} size="xs" className="flex-shrink-0 text-yellow" />
            <Text size="xs" tone="inherit" className="truncate">
              {missingPath}
            </Text>
          </span>
        ) : (
          path && (
            <Text size="xs" tone="secondary" title={path} className="truncate">
              {path}
            </Text>
          )
        )}
      </div>

      {/* WHAT IS TRUE OF IT RIGHT NOW, gathered at the far edge and never shrinking.
          The remote and the agent count left the title line to sit here together: they
          are the same kind of fact — a state the row REPORTS, where the name and the
          path are what the row IS — and a status that changes rank depending on which
          column it sits in is a status you have to hunt for. One rung under the name,
          both of them, so the column of chips reads as an aside to the names beside
          it rather than as a second title. */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {remote && (
          // `PR_COLOR` rather than `bg-green/10 text-green` spelled here: `Label`
          // takes a colour as a VALUE, and this is the folder's one table of the
          // palette in that form. Green and red and not the grey the `github` tone
          // would paint — the chip's job on this row is the verdict, not the brand.
          <Label size="sm" tone="github" color={PR_COLOR[remote.connected ? 'green' : 'red']}>
            {remote.label}
          </Label>
        )}

        {/* THE ACCENT, and the one place this row spends it. The name wears the
            repository's own hue and the remote chip wears a verdict; the count is the
            only thing on the row that is about THIS app, so it takes this app's
            colour. The fallback is the theme's own — an undefined variable makes the
            whole `color-mix` invalid, and a chip with no plate at all is a worse
            failure than a slightly wrong indigo. */}
        {agents && <Label size="sm" color="rgb(var(--c-accent, 99 102 241))">{agents}</Label>}
      </div>

      <Icon
        glyph={ChevronRight}
        size="sm"
        tone="muted"
        className="flex-shrink-0 transition-colors group-hover:text-icon"
      />
    </Item>
  )
}
