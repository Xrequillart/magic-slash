import { useState } from 'react'
import { ChevronDown } from './icons'
import { CommitLine, CommitRail } from './CommitLine'
import { Icon } from './Icon'
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
 * IT DRAWS EVERY COMMIT IT IS HANDED, and that is still true — what changed is that the
 * tail is now a CONTROL, so the card has to be holding the rows it will reveal.
 *
 * The original refusal was to the number five and the words "+N more commits" living
 * INSIDE: a caller could show ten rows only by editing the design system. Neither moved
 * in. `more.shown` is how many rows stand at rest and `more.label` is what the tail says,
 * and both are the caller's exactly as before — what the card gained is the list it hides
 * behind them, because a tail that opens has to have something to open onto.
 *
 * IT IS ALSO STRICTLY SAFER. The tail line and the slice used to be computed at the call
 * site from the same number, twice, and the header here warned that they could disagree.
 * One number reaches the card now and drives both.
 *
 * ── HOW IT OPENS ──────────────────────────────────────────────────────────────────
 *
 * The hidden rows are ALWAYS MOUNTED, inside a grid whose single track travels from `0fr`
 * to `1fr`. That is the one way to transition to a height nobody knows in advance:
 * `height: auto` is not interpolable and never has been, `max-height` needs a guess that
 * is either too small (it clips) or too large (the ease runs on empty space and the rows
 * appear to snap), and measuring in JS is a layout read on every frame of an animation
 * this component has no business scheduling.
 *
 * `overflow-hidden` ON THE CHILD and not on the grid: the track is what shrinks, and the
 * child is what has to be clipped by it. Without it the rows overflow a zero-height track
 * and the card never looks shut.
 *
 * THE OPACITY RUNS SHORTER THAN THE TRACK and starts at the same moment, so the rows are
 * legible before the sweep finishes rather than fading in behind their own reveal.
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
  /**
   * Every commit, in order — no slicing before you get here. `more.shown` is what decides
   * how many stand at rest, and the rest are mounted behind the tail waiting to be
   * revealed.
   */
  commits: CommitCardCommit[]
  /**
   * There are more commits than the card shows at rest, and the tail line that opens
   * them.
   *
   * ABSENT MEANS THE LIST IS WHOLE — every row is drawn, the rail stops at the last
   * tick, and there is nothing to press.
   *
   * IT ALSO CHANGES THE RAIL. Shut, the last standing row keeps its lower segment and
   * the tail continues it past a rail with no tick: the trail saying there is more of
   * this branch than the panel is showing. Open, the rail closes at the true last commit
   * and the control below it draws none — it is no longer part of the list.
   */
  more?: {
    /**
     * How many rows stand at rest. The caller's judgement, not this component's: how
     * much of a branch is worth showing in a 288px sidebar is a fact about the sidebar.
     */
    shown: number
    /** "+2 more commits", composed and translated — the count is the caller's arithmetic. */
    label: string
    /**
     * Putting them back. Absent leaves the card one-way, which is a legitimate choice
     * for a panel a reader scrolls past rather than works in.
     */
    lessLabel?: string
  }
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

/**
 * `inert`, AND IT HAS TO BE SPREAD FROM A LOOSELY TYPED OBJECT.
 *
 * The attribute is boolean-by-PRESENCE in HTML, and the two halves of this repo disagree
 * about how to spell that: the desktop compiles against React 18's types, which have
 * never heard of it, and the webapp against React 19's, which declare it a boolean. A
 * literal `inert=""` fails the second and `inert={true}` fails the first, so neither can
 * be written in a folder both apps compile.
 *
 * `object` is the one type a JSX spread accepts from both — it has no known properties to
 * conflict with either declaration — and the empty string is what React 18 actually
 * writes to the DOM, where a boolean is dropped with a warning.
 */
const SHUT = { inert: '' } as object

export function CommitCard({
  label,
  summary,
  commits,
  more,
  copiedHash,
  onCopyHash,
  open,
  className = '',
}: CommitCardProps) {
  const [expanded, setExpanded] = useState(false)

  // The split. `more` absent draws the whole list and nothing to press — `shown` is
  // clamped so a caller asking for more rows than it handed over cannot produce a tail
  // line that opens onto nothing.
  const shown = more ? commits.slice(0, Math.min(more.shown, commits.length)) : commits
  const hidden = more ? commits.slice(shown.length) : []
  const hasHidden = hidden.length > 0
  const tailLabel = expanded ? more?.lessLabel : more?.label

  const row = (commit: CommitCardCommit, first: boolean, last: boolean) => (
    <CommitLine
      key={commit.hash}
      subject={commit.subject}
      shortHash={commit.shortHash}
      relativeDate={commit.relativeDate}
      first={first}
      last={last}
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
  )

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
        {/* A standing row never closes the rail while anything is hidden: shut, the tail
            continues it; open, the revealed rows do. */}
        {shown.map((commit, index) =>
          row(commit, index === 0, index === shown.length - 1 && !hasHidden),
        )}

        {/* THE REVEAL. See the header for why the track and not a height or a max-height,
            and why the clip is on the child. `duration-300` on the track against `200` on
            the opacity, both starting together, so the rows are readable before the sweep
            has finished rather than fading in behind their own reveal.

            `aria-hidden` and `inert` while it is shut: the rows are in the DOM the whole
            time, and a clipped row that a screen reader still reads out — or that Tab
            still lands the copy button of — is a list whose length depends on how you are
            reading it. See `SHUT` for why the attribute is spread rather than written. */}
        {hasHidden && (
          <div
            aria-hidden={!expanded}
            {...(expanded ? {} : SHUT)}
            className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div
              className={`overflow-hidden transition-opacity duration-200 ease-out motion-reduce:transition-none ${
                expanded ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {hidden.map((commit, index) => row(commit, false, index === hidden.length - 1))}
            </div>
          </div>
        )}

        {/* THE TAIL, AND IT IS A CONTROL. It was a line of muted text saying how many rows
            were being withheld, which named a thing a reader could do nothing about.

            THE RAIL IS ON IT ONLY WHILE IT IS SHUT — rail, no tick, because those commits
            are real but not drawn and a tick for each would be a lie about how many there
            are. Open, the list has closed at its own last tick and this is a control
            standing under it, so it draws no rail and indents to where the subjects are.

            `w-full` and `text-left`, because a button is centred and block-level by
            default and this one has to line up with the rows above it. */}
        {tailLabel && (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className={`group flex w-full items-center gap-2 py-1 text-left text-xs text-text-secondary/40
              transition-colors hover:text-text-secondary focus:outline-none
              focus-visible:text-text-secondary ${expanded ? 'pl-5' : ''}`}
          >
            {!expanded && <CommitRail first={false} last tail />}
            <Text tone="inherit">{tailLabel}</Text>
            {/* The mark turns rather than swapping: a chevron that points down to open and
                up to close is one object rotating, and the rotation is what says the two
                states are the same control. */}
            <Icon
              glyph={ChevronDown}
              size="xs"
              tone="inherit"
              className={`transition-transform duration-300 motion-reduce:transition-none ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>
    </div>
  )
}
