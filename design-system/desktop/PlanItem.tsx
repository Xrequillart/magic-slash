import { FolderGit2, MessageSquare, Ticket, UserLock } from './icons'
import { Item } from './Item'
import { Label } from './Label'
import { Status, type StatusTone } from './Status'
import { Text } from './Text'

/**
 * One plan, as one dense line — the row the Plans list is made of.
 *
 * WHAT IT SAYS is what the webapp's `/plans` list says, in the same order: the plan's
 * number and its title, the status and when it was started, an excerpt of the idea, then
 * the repository, the author and the ticket count. The two lists are read by the same
 * people about the same sessions, so they name the same things in the same order.
 *
 * IT KNOWS NOTHING, which is the whole of what moving it here changed. The row this
 * replaces read the store for the repository colours, called the translator for four of
 * its own strings, counted the tickets and worded the plural, and resolved a cloud
 * repository id to a local config key. All of that is still true of the Plans page and
 * none of it is true HERE: every string arrives translated, the count arrives worded, the
 * colour arrives as a value. The app's `PlanRow` is what does the wiring now, and it is
 * thirty lines.
 *
 * THE CHROME IS `Item`'S — the ground, the hover, the rule against the row above, the
 * radius at the two ends of the stack and the focus ring. A plan row and a repository row
 * are the same object with different contents, and that was not true before: one was a
 * flush list on a framed ground, the other eight separate plates.
 *
 * CHIPS ON THE LAST LINE, not phrases separated by spaces. Each is a fact with a mark and a
 * value — the repository and its colour, the author and their face, the counts and their
 * glyphs — which is what `Label` is for. Loose text ran them together into one grey sentence
 * whose parts had to be picked apart by reading. The last of them, the discussion, is the
 * only one in a colour: it is the only one that is not true of every plan.
 */

export interface PlanItemProps {
  /**
   * The plan's own number, drawn as `#7` on the grey plate a tracker with no brand
   * colour of its own gets — our mark instead of GitHub's.
   *
   * OPTIONAL, and absent draws nothing rather than `#` or `#0`: a row written before the
   * migration that gave plans their numbers has none, and a badge reading `#0` would look
   * like a plan that exists at position zero.
   */
  number?: number
  /** The plan's name. What truncates when the row runs out of room. */
  title: string
  /**
   * What state the plan is in: the word, translated, and the colour it is drawn in.
   *
   * INERT — `Status` with no options, so nothing about it invites a press. An agent's
   * status is SET from its pill; a plan's is derived from whether its tickets exist, and
   * a plate that lit up under the cursor and did nothing would be lying about which of
   * the two this is.
   */
  status: { label: string; tone: StatusTone }
  /**
   * When it was started, ALREADY WORDED — "3d ago", not a timestamp. The relative
   * phrasing belongs to the app's catalogue and not to a component that cannot know
   * which language it is rendering in.
   */
  when?: string
  /**
   * One line of the idea. It is there to tell two plans on the same repository apart,
   * which the first line always does; a paragraph here would turn the list back into a
   * stack of cards, so it is clamped to one line whatever arrives.
   */
  idea?: string
  /**
   * The repository, as its COLOURED MARK and its name.
   *
   * That colour is how the same repository is recognised on the Tasks board and in the
   * agent sidebar. The name stays beside it: the colour tells two rows apart at a glance,
   * it does not say which repository this is to someone reading their first plan.
   *
   * `color` is a VALUE the caller resolved and may legitimately be absent — a plan on an
   * organization repository this machine has never cloned has no local entry to take a
   * colour from. `Label` draws its neutral plate for it, which is the honest look for a
   * repository this app knows no colour for.
   */
  repository: { label: string; color?: string }
  /**
   * Who wrote it. `alt` is the label's own, and it is EMPTY on purpose — the author is
   * named in the very next breath, and an alt repeating the adjacent word makes a screen
   * reader say the same person twice per row. `src: null` is an author with no photo,
   * which draws the bare glyph in the label's own mark colour.
   */
  author: { name: string; avatarUrl?: string | null }
  /**
   * How many tickets it produced, ALREADY COUNTED AND ALREADY WORDED — "7 tickets", not
   * `7`, and "no ticket" rather than a hidden chip. `RepositoryItem` takes its agent
   * count the same way and for the same reason: the plural rule is the app's.
   */
  tickets: string
  /**
   * How much has been said about it, ALREADY COUNTED AND ALREADY WORDED — "3 comments".
   *
   * ABSENT IS A PLAN NOBODY HAS WRITTEN ON, and it draws nothing at all, where the ticket
   * count beside it always draws something. The two are not the same kind of fact: a plan
   * with no tickets was never broken down, which is worth stating on the row, and a plan
   * with no comments is simply the ordinary one — a column of "no comment" would be a column
   * of nothing, in the annotation colour, down a list where most rows have never been
   * discussed.
   *
   * In the orange every comment in this app wears, so a reader scanning the list for the
   * plans that are under discussion finds them without reading a word.
   */
  comments?: string
  /**
   * That the plan is its author's alone, ALREADY WORDED — "Personal". Drawn as one more
   * chip, with a lock on a person, after the counts.
   *
   * ABSENT ON A SHARED PLAN, which is the ordinary case on a team repository, and the only
   * one anybody else ever sees: a personal plan is shown to its author and nobody else, so
   * the chip tells the one reader who can see it that their colleagues cannot.
   */
  personal?: string
  /** Opens the plan. The whole row is the target. */
  onSelect: () => void
  /**
   * Placement. NOT a margin: the rows are flush, and a gap between two of them breaks
   * the stack the first and last radii are describing.
   */
  className?: string
}

export function PlanItem({
  number,
  title,
  status,
  when,
  idea,
  repository,
  author,
  tickets,
  comments,
  personal,
  onSelect,
  className = '',
}: PlanItemProps) {
  return (
    /* `align="start"`: this row is three lines, and the status and the date at the right
       edge belong beside the TITLE rather than beside the middle of the stack. */
    <Item align="start" onClick={onSelect} className={className}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          {/* The plan's id, left of its name, exactly where a ticket wears its key.
              `tabular-nums` so a column of `#7` and `#128` keeps its digits on one grid. */}
          {typeof number === 'number' && (
            <Label tone="magic-slash" className="tabular-nums">{`#${number}`}</Label>
          )}
          <span className="truncate text-sm font-medium text-ink">{title}</span>

          {/* THE RIGHT-HAND PAIR: what state this plan is in, and when it was started.
              Both are fixed-width facts every row has, so they hold a column each on the
              right edge and read straight down the list — where the title's length, and
              the badge's, vary. The date has no mark: it is the one piece of metadata
              whose shape already says what it is. */}
          <span className="ml-auto flex flex-shrink-0 items-center gap-2">
            <Status label={status.label} tone={status.tone} />
            {when && (
              <Text size="xs" tone="secondary" className="opacity-50">
                {when}
              </Text>
            )}
          </span>
        </div>

        {idea && (
          <Text size="xs" tone="secondary" className="line-clamp-1">
            {idea}
          </Text>
        )}

        {/* `gap-1.5` rather than a wider gutter: these chips carry their own padding, so
            the space that separated bare words now separates plates. */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Label icon={FolderGit2} color={repository.color} title={repository.label} truncate>
            {repository.label}
          </Label>
          <Label avatar={{ src: author.avatarUrl ?? null, alt: '' }} truncate>
            {author.name}
          </Label>
          <Label icon={Ticket}>{tickets}</Label>
          {comments && <Label icon={MessageSquare} color="rgb(var(--c-orange))">{comments}</Label>}
          {personal && <Label icon={UserLock}>{personal}</Label>}
        </div>
      </div>
    </Item>
  )
}
