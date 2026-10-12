import { ButtonIcon } from './ButtonIcon'
import { Icon } from './Icon'
import { Check, Copy } from './icons'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * One commit, on the rail that says it belongs to a branch.
 *
 * It came out of the repository card in the right-hand sidebar, where it was five
 * nested `map` levels deep inside `RepositoryCard` and reachable from nowhere else.
 * What made it worth extracting is not length: it is that a commit row is the same
 * object wherever it appears, and the card was the only thing that knew how to draw
 * one.
 *
 * IT IS A ROW AND NOT A CARD, which is the whole difference between this and
 * `CommitCard` next door. This draws one commit and has no ground, no padding and no
 * heading; `CommitCard` is the panel that stacks these and says how many there are.
 * The split is `BranchCard`'s own: a component that draws ONE fact, and a component
 * that arranges several.
 *
 * WHAT IT NEVER KNOWS: the clipboard, the shell, `window.electronAPI`, or what a
 * relative date looks like in the reader's language. All four arrive as props already
 * resolved — see the notes on `relativeDate` and `open`. A design-system component
 * that reached for Electron would be a component the webapp could not draw, which is
 * the one thing this folder exists to prevent.
 */

/**
 * The rail and the tick on it, drawn per ROW.
 *
 * A LIST OF COMMITS IS A SEQUENCE, and nothing in the row said so — five subjects
 * stacked in a box read as five unrelated lines, when what they are is one branch in
 * order. The rail says it in the gutter, at no cost to the width the subjects have.
 *
 * Yellow because this is the branch's own work, unpushed or unmerged: the card this
 * sits in already spends green on the current branch and red on deletions, and the
 * third colour has to be one neither of those claims. The tick is hollow — a window
 * coloured centre inside a yellow ring — so it reads as a marker ON the line rather
 * than a blob interrupting it.
 *
 * It is drawn in two halves that meet at the tick, so a row knows only whether it is
 * the first or the last. `tail` is the "+N more" line: rail, no tick.
 *
 * EXPORTED FOR `CommitCard` AND NOT FOR THE APPS. It is not in `index.ts`, because a
 * bare rail is not a thing a page has any business drawing — only the two components
 * in this pair need it, and they are siblings in this folder.
 */
export function CommitRail({
  first,
  last,
  tail = false,
}: {
  first: boolean
  last: boolean
  tail?: boolean
}) {
  return (
    /* `-my-1` CANCELS THE ROW'S OWN `py-1`. `self-stretch` fills the row's CONTENT box,
       which stops short of its padding — so each rail segment ended 4px above the next
       one began, and the trail came out as five dashes with holes between them. The
       negative margin pushes this one column back out over the padding, so consecutive
       rows' segments meet exactly. */
    <div className="relative self-stretch -my-1 w-3 flex-shrink-0 flex items-center justify-center">
      {/* Two segments rather than one box with conditional insets: the top half stops
          at the tick on the first row, the bottom half stops at it on the last, and
          each is simply absent when it would be a stub hanging off the end. */}
      {/* `left-1/2 -translate-x-1/2` and not a bare `absolute`: the static position of an
          abspos child of a FLEX container is resolved from that container's alignment,
          which is not a thing to hang a 3px rail on. Centred explicitly, it lands on the
          tick whatever the gutter does. */}
      {/* SQUARE ENDS. `rounded-full` on a 3px bar rounds all four corners, so where two
          segments met they each tapered to a point and left a pinch in the line — the
          caps were only ever wanted at the two ends of the whole rail, and a per-row
          segment has no way to know it is one of those. Butt ends join cleanly, and
          the tick covers both meeting points anyway. */}
      {!first && <span className="absolute left-1/2 -translate-x-1/2 top-0 bottom-1/2 w-[3px] bg-yellow" />}
      {!last && <span className="absolute left-1/2 -translate-x-1/2 top-1/2 bottom-0 w-[3px] bg-yellow" />}
      {/* The centre is `bg-bg`, the window's own ground, rather than a literal white:
          hardcoded white is the pre-theme habit themes.test.ts scans for, and on a
          light theme a white dot on a near-white card would leave only the ring. The
          window colour reads white on the dark themes — the look asked for — and stays
          a hole punched in the rail on the light ones, which is the point of it. */}
      {!tail && <span className="relative w-3 h-3 rounded-full border-2 border-yellow bg-bg" />}
    </div>
  )
}

/**
 * The short hash, and the act of taking the long one.
 *
 * A COMPONENT RATHER THAN MARKUP IN THE ROW, which is the thing that was asked for and
 * is right for a reason worth writing down: this is the only control in the pair that
 * is NOT a `ButtonIcon`. It carries a WORD — eight characters of hexadecimal — and
 * `ButtonIcon` is icon-only by construction. Left inline it was six attributes and a
 * ternary in the middle of a row that already had five children, and the one piece of
 * the row with its own state read as decoration on the date beside it.
 *
 * IT IS `ACTION_CHIP`'S SHAPE, SPELLED OUT. The app keeps that string in
 * `renderer/components/actionChip.ts` and this folder cannot import from the app — the
 * dependency only ever points this way. The values are `ButtonIcon`'s own `sm` rung, so
 * a change to either has to be made in both; `actionChip.ts` says as much itself, and
 * this is the second of the two call sites it is talking about.
 *
 * THE HASH IS NOT A `Text`, and that is not an oversight. `Text` pins Cera Pro as its
 * face, so a `font-mono` in its `className` would be a second font-family class settled
 * by the order Tailwind emitted the two in — the same trap its own notes warn about for
 * colour. A hash has to be monospaced to be scannable: eight characters where the `1`
 * and the `l` are different widths is eight characters nobody can check against a
 * terminal. So it is a plain span, on purpose.
 */
function CommitHashButton({
  shortHash,
  label,
  copied,
  onCopy,
}: {
  shortHash: string
  label: string
  copied?: boolean
  onCopy: () => void
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      title={label}
      aria-label={label}
      className={
        'h-6 inline-flex items-center justify-center rounded-lg bg-ink/5 text-icon ' +
        'border-none cursor-pointer transition-colors flex-shrink-0 ' +
        'px-2 gap-1 font-mono text-xs hover:bg-ink/10 hover:text-ink'
      }
    >
      {shortHash}
      {/* `inherit` plus one colour class, which is the only reliable way to say green
          here: `Icon`'s two real tones are both `text-icon` shades, and adding a second
          would be inventing a tone for one tick. With `inherit` the component emits no
          colour at all, so there is nothing for this to lose an emission-order fight
          with. */}
      <Icon
        glyph={copied ? Check : Copy}
        size="xs"
        tone="inherit"
        className={copied ? 'text-green' : ''}
      />
    </button>
  )
}

export interface CommitLineProps {
  /** The commit's first line. Truncates, with the whole of it on the `title`. */
  subject: string
  /** The abbreviated hash, as git prints it. What the chip shows. */
  shortHash: string
  /**
   * The age, ALREADY FORMATTED AND ALREADY TRANSLATED.
   *
   * The app turns git's "2 hours ago" into "2h" through `formatRelativeDate`, which
   * needs the renderer's `t` and its unit keys. Handing this component the raw string
   * and a translator would drag the whole i18n runtime into the design system for one
   * line of text; handing it the finished words costs the caller one function call it
   * was making anyway.
   */
  relativeDate: string
  /** First in the list: no rail above the tick. */
  first?: boolean
  /** Last in the list: no rail below it. False when a "+N more" line continues it. */
  last?: boolean
  /**
   * The copy control. An object and not three props, for the reason `BranchCard`'s is
   * one: the handler and the name it needs cannot be given separately without letting
   * a caller supply half of them.
   *
   * REQUIRED, unlike `BranchCard`'s. A branch chip without a copy button is still a
   * branch chip; a hash nobody can take is eight characters of noise, since the short
   * hash exists to be pasted somewhere that wants the long one.
   */
  copy: {
    /** Tooltip and accessible name. The app puts the FULL hash in it. */
    label: string
    /** Whether this hash is on the clipboard right now — the tick instead of the mark. */
    copied?: boolean
    onCopy: () => void
  }
  /**
   * Opening the commit somewhere else, or nothing at all.
   *
   * A CALLBACK AND NOT A URL. The app opens it with `window.electronAPI.shell`, which
   * this folder must never name — the webapp compiles these same files and has no such
   * object. The caller also owns the CONDITION: the app shows this only for a commit
   * that is pushed and in a repo with a known GitHub address, and neither of those is
   * a fact about a row.
   */
  open?: {
    /** Tooltip and accessible name, translated. */
    label: string
    /** The mark, so the caller names the destination rather than this file assuming it. */
    icon: IconComponent
    onOpen: () => void
  }
  /** Margins and placement. Not the rail, the chip or the grounds. */
  className?: string
}

export function CommitLine({
  subject,
  shortHash,
  relativeDate,
  first = false,
  last = false,
  copy,
  open,
  className = '',
}: CommitLineProps) {
  return (
    // `py-1` and NOT a `space-y` on the parent: the rail is drawn per row, top edge to
    // bottom edge, and any gap between rows would show as a broken trail. The row owns
    // its own vertical padding so consecutive rails touch. See `CommitRail`.
    //
    // The row carries the colour, at the weight the subject wants; the date dims itself
    // one step further below. Spelling it here rather than on each `Text` is what lets
    // both of them ask for `inherit` and take it.
    <div className={`flex items-center gap-2 text-xs py-1 text-text-secondary/60 ${className}`.trim()}>
      <CommitRail first={first} last={last} />
      <Text tone="inherit" className="truncate flex-1" title={subject}>
        {subject}
      </Text>
      {/* One colour class against `inherit`'s none — the same escape the tick uses. */}
      <Text tone="inherit" className="flex-shrink-0 text-text-secondary/40" title={relativeDate}>
        {relativeDate}
      </Text>
      <CommitHashButton
        shortHash={shortHash}
        label={copy.label}
        copied={copy.copied}
        onCopy={copy.onCopy}
      />
      {open && <ButtonIcon icon={open.icon} title={open.label} onClick={open.onOpen} />}
    </div>
  )
}
