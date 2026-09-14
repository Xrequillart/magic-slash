'use client'

import { useState } from 'react'
import { CollapsibleLine } from '@ds/desktop'
import { AlertTriangle, CheckCircle2, Loader2, MessagesSquare, MinusCircle } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  { name: 'icon', type: 'IconComponent', required: true, description: 'The mark in the gutter.' },
  {
    name: 'tone',
    type: 'PRTone',
    fallback: "'neutral'",
    description:
      'The colour of the mark, and of the label while the line is not muted. Named after the colour rather than a severity — see prTones on why a pull request has more states than any such scale has rungs.',
  },
  {
    name: 'spin',
    type: 'boolean',
    fallback: 'false',
    description: 'The mark turns — a CI run still going. Nothing else on the line moves.',
  },
  {
    name: 'label',
    type: 'string',
    required: true,
    description: 'What the line is about. Truncates; it never wraps, which is what keeps the height fixed.',
  },
  {
    name: 'muted',
    type: 'boolean',
    fallback: 'false',
    description:
      'This one is settled, so it steps back to a grey and gives up its tone. The mark keeps the tone either way: a ticked box is still green.',
  },
  {
    name: 'detail',
    type: 'ReactNode',
    description:
      'Pinned right of the label: a count, a ring, a command. A node rather than a string, because it is the one slot whose contents are genuinely the caller’s — and the one place a second control may go.',
  },
  {
    name: 'toggle',
    type: '{ open: boolean; onToggle: () => void }',
    description:
      'Present, the header is a button and children are gated behind it. Absent, the line is a statement — and wrapping a statement in a button that opens nothing is an affordance that lies.',
  },
  {
    name: 'children',
    type: 'ReactNode',
    description: 'What unfolds. Drawn when there is no toggle, or when the toggle is open.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the height, the gutter or either ground.',
  },
]

const CHECKS = [
  { name: 'lint', tone: 'green' as const, icon: CheckCircle2 },
  { name: 'test (node 20)', tone: 'green' as const, icon: CheckCircle2 },
  { name: 'build / macos', tone: 'blue' as const, icon: Loader2, spin: true },
  { name: 'e2e', tone: 'red' as const, icon: AlertTriangle },
]

/** The real thing: a checklist of three, two of which open. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [open, setOpen] = useState<string | null>('checks')
  const fold = (key: string) => ({
    open: open === key,
    onToggle: () => setOpen(open === key ? null : key),
  })
  return (
    <Stage theme={theme}>
      <div className="max-w-[420px] overflow-hidden rounded-lg bg-ink/5">
        {/* The hairline between rows is the panel's job — `PullRequestCard` draws one
            over each child it is given. Here it is spelled out, since this stage is not
            that card. */}
        <div className="[&>*+*]:border-t [&>*+*]:border-line-subtle">
          <CollapsibleLine
            icon={MessagesSquare}
            tone="blue"
            label="Comments"
            muted
            detail={<span className="text-[10px] text-text-secondary/60 tabular-nums">7 comments</span>}
            toggle={fold('comments')}
          >
            <div className="flex flex-wrap gap-x-3 text-[10px] text-text-secondary/70">
              <span>
                <span className="font-medium text-ink/80 tabular-nums">4</span> inline
              </span>
              <span>
                <span className="font-medium text-ink/80 tabular-nums">2</span> conversation
              </span>
              <span>
                <span className="font-medium text-ink/80 tabular-nums">1</span> review
              </span>
            </div>
          </CollapsibleLine>

          <CollapsibleLine
            icon={AlertTriangle}
            tone="red"
            label="Checks"
            detail={<span className="text-[10px] text-text-secondary/60 tabular-nums">2/4 passed</span>}
            toggle={fold('checks')}
          >
            <ul className="space-y-1">
              {CHECKS.map(check => (
                <li key={check.name} className="flex items-center gap-1.5">
                  <check.icon
                    className={`w-3 h-3 flex-shrink-0 ${
                      check.tone === 'green' ? 'text-green' : check.tone === 'blue' ? 'text-blue' : 'text-red'
                    } ${'spin' in check && check.spin ? 'animate-spin' : ''}`}
                  />
                  <span className="min-w-0 truncate text-[10px] text-text-secondary/70">{check.name}</span>
                </li>
              ))}
            </ul>
          </CollapsibleLine>

          <CollapsibleLine icon={CheckCircle2} tone="green" label="No conflicts" muted />
        </div>
      </div>
    </Stage>
  )
}

export function CollapsibleLineEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="CollapsibleLine"
        uses={[
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        One line of a checklist, and whatever unfolds under it. A mark, a label, a detail and
        a fold — in that order and always in those four slots. It is the <em>row</em>;{' '}
        <code>PullRequestCard</code> is the panel that stacks them.
      </EntryHeader>

      <EntrySection
        title="The shape is what makes them a list"
        note="It came out of the pull request card, where three lines — the comments, the CI checks, the merge conflicts — were three differently-shaped blocks each answering a yes-or-no question. Same gutter, same 36px, same place for the count, so the open items are the ones that stand out instead of the ones that happen to be tallest. Press a header: it is live."
      >
        <Live theme={theme} />
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          A fixed <code>h-9</code> and not a <code>min-h</code>: a line carrying a button is no
          taller than one carrying a word, and a checklist of ragged boxes stops reading as a
          list. Safe because the label truncates rather than wraps — only the fold is allowed
          to grow.
        </p>
      </EntrySection>

      <EntrySection
        title="muted is the ticked reading"
        note="A line that has been dealt with steps back to a grey; an open one keeps its tone. That is the whole reason the label’s colour is not simply the icon’s — scanning the list means landing on what still needs doing rather than on what is already fine. The mark keeps its tone either way: a ticked box is still green."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          <Specimen label="open — the tone carries the label too">
            <div className="max-w-[420px] overflow-hidden rounded-lg bg-ink/5">
              <CollapsibleLine icon={AlertTriangle} tone="red" label="Merge conflicts" />
            </div>
          </Specimen>
          <Specimen label="muted — settled, so it goes quiet">
            <div className="max-w-[420px] overflow-hidden rounded-lg bg-ink/5">
              <CollapsibleLine icon={CheckCircle2} tone="green" label="No conflicts" muted />
            </div>
          </Specimen>
          <Specimen label="spin — the mark turns, nothing else moves">
            <div className="max-w-[420px] overflow-hidden rounded-lg bg-ink/5">
              <CollapsibleLine icon={Loader2} tone="blue" label="Checks running" spin />
            </div>
          </Specimen>
          <Specimen label="nothing to say yet">
            <div className="max-w-[420px] overflow-hidden rounded-lg bg-ink/5">
              <CollapsibleLine icon={MinusCircle} tone="muted" label="Mergeability unknown" />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { CollapsibleLine } from '@ds/desktop'
import { MessagesSquare } from '@ds/desktop/icons'

<CollapsibleLine
  icon={MessagesSquare}
  tone="blue"
  label={t('agentInfo.pr.commentsLabel')}
  muted
  detail={<span className="text-[10px] tabular-nums">{count}</span>}
  toggle={{ open, onToggle: () => setOpen(!open) }}
>
  {/* the threads */}
</CollapsibleLine>`}</Snippet>
      </EntrySection>
    </article>
  )
}
