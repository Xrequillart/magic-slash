'use client'

import { Card, FactList, type FactListRow } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const ROWS: FactListRow[] = [
  { id: 'name', label: 'Name', value: 'Camille Dubois' },
  { id: 'email', label: 'Email', value: 'camille@acme.dev' },
  { id: 'organization', label: 'Organization', value: 'Acme' },
  { id: 'plan', label: 'Plan', value: 'Max', badge: true },
]

const PROPS: PropRow[] = [
  {
    name: 'rows',
    type: 'FactListRow[]',
    required: true,
    description:
      '{ id, label, value, badge? }. The value is a string, already formatted: this list does not know what a plan is. badge draws it as a pill in the accent — at most one per list in practice, because two badges is a list with no hierarchy and three is a row of chips that happens to have labels.',
  },
  {
    name: 'empty',
    type: 'string',
    description:
      'What stands where the rows would be when there are none. An empty list is a STATE and not a mistake: the account is read off disk and the disk may hold nothing yet. Without it the card draws an empty plate, which says the read failed rather than that there is nothing to say.',
  },
]

export function FactListEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="FactList" uses={usesOf('factlist')} onOpen={onOpen}>
        A list of facts: what each one is called, and what it says. Nothing to press.
      </EntryHeader>

      <EntrySection
        title="It is not FieldTable, and the difference is the point"
        note="That one is a list of SETTINGS — three columns, a hairline over every row, and a button at the end of each saying what you can do about it. This is a list of things that are simply true: the Claude account read off ~/.claude is a name, an address, an organization and a plan, and there is no control anywhere on it because none of it is this app’s to change."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="four facts, and the one that is a class rather than a particular">
            <Card>
              <FactList rows={ROWS} />
            </Card>
          </Specimen>
          <Specimen label="nothing on disk yet">
            <Card>
              <FactList rows={[]} empty="No Claude account found on this machine." />
            </Card>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The arrangement is a definition list and not a table: the name at the left edge,
          the value at the <em>right</em> one, and no rule between them. A reader scans
          the right-hand column for the value they came for, which is the only column that
          varies — where <code>FieldTable</code>’s reader is looking for the row whose
          button they need.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { FactList } from '@ds/desktop'

<Card>
  <FactList rows={accountFacts} empty={t('settings.claude.noAccount')} />
</Card>`}</Snippet>
      </EntrySection>
    </article>
  )
}
