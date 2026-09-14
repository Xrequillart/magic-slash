import { ContextAgentCard, type ContextAgentCardProps } from './ContextAgentCard'
import { SpecCard, type SpecCardProps } from './SpecCard'
import { TEXT_FACE } from './Text'

/**
 * THE RIGHT COLUMN OF A PLANNING AGENT, WHOLE.
 *
 * `SidebarAgentCoderInfo` is what stands here for an agent that is writing code: a ticket,
 * a card per repository, a way to attach another. A planner has none of those — no branch,
 * no diff, no pull request — and drawing them would be four empty cards above the one thing
 * worth reading. So this column holds what it is spending and the spec, and that is all.
 *
 * TWO COLUMNS AND NOT ONE WITH A MODE, which is the decision this file is. The single
 * column carried a `fill` flag and four conditions spelling out that at `replace` the
 * ticket goes, the repositories go, the add-repository box goes and the spec takes the
 * height — a mode that switched off almost everything the component was. Two names say the
 * same thing and cannot fall out of step: whichever column is on screen, every region it
 * has is a region that agent actually uses.
 *
 * THE SPEC OWNS THE ONLY SCROLL REGION, so this column does not scroll and there is never a
 * scrollbar inside a scrollbar. The content box is a flex column with a gap rather than a
 * stack with margins, because the spec card has to be allowed to GROW into whatever height
 * the usage card leaves.
 *
 * THE FOLD, THE GROUND AND THE FACE are the coder column's too, and deliberately identical:
 * the two sit in the same place and a reader switching between a planner and a coder must
 * not see the panel itself change. See `SidebarAgentCoderInfo` for why the two nested boxes
 * both matter.
 */

export interface SidebarAgentPlannerInfoProps {
  /**
   * The column's width in pixels.
   *
   * WIDER THAN THE CODER'S, by the app's reckoning rather than this file's: a planner's
   * column holds long-form prose being written live and the terminal beside it is mostly a
   * place to reply, so the width is what makes the spec readable. Which share of the
   * viewport that is, and where the bounds are, is policy this column has no way to hold.
   */
  width: number
  /** Folded away: it slides shut by its own width rather than unmounting. */
  collapsed?: boolean
  /**
   * Whether a width change animates. Folding open or shut is a MOVE and should be seen; a
   * width that changed because the window was resized is not. Only the caller knows which
   * just happened — see `SidebarAgentCoderInfo`, which takes it for the same reason.
   */
  animate?: boolean
  /**
   * What the agent is spending — context, cost, model.
   *
   * A PLANNER SPENDS LIKE ANY OTHER AGENT, and a long spec spends a lot: this is the one
   * region the two columns share, and it is above the spec here exactly as it is above the
   * ticket there.
   */
  usage?: ContextAgentCardProps
  /** The spec. The reason this column exists, and the only thing in it that grows. */
  spec: SpecCardProps
  /** Margins. Not the width, the ground, or the order of the regions. */
  className?: string
}

export function SidebarAgentPlannerInfo({
  width,
  collapsed = false,
  animate = false,
  usage,
  spec,
  className = '',
}: SidebarAgentPlannerInfoProps) {
  return (
    <div
      className={`bg-surface-sunken flex flex-col h-full relative overflow-hidden ${
        animate ? 'transition-[width] duration-300 ease-in-out' : ''
      } ${className}`.trim()}
      style={{ width: collapsed ? 0 : width }}
    >
      {/* Pinned at the full width so nothing inside reflows while the box above it
          collapses. See `SidebarAgentCoderInfo`'s note on the two boxes. */}
      <div className={`flex flex-col h-full ${TEXT_FACE}`} style={{ width }}>
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="p-4 flex flex-col gap-4 h-full min-h-0">
            {usage && <ContextAgentCard {...usage} />}
            <SpecCard {...spec} />
          </div>
        </div>
      </div>
    </div>
  )
}
