import { Text } from './Text'

/**
 * How much was added and how much was taken away, and the balance between them.
 *
 * THE NUMBERS AND THE GAUGE ARE ONE COMPONENT, not a pair, because they are one
 * fact stated twice: `+248 -12` is the measurement, and the six squares are that
 * same measurement at a glance. Split apart, a caller could show a gauge that
 * disagreed with the counts beside it — which is the only way this can be wrong.
 *
 * GREEN FOR ADDED AND RED FOR REMOVED, the pair every diff in the world uses. The
 * card this came out of already spends green on the current branch and yellow on
 * the commit rail, so red is the one colour left that says "gone" without being
 * read as an error.
 *
 * IT DRAWS NOTHING WHEN NOTHING CHANGED. A `+0 -0` beside a file is a row saying
 * it has no news, and the gauge would divide by zero to say it — so both halves
 * drop out together and the caller needs no guard of its own.
 */

/**
 * Six squares, and six is not arbitrary: it is the smallest count that still
 * resolves a half (3/3) and a third (2/4 and 4/2) at 6px a square, which is what a
 * 288px sidebar has room for. Named because two things need it — the loop and the
 * threshold that decides each square's colour — and those two disagreeing is the
 * bug the literal used to invite.
 */
const GAUGE_STEPS = 6

/**
 * The balance bar.
 *
 * Each square asks whether the additions' share has reached ITS rung: the first
 * lights green at a sixth, the last only at the whole. So a change that is mostly
 * removal comes out mostly red, and the bar fills left to right the way a meter
 * does — no percentage written anywhere, which is the point of drawing it.
 *
 * `rounded-sm` and not `rounded-full`: at 6px a circle is a dot with no direction
 * to it, and the row reads as a bar rather than a string of beads.
 */
function DiffGauge({ ratio }: { ratio: number }) {
  return (
    <div className="flex gap-0.5 flex-shrink-0">
      {Array.from({ length: GAUGE_STEPS }, (_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-sm ${ratio >= (i + 1) / GAUGE_STEPS ? 'bg-green' : 'bg-red'}`}
        />
      ))}
    </div>
  )
}

export interface DiffStatProps {
  /** Lines added. Drawn in green, and omitted entirely when it is zero. */
  additions: number
  /** Lines removed. Drawn in red, and omitted entirely when it is zero. */
  deletions: number
  /**
   * The six squares, after the numbers.
   *
   * OFF BY DEFAULT, because the gauge is a summary and a summary of one file is
   * just the two numbers again in a shape that is harder to read. It belongs on
   * the heading that stands for a whole working tree — which is exactly where
   * `UnCommittedChangesCard` puts it, and exactly where `FileModifiedLine` does not.
   */
  gauge?: boolean
  /** Margins and placement. Not the two colours, the sizes or the squares. */
  className?: string
}

export function DiffStat({ additions, deletions, gauge = false, className = '' }: DiffStatProps) {
  // Nothing to say. See the note above: this is also what keeps the ratio below
  // from dividing by zero, so there is no second guard anywhere.
  if (additions <= 0 && deletions <= 0) return null

  return (
    <span className={`flex items-center gap-1 flex-shrink-0 ${className}`.trim()}>
      {/* `inherit` plus one colour class, and never a tone: `Text`'s tones are both
          text greys, so adding green and red to that scale would be inventing two
          tones for one component. With `inherit` the component emits no colour at
          all, and there is nothing for the class to lose an emission-order fight
          with — the same escape `CommitLine`'s tick uses. */}
      {additions > 0 && (
        <Text tone="inherit" className="text-green">{`+${additions}`}</Text>
      )}
      {deletions > 0 && (
        <Text tone="inherit" className="text-red">{`-${deletions}`}</Text>
      )}
      {gauge && <DiffGauge ratio={additions / (additions + deletions)} />}
    </span>
  )
}
