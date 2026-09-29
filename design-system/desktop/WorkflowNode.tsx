import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

import { Icon } from './Icon'
import { skillIcon } from './skillIcons'
import { Text } from './Text'
import type { WorkflowCanvasNode } from './workflowLayout'

/**
 * ONE STEP OF A WORKFLOW, AS A CARD ON THE CANVAS: the skill's glyph and name, and a
 * port for every way the skill can end.
 *
 * Drawn by `WorkflowCanvas` through xyflow's `nodeTypes`, never placed by hand: its
 * props are xyflow's `NodeProps`, and everything it shows arrives in `data`, already
 * translated. Nothing here is a `ReactNode` slot, by the folder's rule.
 *
 * THE PORTS ARE THE OUTCOMES. A conditional link leaves from the row naming the
 * outcome it is taken on (the handle's id IS the outcome's name), so "review, when it
 * ends on changes_requested, suggests resolve" reads off the card without a legend.
 * An unconditional link leaves from the header, the one port that means "whatever
 * happened". Every outcome gets its row, linked or not: an outcome that leads nowhere
 * is part of what the flow says.
 *
 * THE GROUND IS OPAQUE (`bg-bg-secondary`), unlike most of this folder's translucent
 * surfaces: a link running under a card must not show through it.
 *
 * IDENTIFIERS ARE `<code>`, not `Text`: the skill folder and the outcome names are
 * written as the skills spell them, in the mono face `CommandChip` uses for a command,
 * and `Text` carries a face of its own that a `font-mono` would fight.
 *
 * Its heights are `workflowLayout.ts`'s: `h-14` header, `h-6` a row, `pb-2` under the
 * rows. Change one side and the columns start overlapping.
 */

export interface WorkflowNodeData extends Record<string, unknown> {
  node: WorkflowCanvasNode
}

export type WorkflowNodeType = Node<WorkflowNodeData, 'workflow'>

/** The port an unconditional link leaves from, and the one every link arrives at. */
export const WORKFLOW_DEFAULT_HANDLE = 'default'
export const WORKFLOW_TARGET_HANDLE = 'in'

/**
 * The ports of a link between two cards of one column (the steps of a loop, see
 * `workflowLayout.ts`): out of the bottom and into the top going down, out of the top
 * and into the bottom going up. The two directions sit either side of the card's
 * middle, so the pair of links runs side by side instead of on top of each other.
 * Every card carries them, and they are invisible (`.ms-wf-lane`): a dot on the edge
 * of every card for a link only the loop's two have would read as a port with nothing
 * plugged in.
 */
export const WORKFLOW_VERTICAL_HANDLES = {
  down: { source: 'down-out', target: 'down-in' },
  up: { source: 'up-out', target: 'up-in' },
} as const

/**
 * Where a `side` detour comes back in: the card's right edge, level with its header,
 * so the arrow points at the card from the gap it ran down. Invisible like the lanes.
 */
export const WORKFLOW_SIDE_TARGET_HANDLE = 'side-in'

/**
 * Where a `self` loop comes back in: the top edge, near the right corner, clear of the
 * two lanes a loop's vertical links use, so a step that retries itself never shares a
 * line with the step before it.
 */
export const WORKFLOW_SELF_TARGET_HANDLE = 'self-in'
const SELF_LANE = { left: '88%' }

/** Spelled as styles: xyflow positions a handle by `left`, which no class here sets per port. */
const DOWN_LANE = { left: '38%' }
const UP_LANE = { left: '62%' }

export function WorkflowNode({ data }: NodeProps<WorkflowNodeType>) {
  const { node } = data
  const hasOutcomes = node.outcomes.length > 0

  return (
    // `h-full w-full`: the node's box is set by the canvas (`WORKFLOW_NODE_WIDTH`,
    // `workflowNodeHeight`), and the card fills it rather than sizing itself a second time.
    <div
      className="relative h-full w-full rounded-xl border border-line-strong bg-bg-secondary text-ink shadow-sm"
    >
      <Handle type="source" position={Position.Bottom} id={WORKFLOW_VERTICAL_HANDLES.down.source} style={DOWN_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Top} id={WORKFLOW_VERTICAL_HANDLES.down.target} style={DOWN_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="source" position={Position.Top} id={WORKFLOW_VERTICAL_HANDLES.up.source} style={UP_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id={WORKFLOW_VERTICAL_HANDLES.up.target} style={UP_LANE} className="ms-wf-lane" isConnectable={false} />
      <Handle type="target" position={Position.Top} id={WORKFLOW_SELF_TARGET_HANDLE} style={SELF_LANE} className="ms-wf-lane" isConnectable={false} />
      <div
        className={`relative flex h-14 items-center gap-2.5 px-3 ${hasOutcomes ? 'border-b border-line' : ''}`.trim()}
      >
        <Handle type="target" position={Position.Left} id={WORKFLOW_TARGET_HANDLE} isConnectable={false} />
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon glyph={skillIcon(node.skill)} size="md" tone="inherit" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="sm" weight="bold" className="truncate" title={node.label}>
            {node.label}
          </Text>
          <code className="truncate font-mono text-[10px] leading-4 text-text-secondary" title={node.skill}>
            {node.skill}
          </code>
        </span>
        <Handle type="source" position={Position.Right} id={WORKFLOW_DEFAULT_HANDLE} isConnectable={false} />
        <Handle type="target" position={Position.Right} id={WORKFLOW_SIDE_TARGET_HANDLE} className="ms-wf-lane" isConnectable={false} />
      </div>

      {hasOutcomes && (
        <ul className="pb-2">
          {node.outcomes.map((outcome) => (
            <li key={outcome} className="relative flex h-6 items-center justify-end pl-3 pr-4">
              <code className="truncate font-mono text-[10px] leading-4 text-text-secondary" title={outcome}>
                {outcome}
              </code>
              <Handle type="source" position={Position.Right} id={outcome} isConnectable={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
