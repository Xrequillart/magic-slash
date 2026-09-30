import { Banner } from './Banner'
import { ButtonIcon } from './ButtonIcon'
import { Card, type CardGround } from './Card'
import { EmptyState } from './EmptyState'
import { Icon } from './Icon'
import { History, RotateCcw, X } from './icons'
import { Text } from './Text'
import { TimelineLine, type TimelineLineProps } from './TimelineLine'

/**
 * THE WORKFLOW'S HISTORY, in the editor: every save of a repository's flow and every
 * change of its /magic:start settings, who made it and when, newest first, on the rail a
 * plan's history uses (`TimelineLine`).
 *
 * EACH SAVE CARRIES WHAT IT CHANGED, as short lines under its row ("Added Lint", "Commit →
 * PR: automatic"): the reader asks what happened to the flow, and a row that only said
 * "edited the workflow" would answer who and when and leave out the what.
 *
 * READ-ONLY. There is no restore: the database writes the history, and putting an old
 * flow back is an edit like any other, made on the canvas.
 *
 * DATA IN. Every word arrives translated, each change as a sentence; the face as bytes for
 * `Avatar`. The panel knows states, not stores: `loading`, `failed` (with `onRetry`), and
 * the entries, or none.
 */

export interface WorkflowHistoryItem {
  id: string
  actor: string
  avatar: { src: string | null; alt: string }
  /** "edited the workflow", "changed the start settings". */
  action: string
  /** A plate after the action, when there is more to say about how it was done. */
  badge?: TimelineLineProps['badge']
  date: string
  dateTitle?: string
  /** What the save changed, one sentence each. */
  changes: string[]
}

export interface WorkflowHistoryLabels {
  /** The panel's heading: "History". */
  title: string
  /** The corner X. */
  close: string
  loading: string
  empty: string
  failed: string
  retry: string
  /** Under the list, when the oldest entries were not read. */
  truncated: string
}

export interface WorkflowHistoryProps {
  state: 'loading' | 'failed' | 'ready'
  items: WorkflowHistoryItem[]
  truncated?: boolean
  labels: WorkflowHistoryLabels
  onRetry?: () => void
  onClose?: () => void
  /** `raised` where the panel floats over the canvas, as the inspector does. */
  ground?: CardGround
  /** Margins and width. Not the ground or the padding. */
  className?: string
}

export function WorkflowHistory({
  state,
  items,
  truncated = false,
  labels,
  onRetry,
  onClose,
  ground = 'surface',
  className = '',
}: WorkflowHistoryProps) {
  return (
    <section aria-label={labels.title} className={className}>
      <Card padding="regular" ground={ground} className="relative flex flex-col gap-3">
        <div className="flex items-center gap-2 pr-6">
          <Icon glyph={History} size="sm" tone="muted" className="flex-shrink-0" />
          <Text size="sm" weight="bold">{labels.title}</Text>
        </div>
        {onClose && (
          <ButtonIcon icon={X} title={labels.close} onClick={onClose} tone="ghost" size="sm" className="absolute right-2 top-2" />
        )}
        {state === 'loading' ? (
          <EmptyState busy>{labels.loading}</EmptyState>
        ) : state === 'failed' ? (
          <Banner
            variant="danger"
            actions={onRetry ? [{ label: labels.retry, icon: RotateCcw, onClick: onRetry, primary: true }] : undefined}
          >
            {labels.failed}
          </Banner>
        ) : items.length === 0 ? (
          <EmptyState icon={History}>{labels.empty}</EmptyState>
        ) : (
          <>
            <div className="-mx-2">
              {items.map((item, i) => (
                <TimelineLine
                  key={item.id}
                  actor={item.actor}
                  avatar={item.avatar}
                  action={item.action}
                  badge={item.badge}
                  date={item.date}
                  dateTitle={item.dateTitle}
                  first={i === 0}
                  last={i === items.length - 1}
                >
                  {item.changes.length > 0 && (
                    <ul className="flex flex-col gap-0.5">
                      {item.changes.map((change, j) => (
                        <li key={j}>
                          <Text size="xs" tone="secondary" className="block">{change}</Text>
                        </li>
                      ))}
                    </ul>
                  )}
                </TimelineLine>
              ))}
            </div>
            {truncated && <Text size="xs" tone="secondary">{labels.truncated}</Text>}
          </>
        )}
      </Card>
    </section>
  )
}
