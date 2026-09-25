'use client'

import { BreakdownList, Card, type BreakdownRow } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const ACCENT = 'rgb(var(--c-accent, 99 102 241))'
const BLUE = 'rgb(var(--c-blue, 59 130 246))'
const GREEN = 'rgb(var(--c-green, 34 197 94))'
const ORANGE = 'rgb(var(--c-orange, 249 115 22))'
const RED = 'rgb(var(--c-red, 239 68 68))'

const PROPS: PropRow[] = [
  {
    name: 'rows',
    type: 'BreakdownRow[]',
    required: true,
    description:
      'One contributor each, in the caller’s order. The list does not sort: the ranking is usually computed alongside the total it is breaking down, and sorting again in here would be a second opinion about the same array.',
  },
  {
    name: 'rows[].lead',
    type: 'BreakdownTag',
    description:
      'A plate BEFORE the name, for the one fact that sorts the list into kinds. In front and not at the end because it is the column the eye runs down to group the rows — a grouping key at the ragged end of a truncating name is a key nobody can follow.',
  },
  {
    name: 'rows[].tags',
    type: 'BreakdownTag[]',
    description:
      'Plates after the name, for an exception worth flagging on this row and not the others. Natural width, because a reserved column would be an empty box on every other line.',
  },
  {
    name: 'rows[].detail / verdict',
    type: 'string | BreakdownTag',
    description:
      'The two fixed columns: what it costs, already formatted and translated, then the verdict on that figure. Both w-14, because two fixed columns of one width read as a table and two of different widths read as a row that ran out.',
  },
]

const ROWS: BreakdownRow[] = [
  { id: '1', lead: { label: 'Built-in', color: ACCENT }, name: 'skill-creator', tags: [{ label: 'cut', color: ORANGE }], detail: '256 tok', verdict: { label: 'High', color: RED } },
  { id: '2', lead: { label: 'Repo', color: BLUE }, name: 'magic-plan', detail: '186 tok', verdict: { label: 'High', color: RED } },
  { id: '3', lead: { label: 'Custom', color: GREEN }, name: 'brand-designer', tags: [{ label: 'cut', color: ORANGE }], detail: '142 tok', verdict: { label: 'Medium', color: ORANGE } },
  { id: '4', lead: { label: 'Built-in', color: ACCENT }, name: 'magic-commit', detail: '88 tok', verdict: { label: 'Medium', color: ORANGE } },
  { id: '5', lead: { label: 'Custom', color: GREEN }, name: 'poster', detail: '41 tok', verdict: { label: 'Low', color: GREEN } },
]

export function BreakdownListEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="BreakdownList" uses={usesOf('breakdownlist')} onOpen={onOpen}>
        What a total is made of, ranked: one row per contributor, the biggest first, each
        naming itself and what it costs.
      </EntryHeader>

      <EntrySection
        title="A table, where NoticeCard’s rows are evidence"
        note="Evidence is three or four names under a sentence that already counted them — ragged right, read once, then gone. This is twenty rows a reader scans down a column to find the one costing the most, so the figure column is fixed-width and right-aligned and the plate at the end of every row starts on the same x."
      >
        <Stage theme={theme}>
          <Specimen label="two fixed columns at the end, and one plate that only some rows wear">
            <Card>
              <BreakdownList rows={ROWS} />
            </Card>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The folder already makes this cut twice — <code>FactList</code> against{' '}
          <code>FieldTable</code>, <code>RepairList</code> against <code>UsageTable</code>.
          A list you read and a list you scan are two components, and the tell is whether
          anything has to line up.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { BreakdownList } from '@ds/desktop'

<BreakdownList
  rows={breakdown.map((entry) => ({
    id: \`\${entry.source}-\${entry.name}\`,
    lead: { label: sourceLabel(entry.source, t), color: SOURCE_COLOR[entry.source] },
    name: entry.name,
    tags: entry.truncated ? [{ label: t('skills.budget.cut'), color: WEIGHT_COLOR.medium }] : undefined,
    detail: t('skills.budget.tok', { count: entry.tokens }),
    verdict: { label: t(WEIGHT_LABELS[entry.weight]), color: WEIGHT_COLOR[entry.weight] },
  }))}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
