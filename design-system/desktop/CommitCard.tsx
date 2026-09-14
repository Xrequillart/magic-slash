import { CommitLine, CommitRail } from './CommitLine'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * What this branch has that its base does not: the commits, in order, on one rail.
 *
 * IT IS THE PANEL AND `CommitLine` IS THE ROW. The pair splits the way `BranchCard`
 * and the chips inside it do — one component draws a FACT, another arranges several
 * and says what the arrangement means. Here the arrangement is a sequence, and the
 * heading is what turns a stack of subjects into "three commits ahead of main".
 *
 * THE GROUND IS `bg-ink/5` ON A `rounded-lg`, which is `ACTION_CHIP`'s own two values
 * and therefore the same shape every other block in the repository card wears. Ink
 * rather than a surface: it is an OVERLAY, so it composes with the card beneath into a
 * visible step up, where surface on surface paints the same value twice and needs a
 * rule around it to be seen at all. `BranchCard` says the same thing about its chips.
 *
 * IT DRAWS EVERY COMMIT IT IS HANDED, and that is a deliberate refusal. The version
 * this came from took the whole list and sliced five off it, which put the number five
 * inside the component and the words "+N more commits" inside it too — so a caller
 * could show ten rows only by changing the design system, and the tail line could
 * disagree with the slice. The caller slices and writes its own tail; this arranges
 * what it is given. The rail is the only thing that has to know where the list ends,
 * and it learns that from `moreLabel` being there or not.
 */

/**
 * One row's worth of facts.
 *
 * `hash` AND `shortHash` BOTH, because they do different jobs: the short one is what
 * the chip shows and the long one is what the clipboard gets and what identifies the
 * row. A component that derived one from the other would be guessing at git's
 * abbreviation length, which is a repository setting.
 */
export interface CommitCardCommit {
  /** The full hash. The key, and what `onCopyHash` is handed. */
  hash: string
  /** The abbreviated hash, as git prints it. */
  shortHash: string
  subject: string
  /** Already formatted and already translated — see `CommitLine`'s note. */
  relativeDate: string
  /** Tooltip and accessible name for this row's copy control, translated. */
  copyLabel: string
  /**
   * Whether this one can be opened externally. The app's test is that the commit is
   * PUSHED and the repository has a known address; both are facts about the world
   * rather than about a row, so the caller decides and this only obeys.
   */
  openable?: boolean
}

export interface CommitCardProps {
  /** The heading word, translated. */
  label: string
  /**
   * The count, to the right of the heading — "3 ahead of main" — composed and
   * translated by the caller, because both halves of it are: the number is the
   * caller's unsliced total, and the base branch is its own.
   */
  summary?: string
  /** The rows to draw, in order. All of them: slice before you get here. */
  commits: CommitCardCommit[]
  /**
   * The tail line, when the caller is showing fewer commits than exist — "+2 more
   * commits", already composed.
   *
   * IT ALSO CHANGES THE RAIL. Present, the last drawn row keeps its lower segment and
   * this line continues it past a rail with no tick: the trail saying there is more of
   * this branch than the panel is showing. Absent, the rail stops at the last tick.
   */
  moreLabel?: string
  /** Which hash is on the clipboard right now, if any. Drives the tick on that row. */
  copiedHash?: string | null
  /** Handed the FULL hash, since that is what anyone pasting it wants. */
  onCopyHash: (hash: string) => void
  /**
   * Opening a commit somewhere else. One object for the whole card rather than one per
   * row: the mark and the words are the same on every line, and only the hash differs.
   */
  open?: {
    /** Tooltip and accessible name, translated. */
    label: string
    /** The mark, so this file never names a destination. */
    icon: IconComponent
    onOpen: (hash: string) => void
  }
  /** Margins and width. Not the ground, the radius or the rail. */
  className?: string
}

export function CommitCard({
  label,
  summary,
  commits,
  moreLabel,
  copiedHash,
  onCopyHash,
  open,
  className = '',
}: CommitCardProps) {
  return (
    <div className={`bg-ink/5 rounded-lg p-3 ${className}`.trim()}>
      {/* The heading carries the colour and both halves take it with `inherit`; the
          count dims one step further with the single class that has nothing to fight.
          Same arrangement as the row below — see `CommitLine`. */}
      <div className="flex items-center text-xs mb-1.5 text-text-secondary/70">
        <Text tone="inherit">{label}</Text>
        {summary && (
          <Text tone="inherit" className="ml-auto text-text-secondary/50">
            {summary}
          </Text>
        )}
      </div>

      {/* NO `space-y` ANYWHERE IN HERE. The rail is drawn per row, top edge to bottom
          edge, so the segments only join into one line while the rows actually touch —
          any gap would show as a broken trail. The rows carry their own `py-1`. */}
      <div>
        {commits.map((commit, index) => (
          <CommitLine
            key={commit.hash}
            subject={commit.subject}
            shortHash={commit.shortHash}
            relativeDate={commit.relativeDate}
            first={index === 0}
            // The last row closes the rail only when nothing continues it.
            last={index === commits.length - 1 && !moreLabel}
            copy={{
              label: commit.copyLabel,
              copied: copiedHash === commit.hash,
              onCopy: () => onCopyHash(commit.hash),
            }}
            open={
              open && commit.openable
                ? { label: open.label, icon: open.icon, onOpen: () => open.onOpen(commit.hash) }
                : undefined
            }
          />
        ))}

        {moreLabel && (
          <div className="flex items-center gap-2 text-xs py-1 text-text-secondary/40">
            {/* Rail, no tick: these commits are real but not drawn, and a tick for each
                of them would be a lie about how many there are. */}
            <CommitRail first={false} last tail />
            <Text tone="inherit">{moreLabel}</Text>
          </div>
        )}
      </div>
    </div>
  )
}
