// Traffic-light color for a fill gauge: green → yellow → red as it fills up.
export function gaugeColors(pct: number): { bar: string; text: string } {
  if (pct >= 85) return { bar: 'bg-red', text: 'text-red' }
  if (pct >= 65) return { bar: 'bg-yellow', text: 'text-yellow' }
  return { bar: 'bg-green', text: 'text-green' }
}

// Compact "time until reset" from a unix-epoch-seconds timestamp: 45m, 2h14, 3d, soon.
export function formatReset(resetsAtSec: number, nowMs: number): string {
  const diffSec = Math.floor((resetsAtSec * 1000 - nowMs) / 1000)
  if (diffSec <= 0) return 'soon'
  const days = Math.floor(diffSec / 86_400)
  if (days >= 1) return `${days}d`
  const hours = Math.floor(diffSec / 3_600)
  const minutes = Math.floor((diffSec % 3_600) / 60)
  if (hours >= 1) return `${hours}h${String(minutes).padStart(2, '0')}`
  return `${Math.max(1, minutes)}m`
}

// Semicircle "speedometer" gauge for a plan rate limit (5h / 7d).
// The arc fills left→right over the top; the percentage sits in the belly and the
// reset countdown sits underneath.
export function LimitGauge({ label, percent, resetsAt, now }: {
  label: string
  percent: number
  resetsAt?: number
  now: number
}) {
  const pct = Math.min(100, Math.max(0, percent))
  const colors = gaugeColors(pct)

  // Geometry: centre bottom, radius r, semicircle from (cx-r, cy) to (cx+r, cy).
  const r = 26
  const cx = 34
  const cy = 32
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: 68, height: 40 }}>
        <svg viewBox="0 0 68 40" className="w-full h-full overflow-visible">
          {/* Track */}
          <path
            d={arc}
            fill="none"
            className="stroke-white/[0.08]"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={100}
          />
          {/* Value */}
          <path
            d={arc}
            fill="none"
            className={`${colors.text} transition-all duration-500`}
            stroke="currentColor"
            strokeWidth={6}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${pct} 100`}
          />
        </svg>
        {/* Percentage in the belly */}
        <span
          className={`absolute inset-x-0 bottom-0 text-center font-mono font-semibold text-sm ${colors.text}`}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <span className="text-[11px] text-text-secondary/70">{label}</span>
      {typeof resetsAt === 'number' && (
        <span className="text-[10px] text-text-secondary/50">resets in {formatReset(resetsAt, now)}</span>
      )}
    </div>
  )
}
