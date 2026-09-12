import { ButtonIcon } from './ButtonIcon'
import { Card } from './Card'
import { Clock, Cpu, DollarSign, Gauge, Minus, Plus } from './icons'
import { Label } from './Label'
import { ProgressBar } from './ProgressBar'
import { PROGRESS_TEXT, progressTone } from './progressTones'
import { Text } from './Text'

/**
 * What a Claude Code agent is currently spending: its context window, its model, what
 * the run has cost and how long it has taken.
 *
 * IT COMPUTES NOTHING AND READS NOTHING. Every figure arrives already formatted, every
 * word already translated, and the fold is a callback — which is the point of it
 * living here at all. The version in the app held `useT`, `useLocale`, a currency
 * formatter and a duration formatter, none of which a drawing needs; what is left is
 * the arrangement, and the arrangement is the part a design system can be asked about.
 *
 * ONE EXCEPTION, and it is not a leak: "Claude Code" is a product name. It does not
 * translate, and passing it in would be a prop whose only correct value is the one
 * written below.
 */

/**
 * Where the context gauge turns: far earlier than a plan's rate limits.
 *
 * 40 and 70 against the limits' 65 and 85, and both are right — 60% of a weekly quota
 * is an ordinary Wednesday, while 60% of a context window is most of the way to a
 * compaction. Fixed here rather than passed in: it is a fact about context windows,
 * not a choice a caller gets to make.
 */
export const CONTEXT_THRESHOLDS = { warning: 40, danger: 70 }

export interface ContextAgentCardProps {
  /** 0 to 100. An agent that has not spoken yet has used 0%, and says so. */
  contextPercent: number
  /** "42k of 200k tokens", already built and already translated. Omitted, the line is absent. */
  contextDetail?: string
  /** The model's name, printed verbatim. */
  model?: string
  /** The run's cost, already in the reader's currency format. */
  cost?: string
  /** How long it has taken, already formatted. */
  duration?: string
  /**
   * Off when the CALLER is animating `contextPercent` itself — the marketing site's
   * illustration ramps it every frame, and the fill's own easing fights a value that
   * moves that fast. See `ProgressBar`.
   */
  transition?: boolean
  minimized?: boolean
  onMinimizedChange: (minimized: boolean) => void
  /** The three translated strings the card cannot build for itself. */
  labels: {
    /** The gauge's name — "Context". */
    context: string
    /** The fold button's tooltip, and its accessible name. */
    minimize: string
    /** The unfold button's. */
    expand: string
  }
}

export function ContextAgentCard({
  contextPercent,
  contextDetail,
  model,
  cost,
  duration,
  transition = true,
  minimized = false,
  onMinimizedChange,
  labels,
}: ContextAgentCardProps) {
  // NO FIGURE READS AS A DASH. An empty bar labelled 0% claims a measurement where
  // there is none — true, and it costs more than it buys: the dash appears for the
  // first seconds of every agent, in the slot a number lives in the rest of the time,
  // and a reader meeting it once has to work out whether something is broken.
  const pct = Math.min(100, Math.max(0, contextPercent))
  const pctLabel = `${Math.round(pct)}%`
  const pctColor = PROGRESS_TEXT[progressTone(pct, CONTEXT_THRESHOLDS)]

  // `sunken` because the well has to stay visible at all times: it is what makes the
  // REMAINDER legible, and a fill floating on nothing says how much is used without
  // saying of what.
  const gauge = (className: string) => (
    <ProgressBar
      value={pct}
      thresholds={CONTEXT_THRESHOLDS}
      track="sunken"
      label={labels.context}
      transition={transition}
      className={className}
    />
  )

  if (minimized) {
    // One line: the brand chip, a short bar, the percent, and the way back out. The
    // vertical padding stays small — matching the full card's would undo the point of
    // folding it.
    return (
      <Card padding="compact" className="flex items-center gap-2">
        <Label tone="claude-code">Claude Code</Label>
        {/* Capped at a third of the row so the bar does not span the whole card;
            `ml-auto` groups it with the percent and the button. */}
        {gauge('flex-1 min-w-0 max-w-[33%] ml-auto')}
        <Text size="xs" tone="inherit" className={`shrink-0 ${pctColor}`}>
          {pctLabel}
        </Text>
        <ButtonIcon icon={Plus} title={labels.expand} onClick={() => onMinimizedChange(false)} />
      </Card>
    )
  }

  return (
    // `gap-2`, the sidebar column's own spacing: a gap sits between children only, so
    // it also skips the blocks that render nothing.
    <Card className="flex flex-col gap-2">
      {/* WHAT IS RUNNING, in one phrase: Claude Code, on this model. The model was
          pinned to the far right once — a pill at the other end of the row from the
          thing it qualifies, with the fold button as its only neighbour, which made it
          look like a second control. It reads left to right now. */}
      <div className="flex items-center gap-1.5">
        <Label tone="claude-code">Claude Code</Label>
        {model && (
          <Label icon={Cpu} title={model} truncate>
            {model}
          </Label>
        )}
        <ButtonIcon
          icon={Minus}
          title={labels.minimize}
          onClick={() => onMinimizedChange(true)}
          className="ml-auto"
        />
      </div>

      {/* NO PLATE. Every other block in this column sits on `bg-ink/5`, but this one
          holds the card's only MEASUREMENT, and a grey box around it made the gauge
          read as one more framed field rather than as the headline. The coloured bar is
          the only thing here with a ground, which is the point of it. */}
      <div className="p-2 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-icon" />
            <Text tone="secondary">{labels.context}</Text>
          </span>
          <Text weight="medium" tone="inherit" className={pctColor}>
            {pctLabel}
          </Text>
        </div>
        {gauge('w-full')}
        {contextDetail && (
          <div className="text-[11px] text-text-secondary/70 tabular-nums">{contextDetail}</div>
        )}
      </div>

      {/* Cost and duration as chips, side by side: they are of a kind with what is
          above them, and two short labels justified apart read as two unrelated
          readings. Gated as a PAIR — with the card rendering before any usage arrives,
          an unguarded row would contribute the column's gap with nothing in it. */}
      {(cost || duration) && (
        <div className="flex items-center gap-1.5">
          {/* `tabular-nums` keeps the digits from shifting as the cost ticks up, which
              is what a monospace face used to buy. */}
          {cost && (
            <Label icon={DollarSign} className="tabular-nums">
              {cost}
            </Label>
          )}
          {/* `ml-auto`: the two are a pair, but they are also the card's bottom line,
              and pinning the clock right gives that line the same two-column reading as
              the header. It also keeps the duration still as the cost's width changes. */}
          {duration && (
            <Label icon={Clock} className="ml-auto tabular-nums">
              {duration}
            </Label>
          )}
        </div>
      )}
    </Card>
  )
}
