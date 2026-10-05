import type { ReactNode } from 'react'

/**
 * A TABLE CLAUDE WROTE, in the chat: drawn as a card like the insights beside it, rounded
 * and framed once, rather than as a grid of boxed cells.
 *
 * A table with `border-collapse` cannot round its own corners, so the frame is a wrapper
 * that clips it, and the table only draws the rules between its cells. The wrapper also
 * scrolls a table wider than the thread, so a long one never pushes the chat sideways.
 *
 * The rows are what `react-markdown` builds from the GFM table: this only owns its look.
 */

export interface ChatTableProps {
  children?: ReactNode
}

const TABLE = `w-full border-collapse text-xs
  [&_th]:bg-surface [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold
  [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top
  [&_th+th]:border-l [&_th+th]:border-line-subtle [&_td+td]:border-l [&_td+td]:border-line-subtle
  [&_thead_tr]:border-b [&_thead_tr]:border-line
  [&_tbody_tr+tr]:border-t [&_tbody_tr+tr]:border-line-subtle`

export function ChatTable({ children }: ChatTableProps) {
  return (
    <div className="my-3 overflow-hidden rounded-xl border border-line">
      <div className="overflow-x-auto">
        <table className={TABLE}>{children}</table>
      </div>
    </div>
  )
}
