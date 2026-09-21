'use client'

import { TicketCard } from '@ds/desktop'
import { BotMessageSquare, ChevronsUp, Play } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const EPIC = 'rgb(var(--c-purple, 168 85 247))'

const PROPS: PropRow[] = [
  { name: 'tracker', type: "'github' | 'jira'", required: true, description: 'Drawn through TrackerBadge, on every card without exception: a board mixes a repository’s GitHub issues and its Jira tickets in the same columns, so the chip is what says which of the two a card came from.' },
  { name: 'ticketId', type: 'string', required: true, description: 'PER-1234 or #234, printed exactly as given.' },
  { name: 'title', type: 'string', required: true, description: 'Two lines at most, then an ellipsis. A column is too narrow to promise a whole title, and a card that grows to four lines of it pushes the rest of its column off the screen.' },
  { name: 'mark', type: '{ icon, tone?, label }', description: 'A Status with markOnly beside the id — priority, today. It sits on the first band because that is the line the eye lands on; below, it was one badge among a status, an epic, a reporter and every label.' },
  { name: 'status', type: '{ label, tone?, strength? }', description: 'The state plate on the third band. WHICH state wears which hue is the caller’s — Status says so at length.' },
  { name: 'tags', type: 'TicketCardTag[]', description: 'The chips: an epic, a parent, the ticket’s own labels. color is a CSS value and the caller’s, Label.color’s contract exactly.' },
  { name: 'notes', type: 'TicketCardNote[]', description: 'The plain words — who filed it, how many of its children are done. Not everything on a metadata line is a plate.' },
  { name: 'copy', type: '{ value, label, copiedLabel }', description: 'A link to put on the clipboard. Absent draws nothing: a dead copy button is a worse answer than no button.' },
  { name: 'action', type: 'TicketCardAction', description: 'The launch. Absent draws nothing rather than a disabled button — a greyed-out Play invites the press it then refuses.' },
  { name: 'agent', type: '{ icon, label }', description: 'Somebody is already on this one. Tints the whole plate and puts a mark where the action would be — a statement, not a button, because there is nothing here to press.' },
  { name: 'onOpen', type: '() => void', required: true, description: 'Click, Enter or Space. A div with a role rather than a button, because the card contains buttons of its own — so the keyboard half is provided here by hand.' },
]

export function TicketCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="TicketCard" uses={usesOf('ticketcard')} onOpen={onOpen}>
        One ticket on a board — three stacked bands: what it is and what you can do with
        it, then its title, then whatever else is known about it.
      </EntryHeader>

      <EntrySection
        title="The card, where a list would draw a row"
        note="The split this folder makes everywhere — CommitLine against CommitCard, FileModifiedLine against UnCommittedChangesCard. A row is full width and puts everything on two lines; a board column is a quarter of that, so this stacks instead. Nothing wraps into the actions, which is the property a strip could not keep once the width went."
      >
        <Stage theme={theme}>
          <Specimen label="a Jira ticket with everything, a GitHub issue, and one somebody is already on">
            <div className="grid w-full grid-cols-2 gap-3">
              <TicketCard
                tracker="jira"
                ticketId="PER-1234"
                title="Sprint board should keep the repository it was left on"
                mark={{ icon: ChevronsUp, tone: 'red', label: 'Priority: Highest' }}
                status={{ label: 'In review', tone: 'accent' }}
                tags={[
                  { id: 'epic', label: 'Rebranding', color: EPIC, title: 'Epic · PER-90 · Rebranding', truncate: true },
                  { id: 'l1', label: 'desktop' },
                ]}
                notes={[{ id: 'reporter', text: 'Ada Lovelace' }]}
                copy={{ value: 'https://acme.atlassian.net/browse/PER-1234', label: 'Copy link', copiedLabel: 'Copied' }}
                action={{ icon: Play, title: 'Start an agent', onClick: () => undefined }}
                onOpen={() => undefined}
              />
              <TicketCard
                tracker="github"
                ticketId="#412"
                title="EMFILE on next dev after a long session"
                tags={[{ id: 'parent', label: 'Parent #380' }, { id: 'l1', label: 'bug' }]}
                notes={[{ id: 'author', text: '@xrequillart' }, { id: 'sub', text: '3 sub-issues · 1 done' }]}
                copy={{ value: 'https://github.com/acme/api/issues/412', label: 'Copy link', copiedLabel: 'Copied' }}
                action={{ icon: Play, title: 'Start an agent', onClick: () => undefined }}
                onOpen={() => undefined}
              />
              <TicketCard
                tracker="jira"
                ticketId="PER-88"
                title="Extract the board column into the design system"
                status={{ label: 'In progress', tone: 'accent' }}
                agent={{ icon: BotMessageSquare, label: 'An agent is already on this ticket' }}
                onOpen={() => undefined}
              />
              <TicketCard
                tracker="github"
                ticketId="#7"
                title="A ticket with nothing on it at all"
                onOpen={() => undefined}
              />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="No outline, and the tint that replaced the green one"
        note="It wore border border-line-field with a hover that swapped it for border-accent/40, and a column of eight was eight rectangles drawn on a plate that is already a rectangle. The plate is the card: surface on the column’s surface-subtle, stepping to surface-strong under the cursor."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          An agented ticket used to be a 1px green rule around the card. It is the whole
          plate at 10% now, which says the thing louder rather than quieter — “somebody is
          already on this one” has to survive being read in a column that is scanned, not
          read. The same slot then carries a mark instead of the Play button, because
          there is nothing there to press.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { TicketCard } from '@ds/desktop'

<TicketCard
  tracker={card.tracker}
  ticketId={card.tracker === 'jira' ? card.issue.key : \`#\${card.issue.number}\`}
  title={card.issue.title}
  status={{ label: card.issue.statusName, tone: JIRA_STATUS_TONE[card.issue.statusCategory] }}
  tags={tags}
  notes={notes}
  action={{ icon: Play, title: t('tasks.startAgent'), onClick: start }}
  onOpen={select}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
