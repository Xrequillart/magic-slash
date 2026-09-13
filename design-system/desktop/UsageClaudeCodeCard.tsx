import { ButtonIcon } from './ButtonIcon'
import { Card } from './Card'
import { Minus, Plus } from './icons'
import { Label } from './Label'
import { ProgressBar, PROGRESS_TEXT, progressTone, type ProgressThresholds } from './ProgressBar'
import { Text } from './Text'

/**
 * What is left of the Claude Code account: its rate limits, at the foot of the
 * sidebar.
 *
 * IT WEARS CLAUDE'S CHIP and not a generic account badge — the same mark, the same
 * coral ground and the same ink label as the agent card on the other side of the
 * window. The two cards are a pair, one per sidebar, and the chip is what says so. A
 * user glyph on a grey plate would name the person without naming what they are
 * signed in to, which is the only thing this card is about.
 *
 * IT COLLAPSES, and the collapsed form is not a smaller version of the open one — it
 * is a DIFFERENT reading. Open, each limit gets a row: its name, when it resets, its
 * percentage and a full-width bar, which is a thing you read. Collapsed, they share
 * one line and the bar becomes whatever is left between a short label and a number,
 * which is a thing you glance at. A card that only shrank would have made the glance
 * unreadable and the reading pointless.
 *
 * WHOSE STATE IT IS: the caller's. Collapsed is persisted config in the app, and a
 * card holding its own copy would fight the one that survives a restart.
 *
 * WHAT IT DOES NOT KNOW: how long until a reset, or where the thresholds sit. Both
 * arrive already answered — a reset as a formatted string, because "2h14" needs a
 * translator and a clock; the thresholds as numbers, because `ProgressBar` takes
 * those from its caller for the reason its own note gives.
 */

export interface UsageLimit {
  id: string
  /** The full name, for the open card — "Session (5h)". Translated. */
  label: string
  /**
   * The short name for the collapsed line, where every limit shares one row —
   * "session". Translated, and separate from `label` rather than truncated out of it:
   * a name cut to fit is a name that stops naming.
   */
  shortLabel: string
  /** 0 to 100. `ProgressBar` clamps it. */
  percent: number
  /** When it resets, ALREADY FORMATTED — "2h14", "3d", "soon". Open card only. */
  reset?: string
}

export interface UsageClaudeCodeCardProps {
  /** Whose usage — the account's name, or whatever the caller falls back to. */
  account: string
  /**
   * The limits, in the order they should read. EMPTY IS A REAL STATE and not an
   * error: an account whose agents have not reported yet has no numbers, which is
   * different from having zeroes.
   */
  limits: UsageLimit[]
  /**
   * Where the bars turn orange and then red. The caller's, because a percentage means
   * different things on different gauges — see `ProgressBar`. Without them the bars
   * stay green to 100%, which for a rate limit is the wrong answer and is why the app
   * always passes them.
   */
  thresholds?: ProgressThresholds
  collapsed?: boolean
  onToggle: () => void
  /**
   * Whether the bars EASE between readings. On by default, and off for one reason: the
   * caller is already animating the percentages itself.
   *
   * The marketing site's illustration is that caller. `ProgressBar`'s own note has the
   * measurement — a value that moves every frame restarts the ease on every one of
   * them, and the bar crawls behind the number it is supposed to be showing.
   */
  transition?: boolean
  /** The one control's tooltip, in each direction. Translated. */
  expandLabel: string
  collapseLabel: string
  /** One line, collapsed, when there is nothing to show. Translated. */
  emptyLabel: string
  /** A longer sentence, open, when there is nothing to show. Translated. */
  emptyHint: string
  /** Where the card sits: margins. Not the ground, the radius or the padding. */
  className?: string
}

export function UsageClaudeCodeCard({
  account,
  limits,
  thresholds,
  collapsed = false,
  onToggle,
  transition = true,
  expandLabel,
  collapseLabel,
  emptyLabel,
  emptyHint,
  className = '',
}: UsageClaudeCodeCardProps) {
  const hasLimits = limits.length > 0

  return (
    <Card padding="tight" className={className}>
      {collapsed ? (
        <div className="flex items-center justify-between gap-1.5">
          {hasLimits ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {limits.map((limit) => (
                <MiniBar key={limit.id} limit={limit} thresholds={thresholds} transition={transition} />
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-text-secondary/40">{emptyLabel}</span>
          )}
          <ButtonIcon icon={Plus} title={expandLabel} onClick={onToggle} />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2 gap-2">
            {/* `truncate`, unlike the fixed labels this chip usually carries: an account
                is whatever the person is called, in a column barely wider than 200px.
                The full value stays in the tooltip. */}
            <Label tone="claude-code" title={account} truncate>
              {account}
            </Label>
            <ButtonIcon icon={Minus} title={collapseLabel} onClick={onToggle} />
          </div>

          {hasLimits ? (
            <div className="space-y-2">
              {limits.map((limit) => (
                <FullBar key={limit.id} limit={limit} thresholds={thresholds} transition={transition} />
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-text-secondary/40 text-center py-1.5 leading-snug">
              {emptyHint}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

interface Bar {
  limit: UsageLimit
  thresholds?: ProgressThresholds
  transition?: boolean
}

/**
 * One limit on the collapsed line: "session ▬▬ 89%".
 *
 * EVERY LIMIT SHARES ONE ROW, so each takes an equal part of it — the label and the
 * percentage are `shrink-0` and the BAR absorbs whatever is left. It goes very small
 * on a narrow sidebar, by design: at a glance the colour and the number are the
 * reading, and the bar is there to say which way the number is going.
 *
 * 11px, one step under the open card's 12 — three of these share the row the open
 * card gives to one.
 */
function MiniBar({ limit, thresholds, transition }: Bar) {
  const pct = clamp(limit.percent)
  const tone = progressTone(pct, thresholds)
  return (
    <div className="flex items-center gap-1 flex-1 min-w-0">
      <span className="shrink-0 text-[11px] text-text-secondary/60">{limit.shortLabel}</span>
      <ProgressBar
        value={pct}
        thresholds={thresholds}
        size="xs"
        label={limit.shortLabel}
        transition={transition}
        className="flex-1 min-w-[8px]"
      />
      <span className={`shrink-0 text-[11px] font-semibold ${PROGRESS_TEXT[tone]}`}>
        {Math.round(pct)}%
      </span>
    </div>
  )
}

/**
 * One limit on the open card: a name, when it resets, a percentage, and the bar.
 *
 * `text-xs` and not the 10px this was: the card is the one thing in the left sidebar
 * a person READS a number off rather than glances at. The reset stamp keeps a step
 * below the two figures it qualifies, at 11px — it is context for the percentage, not
 * a third reading.
 */
function FullBar({ limit, thresholds, transition }: Bar) {
  const pct = clamp(limit.percent)
  const tone = progressTone(pct, thresholds)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        {/* `opacity` and not `text-text-secondary/60`: `Text` owns the colour, and a
            second colour class on one element is settled by the order Tailwind emitted
            the two rather than by the order they are written. */}
        <Text tone="secondary" className="opacity-60">
          {limit.label}
        </Text>
        <span className="flex items-center gap-1.5">
          {limit.reset && <span className="text-[11px] text-text-secondary/35">{limit.reset}</span>}
          <span className={`font-semibold ${PROGRESS_TEXT[tone]}`}>{Math.round(pct)}%</span>
        </span>
      </div>
      <ProgressBar value={pct} thresholds={thresholds} label={limit.label} transition={transition} />
    </div>
  )
}

/**
 * `ProgressBar` clamps the bar itself, but the PERCENTAGE and the tone are read here
 * — and a caller doing its own arithmetic must not be able to print "104%" beside a
 * bar that stopped at full.
 */
function clamp(value: number): number {
  return Math.min(100, Math.max(0, value))
}
