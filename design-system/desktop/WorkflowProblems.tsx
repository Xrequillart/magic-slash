import { Icon } from './Icon'
import { ChevronRight, CircleAlert } from './icons'
import { Text } from './Text'

/**
 * WHY THE WORKFLOW CANNOT BE SAVED, one row per problem, above or beside the canvas.
 *
 * A PROBLEM THAT BELONGS TO A STEP IS A BUTTON: pressing it calls `onFocus` with the
 * step's id, and the caller centres the canvas on it (`WorkflowCanvas.focusRequest`)
 * and selects it. A problem about the flow as a whole has no step to go to, and is a
 * line of text.
 *
 * NOTHING TO SAY, NOTHING DRAWN: an empty list renders nothing at all, not an empty
 * box or an "all good" line. Being able to save is the normal state, and the Save
 * button already says so by being pressable.
 *
 * Every word arrives translated: the heading (`labels.title`, counted by the caller:
 * "2 problems to fix before saving") and each message.
 */

export interface WorkflowProblemItem {
  /** Stable across renders: the row's key. */
  id: string
  message: string
  /** The step it belongs to, if any. The row is then a button that focuses it. */
  nodeId?: string
}

export interface WorkflowProblemsLabels {
  /** The heading, already counted by the caller. Also the list's accessible name. */
  title: string
  /** The tooltip of a row that focuses its step: "Show on the canvas". */
  show: string
}

export interface WorkflowProblemsProps {
  problems: WorkflowProblemItem[]
  onFocus: (nodeId: string) => void
  labels: WorkflowProblemsLabels
  /** Margins and width. Not the ground or the padding. */
  className?: string
}

export function WorkflowProblems({ problems, onFocus, labels, className = '' }: WorkflowProblemsProps) {
  if (problems.length === 0) return null

  return (
    <section
      aria-label={labels.title}
      className={`flex flex-col gap-1 rounded-xl border border-red/20 bg-red/10 px-3 py-2.5 ${className}`.trim()}
    >
      <span className="flex items-center gap-2 text-red">
        <Icon glyph={CircleAlert} size="sm" tone="inherit" className="flex-shrink-0" />
        <Text size="xs" weight="bold" tone="inherit">{labels.title}</Text>
      </span>
      <ul className="flex flex-col">
        {problems.map((problem) => {
          const nodeId = problem.nodeId
          return (
            <li key={problem.id} className="pl-6">
              {nodeId ? (
                <button
                  type="button"
                  title={labels.show}
                  onClick={() => onFocus(nodeId)}
                  className="group -mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-ink transition-colors hover:bg-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red/40"
                >
                  <Text size="xs" tone="inherit" className="min-w-0 flex-1">{problem.message}</Text>
                  <Icon glyph={ChevronRight} size="xs" tone="muted" className="flex-shrink-0 group-hover:text-red" />
                </button>
              ) : (
                <Text size="xs" className="block py-1">{problem.message}</Text>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
