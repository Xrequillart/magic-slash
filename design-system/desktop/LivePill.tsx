/**
 * A PILL THAT SAYS SOMETHING IS HAPPENING RIGHT NOW: a green word behind a dot that
 * pulses, or a yellow one behind a still dot when the thing is on its way back.
 *
 * Lifted out of the plan modal's header (`LiveIndicator`, "Live" / "Reconnecting…"),
 * where it was drawn by hand, so the Security & Access page could mark the session in
 * use with the same pill rather than a second green of its own.
 *
 * THE PULSE IS THE MESSAGE, and only `live` has it. A dot that pulses while waiting
 * would say "working" about something that is not.
 */

export type LivePillTone = 'live' | 'waiting'

export interface LivePillProps {
  /** The word, translated: "Live", "Active now". */
  label: string
  tone?: LivePillTone
  /** A longer sentence for the tooltip. */
  title?: string
  /** Margins and layout. Not the ground, the padding or the radius. */
  className?: string
}

const TONES: Record<LivePillTone, { pill: string; dot: string }> = {
  live: { pill: 'bg-green/10 text-green', dot: 'bg-green' },
  waiting: { pill: 'bg-yellow/10 text-yellow', dot: 'bg-yellow' },
}

export function LivePill({ label, tone = 'live', title, className = '' }: LivePillProps) {
  const { pill, dot } = TONES[tone]

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium ${pill} ${className}`.trim()}
      title={title}
    >
      <span className="relative flex h-2 w-2">
        {tone === 'live' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      {label}
    </span>
  )
}
