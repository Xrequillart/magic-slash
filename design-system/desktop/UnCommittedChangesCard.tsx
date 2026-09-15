import { DiffStat } from './DiffStat'
import { FileModifiedLine } from './FileModifiedLine'
import { Text } from './Text'

/**
 * What the working tree has that git does not: the files you are in the middle of.
 *
 * IT IS THE PANEL AND `FileModifiedLine` IS THE ROW, the same split as
 * `CommitCard`/`CommitLine` next door — one component draws a FACT, another arranges
 * several and says what the arrangement means. Here the arrangement is a working
 * tree, and the heading is what turns four filenames into "seven files, mostly
 * additions, none of it committed".
 *
 * THE GROUND IS `bg-ink/5` ON A `rounded-lg`, which is `ACTION_CHIP`'s own two values
 * and therefore the same shape every other block in the repository card wears. Ink
 * rather than a surface: it is an OVERLAY, so it composes with the card beneath into
 * a visible step up, where surface on surface paints the same value twice and needs a
 * rule around it to be seen at all. `BranchCard` and `CommitCard` both say this.
 *
 * THE TOTALS ARE GIVEN, NOT SUMMED FROM THE ROWS. They are git's own numbers for the
 * whole tree, and the list may be a slice of it — a panel that added up what it could
 * see would quietly report a different diff from the one `git diff --stat` prints.
 * The caller owns the count, exactly as it owns `CommitCard`'s.
 *
 * A CLEAN TREE IS A STATE, NOT AN ABSENCE. Handed an `emptyLabel`, the panel stays on
 * screen with one line saying so instead of vanishing — because a card that disappears
 * makes the reader work out WHY: nothing to commit, or the poll has not answered, or
 * the repository was detached. It costs one row to say which, and the row below the
 * heading is the only place in the card where that sentence can go.
 *
 * WHICH IT WORKS OUT RATHER THAN BEING TOLD: no files, no additions, no deletions. The
 * three cannot disagree — a rename with no content change is +0 −0 but still a FILE, so
 * `files` is non-empty and this is not the clean case. What it is NOT is "the caller
 * sliced the list": totals with no rows is a real state and keeps the heading it had.
 *
 * WHETHER THE PANEL EXISTS AT ALL IS STILL THE CALLER'S. This one knows about a working
 * tree and nothing else, so a sentence that also claims something about the COMMITS —
 * the app's does — can only be true if whoever can see both decides to say it. The app
 * drops the whole panel instead when the branch is ahead: the commit card below is
 * already saying what is in flight, and a heading over an empty plate would be a second,
 * quieter way of saying nothing.
 */

/** One row's worth of facts. The shape `FileModifiedLine` draws, plus its identity. */
export interface UnCommittedChangesFile {
  /**
   * The path, relative to the repository root. The row's KEY and its tooltip, and
   * what `onOpenFile` is handed — the one value that identifies this file.
   */
  path: string
  /**
   * What the row actually shows. The app draws the basename, because a sidebar at
   * 288px has no room for `desktop/src/renderer/components/…` and the tail is the
   * half that says which file it is.
   */
  name: string
  additions: number
  deletions: number
}

export interface UnCommittedChangesCardProps {
  /** The heading words, translated. */
  label: string
  /**
   * The count, to the right of the heading — "7 files" — composed and translated by
   * the caller, because pluralising it is the caller's job and the number is the
   * caller's unsliced total.
   */
  summary?: string
  /** Lines added across the whole tree. Drives the numbers and the gauge. */
  additions: number
  /** Lines removed across the whole tree. */
  deletions: number
  /** The rows to draw, in order. All of them: slice before you get here. */
  files: UnCommittedChangesFile[]
  /**
   * One line, in place of the list, when the tree is clean. Translated, and free to
   * claim more than this panel can see — the app's says nothing is waiting for a commit
   * either, which is why the app only mounts the panel at all when that is true.
   *
   * ITS ABSENCE IS ALSO AN ANSWER: without it a clean panel draws its heading and
   * nothing under it, which is what a caller that only mounts this card when there IS
   * something to show wants. Passing it is what turns the empty case into a sentence.
   */
  emptyLabel?: string
  /**
   * Opening a file. One handler for the panel rather than one per row, since only
   * the path differs between them. Absent, the rows are text: see
   * `FileModifiedLine`'s note on why there is no way to have the hover without it —
   * which is now the filename lifting to `text-ink`, and no ground at all.
   */
  onOpenFile?: (path: string) => void
  /** Margins and width. Not the ground, the radius or the gauge. */
  className?: string
}

export function UnCommittedChangesCard({
  label,
  summary,
  additions,
  deletions,
  files,
  emptyLabel,
  onOpenFile,
  className = '',
}: UnCommittedChangesCardProps) {
  const clean = files.length === 0 && additions === 0 && deletions === 0
  const empty = clean && Boolean(emptyLabel)

  return (
    <div className={`bg-ink/5 rounded-lg p-3 ${className}`.trim()}>
      {/* The heading carries the colour and both halves take it with `inherit`; the
          count dims one step further with the single class that has nothing to fight.
          `DiffStat` keeps its own green and red — it is the one thing in the row that
          is not text about text. Same arrangement as `CommitCard`. */}
      <div className="flex items-center gap-2 text-xs mb-2 text-text-secondary/70">
        {/* ONE FLAT ROW OF THREE, and not a heading beside a right-hand group, which
            is what this was. The group had to carry `min-w-0` to shrink at all, and a
            `min-w-0` box whose own content cannot shrink — `DiffStat` is
            `flex-shrink-0` — is a box that gets narrower while its numbers hang out the
            side of the plate. Measured at 170px: the row stayed one line and still
            overflowed its panel by 32px. Flattened, the shrink has nowhere to go but
            the two pieces of text, and they are the two that can afford it.

            `min-w-0` ON BOTH OF THEM, which is what lets either truncate at all: a flex
            item's floor is its own content by default, so the heading and the count
            each refused to go below their natural width and the row grew a SECOND LINE
            instead. With the floor lifted the row is one line at every width.

            The `truncate` works because these are flex items: it needs `overflow:
            hidden`, which does nothing on an inline box, and a flex item is blockified
            whatever `Text`'s `<span>` would otherwise have been. */}

        {/* `flex-1` IS WHAT DECIDES THE ORDER THEY GIVE WAY IN, and the order is the
            whole point. Left to shrink in proportion, both were cut at once: measured
            at the sidebar's own 288px, "Uncommitted changes" lost 10px and "5 files"
            lost 2.5 — and half a file count is a number that is simply WRONG, where a
            clipped heading is a constant phrase the reader learned the first time they
            saw it. `flex-1` makes this one's basis zero, so it takes the room the other
            two leave and is the only thing cut until there is no room left to take.
            Below roughly 174px the count starts giving way too, which is the point at
            which nothing else can. */}
        <Text tone="inherit" className="flex-1 min-w-0 truncate" title={label}>
          {label}
        </Text>

        {/* BOTH DROP OUT ON A CLEAN TREE, and neither is a judgement call. "0 files" is
            the count the caller composed for a list that is not there, and "+0 −0" with
            a gauge is a bar drawn at nothing — two ways of writing the word the line
            below already says in full. The heading stays, because it is what the
            sentence under it is an answer to. */}
        {!empty && summary && (
          <Text
            tone="inherit"
            className="min-w-0 truncate text-text-secondary/50"
            title={summary}
          >
            {summary}
          </Text>
        )}

        {/* The one thing that never gives way — it is already `flex-shrink-0` of its
            own accord, and needs no `ml-auto` now that the heading grows into the slack.
            Truncating "+248 -12" would print a different number, which is worse than
            printing none; the words around it only get shorter. */}
        {!empty && <DiffStat additions={additions} deletions={deletions} gauge />}
      </div>

      {/* CENTRED, AND DIMMER THAN THE HEADING ABOVE IT. A placeholder is the one line in
          the card nobody is trying to read — it is there to be recognised at a glance and
          then skipped, which is the opposite of a filename. Same treatment as
          `UsageClaudeCodeCard`'s empty hint, so the two read as one kind of thing.

          `opacity` and not `text-text-secondary/40`: `Text` owns the colour, and a second
          colour class on one element is settled by the order Tailwind emitted the two
          rather than by the order they are written. */}
      {/* `clean && emptyLabel` rather than the `empty` flag above: the two say the same
          thing, but only this spelling narrows `emptyLabel` to a string, and `Text` takes
          a string for the reason its own note gives. */}
      {clean && emptyLabel && (
        <div className="text-center py-1.5">
          {/* `leading-snug` because this one WRAPS: it is a sentence rather than the two
              or three words a placeholder usually is, and at the sidebar's 288px it takes
              two lines. Default leading on a two-line centred block reads as two separate
              lines rather than one sentence. `UsageClaudeCodeCard`'s empty hint says the
              same thing for the same reason. */}
          <Text tone="secondary" className="opacity-40 leading-snug">
            {emptyLabel}
          </Text>
        </div>
      )}

      {/* NOTHING BLEEDS OUT OF THE PLATE'S PADDING. One padding, on the card, around
          everything: the rows fill the content box, so a filename starts on the
          heading's own left edge and its `DiffStat` ends on the heading's right one.
          The list carried a `-mx-3` for a measurement, cancelling this panel's `p-3`,
          and every row then began 12px to the left of the words above it.

          `space-y-0.5` and not the flush stack `CommitCard` uses: there is no rail to
          break here, and a hair of air is what keeps a dense list of filenames from
          reading as a paragraph. */}
      {files.length > 0 && (
        <div className="space-y-0.5">
          {files.map(file => (
            <FileModifiedLine
              key={file.path}
              name={file.name}
              title={file.path}
              additions={file.additions}
              deletions={file.deletions}
              onOpen={onOpenFile ? () => onOpenFile(file.path) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
