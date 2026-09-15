import type { ComponentSize } from './componentSizes'
import { CheckCircle2, Loader2, MinusCircle, XCircle } from './icons'
import { Icon, type IconSize } from './Icon'
import { PR_MARK, type PRTone } from './prTones'
import { Text, type TextSize } from './Text'
import type { IconComponent } from './types'

/**
 * The named CI checks behind a count — what "9/12 passed" is actually made of.
 *
 * It unfolds under a `CollapsibleLine` whose header carries the figure, which is why
 * there is no heading, no total and no ground in here: the row above said all three,
 * and saying them again would make the fold look like a second card.
 *
 * NO PROGRESS BAR AND NO RING. Both live on the header — the ring is the shape of the
 * proportion, this is the list of names — and a component that drew either would be
 * the fold arguing with the line it hangs off.
 *
 * ONE COMPONENT AND NOT A ROW PLUS A LIST, where this folder usually splits them
 * (`CommitLine`/`CommitCard`, `FileModifiedLine`/`UnCommittedChangesCard`). Those rows
 * are things a page draws on their own — one file in a review drawer, one commit in a
 * timeline. A single CI check is not: it only ever means anything as part of the run
 * it belongs to, next to the ones that passed. Exporting a `CheckLine` would be
 * offering a component whose only honest use is this one.
 */

/**
 * The four states a check can be in, which is GitHub's vocabulary and everyone else's.
 *
 * NEUTRAL, CANCELLED, TIMED_OUT and the rest of the Checks API fold into these four at
 * the edge that reads them: what a reader does about a check is decided by whether it
 * passed, failed, is still going, or was never run, and a scale with nine rungs would
 * be nine icons nobody can tell apart at 12px.
 */
export type CheckState = 'passed' | 'failed' | 'running' | 'skipped'

/**
 * The mark each state is read by, and the one thing that turns.
 *
 * IN HERE AND NOT AT THE CALL SITE, on `PR_STATE_MARK`'s model: a red cross for a
 * failed check is not a fact about one app's watcher, it is what a failed check looks
 * like. The caller keeps the WORDS — those need a catalogue and a language — and this
 * keeps the glyphs and the colours, so two surfaces listing checks cannot disagree
 * about what `skipped` looks like.
 *
 * `skipped` IS MUTED RATHER THAN NEUTRAL. It is the one state that is settled without
 * having been done, and a grey minus beside a green tick reads as "not applicable"
 * where a full-strength one reads as a third outcome.
 */
export const CHECK_STATE_MARK: Record<
  CheckState,
  { icon: IconComponent; tone: PRTone; spin?: boolean }
> = {
  passed: { icon: CheckCircle2, tone: 'green' },
  failed: { icon: XCircle, tone: 'red' },
  running: { icon: Loader2, tone: 'blue', spin: true },
  skipped: { icon: MinusCircle, tone: 'muted' },
}

/**
 * The three rungs, which are `ComponentSize`'s and therefore `Label`'s.
 *
 * `sm` IS WHAT IT ALWAYS DREW — a 10px name beside a 12px tick. The names used to be a
 * hand-spelled `text-[10px]` with a comment saying `Text` had no rung that small; now
 * it does, and nothing on the pull request card moved.
 *
 * THE MARK IS A RUNG ABOVE THE WORD in the middle of the ladder, and they meet at
 * `lg` and stay together above it. A tick, a cross and a spinner have to be told
 * apart at a glance, and below 12px they cannot be — so the glyph holds its own floor
 * while the name drops beneath it. By `lg` the name has caught up and both sit at
 * 14px, which is the arrangement `Label` reaches at its own middle rung: at that size
 * a glyph larger than the word beside it reads as a bullet rather than as a state.
 *
 * THE INDENT IS MEASURED, NOT CHOSEN. `more` clears the gutter — the mark's width plus
 * the gap — so it starts where the NAMES start rather than where their icons do. It is
 * a remark about the list, not another check, which is also why it wears no mark. Every
 * rung's `indent` is that arithmetic and must be redone if either number moves.
 */
const SIZES: Record<ComponentSize, { text: TextSize; icon: IconSize; gap: string; rows: string; indent: string }> = {
  // 10px mark + 4px gap. The mark is at the floor of what a tick and a cross can be
  // told apart at, which is the rung's own warning: below `sm` the states stop being
  // four and start being "coloured" and "not".
  '2xs': { text: '2xs', icon: '2xs', gap: 'gap-1', rows: 'space-y-0.5', indent: 'pl-[14px]' },
  // 12px mark + 4px gap
  xs: { text: '2xs', icon: 'xs', gap: 'gap-1', rows: 'space-y-0.5', indent: 'pl-[16px]' },
  // 12px mark + 6px gap
  sm: { text: '2xs', icon: 'xs', gap: 'gap-1.5', rows: 'space-y-1', indent: 'pl-[18px]' },
  // 14px mark + 6px gap
  md: { text: 'xs', icon: 'sm', gap: 'gap-1.5', rows: 'space-y-1', indent: 'pl-[20px]' },
  // 14px mark + 8px gap
  lg: { text: 'sm', icon: 'sm', gap: 'gap-2', rows: 'space-y-1.5', indent: 'pl-[22px]' },
  // 16px mark + 8px gap
  xl: { text: 'md', icon: 'md', gap: 'gap-2', rows: 'space-y-1.5', indent: 'pl-[24px]' },
  // 20px mark + 10px gap
  '2xl': { text: 'lg', icon: 'lg', gap: 'gap-2.5', rows: 'space-y-2', indent: 'pl-[30px]' },
}

export interface CheckListEntry {
  /** The check's name, as CI reports it — "build / macos", "test (node 20)". */
  name: string
  state: CheckState
  /**
   * The state as a word, for the mark's tooltip — "Passed", "Failed".
   *
   * The one thing the caller has to translate, and the reason it is optional rather
   * than required: the colour and the glyph already say it to anyone who can see them,
   * so a list with no `stateLabel` is quieter than it should be but never wrong.
   */
  stateLabel?: string
}

export interface CheckListProps {
  /**
   * The checks, worst first.
   *
   * THE ORDER IS THE CALLER'S. A watcher that caps its list keeps the failures and the
   * runs — the ones worth a name — and sorting them again in here would put back the
   * passed checks it deliberately dropped.
   */
  checks: CheckListEntry[]
  /**
   * "and 14 more", when the list is capped — already composed and already translated.
   *
   * SAID OUT LOUD RATHER THAN SILENTLY DROPPED. A fold showing 20 checks under a header
   * that reads "12/34" invites the reader to count, and the count they arrive at is
   * wrong. What the sentence says is the caller's: only it knows what its own cap is.
   */
  more?: string
  /**
   * Which rung. `sm` is the fold it was built for; see `SIZES`.
   *
   * It climbs because the thing ABOVE the list climbed, never because the list wants
   * to be louder: this is the inside of a fold, and a fold drawn larger than the line
   * it hangs off is the fold arguing with it.
   */
  size?: ComponentSize
  /** Margins and placement. Not the gutter, the row height or either colour. */
  className?: string
}

export function CheckList({ checks, more, size = 'sm', className = '' }: CheckListProps) {
  const rung = SIZES[size]

  return (
    <ul className={`${rung.rows} ${className}`.trim()}>
      {checks.map((check) => {
        const mark = CHECK_STATE_MARK[check.state]
        return (
          /* Keyed on the state as well as the name: a check that is re-run appears
             twice in a capped list — once as it was, once as it is — and two rows with
             one key is React keeping whichever it saw first.

             The ink is stated HERE rather than inside the `Text`: it is an alpha, and
             `Text` owns exactly two ink rungs of which neither is one. `tone="inherit"`
             is the way out it provides, and this is what that way out is for. */
          <li
            key={`${check.state}:${check.name}`}
            className={`flex items-center ${rung.gap} text-text-secondary/70`}
          >
            {/* The tooltip goes on the WRAPPER and not on the glyph: a `title` on an
                `aria-hidden` element is a tooltip the accessibility tree cannot see,
                and `Icon` hides every glyph it draws by construction. */}
            <span className="flex-shrink-0 flex" title={check.stateLabel}>
              <Icon
                glyph={mark.icon}
                size={rung.icon}
                tone="inherit"
                className={`${PR_MARK[mark.tone]} ${mark.spin ? 'animate-spin' : ''}`.trim()}
              />
            </span>
            {/* SANS, like every other label on this card — a check name is read as a
                name, not as code, and the mono face it used to carry was the one thing
                here in a different typeface. Which is `Text`'s whole job now: it names
                the face outright rather than inheriting whatever the surface had. */}
            <Text
              size={rung.text}
              tone="inherit"
              className="min-w-0 truncate"
              title={check.name}
            >
              {check.name}
            </Text>
          </li>
        )
      })}
      {/* Cleared to the gutter so it starts where the names above it start rather than
          where their icons do, and a rung quieter than them: it is a remark about the
          list, not another check, which is also why it wears no mark of its own. */}
      {more && (
        <li className={`${rung.indent} text-text-secondary/50`}>
          <Text size={rung.text} tone="inherit">
            {more}
          </Text>
        </li>
      )}
    </ul>
  )
}
