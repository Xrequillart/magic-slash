import { useState, useCallback } from 'react'

interface ActivityHeatmapProps {
  heatmapData: Map<string, number>
}

const CELL_SIZE = 12
const CELL_GAP = 2
const CELL_STRIDE = CELL_SIZE + CELL_GAP
const WEEKS = 52
const DAYS = 7
const LABEL_WIDTH = 32
const HEADER_HEIGHT = 16

const DAY_LABELS: { row: number; label: string }[] = [
  { row: 1, label: 'Mon' },
  { row: 3, label: 'Wed' },
  { row: 5, label: 'Fri' },
]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const ACCENT = '#6366f1'
const EMPTY_FILL = '#1c1c1f'

function getCellColor(count: number): string {
  if (count === 0) return EMPTY_FILL
  if (count === 1) return `${ACCENT}26` // ~0.15 opacity
  if (count === 2) return `${ACCENT}4d` // ~0.3 opacity
  if (count <= 4) return `${ACCENT}8c` // ~0.55 opacity
  return `${ACCENT}d9` // ~0.85 opacity
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

interface TooltipState {
  x: number
  y: number
  date: string
  count: number
}

export function ActivityHeatmap({ heatmapData }: ActivityHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  // Build grid: 52 weeks, right-aligned to today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Find the start date: go back 52 weeks from the end of this week
  // We want today to be the last cell. dayOfWeek: 0=Sun
  const todayDay = today.getDay()
  // Shift so Sunday=6, Mon=0, ..., Sat=5
  const adjustedDay = todayDay === 0 ? 6 : todayDay - 1

  // Start date is 52 weeks back from the beginning of the current week
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - adjustedDay - (WEEKS - 1) * 7)

  // Build month labels
  const monthLabels: { week: number; label: string }[] = []
  let lastMonth = -1
  for (let w = 0; w < WEEKS; w++) {
    const cellDate = new Date(startDate)
    cellDate.setDate(cellDate.getDate() + w * 7)
    const month = cellDate.getMonth()
    if (month !== lastMonth) {
      monthLabels.push({ week: w, label: MONTH_NAMES[month] })
      lastMonth = month
    }
  }

  const svgWidth = LABEL_WIDTH + WEEKS * CELL_STRIDE
  const svgHeight = HEADER_HEIGHT + DAYS * CELL_STRIDE

  const handleMouseEnter = useCallback((e: React.MouseEvent<SVGRectElement>, date: Date, count: number) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const parent = e.currentTarget.closest('.heatmap-container')
    if (!parent) return
    const parentRect = parent.getBoundingClientRect()
    setTooltip({
      x: rect.left - parentRect.left + CELL_SIZE / 2,
      y: rect.top - parentRect.top - 8,
      date: formatDateLabel(date),
      count,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <div className="bg-white/[0.06] rounded-xl p-4">
      <div className="overflow-x-auto heatmap-container relative">
        <svg
          width={svgWidth}
          height={svgHeight}
          className="block"
        >
          {/* Month labels */}
          {monthLabels.map(({ week, label }) => (
            <text
              key={`month-${week}`}
              x={LABEL_WIDTH + week * CELL_STRIDE}
              y={HEADER_HEIGHT - 4}
              className="fill-text-secondary"
              fontSize={10}
            >
              {label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map(({ row, label }) => (
            <text
              key={`day-${row}`}
              x={0}
              y={HEADER_HEIGHT + row * CELL_STRIDE + CELL_SIZE - 2}
              className="fill-text-secondary"
              fontSize={10}
            >
              {label}
            </text>
          ))}

          {/* Grid cells */}
          {Array.from({ length: WEEKS }, (_, w) =>
            Array.from({ length: DAYS }, (_, d) => {
              const cellDate = new Date(startDate)
              cellDate.setDate(cellDate.getDate() + w * 7 + d)

              // Don't render future cells
              if (cellDate > today) return null

              const key = toDateKey(cellDate)
              const count = heatmapData.get(key) || 0

              return (
                <rect
                  key={`${w}-${d}`}
                  x={LABEL_WIDTH + w * CELL_STRIDE}
                  y={HEADER_HEIGHT + d * CELL_STRIDE}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={getCellColor(count)}
                  onMouseEnter={(e) => handleMouseEnter(e, cellDate, count)}
                  onMouseLeave={handleMouseLeave}
                  className="cursor-pointer"
                />
              )
            }),
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-bg-secondary border border-white/[0.12] rounded-lg px-3 py-1.5 text-xs text-white shadow-lg whitespace-nowrap"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {tooltip.date} — {tooltip.count} {tooltip.count === 1 ? 'action' : 'actions'}
          </div>
        )}
      </div>
    </div>
  )
}
