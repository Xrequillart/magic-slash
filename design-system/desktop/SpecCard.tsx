import { useCallback, useRef, useState, type ReactNode } from 'react'
import { ButtonIcon } from './ButtonIcon'
import { Card } from './Card'
import { EditableText, type EditableTextProps } from './EditableText'
import { Label, type LabelProps } from './Label'
import { Status, type StatusProps } from './Status'
import { FolderGit2, Maximize2 } from './icons'

/**
 * A `/magic:plan` SPEC, as the planner's sidebar shows it: which repositories it is being
 * written against, whose plan it is, and the document itself.
 *
 * IT IS THE ONLY CARD A PLANNING AGENT HAS, and every decision here follows from that. It
 * carries the agent's title and status because the ticket card that normally holds them is
 * not on screen; it does not collapse, because folding away the one thing worth reading
 * would put it an interaction away; and it grows to fill the column rather than scrolling
 * inside a column that also scrolls.
 *
 * IT OPENS AT THE TOP AND STAYS WHERE THE READER PUTS IT. A spec is a document to be read
 * from its first line, not a log to be tailed, so nothing here chases the end of the file.
 * A scroll container starts at 0 and keeps its offset as content is appended below, which
 * is exactly the wanted behaviour — hence no effect, only the scroll-to-top control once
 * the top is genuinely off screen.
 *
 * THE DOCUMENT ARRIVES AS A NODE and so do the comments. Rendering the spec means reading a
 * file off disk through the app's IPC and laying a comment layer over its markdown; the
 * comments control is a popover wired to a store. Neither is a drawing, and a folder that
 * cannot import the app cannot own them. What this card owns is everything around them:
 * the plate, the heading row, the rhythm, and the scroll.
 *
 * SAME PADDING AND RHYTHM AS `TitleAgentCard` — `p-4`, `mb-3` under the top row, the title
 * below it — so the spec card and the ticket card read as one family rather than two.
 */

/** Past this many pixels the top is genuinely off screen and the control earns its place. */
const SCROLL_TOLERANCE_PX = 8

export interface SpecCardProps {
  /**
   * The repositories being planned against — a `Label` each, exactly as `HeaderRepoCard`
   * names one on a coder's repository card.
   *
   * THE SAME CHIP ON BOTH SIDES, which is the point: a planner and a coder pointed at one
   * repository must be recognisable as the same repository, and the chip — the folder, the
   * name, the hue at 12% — is what the reader recognises it by. This row used to draw a bare
   * tile with the names joined into a plain string beside it, so the two surfaces named the
   * same thing two ways.
   *
   * ONE PER REPOSITORY and not a single chip over a joined name: a full-stack plan spans two,
   * and one chip would have to pick one of the two colours and be wrong about the other.
   */
  repos?: {
    name: string
    /** The hue it was given in Settings, or undefined for one this app knows none for. */
    color?: string
  }[]
  /**
   * What heads the row when NO repository is attached — the spec's own file name, in
   * practice, so the row is never left empty.
   *
   * Plain text rather than a chip, deliberately: a repository chip in front of a file name
   * would name something that is not there.
   */
  emptyLabel: string
  /**
   * The ticket, once `/magic:plan` has created it.
   *
   * The ticket card never comes back for a planning agent, so without this the ticket the
   * skill just created would be unreachable from the sidebar.
   */
  ticket?: Omit<LabelProps, 'size' | 'truncate'>
  /**
   * The comments on the spec — a node, and absent until there is at least one.
   *
   * A header row has no other job that would keep it there at zero, unlike a review's
   * footer bar which stays for the changes; an empty control in a title row is a
   * permanently dead affordance.
   */
  comments?: ReactNode
  /**
   * The agent's status. The ticket card is the only other place that draws it, and it is
   * not on screen here — without this the card would REMOVE the marker that tells a
   * planning agent from an implementation one.
   */
  status?: Omit<StatusProps, 'size'>
  /** Hand the same document to the app's wider preview. */
  expand: { title: string; onClick: () => void }
  /**
   * The agent's title, editable.
   *
   * The description is deliberately absent: `/magic:plan` never fills it, and the spec
   * below says everything it would have said.
   */
  title: Omit<EditableTextProps, 'variant' | 'multiline' | 'as' | 'className'>
  /** The document itself. */
  children: ReactNode
  /** The control that appears once the reader has scrolled away from the first line. */
  scrollToTopLabel: string
  /** Margins. Not the plate, the padding or the order of the rows. */
  className?: string
}

export function SpecCard({
  repos = [],
  emptyLabel,
  ticket,
  comments,
  status,
  expand,
  title,
  children,
  scrollToTopLabel,
  className = '',
}: SpecCardProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [showScrollToTop, setShowScrollToTop] = useState(false)

  const scrollToTop = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = 0
  }, [])

  const handleScroll = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    setShowScrollToTop(body.scrollTop > SCROLL_TOLERANCE_PX)
  }, [])

  return (
    // No `overflow-hidden` on the card: the status picker is an absolutely positioned
    // dropdown and would be clipped by it. The body rounds its own bottom corners instead.
    <Card padding="none" className={`flex flex-col flex-1 min-h-0 ${className}`.trim()}>
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* The repository, at the weight `HeaderRepoCard` gives it. The repository cards
              are gone for a planning agent, so this row takes over their header: what is
              being planned against, said once and said plainly.

              `tone="neutral"` with a `color` is what paints the glyph in the ground's own
              hue — the one place `Label` does that, and it does it here for the reason it
              does it there: a repository has no mark of its own, so the colour is the mark. */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {repos.length > 0 ? (
              repos.map(repo => (
                <Label
                  key={repo.name}
                  tone="neutral"
                  icon={FolderGit2}
                  color={repo.color}
                  title={repo.name}
                  truncate
                >
                  {repo.name}
                </Label>
              ))
            ) : (
              <span className="text-ink/90 font-medium text-sm truncate" title={emptyLabel}>
                {emptyLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {ticket && <Label {...ticket} />}
            {/* Before the status and the expand control rather than after: the comments
                belong to the DOCUMENT, and those two describe the agent and the frame
                around it. `gap-1.5` on the row is what spaces them, so none needs a margin
                of its own. */}
            {comments}
            {status && <Status {...status} />}
            <ButtonIcon
              icon={Maximize2}
              title={expand.title}
              onClick={expand.onClick}
              className="-mr-1.5"
            />
          </div>
        </div>

        <EditableText as="h2" variant="title" {...title} />
      </div>

      <div className="relative flex flex-col flex-1 min-h-0">
        <div
          ref={bodyRef}
          onScroll={handleScroll}
          className="overflow-y-auto rounded-b-xl border-t border-line flex-1 min-h-0"
        >
          {children}
        </div>
        {showScrollToTop && (
          <button
            type="button"
            onClick={scrollToTop}
            className="absolute bottom-3 right-3 z-10 bg-ink/15 hover:bg-ink/25 text-ink/70 px-3 py-1 rounded-full text-[10px] transition-all duration-200 border-none cursor-pointer"
          >
            {scrollToTopLabel}
          </button>
        )}
      </div>
    </Card>
  )
}
