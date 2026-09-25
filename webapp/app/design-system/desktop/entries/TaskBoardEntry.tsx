'use client'

import { TaskBoard, type FilterBarProps, type TaskBoardColumn } from '@ds/desktop'
import {
  ArrowDownWideNarrow,
  BotMessageSquare,
  CalendarRange,
  ChevronsUp,
  CircleCheck,
  CircleDashed,
  ListTodo,
  LoaderCircle,
  OctagonAlert,
  Play,
  RefreshCw,
  SearchX,
} from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'heading', type: 'SectionHeaderProps', description: 'What the section is, how many are in it, and what can be done to the lot. spacing is forced to none: this component spaces its own bands with a gap, and a heading that also carried a margin would space itself twice.' },
  { name: 'filters', type: 'FilterBarProps', description: 'The pinned row of controls. top and paneRef are supplied from this component’s own — a bar cannot be told to pin somewhere other than where the board expects it, because the columns pin directly underneath.' },
  { name: 'notices', type: 'TaskBoardNotice[]', description: 'Bands between the controls and the columns: a repository whose read did not come back, a tracker that is not connected. BETWEEN and not above, which is where a fact about the CONTENTS belongs.' },
  { name: 'empty', type: 'EmptyStateProps', description: 'One sentence INSTEAD OF THE COLUMNS. It replaces the grid, never the page — a caller that swapped the whole component for an EmptyState would take away the one control able to undo the narrowing.' },
  { name: 'columns', type: 'TaskBoardColumn[]', required: true, description: 'One entry per column: an id, a title, a glyph, a tone, a count, the sentence for an empty one, and its cards. The number of columns sets the grid’s tracks, so four is the Tasks page’s answer and not this component’s.' },
  { name: 'columns[].cards', type: 'TaskBoardCard[]', required: true, description: 'TicketCardProps plus an id for React’s key. Spread verbatim, so everything TicketCard can draw — the priority mark, the agent tint, the copy button, the launch — is reachable without this component naming any of it.' },
  { name: 'top', type: 'number', fallback: '0', description: 'What is already pinned above the whole pane — a mode banner, a title bar. THE ONLY OFFSET A CALLER OWES: the bar pins here and the column headings at this plus the bar’s own height, which is arithmetic this component does rather than asks for.' },
  { name: 'paneRef', type: 'RefObject<HTMLElement>', description: 'The scrolling pane the bands pin inside. OMITTED MEANS NOTHING PINS, which is the honest state for a board drawn inside a plate that never scrolls — the public site’s picture of this screen passes none.' },
  { name: 'className', type: 'string', description: 'Margins and width. Not the grid, the gaps or the columns.' },
]

/** The bar over the board: which repository, which sprint, a search box, an order. */
const FILTERS: FilterBarProps = {
  before: [
    {
      kind: 'select',
      id: 'repo',
      value: 'magic-slash',
      options: [{ value: 'magic-slash', label: 'magic-slash', color: '#3B82F6' }],
      onChange: () => undefined,
      width: 208,
      marker: 'repo',
    },
    { kind: 'chip', id: 'sprint', label: 'PER Sprint 12', icon: CalendarRange },
  ],
  search: { value: '', onChange: () => undefined, placeholder: 'Search by ticket ID or title…' },
  after: [{
    kind: 'select',
    id: 'sort',
    value: 'recent',
    options: [{ value: 'recent', label: 'Newest' }, { value: 'priority', label: 'Priority' }],
    onChange: () => undefined,
    width: 152,
    icon: ArrowDownWideNarrow,
  }],
}

/** Four invented columns of an invented sprint. */
const COLUMNS: TaskBoardColumn[] = [
  {
    id: 'blocked',
    title: 'Blocked',
    icon: OctagonAlert,
    tone: 'alert',
    count: 1,
    empty: 'Nothing here',
    cards: [{
      id: 'jira:PER-12',
      tracker: 'jira',
      ticketId: 'PER-12',
      title: 'Waiting on the Atlassian credential',
      status: { label: 'Blocked', tone: 'accent' },
      mark: { icon: ChevronsUp, tone: 'red', label: 'Priority: Highest' },
      onOpen: () => undefined,
    }],
  },
  {
    id: 'backlog',
    title: 'Backlog',
    icon: CircleDashed,
    count: '100+',
    countTitle: 'The read stopped at its budget — this column has more',
    empty: 'Nothing here',
    cards: [
      {
        id: 'jira:PER-34',
        tracker: 'jira',
        ticketId: 'PER-34',
        title: 'Extract the board column',
        status: { label: 'To Do', tone: 'neutral' },
        action: { icon: Play, title: 'Start an agent', onClick: () => undefined },
        onOpen: () => undefined,
      },
      {
        id: 'github:#211',
        tracker: 'github',
        ticketId: '#211',
        title: 'Drop every border from the tasks page',
        tags: [{ id: 'label:design', label: 'design' }],
        notes: [{ id: 'author', text: '@lmartel' }],
        action: { icon: Play, title: 'Start an agent', onClick: () => undefined },
        onOpen: () => undefined,
      },
    ],
  },
  {
    id: 'progress',
    title: 'In progress',
    icon: LoaderCircle,
    count: 1,
    empty: 'Nothing here',
    cards: [{
      id: 'github:#214',
      tracker: 'github',
      ticketId: '#214',
      title: 'Move the ticket card into the design system',
      notes: [{ id: 'author', text: '@nadia-b' }],
      agent: { icon: BotMessageSquare, label: 'An agent is already working on this ticket.' },
      onOpen: () => undefined,
    }],
  },
  { id: 'done', title: 'Done', icon: CircleCheck, count: 0, empty: 'Nothing here', cards: [] },
]

export function TaskBoardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="TaskBoard" uses={usesOf('taskboard')} onOpen={onOpen}>
        A board of tickets: columns of equal width, each holding a stack of cards, with
        headings that stay put while the page scrolls past them.
      </EntryHeader>

      <EntrySection
        title="The whole page: a heading, a bar, and one repository’s sprint dealt into four"
        note="Blocked leads rather than sitting where a workflow would put it. It is the only column that asks something of the reader, and a column nobody scrolls to is a column that says nothing; everything else then reads left to right as the work moves."
      >
        <Stage theme={theme}>
          <Specimen label="heading, filter bar, four columns, one of them empty">
            <TaskBoard
              heading={{
                icon: ListTodo,
                title: 'To do',
                count: '4 to do',
                actions: [{ id: 'reload', label: 'Reload', icon: RefreshCw, onClick: () => undefined }],
              }}
              filters={FILTERS}
              columns={COLUMNS}
              className="w-full"
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A search that matched nothing"
        note="The empty state replaces the COLUMNS and not the page: the heading still says what the section is and the bar still holds the search that emptied it."
      >
        <Stage theme={theme}>
          <Specimen label="empty, with the control that emptied it still there">
            <TaskBoard
              heading={{ icon: ListTodo, title: 'To do' }}
              filters={{ ...FILTERS, search: { ...FILTERS.search!, value: 'PER-999' } }}
              empty={{
                icon: SearchX,
                children: 'No ticket matches these filters.',
                actions: [{ id: 'clear', label: 'Clear the filters', onClick: () => undefined }],
              }}
              columns={COLUMNS}
              className="w-full"
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Why the four bands are one component"
        note="Because they cannot be assembled correctly from outside: two of them pin, one directly under the other."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The bar pins at the top of the pane and the column headings pin directly under it,
          which is arithmetic somebody has to do — and every caller that did it was one
          refactor away from two opaque bands at the same offset, which is one band hiding
          the other. It is done here now, and <code>top</code> is the only number a caller
          owes: what is pinned above the whole pane. The sentinels go with it —{' '}
          <code>BoardColumn</code> takes <code>pinned</code> as a prop because a band that has
          moved cannot report where it started, and this is the element that holds the ROW of
          headings.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Driven by DATA and not by children, unlike <code>BoardColumn</code> and{' '}
          <code>Card</code>. A column takes children because what goes in one is genuinely
          open; a board’s cards are tickets, and a board that took nodes would be a grid with
          a sticky heading rather than a board. What it holds nothing of is Jira and GitHub:
          which columns there are and what puts a ticket in one arrive as{' '}
          <code>columns</code>.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { TaskBoard } from '@ds/desktop'

<TaskBoard
  heading={{ icon: ListTodo, title: t('tasks.section'), count, actions: [reload] }}
  filters={buildTaskFilters({ value, repos, epics, t, onChange, bleed: '-mx-6 px-6' })}
  notices={taskFailureNotices(rows, t)}
  {...(emptyBoard ? { empty: emptyBoard } : {})}
  columns={buildTaskColumns({ board, repoConfigs, truncatedColumns, ...ctx, t })}
  top={pickAgentId ? PICK_BAR_H : 0}
  paneRef={paneRef}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
