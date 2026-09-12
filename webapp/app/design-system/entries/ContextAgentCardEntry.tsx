'use client'

import { useState } from 'react'
import { ContextAgentCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const LABELS = { context: 'Context', minimize: 'Fold', expand: 'Unfold' }

const PROPS: PropRow[] = [
  { name: 'contextPercent', type: 'number', required: true, description: 'How full the context window is. An agent that has not spoken yet has used 0%, and says so — a dash there appears for the first seconds of every agent and makes a reader wonder what is broken.' },
  { name: 'contextDetail', type: 'string', description: '“42k of 200k tokens”, already built and already translated. Omitted, the line is absent.' },
  { name: 'model', type: 'string', description: 'Printed verbatim, and truncated rather than pushing the fold button off the row.' },
  { name: 'cost', type: 'string', description: 'Already in the reader’s currency format. The card does no arithmetic.' },
  { name: 'duration', type: 'string', description: 'Already formatted.' },
  { name: 'minimized', type: 'boolean', fallback: 'false', description: 'Folded to one line. Owned by the caller — it lives in the config, so it survives an agent switch.' },
  { name: 'onMinimizedChange', type: '(minimized: boolean) => void', required: true, description: 'Both buttons go through it.' },
  { name: 'labels', type: '{ context; minimize; expand }', required: true, description: 'The three translated strings the card cannot build for itself. There is no fourth: “Claude Code” is a product name and does not translate.' },
]

export function ContextAgentCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [minimized, setMinimized] = useState(false)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="ContextAgentCard"
        uses={[
          { id: 'card', label: 'Card' },
          { id: 'label', label: 'Label' },
          { id: 'progress', label: 'ProgressBar' },
          { id: 'buttonicon', label: 'ButtonIcon' },
        ]}
        onOpen={onOpen}
      >
        What a Claude Code agent is currently spending: its context window, its model, what the
        run has cost and how long it has taken. It computes nothing and reads nothing — every
        figure arrives formatted, every word translated, and the fold is a callback.
      </EntryHeader>

      <EntrySection
        title="Both states"
        note="Fold and unfold it. The same card, at the two sizes the sidebar gives it."
      >
        <Stage theme={theme}>
          <div className="max-w-[320px]">
            <ContextAgentCard
              contextPercent={34}
              contextDetail="68k of 200k tokens"
              model="claude-opus-5"
              cost="$1.42"
              duration="12 min"
              minimized={minimized}
              onMinimizedChange={setMinimized}
              labels={LABELS}
            />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="As the gauge fills"
        note="40 and 70, far earlier than a plan's rate limits — filling a context window is what triggers a compaction, so the warning has to arrive long before the end."
      >
        <Stage theme={theme} className="grid gap-4 md:grid-cols-3">
          {[12, 55, 88].map((pct) => (
            <ContextAgentCard
              key={pct}
              contextPercent={pct}
              contextDetail={`${Math.round(pct * 2)}k of 200k tokens`}
              model="claude-opus-5"
              onMinimizedChange={() => undefined}
              labels={LABELS}
            />
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="What it does without"
        note="Every field below the gauge is optional, and the row holding the cost and the duration is gated as a pair: with the card rendering before any usage arrives, an unguarded row would contribute the column's gap with nothing in it."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="a fresh agent — nothing reported yet">
            <Stage theme={theme}>
              <ContextAgentCard contextPercent={0} onMinimizedChange={() => undefined} labels={LABELS} />
            </Stage>
          </Specimen>
          <Specimen label="no cost yet, but a duration">
            <Stage theme={theme}>
              <ContextAgentCard
                contextPercent={7}
                model="claude-haiku-4-5"
                duration="48 s"
                onMinimizedChange={() => undefined}
                labels={LABELS}
              />
            </Stage>
          </Specimen>
        </div>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`// desktop: UsageCard.tsx — the data path, and nothing else
<ContextAgentCard
  contextPercent={contextPercent ?? 0}
  contextDetail={detail}
  cost={formatUsd(costUsd, locale)}
  labels={{ context: t('agentInfo.context'), minimize: t('usage.minimize'), expand: t('usage.expand') }}
  onMinimizedChange={onMinimizedChange}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
