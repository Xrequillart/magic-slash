import { Gauge, DollarSign, Cpu, Clock, Minus, Plus } from 'lucide-react'
import type { TerminalUsage } from '../../../types'
import { contextColors } from './utils'
import { CLAUDE_CHIP_GROUND, CLAUDE_CORAL, ClaudeCodeIcon } from '../icons/ClaudeCode'
import { ACTION_CHIP, ACTION_CHIP_SQUARE, LABEL_CHIP } from '../actionChip'
import { useT, useLocale, type Translate } from '../../i18n'
import { formatUsd } from '../../utils/usageStats'

interface UsageCardProps {
  usage: TerminalUsage
  /**
   * Collapsed to the context gauge alone. Owned by the parent (and through it by
   * the config) rather than by this card: it used to be local state, which meant
   * the compact form was forgotten on every agent switch, and the Appearance tab
   * now offers the same choice as a select. One value, two ways to set it.
   */
  minimized: boolean
  onMinimizedChange: (minimized: boolean) => void
}

// The mantissa goes through toLocaleString and the unit through the catalogue:
// French writes "12,5 M", not "12.5M".
function formatTokens(n: number, locale: string, t: Translate): string {
  const scaled = (value: number, digits: number, unit: string) =>
    `${value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit}`
  if (n >= 1_000_000) return scaled(n / 1_000_000, 2, t('usage.unit.million'))
  if (n >= 1_000) return scaled(n / 1_000, 1, t('usage.unit.thousand'))
  return n.toLocaleString(locale)
}

function formatDuration(ms: number, t: Translate): string {
  const totalSec = Math.round(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return t('duration.hoursMinutes', { hours: h, minutes: m })
  if (m > 0) return t('duration.minutesSeconds', { minutes: m, seconds: s })
  return t('relative.seconds', { count: s })
}

/**
 * WHAT IS BEING MEASURED, named and marked: Claude Code, top left of the card.
 *
 * The label was the word "SESSION", which named the container and not the thing —
 * every card in this column is about the same session, and the one fact this one had
 * to give up its corner for is WHOSE context window is filling. The mark says it
 * faster than the word, and the reader recognises it from the terminal underneath.
 *
 * NO CATALOGUE ENTRY: "Claude Code" is a product name, spelled the same in every
 * language, which is the same call the site makes for its own row of three.
 *
 * The coral and its 14% ground come from `icons/ClaudeCode`, which carries why they
 * are a hex and an rgba rather than tokens — and which the left sidebar's usage card
 * now reads too, so the two Claude chips cannot drift apart.
 *
 * The refresh stamp that sat beside the old label is gone. It answered a question
 * nobody was asking — the usage feed pushes, so the figures below are current by
 * construction, and a timestamp next to them only invited doubt about whether they
 * were.
 */
/**
 * The shape all four labels on this card share — the repository header's chip, which
 * is the ticket badge's, which is this app's one small filled label.
 *
 * `LABEL_CHIP` is that shape, shared with the left sidebar's usage card — see
 * `actionChip`, which now holds both halves of the vocabulary.
 *
 * Four of them here, and they are four FACTS about one run: which tool, which model,
 * what it has cost, how long it has been going. They used to be a coral chip, a purple
 * pill at a different height and radius, and two bare icon-and-number pairs floating
 * on the card — three treatments for one kind of thing, which is what made the card
 * read as a form rather than as a readout.
 */
const USAGE_CHIP = LABEL_CHIP

/**
 * The neutral one: grey ground, primary ink. `bg-ink/10` rather than the `/5` the
 * repository card's blocks wear — those are containers and this is a label sitting ON
 * one, so it needs the extra step to stay a distinct object rather than dissolving
 * into whatever it is placed on.
 */
const USAGE_CHIP_NEUTRAL = `${USAGE_CHIP} bg-ink/10 text-ink`

function ClaudeCodeBadge() {
  return (
    <span
      className={`${USAGE_CHIP} text-ink`}
      style={{ backgroundColor: CLAUDE_CHIP_GROUND }}
    >
      {/* THE MARK KEEPS THE CORAL, THE WORDS DO NOT — `TrackerBadge`'s split, and
          `RepoNameBadge`'s: one coloured thing per chip. A brand hue at full saturation
          on its own 14% tint is not a legible pair on every theme, and the ground
          already says whose chip this is. */}
      <ClaudeCodeIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: CLAUDE_CORAL }} />
      Claude Code
    </span>
  )
}

/**
 * The context gauge, in both forms of the card.
 *
 * The track keeps its well at all times: it is what makes the REMAINDER legible, and
 * a fill floating on nothing says how much is used without saying of what. What comes
 * and goes under the pointer is the PLATE around it — see the gauge block below.
 */
function ContextBar({ pct, bar, className = '' }: { pct: number; bar: string; className?: string }) {
  return (
    <div
      className={`h-1.5 rounded-full bg-surface-sunken overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full ${bar} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function UsageCard({ usage, minimized, onMinimizedChange }: UsageCardProps) {
  const t = useT()
  const locale = useLocale()
  const {
    costUsd,
    contextPercent,
    contextTokens,
    contextWindowSize,
    model,
    durationMs,
  } = usage

  // NO FIGURE READS AS 0%. This used to fall back to an em dash, on the argument that
  // an empty bar labelled 0% claims a measurement where there is none — true, and it
  // cost more than it bought: the dash appears for the first seconds of every agent,
  // in the slot a number lives in the rest of the time, and a reader meeting it once
  // has to work out whether something is broken. 0% is what an agent that has not
  // spoken yet has actually used, and the bar beside it says the same thing.
  const pct = Math.min(100, Math.max(0, contextPercent ?? 0))
  const colors = contextColors(pct)
  const pctLabel = `${Math.round(pct)}%`
  const pctColor = colors.text

  // Minimized: single-line — the same brand chip, a small progress bar, the percent
  // and the expand button.
  if (minimized) {
    return (
      /* `px-4` to line its content up with every other card in the column (see
         `RepositoryCard`); the vertical padding stays small, because minimised is a
         one-line bar and matching `p-4` there would undo the point of minimising. */
      <div className="bg-surface rounded-xl px-4 py-2 flex items-center gap-2">
        <ClaudeCodeBadge />
        {/* Capped at a third of the row so the bar doesn't span the whole card;
            ml-auto pushes it right, grouping it with the percent + expand button. */}
        <ContextBar pct={pct} bar={colors.bar} className="flex-1 min-w-0 max-w-[33%] ml-auto" />
        <span className={`font-medium text-xs shrink-0 ${pctColor}`}>{pctLabel}</span>
        <button
          onClick={() => onMinimizedChange(false)}
          title={t('usage.expand')}
          className={`${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-ink/10 hover:text-ink`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    /* `gap-2`, the column's own spacing — `RepositoryCard` sets it out at length: a gap
       sits between children only, so it also skips the blocks that render nothing. This
       was `space-y-3`, one step wider than every other card in the sidebar, which read
       as three loose fields rather than one card. */
    <div className="bg-surface rounded-xl p-4 flex flex-col gap-2">
      {/* WHAT IS RUNNING, in one phrase: Claude Code, on this model. The model used to
          be pinned to the far right, a purple pill at the other end of the row from the
          thing it qualifies — with the fold button as its only neighbour, which made it
          look like a second control. Read left to right now, and `min-w-0` + `truncate`
          on the model so a long name gives way rather than pushing the button off. */}
      <div className="flex items-center gap-1.5">
        <ClaudeCodeBadge />
        {model && (
          <span className={`${USAGE_CHIP_NEUTRAL} min-w-0`} title={model}>
            <Cpu className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{model}</span>
          </span>
        )}
        {/* The repository header's chip, so the one control on this card is the same
            object as the four on the card below it. */}
        <button
          onClick={() => onMinimizedChange(true)}
          title={t('usage.minimize')}
          className={`ml-auto ${ACTION_CHIP} ${ACTION_CHIP_SQUARE} hover:bg-ink/10 hover:text-ink`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Context usage — always present, empty until the feed reports a figure.
          NO PLATE. The block is `bg-ink/5` everywhere the repository card stacks one —
          but this one holds the card's only MEASUREMENT, and a grey box around it made
          the gauge read as one more framed field rather than as the headline. The
          coloured bar is the only thing here with a ground, which is the point of it. */}
      <div className="p-2 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <Gauge className="w-3.5 h-3.5" />
            {t('agentInfo.context')}
          </span>
          <span className={`font-medium ${pctColor}`}>{pctLabel}</span>
        </div>
        <ContextBar pct={pct} bar={colors.bar} className="w-full" />
        {typeof contextTokens === 'number' && typeof contextWindowSize === 'number' && (
          <div className="text-[11px] text-text-secondary/70 tabular-nums">
            {t('agentInfo.tokensOf', { used: formatTokens(contextTokens, locale, t), total: formatTokens(contextWindowSize, locale, t) })}
          </div>
        )}
      </div>

      {/* Cost and duration, as the model's own chip — the last two facts on the card
          that were still bare icon-and-number pairs pushed to opposite ends of a row.
          Chips, and side by side: they are of a kind with what is above them, and two
          short labels justified apart read as two unrelated readings.

          Gated as a pair: with the card rendering before any usage arrives, an
          unguarded row would contribute the column's gap below the gauge with
          nothing in it. */}
      {(typeof costUsd === 'number' || typeof durationMs === 'number') && (
        <div className="flex items-center gap-1.5">
          {typeof costUsd === 'number' && (
            <span className={USAGE_CHIP_NEUTRAL}>
              <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
              {/* tabular-nums keeps the digits from shifting as the cost ticks up,
                  which is what the mono face used to buy us. */}
              <span className="tabular-nums">{formatUsd(costUsd, locale)}</span>
            </span>
          )}
          {/* `ml-auto`: the two are read as a pair — what this run cost, and how long it
              has taken — but they are also the card's bottom line, and pinning the clock
              to the right edge gives that line the same two-column reading as the header
              above it. It also keeps the duration in one place as the cost's width
              changes under it. */}
          {typeof durationMs === 'number' && (
            <span className={`${USAGE_CHIP_NEUTRAL} ml-auto`}>
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="tabular-nums">{formatDuration(durationMs, t)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
