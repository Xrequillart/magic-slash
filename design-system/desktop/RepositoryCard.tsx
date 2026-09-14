import type { ReactNode } from 'react'
import { BranchCard, type BranchCardProps } from './BranchCard'
import { Card } from './Card'
import { CommitCard, type CommitCardProps } from './CommitCard'
import { HeaderRepoCard, type HeaderRepoCardProps } from './HeaderRepoCard'
import { UnCommittedChangesCard, type UnCommittedChangesCardProps } from './UnCommittedChangesCard'

/**
 * One repository, as an agent's sidebar shows it: what it is called, where the work is,
 * what has changed, what has been committed, and what is open on GitHub.
 *
 * IT DRAWS ITS OWN BLOCKS. `HeaderRepoCard`, `BranchCard`, `UnCommittedChangesCard` and
 * `CommitCard` are imported here and rendered here; what arrives from the caller is their
 * DATA. They used to be `ReactNode` slots, and that was the mistake: which component goes
 * in which row is a style decision, and a slot posts it out to the call site where no
 * drawing of this card can reach it. The design system is style, so the style lives here.
 *
 * THE ORDER IS THE MEANING. It runs from what this repository IS down to what is happening
 * to it: the name, then whatever is running right now, then the branch, then the working
 * tree, then what is already committed, then the pull request. A reader scanning four of
 * these down a column finds the same thing in the same place in each. Named props rather
 * than `children` for exactly that: a caller cannot put the branch under the commits.
 *
 * TWO THINGS STAY NODES and both are the same exception: they are not drawings. The
 * scripts running on this repository track live processes, and the pull-request watcher
 * polls GitHub and types slash commands into a terminal. A folder that cannot import the
 * app cannot own either, so the card owns WHERE they sit and nothing else.
 *
 * `flex flex-col gap-2` AND NOT A `mb-2` PER BLOCK, which is what this was. A margin
 * belongs to whichever block happens to be last and stacks on top of the card's own
 * padding — the card had 12px of padding above its header and 20px under its last row.
 * A gap sits BETWEEN children only, and it also skips the slots that render nothing,
 * which margins could not.
 *
 * `Card`'s `regular` padding, which is the sidebar COLUMN's and not this card's own
 * choice: the usage card, the ticket card and the spec panel all state it, and at one
 * rung tighter this card sat 4px narrower than the ones above it — a stepped left edge
 * running down the column, the kind of thing that reads as sloppiness without the
 * reader being able to name it.
 */

export interface RepositoryCardProps {
  /**
   * The row that names it. REQUIRED, and the only one that is: a card with no name on it
   * is a plate, and every other block here is something this repository may simply not
   * have yet.
   */
  header: HeaderRepoCardProps
  /**
   * Straight under the row that launched them: what is running right now.
   *
   * A NODE, and the reason is not shyness — a running script is a live process with a
   * terminal behind it, not a shape this card could draw from four values.
   */
  activity?: ReactNode
  /** Where the work is. */
  branch?: BranchCardProps
  /** The working tree. */
  changes?: UnCommittedChangesCardProps
  /** What the branch has that its base does not. */
  commits?: CommitCardProps
  /**
   * What to say when the three above have nothing to say.
   *
   * DRAWN ONLY WHEN ALL THREE ARE ABSENT, and that test is here rather than at the call
   * site because it is the same test every caller would write and the one they would get
   * wrong: an empty state shown beside a branch row is a card contradicting itself.
   *
   * Absent rather than empty when the repository FAILED to read: a tree nobody could look
   * at has an error to report, not a quiet "nothing to commit". Only the app can tell those
   * two apart, so it decides by passing this or not.
   */
  emptyLabel?: string
  /**
   * Last, and its own card: the pull request.
   *
   * A NODE for `activity`'s reason. The app's watcher polls GitHub, holds its own state and
   * writes into a terminal; the site's drawings pass `PullRequestCard` straight through.
   */
  pullRequest?: ReactNode
  /** Margins and width. Not the ground, the padding or the order. */
  className?: string
}

export function RepositoryCard({
  header,
  activity,
  branch,
  changes,
  commits,
  emptyLabel,
  pullRequest,
  className = '',
}: RepositoryCardProps) {
  const hasGit = Boolean(branch || changes || commits)

  return (
    <Card className={`flex flex-col gap-2 ${className}`.trim()}>
      <HeaderRepoCard {...header} />
      {activity}
      {branch && <BranchCard {...branch} />}
      {changes && <UnCommittedChangesCard {...changes} />}
      {commits && <CommitCard {...commits} />}
      {!hasGit && emptyLabel && (
        <div className="bg-ink/5 rounded-lg p-2">
          <span className="text-xs text-text-secondary/40 italic">{emptyLabel}</span>
        </div>
      )}
      {pullRequest}
    </Card>
  )
}
