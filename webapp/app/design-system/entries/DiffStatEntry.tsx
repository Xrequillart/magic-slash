'use client'

import { DiffStat } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  {
    name: 'additions',
    type: 'number',
    required: true,
    description:
      'Lines added, drawn in green. Omitted entirely when it is zero — a “+0” is a number saying it has no news.',
  },
  {
    name: 'deletions',
    type: 'number',
    required: true,
    description: 'Lines removed, drawn in red. Omitted the same way when it is zero.',
  },
  {
    name: 'gauge',
    type: 'boolean',
    fallback: 'false',
    description:
      'The six squares, after the numbers. Off by default, because a summary of one file is just the two numbers again in a shape that is harder to read — it belongs on the heading that stands for a whole working tree.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the two colours, the sizes or the squares.',
  },
]

const BALANCES = [
  { label: 'all additions — six green', additions: 248, deletions: 0 },
  { label: 'two thirds added', additions: 120, deletions: 60 },
  { label: 'an even split — three and three', additions: 84, deletions: 84 },
  { label: 'mostly removal', additions: 12, deletions: 190 },
  { label: 'nothing but deletions — six red', additions: 0, deletions: 74 },
]

export function DiffStatEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="DiffStat" uses={[{ id: 'text', label: 'Text' }]} onOpen={onOpen}>
        How much was added and how much was taken away, and the balance between them. The
        numbers and the gauge are <em>one</em> component because they are one fact stated
        twice — split apart, a caller could show a gauge that disagreed with the counts
        beside it, which is the only way this can be wrong.
      </EntryHeader>

      <EntrySection
        title="The gauge is the numbers, at a glance"
        note="Each square asks whether the additions’ share has reached its own rung: the first lights green at a sixth, the last only at the whole. So a change that is mostly removal comes out mostly red, and the bar fills left to right the way a meter does — no percentage written anywhere, which is the point of drawing it."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {BALANCES.map(balance => (
            <Specimen key={balance.label} label={balance.label}>
              <DiffStat additions={balance.additions} deletions={balance.deletions} gauge />
            </Specimen>
          ))}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Six is not arbitrary: it is the smallest count that still resolves a half (3/3)
          and a third (2/4, 4/2) at 6px a square, which is what a 288px sidebar has room
          for. And <code>rounded-sm</code> rather than <code>rounded-full</code> — at that
          size a circle is a dot with no direction to it, and the row reads as a string of
          beads instead of a bar.
        </p>
      </EntrySection>

      <EntrySection
        title="Without the gauge, and with nothing at all"
        note="Bare, it is the form every file row wears. And when both numbers are zero it draws nothing — which is also what keeps the ratio from dividing by zero, so no caller needs a guard of its own."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <Specimen label="the row form — numbers only">
            <DiffStat additions={31} deletions={4} />
          </Specimen>
          <Specimen label="additions only — the red half simply is not there">
            <DiffStat additions={31} deletions={0} />
          </Specimen>
          <Specimen label="0 / 0 — the component renders null">
            <div className="flex h-4 items-center">
              <DiffStat additions={0} deletions={0} />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Green and red are classes, not tones"
        note="Text’s tones are both greys, so adding green and red to that scale would be inventing two tones for one component. With tone=&quot;inherit&quot; the Text emits no colour at all, and there is nothing for the class to lose an emission-order fight with — the same escape CommitLine’s copy tick uses."
      >
        <PropsTable rows={PROPS} />
        <Snippet>{`import { DiffStat } from '@ds/desktop'

// On a heading, standing for a whole working tree
<DiffStat additions={stats.additions} deletions={stats.deletions} gauge />

// On a row, standing for one file
<DiffStat additions={file.additions} deletions={file.deletions} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
