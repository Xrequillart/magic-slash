import { DiffStat } from './DiffStat'
import { Text } from './Text'

/**
 * One file that has changed, and by how much.
 *
 * A NAME AND A `DiffStat`, and that really is all of it — which is the reason it is
 * a component rather than six lines left inside the card. The row is the same object
 * wherever a working tree is listed (the sidebar, the review drawer, a future commit
 * preview), and the card was the only thing that knew how to draw one.
 *
 * IT IS THE ROW AND `UnCommittedChangesCard` IS THE PANEL, the split this folder
 * makes everywhere: `CommitLine`/`CommitCard`, `BranchCard` and its chips. This has
 * no ground of its own, no heading and no count — it draws ONE file, and the panel
 * says what a stack of them means.
 *
 * THE NAME IS WHAT IT IS HANDED, not what it derives. The app shows the basename and
 * keeps the whole path in the tooltip, but "which part of a path is worth reading"
 * is a question about a sidebar's width rather than about a file — so the caller
 * answers it and this obeys, the way `CommitLine` takes a formatted date.
 */

export interface FileModifiedLineProps {
  /** What the row shows. The app hands it the basename; the path goes in `title`. */
  name: string
  /** The native tooltip — the whole path, since the name is usually a truncation of it. */
  title?: string
  /** Lines added in this file. */
  additions: number
  /** Lines removed in this file. */
  deletions: number
  /**
   * Opening the file, or nothing at all.
   *
   * ITS PRESENCE IS WHAT MAKES THE ROW INTERACTIVE — the hover, the pointer and the
   * `<button>` element all arrive with it. A row that looks pressable and does
   * nothing is worse than a row that looks like text, so there is no way to ask for
   * one half without the other.
   *
   * A CALLBACK AND NOT A PATH TO OPEN. The app answers this by opening its review
   * drawer on a frozen copy of the whole changed-file list, which is an app fact
   * three layers deep; this folder must not know that such a thing exists.
   */
  onOpen?: () => void
  /** Margins and placement. Not the ground, the radius or either number's colour. */
  className?: string
}

export function FileModifiedLine({
  name,
  title,
  additions,
  deletions,
  onOpen,
  className = '',
}: FileModifiedLineProps) {
  /* NO SIDE PADDING AND NO NEGATIVE MARGIN — the row is exactly as wide as the box
     it is put in, and the panel's own padding is what insets it. So the filename
     starts on the heading's own left edge and the `DiffStat` ends on its right one,
     and a column of rows lines up with the words above them.

     THE `w-full` IS LOAD-BEARING, which is not obvious. A `<button>` is shrink-to-fit
     even as a block-level flex container — measured, three rows in a 264px list came
     out 179, 227 and 161px wide, each one stopping wherever its filename did. Width
     `auto` does not fill for a form control the way it does for a `<div>`.

     `rounded-lg` WITH NOTHING BEHIND IT is not left over: there is no ground here any
     more (see the button below), and the radius now shapes one thing only — the focus
     ring the browser draws when someone tabs to the row. */
  const row = `flex items-center gap-1.5 w-full py-1 rounded-lg ${className}`.trim()

  /* The row carries the colour and the `Text` takes it with `inherit`; spelling it
     once here is what lets the name dim with the row while `DiffStat` keeps its own
     green and red. Same arrangement as `CommitLine`. */
  const content = (
    <>
      <Text tone="inherit" className="flex-1 truncate text-left" title={title ?? name}>
        {name}
      </Text>
      <DiffStat additions={additions} deletions={deletions} />
    </>
  )

  if (!onOpen) {
    return <div className={`${row} text-text-secondary/60`}>{content}</div>
  }

  return (
    /* A real `<button>` and not a div with an `onClick`, which is what this was:
       keyboard focus, Enter and Space and a name in the accessibility tree all come
       free with the element and would each have to be rebuilt by hand without it.
       `border-none bg-transparent` because a button's default chrome has no place in
       a list of filenames — and there is no ground of our own to put in its place.

       THE HOVER IS THE TEXT, AND ONLY THE TEXT. A plate behind every row of a list
       this dense is a great deal of ink spent saying "your pointer is here"; the
       filename coming up from `text-text-secondary/60` to full `text-ink` says it
       with nothing drawn at all. `text-ink` AND NOT A WHITE, because this folder
       names a role and never a value — ink is the reader's own colour in each of the
       eight themes, which reads white on the dark ones and would be an unreadable
       white-on-white if it were spelled literally on the light ones.

       The `DiffStat` does not follow: its green and red are its own, and they are
       the one thing in the row that is not text about text. */
    <button
      type="button"
      onClick={onOpen}
      className={`${row} border-none bg-transparent cursor-pointer text-text-secondary/60 hover:text-ink transition-colors`}
    >
      {content}
    </button>
  )
}
