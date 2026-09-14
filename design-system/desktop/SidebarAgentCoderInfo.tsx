import { ContextAgentCard, type ContextAgentCardProps } from './ContextAgentCard'
import { RepositoryCard, type RepositoryCardProps } from './RepositoryCard'
import { RepositorySelector, type RepositorySelectorProps } from './RepositorySelector'
import { TitleAgentCard, type TitleAgentCardProps } from './TitleAgentCard'
import { TEXT_FACE } from './Text'

/**
 * THE RIGHT COLUMN OF A CODER AGENT, WHOLE — and it still knows nothing.
 *
 * `Sidebar` is the agent list; this is what stands opposite it: everything the app knows
 * about the agent you are looking at. The account's usage, the ticket, a card per attached
 * repository, and a way to attach another — in that order, on the app's own ground, in the
 * app's own face.
 *
 * THERE IS NO SPEC HERE. A planning agent gets `SidebarAgentPlannerInfo` instead, which is
 * a second component rather than a mode of this one: what used to be a `fill` flag and four
 * conditions saying "at `replace` the ticket goes, the repositories go, the add-repository
 * box goes and the spec takes the height" switched off almost everything this column is.
 *
 * IT ARRANGES THE CARDS ITSELF NOW, which is the change that gave it this name. It used
 * to take five `ReactNode` slots and the app built every one of them: `AgentInfoSidebar`
 * knew that usage is a `ContextAgentCard`, that a repository is a `HeaderRepoCard` above
 * a `BranchCard` above an `UnCommittedChangesCard`, and in what order. That is a DESIGN
 * decision living in an app file, where no drawing of this column could reach it — and
 * the marketing site, which draws this column too, had rebuilt the same arrangement by
 * hand and got a different one.
 *
 * SO THE APP HANDS IT DATA AND CALLBACKS, and nothing else. `usage` is a number and a
 * model name, not a card; a repository is a name, a branch, a diff and some commits, not
 * six nested elements. Every string arrives already translated and every number already
 * formatted, because this folder has no translator and no locale — "3.4k of 200k tokens"
 * is the app's sentence, the gauge under it is this column's.
 *
 * WHAT IT STILL TAKES AS NODES is the short list of things that are not drawings at all:
 * the scripts running on a repository, and the pull-request watcher. Those hold effects,
 * poll, and type into a terminal. A component that cannot import the
 * store cannot own them, and pretending otherwise would mean threading forty callbacks
 * through this file to arrive at the same place. They are named slots, so the ORDER is
 * still this column's even where the contents are not.
 *
 * THE ORDER IS THE MEANING, as it is in `RepositoryCard` one rung down: it runs from the
 * account to the work — what you are spending, what you are on, what you are writing, and
 * the repositories it all lands in. Named props rather than `children`, so a caller cannot
 * put the spec above the ticket.
 *
 * TWO NESTED BOXES AND BOTH ARE LOAD-BEARING. The outer one animates its width to zero to
 * fold the column away; the inner one is pinned at the full width so the cards do NOT
 * reflow while that happens — text rewrapping through a 300ms collapse is the thing this
 * arrangement exists to prevent. Sliding shut rather than unmounting also keeps the scroll
 * position for when it comes back.
 *
 * THE FACE IS SET HERE, once, for everything inside. It is `Text`'s own — the app used to
 * spell it as an inline `fontFamily` on the scrolling container, which was the one place
 * in the renderer that named a font outside the design system.
 */

/**
 * One attached repository, as this column lists it.
 *
 * `RepositoryCard`'S OWN PROPS PLUS A KEY, and nothing else. The card draws its header, its
 * branch row, its diff and its commits itself, so there is no second vocabulary here and
 * nothing to fall out of date: a prop added to that card arrives in this list for free.
 *
 * This used to spell out each of the card's blocks and build them one by one, which put the
 * same four components in two places' "built on" lists — one because it drew them, one
 * because its slots expected them. The card draws them; this column draws the card.
 */
export interface CoderRepository extends RepositoryCardProps {
  /**
   * React's key, and the app's own handle on the row — the checkout path, in practice.
   * NOT the name: the same repository can be attached twice from two clones.
   */
  id: string
}

export interface SidebarAgentCoderInfoProps {
  /**
   * The column's width in pixels.
   *
   * A NUMBER FROM THE CALLER, not a constant of this file's, and that is the difference
   * from `Sidebar`: the left column is a fixed 230px by decree, this one is DERIVED — the
   * app takes a share of the viewport, floored and capped, and widens it again for a
   * planning agent whose spec needs the room. Which share, and where the bounds are, is
   * policy this column has no way to hold.
   */
  width: number
  /** Folded away: it slides shut by its own width rather than unmounting. */
  collapsed?: boolean
  /**
   * Whether a width change animates.
   *
   * A PROP BECAUSE THE COLUMN CANNOT TELL THE TWO KINDS OF WIDTH CHANGE APART, and they
   * want opposite things. Folding open or shut is a MOVE and should be seen: 300ms. A width
   * that changed because the window was resized, or because the agent switched to one that
   * wants a wider column, is not a move — it is where the column simply is now, and easing
   * into it lags the window edge the reader is dragging.
   *
   * So the caller switches it on around a fold and drops it again once the panel has
   * arrived. Only it knows which just happened.
   */
  animate?: boolean
  /** Nothing is selected. Drawn alone, when every region below is empty. */
  emptyLabel?: string
  /** What the agent is spending — context, cost, model. `ContextAgentCard`'s arguments. */
  usage?: ContextAgentCardProps
  /** What it is working on — the ticket, the status, the two fields. `TitleAgentCard`'s. */
  ticket?: TitleAgentCardProps
  /** One per attached repository, in the order they should be read. */
  repositories?: CoderRepository[]
  /**
   * Under the cards: the dashed empty slot that attaches another repository.
   *
   * THE BOX IS DRAWN HERE, the words and the click are not. `label` because this column has
   * no translator; `onClick` because it has no idea what attaching one means — the app opens
   * its repository picker, the site's drawings pass a no-op.
   *
   * Omit it and there is no box, which is how a planning agent gets a column without one: it
   * has no branch, no diff and no PR, and attaching a repository is not a planning-time
   * action.
   */
  /**
   * The picker the box below opens — rendered by this column, because it is this column's
   * own dialog and not a thing that happens to float next to it.
   *
   * IT PORTALS OUT anyway, which is what makes the position in this tree free: the caller
   * used to render it as a sibling on the grounds that the portal settled the matter, and
   * that is true of the PIXELS and false of everything else. Where a dialog is declared is
   * where a reader looks for it, and this column is what opens it.
   *
   * Absent while it is shut. The app keeps it mounted a few frames past that so its exit
   * animation has somewhere to play — see `useModalExit`.
   */
  repositorySelector?: RepositorySelectorProps
  addRepository?: {
    label: string
    onClick: () => void
    /**
     * The caller's own STATE on the box — the marketing site dims it while its scroll tour
     * holds another card. Not the dashed rule, the radius or the ink: those are what this
     * slot moved in here to stop having three of.
     */
    className?: string
  }
  /** Margins. Not the width, the ground, or the order of the regions. */
  className?: string
}

export function SidebarAgentCoderInfo({
  width,
  collapsed = false,
  animate = false,
  emptyLabel,
  usage,
  ticket,
  repositories,
  addRepository,
  repositorySelector,
  className = '',
}: SidebarAgentCoderInfoProps) {
  const empty = !usage && !ticket && !repositories?.length && !addRepository

  return (
    <>
    <div
      className={`bg-surface-sunken flex flex-col h-full relative overflow-hidden ${
        animate ? 'transition-[width] duration-300 ease-in-out' : ''
      } ${className}`.trim()}
      style={{ width: collapsed ? 0 : width }}
    >
      {/* Pinned at the full width so nothing inside reflows while the box above it
          collapses. See the note on the two boxes. */}
      <div className={`flex flex-col h-full ${TEXT_FACE}`} style={{ width }}>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {empty ? (
            emptyLabel && (
              <div className="px-4 py-8 text-center text-text-secondary text-xs">{emptyLabel}</div>
            )
          ) : (
            /* `space-y-4` and not a flex gap: this column is a plain stack of blocks and
               margins are all it needs. The planner's column, where the spec has to GROW
               into the height left over, is the one that needs a flex column. */
            <div className="p-4 space-y-4">
              {usage && <ContextAgentCard {...usage} />}
              {ticket && <TitleAgentCard {...ticket} />}
              {/* `space-y-3` and not the column's own `space-y-4`: the repository cards are
                  one subject stacked, not four peers, and they read as a group at one rung
                  tighter than the gap between the regions above them. */}
              {repositories && repositories.length > 0 && (
                /* `space-y-3` and not the column's own `space-y-4`: the repository cards are
                   one subject stacked, not four peers, and they read as a group at one rung
                   tighter than the gap between the regions above them. */
                <div className="space-y-3">
                  {repositories.map(({ id, ...repo }) => (
                    <RepositoryCard key={id} {...repo} />
                  ))}
                </div>
              )}
              {addRepository && (
                /* `rounded-xl`, the CARD radius. This box stands exactly where another
                   repository card would, and is the full width of one. The dashed rule
                   stays: it is what says "empty slot", not chrome. */
                <button
                  type="button"
                  onClick={addRepository.onClick}
                  className={`w-full py-4 text-center border border-dashed border-border/50 rounded-xl hover:border-text-secondary/50 hover:bg-surface transition-colors ${
                    addRepository.className ?? ''
                  }`.trim()}
                >
                  <div className="text-xs text-text-secondary/50">{addRepository.label}</div>
                </button>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
    {/* OUTSIDE THE COLUMN'S BOX, and outside the empty branch: a dialog is not column
        content. It renders nothing here anyway — it portals — but declared inside the
        scroll region it would vanish with the cards the day the column had none. */}
    {repositorySelector && <RepositorySelector {...repositorySelector} />}
    </>
  )
}
