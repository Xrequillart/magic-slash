'use client'

import { SpecCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'repos',
    type: '{ name, color? }[]',
    fallback: '[]',
    description:
      'The repositories being planned against — a Label each, exactly as HeaderRepoCard names one on a coder’s repository card. One per repository and not a single chip over a joined name: a full-stack plan spans two, and one chip would have to pick one of the two colours and be wrong about the other.',
  },
  {
    name: 'emptyLabel',
    type: 'string',
    required: true,
    description:
      'What heads the row when no repository is attached — the spec’s own file name, in practice, so the row is never left empty. Plain text rather than a chip, deliberately: a repository chip in front of a file name would name something that is not there.',
  },
  {
    name: 'ticket',
    type: 'LabelProps',
    description:
      'The ticket, once /magic:plan has created it. The ticket card never comes back for a planning agent, so without this the ticket the skill just created would be unreachable from the sidebar.',
  },
  {
    name: 'comments',
    type: 'ReactNode',
    description:
      'The comments on the spec — a node, and absent until there is at least one. A header row has no other job that would keep it there at zero, unlike a review’s footer bar which stays for the changes; an empty control in a title row is a permanently dead affordance.',
  },
  {
    name: 'status',
    type: 'StatusProps',
    description:
      'The agent’s status. The ticket card is the only other place that draws it and it is not on screen here — without this the card would remove the marker that tells a planning agent from an implementation one.',
  },
  {
    name: 'expand',
    type: '{ title, onClick }',
    required: true,
    description: 'Hand the same document to the app’s wider preview.',
  },
  {
    name: 'title',
    type: 'EditableTextProps',
    required: true,
    description:
      'The agent’s title, editable. The description is deliberately absent: /magic:plan never fills it, and the spec below says everything it would have said.',
  },
  {
    name: 'children',
    type: 'ReactNode',
    required: true,
    description:
      'The document itself. A node, because rendering a spec means reading a file off disk through the app’s IPC and laying a comment layer over its markdown — not a drawing, and not something a folder that cannot import the app can own.',
  },
  {
    name: 'scrollToTopLabel',
    type: 'string',
    required: true,
    description: 'The control that appears once the reader has scrolled away from the first line.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the plate, the padding or the order of the rows.' },
]

const noop = () => undefined

const TITLE = {
  value: 'Invoice VAT, rounded once',
  placeholder: 'Invoice VAT, rounded once',
  editing: false,
  draft: 'Invoice VAT, rounded once',
  onDraftChange: noop,
  onStartEditing: noop,
  onSave: noop,
  onCancel: noop,
}

const BODY = (
  <div className="space-y-3 p-4 text-xs leading-relaxed text-text-secondary">
    <p className="text-sm font-medium text-ink">Why</p>
    <p>
      Per-line rounding drifts by a cent on long invoices. Accounting reconciles against
      the total, so the total is what has to be right.
    </p>
    <p className="text-sm font-medium text-ink">What changes</p>
    <p>Round once, on the summed amount, and keep the per-line figures unrounded.</p>
  </div>
)

export function SpecCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="SpecCard"
        uses={usesOf('speccard')}
        onOpen={onOpen}
      >
        A <code>/magic:plan</code> spec, as the planner’s sidebar shows it: which
        repositories it is being written against, whose plan it is, and the document itself.
      </EntryHeader>

      <EntrySection
        title="It is the only card a planning agent has"
        note="Every decision here follows from that. It carries the agent’s title and status because the ticket card that normally holds them is not on screen; it does not collapse, because folding away the one thing worth reading would put it an interaction away; and it grows to fill the column rather than scrolling inside a column that also scrolls."
      >
        <Stage theme={theme}>
          <Specimen label="a plan at planned — ticket, status, document">
            <div className="flex h-[420px] w-[420px] flex-col">
              <SpecCard
                repos={[{ name: 'magic-pay', color: '#F43F5E' }]}
                emptyLabel="spec.md"
                ticket={{ children: 'PAY-318', tone: 'jira', title: 'PAY-318', onClick: noop }}
                status={{ label: 'Planned', tone: 'purple', options: [], onSelect: noop }}
                expand={{ title: 'Open the spec', onClick: noop }}
                title={TITLE}
                scrollToTopLabel="Back to top"
              >
                {BODY}
              </SpecCard>
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="It opens at the top and stays where the reader puts it"
        note="A spec is a document to be read from its first line, not a log to be tailed, so nothing here chases the end of the file. A scroll container starts at 0 and keeps its offset as content is appended below, which is exactly the wanted behaviour — hence no effect, only the scroll-to-top control once the top is genuinely off screen."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          No <code>overflow-hidden</code> on the plate either: the status picker is an
          absolutely positioned dropdown and would be clipped by it. The body rounds its own
          bottom corners instead.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SpecCard } from '@ds/desktop'

<SpecCard {...useSpecCard({ agentId, identity, repoPath, filePath, … })} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
