import { ToolMark } from './ToolMark'

/**
 * A RUN OF TOOL CALLS AS OVERLAPPING MARKS, one per call, oldest first, the way
 * `AvatarStack` overlaps faces: the line reads as what the run did.
 *
 * Only the last `max` calls are drawn: a run of forty reads by its latest steps, and a
 * `+N` would repeat the count the line already prints beside it.
 *
 * EACH MARK SITS ON A WHITE DISC, in the fixed paper and ink (`release-paper`,
 * `release-ink`), so the marks read the same on every theme and a logo keeps the ground
 * it was drawn for. The disc's ring is the thread's ground (`surface-sunken`, the
 * chat's), so the disc on top cuts the one under it instead of drawing over it.
 */

export interface ToolMarkStackProps {
  /** The tools' names, in the order they were called. */
  names: string[]
  /** How many of the last calls are drawn. */
  max?: number
}

export function ToolMarkStack({ names, max = 5 }: ToolMarkStackProps) {
  const shown = names.slice(-max)
  return (
    <span className="flex flex-shrink-0 items-center" aria-hidden>
      {shown.map((name, i) => (
        <span
          key={names.length - shown.length + i}
          className={`relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-release-paper ring-2 ring-surface-sunken ${i > 0 ? '-ml-1' : ''}`}
        >
          <ToolMark name={name} tone="paper" />
        </span>
      ))}
    </span>
  )
}
