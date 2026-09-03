'use client'

/**
 * The artwork beside the `Split View` row: one app window, two agents in it, side by
 * side.
 *
 * DELIBERATELY THE LIGHTEST DRAWING ON THE PAGE. The sentence beside it is about a
 * layout, not about what either agent is saying, so the picture only has to show the
 * division: a dark window, a seam down the middle, and a pane on each side with the
 * shape of a conversation in it. Skeleton bars rather than copy, because any real
 * sentence here would be read, and there is nothing to read — the point is that there
 * are TWO of them.
 *
 * THE TWO PANES DIFFER IN ONE WAY ONLY: the left one ends in a brighter, wider bar where
 * a prompt is being typed, the right one does not. That is the row's own sentence — "the
 * one you are answering, and the one you are watching" — drawn rather than said.
 *
 * Each pane is headed by a ticket id, on the same invented project as the other drawings,
 * because a ticket is how a task is named everywhere else on this page and a pane with
 * no name is a pane you cannot tell from its neighbour. The ids are the same string in
 * both languages, so they are not routed through the catalogue.
 *
 * `bg-tone-mist`, the palest plate: a window that is mostly dark ground needs the
 * quietest surface under it, or the plate competes with the picture.
 *
 * `aria-hidden`: it is a drawing.
 */
export function SplitViewMockup() {
  return (
    <div
      aria-hidden
      className="flex h-full min-h-44 items-center overflow-hidden rounded-xl bg-tone-mist px-6 py-6"
    >
      <div className="flex w-full overflow-hidden rounded-2xl bg-ink shadow-lift">
        <Pane ticket="PROJ-123" typing />
        <div className="w-px shrink-0 self-stretch bg-white/10" />
        <Pane ticket="PROJ-124" />
      </div>
    </div>
  )
}

function Pane({ ticket, typing = false }: { ticket: string; typing?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 px-4 py-4">
      <span className="text-[11px] font-medium uppercase tracking-wider text-appink-icon">
        {ticket}
      </span>
      <div className="flex flex-col gap-2">
        <div className="h-2 w-4/5 rounded-full bg-white/15" />
        <div className="h-2 w-3/5 rounded-full bg-white/15" />
        <div className="h-2 w-2/3 rounded-full bg-white/15" />
      </div>
      {typing ? (
        <div className="mt-auto h-7 rounded-lg border border-white/20 bg-white/5" />
      ) : (
        <div className="mt-auto h-7" />
      )}
    </div>
  )
}
