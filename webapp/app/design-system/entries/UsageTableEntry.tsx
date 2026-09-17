'use client'

import { Card, UsageTable } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const COLUMNS = ['Tokens', 'Est. cost']

const PROPS: PropRow[] = [
  {
    name: 'columns · rows',
    type: 'string[] · UsageTableRow[]',
    required: true,
    description:
      'One heading per figure column, and one row per period. The row’s own label column is headed by nothing: what a period is called needs no title.',
  },
  {
    name: 'UsageTableRow',
    type: '{ id, label, figures? }',
    description:
      'The figures are STRINGS, in the order of columns: a thousands separator is a locale’s business, the compact unit for a billion is a catalogue entry (French says “Md”), and a currency is neither. Absent figures is PENDING and draws the skeletons — an answered row with nothing in it passes zeroes, formatted.',
  },
  {
    name: 'note · empty',
    type: 'string · string',
    description:
      'The small print under the table, and what stands where the table would be. empty is shown only when the caller knows there is nothing: the app drew it while the fold was still being read, which said “no history” to users who have plenty of it.',
  },
]

export function UsageTableEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="UsageTable" uses={usesOf('usagetable')} onOpen={onOpen}>
        Figures over periods: one row per stretch of time, one column per number.
      </EntryHeader>

      <EntrySection
        title="Three states and not two"
        note="A row is pending until its figures arrive, and the difference between “pending” and “nothing to show” is the bug this shape exists to prevent. The skeletons are sized to the numbers they stand in for, so nothing shifts when the values land — a table that reflows on arrival is a table the eye has to find twice."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="answered">
            <Card>
              <UsageTable
                columns={COLUMNS}
                rows={[
                  { id: 'today', label: 'Today', figures: ['812.4K', '~$3.10'] },
                  { id: 'week', label: 'This week', figures: ['12.5M', '~$48.20'] },
                  { id: 'allTime', label: 'All time', figures: ['1.42Md', '~$5,180.00'] },
                ]}
                note="Estimated from the models’ public prices. Anthropic bills your plan, not these figures."
              />
            </Card>
          </Specimen>
          <Specimen label="still reading the fold">
            <Card>
              <UsageTable
                columns={COLUMNS}
                rows={[
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'This week' },
                  { id: 'allTime', label: 'All time' },
                ]}
                note="Estimated from the models’ public prices. Anthropic bills your plan, not these figures."
              />
            </Card>
          </Specimen>
          <Specimen label="answered, and there is genuinely nothing">
            <Card>
              <UsageTable columns={COLUMNS} rows={[]} empty="No usage recorded on this machine yet." />
            </Card>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          A table and not three cards, because the question a reader opens it with is
          comparative: “is today heavy” is answered by the row above and below it, and a
          figure that has to be compared has to be in a column. The figures are mono and
          right-aligned for the same reason.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { UsageTable } from '@ds/desktop'

<UsageTable
  columns={[t('settings.spend.tokens'), t('settings.spend.estCost')]}
  rows={buckets.map(({ id, label, bucket }) => ({
    id,
    label,
    figures: bucket ? [formatTokens(bucket.tokens), \`~\${formatUsd(bucket.costUsd)}\`] : undefined,
  }))}
  note={t('settings.spend.disclaimer')}
  empty={t('settings.spend.empty')}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
