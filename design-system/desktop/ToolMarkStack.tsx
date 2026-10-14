import { ToolMark } from './ToolMark'

/**
 * A RUN OF TOOL CALLS AS OVERLAPPING MARKS, one per call, oldest first, the way
 * `AvatarStack` overlaps faces: the line reads as what the run did. A single call is a
 * run of one, so every tool line of the chat wears the same disc.
 *
 * Only the last `max` calls are drawn: a run of forty reads by its latest steps, and a
 * `+N` would repeat the count the line already prints beside it.
 *
 * EACH DISC SITS ON THE THREAD'S GROUND (`surface-sunken`, the chat's), with a ring of
 * it: the disc on top cuts the one under it instead of drawing over it, and a translucent
 * plate (Jira's) is a tint of that ground rather than a window onto the disc below.
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
          className={`relative flex rounded-full bg-surface-sunken ring-2 ring-surface-sunken ${i > 0 ? '-ml-1.5' : ''}`}
        >
          <ToolMark name={name} />
        </span>
      ))}
    </span>
  )
}
