'use client'

import { useState } from 'react'
import { DecisionList } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'items',
    type: 'DecisionListItem[]',
    required: true,
    description:
      'One per question: its key, the three cells as nodes (question, decision, reason), whether it is open and how to fold it, and, when the document can be commented on, the row as a CommentableLine. A row with comments is lit orange all over.',
  },
  {
    name: 'labels',
    type: '{ decision; reason; expand; collapse }',
    required: true,
    description:
      'Already translated: the captions over the decision and the reason, and the chevron’s two names. Drawn as ::before content, so no text walk reads them into a quote.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement.' },
]

const DECISIONS = [
  {
    question: 'Scope: desktop only, or the webapp too?',
    decision: 'Desktop only for now',
    reason: 'The webapp has no spec editor yet.',
  },
  {
    question: 'Who is it for?',
    decision: 'The PMs who review the spec',
    reason: 'They are the ones who approve the tickets.',
  },
  {
    question: 'How will we know it worked?',
    decision: 'Every question of a plan gets its own thread',
    reason: 'A table could not be commented on at all.',
  },
]

const LABELS = { decision: 'Decision made', reason: 'Why', expand: 'Show the decision and why', collapse: 'Fold this question' }

/** The real thing: three questions, the first one open, the second carrying a discussion. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]))
  const toggle = (i: number) => setOpen((prev) => {
    const next = new Set(prev)
    if (!next.delete(i)) next.add(i)
    return next
  })
  return (
    <Stage theme={theme}>
      {/* `relative` and a right padding: the document a list sits in reserves the column its
          comment marks are drawn in, and this stage stands in for it. */}
      <div className="relative max-w-[616px] pr-14 text-sm">
        <DecisionList
          labels={LABELS}
          items={DECISIONS.map((d, i) => ({
            key: String(i),
            question: d.question,
            decision: d.decision,
            reason: d.reason,
            open: open.has(i),
            onToggle: () => toggle(i),
            comment: {
              lineId: `demo-${i}`,
              count: i === 1 ? 2 : 0,
              active: false,
              label: i === 1 ? '2 comments' : 'Comment on this decision',
              onOpen: () => {},
            },
          }))}
        />
      </div>
    </Stage>
  )
}

export function DecisionListEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="DecisionList" uses={usesOf('decisionlist')} onOpen={onOpen}>
        The questions a plan was framed by, and what was decided. Folded to the question alone;
        unfolded, the decision in green and the reason behind it in blue. It replaces the{' '}
        <code>## Framing decisions</code> table of a spec, which nobody could comment on.
      </EntryHeader>

      <EntrySection
        title="One row, one line"
        note="Each row is one line, commented on whole: the question and its decision together, which is how a reader argues about them. Its words cannot be selected, and a row carrying a discussion is lit orange: text, ground and border. Read, not written: changing a decision is a conversation. Press one: it is live."
      >
        <Live theme={theme} />
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Folding changes the grid and nothing else. The three cells are always rendered, in
          the same order, because a comment is anchored to the text of its line: a row that
          dropped its reason while folded would quote differently open and closed.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { DecisionList } from '@ds/desktop'

<DecisionList
  labels={{ decision: t('plans.decisions.decision'), reason: t('plans.decisions.reason'), … }}
  items={rows.map((row, i) => ({
    key: String(i),
    question: row.cells[0],
    decision: row.cells[1],
    reason: row.cells[2],
    open: open.has(i),
    onToggle: () => toggle(i),
    comment: { lineId: row.lineKey, count, active, label, onOpen },
  }))}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
