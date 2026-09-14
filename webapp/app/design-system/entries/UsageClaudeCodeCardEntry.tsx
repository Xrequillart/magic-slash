'use client'

import { useState } from 'react'
import { UsageClaudeCodeCard, type UsageLimit } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The app's own two, and the thresholds it draws them against. */
const THRESHOLDS = { warning: 65, danger: 85 }

const LIMITS = (session: number, weekly: number): UsageLimit[] => [
  { id: 'session', label: 'Session (5h)', shortLabel: 'session', percent: session, reset: '2h14' },
  { id: 'weekly', label: 'Weekly (7d)', shortLabel: 'weekly', percent: weekly, reset: '3d' },
]

const PROPS: PropRow[] = [
  {
    name: 'account',
    type: 'string',
    required: true,
    description:
      'Whose usage — the account’s name, or whatever the caller falls back to. It truncates: an account is whatever the person is called, in a column barely wider than 200px.',
  },
  {
    name: 'limits',
    type: 'UsageLimit[]',
    required: true,
    description:
      'The limits, in the order they should read. Empty is a real state and not an error: an account whose agents have not reported yet has no numbers, which is different from having zeroes.',
  },
  {
    name: 'thresholds',
    type: '{ warning: number; danger: number }',
    description:
      'Where the bars turn orange and then red. The caller’s, because a percentage means different things on different gauges. Without them the bars stay green to 100%, which for a rate limit is the wrong answer.',
  },
  { name: 'collapsed', type: 'boolean', fallback: 'false', description: 'The caller’s state — in the app it is persisted config, and a card holding its own copy would fight the one that survives a restart.' },
  { name: 'onToggle', type: '() => void', required: true, description: 'The one control.' },
  { name: 'expandLabel / collapseLabel', type: 'string', description: 'The control’s tooltip, in each direction. Translated.' },
  { name: 'emptyLabel', type: 'string', description: 'One line, collapsed, when there is nothing to show.' },
  { name: 'emptyHint', type: 'string', description: 'A longer sentence, open, when there is nothing to show.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Where the card sits: margins. Not the ground, the radius or the padding.' },
]

const LIMIT_PROPS: PropRow[] = [
  { name: 'id', type: 'string', required: true, description: 'Stable across renders.' },
  { name: 'label', type: 'string', required: true, description: 'The full name, for the open card — “Session (5h)”.' },
  {
    name: 'shortLabel',
    type: 'string',
    required: true,
    description:
      'The short name for the collapsed line, where every limit shares one row. Separate from label rather than truncated out of it: a name cut to fit is a name that stops naming.',
  },
  { name: 'percent', type: 'number', required: true, description: '0 to 100, clamped.' },
  {
    name: 'reset',
    type: 'string',
    description:
      'When it resets, already formatted — “2h14”, “3d”, “soon”. A string and not a timestamp: a countdown needs a translator and a clock, and neither belongs in this folder.',
  },
]

/**
 * One card, held in whichever state it is given — so the two readings can sit beside
 * each other rather than one behind a press.
 */
function Still({ limits, collapsed = false }: { limits: UsageLimit[]; collapsed?: boolean }) {
  return (
    <div className="w-[228px]">
      <UsageClaudeCodeCard
        account="camille@acme.dev"
        limits={limits}
        thresholds={THRESHOLDS}
        collapsed={collapsed}
        onToggle={() => undefined}
        expandLabel="Expand"
        collapseLabel="Minimise"
        emptyLabel="No data"
        emptyHint="Usage appears once an agent has reported it."
      />
    </div>
  )
}

/** The real card, at the sidebar's own width, with its own control working. */
function Live({ limits }: { limits: UsageLimit[] }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className="w-[228px]">
      <UsageClaudeCodeCard
        account="camille@acme.dev"
        limits={limits}
        thresholds={THRESHOLDS}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        expandLabel="Expand"
        collapseLabel="Minimise"
        emptyLabel="No data"
        emptyHint="Usage appears once an agent has reported it."
      />
    </div>
  )
}

export function UsageClaudeCodeCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="UsageClaudeCodeCard"
        uses={usesOf('usageclaudecodecard')}
        onOpen={onOpen}
      >
        What is left of the Claude Code account: its rate limits, at the foot of the sidebar.
        It wears Claude’s chip and not a generic account badge — the same mark, ground and
        label as the agent card on the other side of the window. The two are a pair, one per
        sidebar, and the chip is what says so.
      </EntryHeader>

      <EntrySection
        title="Open, and collapsed"
        note="The same two limits, both ways, side by side — 104px against 36. The collapsed form is not a smaller version of the open one, it is a different reading: open, each limit gets a row you read, with its name and when it resets; collapsed, they share one line and the bar becomes whatever is left between a short label and a number, which you glance at. A card that only shrank would have made the glance unreadable and the reading pointless."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <div className="flex flex-col gap-2">
            <Still limits={LIMITS(42, 71)} />
            <span className="font-mono text-[10px] text-text-secondary">open · 104px</span>
          </div>
          <div className="flex flex-col gap-2">
            <Still limits={LIMITS(42, 71)} collapsed />
            <span className="font-mono text-[10px] text-text-secondary">collapsed · 36px</span>
          </div>
          <div className="flex flex-col gap-2">
            <Live limits={LIMITS(42, 71)} />
            <span className="font-mono text-[10px] text-text-secondary">
              and the real control — press it
            </span>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The thresholds are the caller’s"
        note="65 and 85 in the app. A percentage means different things on different gauges, so the card does not decide — it hands them to ProgressBar, which has the same rule for the same reason. Below the first threshold the bar and the number are green; the number always agrees with the bar, because both read the same function."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-6">
          {[
            [12, 30],
            [70, 55],
            [94, 88],
          ].map(([session, weekly]) => (
            <div key={session} className="flex flex-col gap-2">
              <div className="w-[228px]">
                <UsageClaudeCodeCard
                  account="camille@acme.dev"
                  limits={LIMITS(session, weekly)}
                  thresholds={THRESHOLDS}
                  onToggle={() => undefined}
                  expandLabel="Expand"
                  collapseLabel="Minimise"
                  emptyLabel="No data"
                  emptyHint="Usage appears once an agent has reported it."
                />
              </div>
              <span className="font-mono text-[10px] text-text-secondary">
                {session}% · {weekly}%
              </span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Nothing to show"
        note="An account whose agents have not reported yet has no numbers, which is different from having zeroes — bars at 0% would be a claim. Collapsed it is one quiet line; open there is room for a sentence saying why."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <Live limits={[]} />
          <div className="w-[228px]">
            <UsageClaudeCodeCard
              account="camille@acme.dev"
              limits={[]}
              collapsed
              onToggle={() => undefined}
              expandLabel="Expand"
              collapseLabel="Minimise"
              emptyLabel="No data"
              emptyHint="Usage appears once an agent has reported it."
            />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">open, then collapsed</span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The name gives way"
        note="The chip truncates, unlike the fixed labels Label usually carries: an account is whatever the person is called. The full value stays in the tooltip — hover it."
      >
        <Stage theme={theme} className="flex items-start gap-8">
          <div className="w-[228px]">
            <UsageClaudeCodeCard
              account="alexandra.developer@a-very-long-domain.example"
              limits={LIMITS(42, 71)}
              thresholds={THRESHOLDS}
              onToggle={() => undefined}
              expandLabel="Expand"
              collapseLabel="Minimise"
              emptyLabel="No data"
              emptyHint="Usage appears once an agent has reported it."
            />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { UsageClaudeCodeCard } from '@ds/desktop'

<UsageClaudeCodeCard
  className="mx-2 mb-1"
  account={accountLabel}
  limits={limits}
  thresholds={LIMIT_THRESHOLDS}
  collapsed={minimized}
  onToggle={toggleMinimized}
  expandLabel={t('usage.expand')}
  collapseLabel={t('usage.minimize')}
  emptyLabel={t('usage.noData')}
  emptyHint={t('usage.noDataHint')}
/>`}</Snippet>
      </EntrySection>

      <EntrySection title="UsageLimit">
        <PropsTable rows={LIMIT_PROPS} />
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It is the one card in the app whose padding is <code>tight</code> — the left sidebar
          is 228px where the right is 320, and <code>compact</code>’s 16px of side padding is
          14% of the narrow column before anything is drawn in it. Two progress bars need every
          pixel they can get.
        </p>
      </EntrySection>
    </article>
  )
}
