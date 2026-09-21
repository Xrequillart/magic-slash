'use client'

import { BoardColumn, TicketCard } from '@ds/desktop'
import { CircleCheck, CircleDashed, LoaderCircle, OctagonAlert, Play } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'title', type: 'string', required: true, description: 'What the column is called, already translated.' },
  { name: 'icon', type: 'IconComponent', description: 'The mark beside it. Optional — a column with no glyph is still a column.' },
  { name: 'tone', type: "'neutral' | 'alert'", fallback: "'neutral'", description: 'Two and not ten. alert is for the column that has STOPPED and needs a person; the others are states work passes through, and colouring them would make the board a traffic light.' },
  { name: 'count', type: 'string | number', required: true, description: 'Drawn always, zero included: a column that showed nothing and said nothing would be indistinguishable from one that failed to render. A string too, because whether a count is exact is a fact about the read — “100+” is the caller’s word for a cap wearing a count’s clothes.' },
  { name: 'countTitle', type: 'string', description: 'The tooltip on the count, for the case it has to explain itself.' },
  { name: 'empty', type: 'string', description: 'The sentence for a column with nothing in it. A word rather than an empty box — a box with nothing in it reads as a column that failed to render.' },
  { name: 'headingTop', type: 'number', fallback: '0', description: 'Where the heading pins, in pixels from the top of the scrolling pane. The caller’s, and it cannot be otherwise: what is stacked above a band is a fact about the page around it.' },
  { name: 'pinned', type: 'boolean', fallback: 'false', description: 'Whether it HAS pinned there, which is the only thing that changes about it: its top corners. The caller owns the question too — a band that has moved cannot report the position it started from.' },
  { name: 'children', type: 'ReactNode', description: 'The cards. A container, so it takes children — the one shape of prop this folder is otherwise suspicious of, and the same exception Card and ItemGroup already are.' },
]

function Ticket({ id, title }: { id: string; title: string }) {
  return (
    <TicketCard
      tracker="jira"
      ticketId={id}
      title={title}
      action={{ icon: Play, title: 'Start an agent', onClick: () => undefined }}
      onOpen={() => undefined}
    />
  )
}

export function BoardColumnEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="BoardColumn" uses={usesOf('boardcolumn')} onOpen={onOpen}>
        One column of a board: a heading that stays with it, and whatever is stacked
        under it.
      </EntryHeader>

      <EntrySection
        title="Four of them, one empty, one that has stopped"
        note="The columns are equal width and never stack: at the narrowest this is a tight fit, and it is still the right one — a board whose columns stack is a list with headings in it."
      >
        <Stage theme={theme}>
          <Specimen label="blocked / backlog / in progress / done">
            <div className="grid w-full grid-cols-4 items-start gap-3">
              <BoardColumn title="Blocked" icon={OctagonAlert} tone="alert" count={1} empty="Nothing here">
                <Ticket id="PER-12" title="Waiting on the Atlassian credential" />
              </BoardColumn>
              <BoardColumn
                title="Backlog"
                icon={CircleDashed}
                count="100+"
                countTitle="The read stopped at its budget — this column has more"
                empty="Nothing here"
              >
                <Ticket id="PER-34" title="Extract the board column" />
                <Ticket id="PER-35" title="Drop every border from the tasks page" />
              </BoardColumn>
              <BoardColumn title="In progress" icon={LoaderCircle} count={1} empty="Nothing here">
                <Ticket id="PER-56" title="Move the ticket card into the design system" />
              </BoardColumn>
              <BoardColumn title="Done" icon={CircleCheck} count={0} empty="Nothing here" />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The heading is two nested boxes"
        note="Cards slide under it as the page scrolls, so it has to be opaque. Every surface-* token in this folder is an ALPHA colour — a tint meant to sit on a ground, not a ground — so a heading painted with one alone is 96% transparent, which is exactly as much as it sounds like."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The outer box lays down the page’s own opaque ground and the inner one puts the
          column’s tint back on top of it. The top radius is the third thing, and it only
          holds while the heading is at rest: a rounded corner paints nothing outside its
          arc, so a pinned heading rounded at the top has two 12px holes in its first rows
          with the board sliding behind them — hence <code>pinned</code>.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The hairline under the heading is gone. It was the only thing separating it from
          a column body painted the same colour; the separation is the inset instead — the
          cards are plates on the column’s plate, and the heading is the plate showing
          through above them. One fewer edge on a board that has four of these side by
          side.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { BoardColumn } from '@ds/desktop'

<BoardColumn
  title={t(title)}
  icon={icon}
  tone={tone}
  count={truncated ? t('tasks.board.cappedCount', { count: cards.length }) : cards.length}
  empty={t('tasks.board.empty')}
  headingTop={headingTop}
  pinned={pinned}
>
  {cards.map((card) => <TaskCard key={card.key} card={card} onSelect={onSelect} />)}
</BoardColumn>`}</Snippet>
      </EntrySection>
    </article>
  )
}
