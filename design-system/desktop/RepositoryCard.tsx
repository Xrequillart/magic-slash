import type { ReactNode } from 'react'
import { Card } from './Card'

/**
 * One repository, as an agent's sidebar shows it: what it is called, where the work is,
 * what has changed, what has been committed, and what is open on GitHub.
 *
 * IT IS THE ARRANGEMENT, and that is the whole component. Every block it holds already
 * draws itself — `HeaderRepoCard`, `BranchCard`, `UnCommittedChangesCard`, `CommitCard`,
 * `PullRequestCard` — and each is a fact. What was left over was the ORDER those facts
 * are read in, the air between them, and the plate they all sit on; three things that
 * lived as markup in one app file and as a copy of that markup in every drawing of it.
 *
 * THE ORDER IS THE MEANING. It runs from what this repository IS down to what is
 * happening to it: the name, then whatever is running right now, then the branch, then
 * the working tree, then what is already committed, then the pull request. A reader
 * scanning four of these down a column finds the same thing in the same place in each.
 * Named slots rather than `children` for exactly that: a caller cannot put the branch
 * under the commits, because the order is not the caller's to decide.
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
   * The row that names it — `HeaderRepoCard`. REQUIRED, and the only slot that is: a
   * card with no name on it is a plate, and every other block here is something this
   * repository may simply not have yet.
   */
  header: ReactNode
  /**
   * Straight under the row that launched them: what is running right now. Absent when
   * nothing is.
   */
  activity?: ReactNode
  /** Where the work is — `BranchCard`. */
  branch?: ReactNode
  /** The working tree — `UnCommittedChangesCard`. */
  changes?: ReactNode
  /** What the branch has that its base does not — `CommitCard`. */
  commits?: ReactNode
  /**
   * What to say when the three above have nothing to say.
   *
   * DRAWN ONLY WHEN ALL THREE ARE ABSENT, and that test is here rather than at the call
   * site because it is the same test every caller would write and the one they would
   * get wrong: an empty state shown beside a branch row is a card contradicting itself.
   */
  empty?: ReactNode
  /** Last, and its own card — `PullRequestCard`. */
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
  empty,
  pullRequest,
  className = '',
}: RepositoryCardProps) {
  const hasGit = Boolean(branch || changes || commits)

  return (
    <Card className={`flex flex-col gap-2 ${className}`.trim()}>
      {header}
      {activity}
      {branch}
      {changes}
      {commits}
      {!hasGit && empty}
      {pullRequest}
    </Card>
  )
}
