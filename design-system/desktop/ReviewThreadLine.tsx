import { Icon } from './Icon'
import { PR_BADGE, PR_MARK, type PRTone } from './prTones'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * One review thread, on one line: who opened it, where, how many answers, and whether
 * it is settled.
 *
 * A ROW TO SCAN, NOT TO READ, and every decision in here follows from that. The
 * sidebar it lives in is 500px wide and does not resize, so the BODIES are deliberately
 * absent — a card per comment turned a bot-reviewed PR into a page of prose in a column
 * too narrow for it. The question this row answers is "what is still open, and where",
 * not "what exactly was said"; reading the conversation is a panel of its own.
 *
 * IT IS THE ROW AND THE FOLD ABOVE IT IS `CollapsibleLine`, which is in turn one line
 * of `PullRequestCard`. Three levels, each drawing one thing — the same split as
 * `CommitLine` inside `CommitCard`.
 *
 * THE WHOLE ROW IS THE CONTROL. Every part of it names the same thread, so a chevron
 * at one end would be a smaller target saying the same thing. It reports nothing but
 * the click: what to open, and on what, is the caller's — this file has never heard of
 * a panel, a store or a URL.
 *
 * IT HAS ITS OWN FILL, unlike every other row in this folder. `bg-surface` is the token
 * the card itself is painted with, so the rows belong to the card rather than to a
 * palette of their own — they still read a shade lighter, because these are TRANSLUCENT
 * overlays and a row sits on three of them. The separation comes from the border; the
 * fill only has to stop the rows running together.
 */

export interface ReviewThreadLineProps {
  /** Who opened the thread. Truncates: a shortened login is still readable. */
  author: string
  /**
   * The review verdict, when this thread is one — "Approved", "Changes requested".
   * Already translated, and its tone already decided: a mapping from a GraphQL enum
   * to a word is the app's, not this file's.
   */
  badge?: { label: string; tone: PRTone }
  /**
   * Where in the diff it hangs — `watcher.ts:184`, composed by the caller. The app
   * draws the BASENAME and keeps the whole path in `locationTitle`: a sidebar column
   * cannot hold `desktop/src/main/…/watcher.ts`, and that is a fact about the column.
   */
  location?: string
  /** The tooltip for `location` — the full path. */
  locationTitle?: string
  /**
   * How many answers, ALREADY COUNTED AND ALREADY PLURALISED — "3 replies". The
   * catalogue this comes from interpolates but does not pluralise, so the caller picks
   * the key; handing this a number and a translator would drag the i18n runtime into
   * the design system for one span of text.
   */
  replies?: string
  /**
   * Whether GitHub tracks a state for this thread at all, and what it is.
   *
   * Absent on a conversation comment and on a review summary, which are not threads
   * with a state — pinning "open" to every one of them would spend the row's width
   * saying nothing.
   *
   * `strong` is the one state drawn as a tinted BADGE rather than as a word beside an
   * icon: resolved is what separates "still to do" from "done" in a list of twenty,
   * and a grey word carried the same weight as "outdated", which says nothing of the
   * kind.
   */
  state?: { icon: IconComponent; label: string; tone: PRTone; strong?: boolean }
  /** When it was opened, already formatted and already translated. */
  age?: string
  /**
   * Settled, so the row steps back — border tinted green, text dimmed. The same
   * reading as the checklist above it, where a ticked line goes quiet so the eye lands
   * on what is still open. The badge inside stays at full strength: it is the one
   * thing on the row that has to be readable without stopping.
   */
  resolved?: boolean
  /** Tooltip and accessible name for the row. */
  openLabel: string
  onOpen: () => void
  /** Margins and placement. Not the fill, the border or any of the tones. */
  className?: string
}

export function ReviewThreadLine({
  author,
  badge,
  location,
  locationTitle,
  replies,
  state,
  age,
  resolved = false,
  openLabel,
  onOpen,
  className = '',
}: ReviewThreadLineProps) {
  return (
    <li className={`flex items-center ${className}`.trim()}>
      <button
        type="button"
        onClick={onOpen}
        title={openLabel}
        className={`flex-1 flex items-center gap-1.5 min-w-0 rounded-lg border bg-surface hover:bg-surface-strong px-2 py-1.5 text-xs text-left transition-colors cursor-pointer ${
          resolved ? 'border-green/30' : 'border-border/30'
        }`}
      >
        {/* The author gives way to the location: on an inline thread "which file" is
            the part that places the row, and a truncated login is still readable. */}
        <Text tone="inherit" className={`truncate ${resolved ? 'text-ink/50' : 'text-ink/80'}`}>
          {author}
        </Text>
        {badge && (
          <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold flex-shrink-0 ${PR_BADGE[badge.tone]}`}>
            {badge.label}
          </span>
        )}
        {location && (
          /* NOT A `Text`, and not an oversight: `Text` pins Cera Pro as its face, so a
             `font-mono` in its `className` would be a second font-family class settled
             by the order Tailwind emitted the two in. A file and a line number are read
             the way a hash is — `CommitLine` says the same thing about its own. */
          <span className="text-text-secondary/60 font-mono truncate" title={locationTitle ?? location}>
            {location}
          </span>
        )}
        {/* ONE GROUP TRAVELLING TO THE RIGHT EDGE, so the counts and states line up
            column-wise down the list rather than trailing each row's own text. */}
        <span className="ml-auto flex items-center gap-1.5 flex-shrink-0 text-[10px]">
          {replies && <span className="text-text-secondary/70 tabular-nums">{replies}</span>}
          {state && (
            <span
              className={`flex items-center gap-1 ${
                state.strong
                  ? `${PR_BADGE[state.tone]} font-semibold px-1.5 py-0.5 rounded-md`
                  : 'text-text-secondary/60'
              }`}
            >
              <Icon glyph={state.icon} size="xs" tone="inherit" className={PR_MARK[state.tone]} />
              {state.label}
            </span>
          )}
          {age && <span className="text-text-secondary/40">{age}</span>}
        </span>
      </button>
    </li>
  )
}
