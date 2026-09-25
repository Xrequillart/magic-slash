'use client'

import { SizingCard, type SizingFact } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'facts',
    type: 'SizingFact[]',
    required: true,
    description:
      'In the order the spec wrote them: each a kind (verdict, deliverables, splitting, justification), its value as a node, and, when the document can be commented on, the fact as a CommentableLine. A fact with comments is lit orange all over.',
  },
  {
    name: 'labels',
    type: 'Record<SizingFactKind, string>',
    required: true,
    description: 'Already translated: the caption over each kind. Drawn as ::before content, so no text walk reads it into a quote.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement.' },
]

const LABELS = {
  verdict: 'Verdict',
  deliverables: 'Deliverables counted',
  splitting: 'Splitting mode',
  justification: 'Justification',
}

const comment = (i: number, count: number) => ({
  lineId: `demo-${i}`,
  count,
  active: false,
  label: count ? `${count} comments` : 'Comment on this fact',
  onOpen: () => {},
})

const FACTS: SizingFact[] = [
  { kind: 'verdict', value: <strong>epic + 3 stories</strong>, comment: comment(0, 0) },
  { kind: 'deliverables', value: '3', comment: comment(1, 0) },
  { kind: 'splitting', value: <><code>balanced</code> (the default)</>, comment: comment(2, 2) },
  {
    kind: 'justification',
    value: 'Balanced files an epic from D ≥ 2. The three deliverables are independently mergeable and each leaves the product coherent on its own.',
    comment: comment(3, 0),
  },
]

export function SizingCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SizingCard" uses={usesOf('sizingcard')} onOpen={onOpen}>
        How big a plan was judged to be, and why: a spec&rsquo;s <code>## Sizing</code>, as a card
        of four facts rather than four bullets that each open on a word and a colon.
      </EntryHeader>

      <EntrySection
        title="One mark and one colour per fact"
        note="The verdict first and a size up, the reasoning last and as prose: the order a reader asks about them. Each fact is a line commented on whole, like a DecisionList row, and read rather than written: disagreeing with a sizing is a conversation."
      >
        <Stage theme={theme}>
          {/* `relative` and a right padding: the document a card sits in reserves the column
              its comment marks are drawn in, and this stage stands in for it. */}
          <div className="relative max-w-[616px] pr-14 text-sm">
            <SizingCard facts={FACTS} labels={LABELS} />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SizingCard } from '@ds/desktop'

<SizingCard
  labels={{ verdict: t('plans.sizing.verdict'), … }}
  facts={items.map((item) => ({
    kind: sizingKindOf(item.text),
    value: afterLabel(item.children),
    comment: { lineId: item.lineKey, count, active, label, onOpen },
  }))}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
