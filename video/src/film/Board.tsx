import { ModalHeader, TaskBoard, type TaskBoardCard, type TaskBoardColumn } from '@ds/desktop'
import { ArrowUp, Bot, CircleCheck, CircleDashed, ListTodo, LoaderCircle, Minus, Play, RefreshCw } from '@ds/desktop/icons'

const noop = () => undefined

const EPIC = { id: 'epic', label: 'PAY-310 Invoice PDF export', color: '#A855F7' }

const STORIES = [
  { key: 'PAY-311', title: 'PDF template per locale', priority: 'high' },
  { key: 'PAY-312', title: 'Export endpoint', priority: 'high' },
  { key: 'PAY-313', title: 'Download button on the invoice page', priority: 'medium' },
  { key: 'PAY-314', title: 'Audit log entry for every export', priority: 'medium' },
] as const

const PRIORITY = {
  high: { icon: ArrowUp, tone: 'orange', label: 'High' },
  medium: { icon: Minus, tone: 'yellow', label: 'Medium' },
} as const

type Where = 'backlog' | 'progress' | 'done'

function card(story: (typeof STORIES)[number], where: Where, startable: boolean): TaskBoardCard {
  return {
    id: story.key,
    tracker: 'jira',
    ticketId: story.key,
    title: story.title,
    mark: PRIORITY[story.priority],
    status:
      where === 'done'
        ? { label: 'Done', tone: 'green' }
        : where === 'progress'
          ? { label: 'In progress', tone: 'blue' }
          : { label: 'To Do', tone: 'neutral' },
    tags: [EPIC],
    ...(startable ? { action: { icon: Play, title: 'Start a session', onClick: noop } } : {}),
    ...(where === 'progress' ? { agent: { icon: Bot, label: 'PAY-312' } } : {}),
    onOpen: noop,
    className: `film-card-${story.key}`,
  }
}

/**
 * THE TASKS PAGE as the app opens it over the window: the sprint board, read from Jira.
 * `shown` is how many of the new stories have landed; `pay312` is where the story the
 * film follows sits.
 */
export function Board({ shown, pay312 }: { shown: number; pay312: Where }) {
  const cards = STORIES.slice(0, shown)
  const column = (where: Where) =>
    cards
      .filter((s) => (s.key === 'PAY-312' ? pay312 : 'backlog') === where)
      .map((s) => card(s, where, where === 'backlog'))

  const columns: TaskBoardColumn[] = [
    { id: 'backlog', title: 'Backlog', icon: CircleDashed, tone: 'neutral', count: column('backlog').length, empty: 'Nothing here', cards: column('backlog') },
    { id: 'progress', title: 'In progress', icon: LoaderCircle, tone: 'neutral', count: column('progress').length, empty: 'Nothing here', cards: column('progress') },
    { id: 'done', title: 'Done', icon: CircleCheck, tone: 'neutral', count: column('done').length, empty: 'Nothing here', cards: column('done') },
  ]

  return (
    <div className="film-board flex h-full flex-col overflow-hidden rounded-xl border border-line bg-bg-secondary shadow-2xl">
      <ModalHeader title="Tasks" icon={ListTodo} onClose={noop} closeTitle="Close" />
      <div className="min-h-0 flex-1 overflow-hidden px-6">
        <TaskBoard
          heading={{
            icon: ListTodo,
            title: 'To do',
            count: `${cards.length} in the sprint`,
            actions: [{ id: 'reload', label: 'Reload', icon: RefreshCw, onClick: noop }],
          }}
          columns={columns}
        />
      </div>
    </div>
  )
}
