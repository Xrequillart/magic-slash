import { Icon } from './Icon'
import { Label } from './Label'
import { PR_BADGE, PR_COLOR, PR_MARK, type PRTone } from './prTones'
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
 * overlays and a row sits on three of them. THE FILL IS THE WHOLE SEPARATION now: the
 * rows carried an outline as well, and an outlined plate inside a fold inside a card is
 * three frames deep for one line of text. A shade of ground is enough to stop rows
 * running together, and the list reads as a stack rather than as a column of boxes.
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
   * `strong` is the one state drawn as a `Label` rather than as a word beside an icon:
   * resolved is what separates "still to do" from "done" in a list of twenty, and a grey
   * word carried the same weight as "outdated", which says nothing of the kind. It wears
   * the tone's colour through `Label`'s `color`, the same door a repository's own hue
   * comes through — plate at 12%, glyph at full strength, the word in ink.
   */
  state?: { icon: IconComponent; label: string; tone: PRTone; strong?: boolean }
  /** When it was opened, already formatted and already translated. */
  age?: string
  /**
   * Settled, so the row steps back — the text dims. The same reading as the checklist
   * above it, where a ticked line goes quiet so the eye lands on what is still open.
   *
   * THE DIMMED TEXT IS ALL OF IT since the outline went, and it is enough: the green
   * was saying the same thing twice, once on a border and once on the "Resolved" chip
   * two inches to its right. The chip stays at full strength — it is the one thing on
   * the row that has to be readable without stopping.
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
        className="flex-1 flex items-center gap-1.5 min-w-0 rounded-lg border-none bg-surface hover:bg-surface-strong px-2 py-1.5 text-xs text-left transition-colors cursor-pointer"
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
          {state &&
            (state.strong ? (
              /* A `Label`, and not one more hand-rolled capsule: this is a word on a
                 tinted plate with a mark in front of it, which is the thing `Label` is.
                 `color` rather than a tone, because the tones there are brands — see
                 `PR_COLOR` for why the value is a variable and not a hex. */
              <Label color={PR_COLOR[state.tone]} icon={state.icon}>
                {state.label}
              </Label>
            ) : (
              <span className="flex items-center gap-1 text-text-secondary/60">
                <Icon glyph={state.icon} size="xs" tone="inherit" className={PR_MARK[state.tone]} />
                {state.label}
              </span>
            ))}
          {age && <span className="text-text-secondary/40">{age}</span>}
        </span>
      </button>
    </li>
  )
}
