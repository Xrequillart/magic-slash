'use client'

import { Card, Label, MetaBlock, ProgressBar, Text } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'title', type: 'string', required: true, description: 'What the field is called, already translated. Quiet, and never the loud thing here.' },
  { name: 'children', type: 'ReactNode', required: true, description: 'What it holds, laid out as a wrapping row — a set of chips, a person, a count. A child that wants the full width says so itself (w-full), which is what a progress bar and its caption do.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the rhythm inside — that is the two lines this component is.' },
]

export function MetaBlockEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="MetaBlock" uses={usesOf('metablock')} onOpen={onOpen}>
        One field of a metadata column: a quiet heading, and whatever it labels.
      </EntryHeader>

      <EntrySection
        title="FactList’s neighbour, not its rival"
        note="The line between them is what the VALUE is. A fact is a string — an email address, a plan’s name — so that component takes its rows as data and typesets both halves. What goes under one of these is a set of chips, a progress bar with a count over it, a link to another page: things the caller builds. Reach for the list first; reach for this when the value stopped being a sentence."
      >
        <Stage theme={theme}>
          <Specimen label="a ticket’s sidebar, at the 256px it is drawn in">
            <Card className="flex w-64 flex-col gap-4">
              <MetaBlock title="Assignees">
                <Text tone="secondary">Ada Lovelace</Text>
              </MetaBlock>
              <MetaBlock title="Labels">
                <Label size="xs">desktop</Label>
                <Label size="xs">design-system</Label>
                <Label size="xs">bug</Label>
              </MetaBlock>
              <MetaBlock title="Sub-issues">
                <div className="flex w-full flex-col gap-1.5">
                  <Text tone="secondary">1 of 3 done</Text>
                  <ProgressBar value={33} track="strong" />
                </div>
              </MetaBlock>
            </Card>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="No hairline between them"
        note="These were separated by border-b border-line-subtle last:border-b-0, which is how GitHub rules its own issue sidebar — one rule per field down a column that already has a plate around it."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The separation is the space now: the caller stacks them with a <code>gap</code>,
          and the label’s own quiet is what says a new field has started. A column of five
          fields is then one card rather than five boxes sharing edges.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It stacks rather than sitting the label beside the value, which is the other half
          of the distinction from <code>FactList</code>: a metadata column is 256px, and a
          label with three chips on one line leaves nothing for either.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Card, MetaBlock } from '@ds/desktop'

<Card className="flex flex-col gap-4">
  <MetaBlock title={t('tasks.detail.assignees')}>
    {assignees.length > 0 ? assignees.map(…) : <NoneYet />}
  </MetaBlock>
  <MetaBlock title={t('tasks.detail.labels')}>
    {labels.map((label) => <Label key={label}>{label}</Label>)}
  </MetaBlock>
</Card>`}</Snippet>
      </EntrySection>
    </article>
  )
}
