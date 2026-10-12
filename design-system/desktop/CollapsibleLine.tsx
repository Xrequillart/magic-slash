import type { ReactNode } from 'react'
import { ChevronDown } from './icons'
import { Icon } from './Icon'
import { PR_MARK, type PRTone } from './prTones'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * One line of a checklist, and whatever unfolds under it.
 *
 * A MARK, A LABEL, A DETAIL AND A FOLD, in that order and always in those four slots.
 * It came out of the pull request card, where three lines — the comments, the CI
 * checks, the merge conflicts — were three differently-shaped blocks each answering a
 * yes-or-no question. The shape itself is what makes them a list: same gutter, same
 * 36px, same place for the count, so the open items are the ones that stand out
 * instead of the ones that happen to be tallest.
 *
 * IT IS THE ROW AND `PullRequestCard` IS THE PANEL, the split this folder makes
 * everywhere: `CommitLine`/`CommitCard`, `FileModifiedLine`/`UnCommittedChangesCard`.
 *
 * THE FOLD IS OPTIONAL AND SO IS THE BUTTON WITH IT. A line with nothing behind it —
 * "no conflicts" — is a statement, and wrapping a statement in a button that opens
 * nothing is an affordance that lies. `toggle` is what turns the header into a
 * control, and `children` only render once there is one or the line never folded at
 * all.
 *
 * `muted` IS THE TICKED READING. A line that has been dealt with steps back to a
 * grey; an open one keeps its tone. That is the whole reason the colour is not simply
 * the icon's: scanning the list means landing on what still needs doing.
 */

export interface CollapsibleLineProps {
  /** The mark in the gutter. */
  icon: IconComponent
  /**
   * The colour of the mark, and of the label while the line is not `muted`. See
   * `prTones` for why these are named after colours rather than after severities.
   */
  tone?: PRTone
  /** The mark turns — a CI run still going. Nothing else on the line moves. */
  spin?: boolean
  /** What the line is about. Truncates; it never wraps — see the note on the height. */
  label: string
  /**
   * This one is settled, so it steps back to a grey and gives up its tone. The mark
   * keeps the tone either way: a ticked box is still green.
   */
  muted?: boolean
  /**
   * Pinned right of the label: a count, a ring, a command. A node rather than a
   * string, because it is the one slot on this line whose contents are genuinely the
   * caller's — and the one place a second control may go.
   */
  detail?: ReactNode
  /** Present, the header is a button and `children` are gated behind it. */
  toggle?: { open: boolean; onToggle: () => void }
  /** What unfolds. Drawn when there is no toggle, or when the toggle is open. */
  children?: ReactNode
  /** Margins and placement. Not the height, the gutter or either ground. */
  className?: string
}

export function CollapsibleLine({
  icon,
  tone = 'neutral',
  spin = false,
  label,
  muted = false,
  detail,
  toggle,
  children,
  className = '',
}: CollapsibleLineProps) {
  const open = Boolean(toggle?.open)

  const line = (
    <>
      {/* The mark is a flex item OF the header line and not centred in a box beside
          it: that box only lines up while the line happens to be exactly as tall as
          it is. */}
      <span className="w-4 flex-shrink-0 flex items-center justify-center">
        <Icon
          glyph={icon}
          tone="inherit"
          className={`${PR_MARK[tone]} ${spin ? 'animate-spin' : ''}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        {/* `inherit` plus exactly one colour class, which is the only reliable way to
            say green here: two colour classes on one element are settled by the order
            Tailwind emitted them in, not the order they are written. `Text` states
            that rule for its own props and this is the same rule. */}
        <Text
          tone="inherit"
          className={`block truncate ${muted ? 'text-text-secondary/70' : PR_MARK[tone]}`}
          title={label}
        >
          {label}
        </Text>
      </div>
      {/* `flex items-center` and not a bare span: a detail is 10px text inside a line
          whose strut is the card's own 14px, so an inline child sat on THAT baseline —
          a couple of pixels below the middle of the 36px row, beside a 14px label that
          was centred. Making the slot a flex box centres the box instead of the
          baseline, which is what the eye is comparing. */}
      {detail !== undefined && <span className="flex-shrink-0 flex items-center">{detail}</span>}
      {toggle && (
        <Icon
          glyph={ChevronDown}
          size="xs"
          tone="inherit"
          className={`flex-shrink-0 text-icon group-hover:text-ink transition-all ${open ? '' : '-rotate-90'}`}
        />
      )}
    </>
  )

  return (
    /* The band every item is drawn in — edge to edge, with no chrome of its own, so
       the rows read as one list rather than as separate treatments. The surface only
       comes up while the row is unfolded, so the open item is the one that stands out
       and the closed ones stay part of the card. */
    <div className={`w-full px-3 transition-colors ${open ? 'bg-surface' : ''} ${className}`.trim()}>
      {/* A FIXED `h-9`, not a `min-h`: every header lands on exactly the same 36px — a
          line carrying a button is no taller than one carrying a word, and a checklist
          of ragged boxes stops reading as a list. Safe because the label truncates
          rather than wraps; only `children`, below the line, are allowed to grow. */}
      {toggle ? (
        <button
          type="button"
          onClick={toggle.onToggle}
          aria-expanded={open}
          className="group w-full h-9 flex items-center gap-2 text-left border-none bg-transparent p-0 cursor-pointer"
        >
          {line}
        </button>
      ) : (
        <div className="h-9 flex items-center gap-2">{line}</div>
      )}
      {/* NOT INDENTED TO THE GUTTER. What unfolds under a header is that header's own
          detail — the named checks under "Checks", the threads under "Comments" — and
          clearing an icon that is not beside it made the list read as a level deeper
          than it is. It lines up with the label. */}
      {children && (!toggle || open) && <div className="pb-2.5">{children}</div>}
    </div>
  )
}
