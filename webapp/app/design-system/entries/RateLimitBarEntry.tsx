'use client'

import { Card, EmptyLine, RateLimitBar } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'label · percent',
    type: 'string · number',
    required: true,
    description:
      'Which limit this is, translated, and how much of it is gone. The percentage is clamped: a server may report 103.',
  },
  {
    name: 'resets',
    type: 'string',
    description:
      '“resets in 2h14”, already built and translated. Both halves of it are the app’s: this folder cannot read a translation, and a component that set its own interval would re-render every surface drawing one on a timer none of them asked for. Omitted draws nothing.',
  },
]

export function RateLimitBarEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="RateLimitBar" uses={usesOf('ratelimitbar')} onOpen={onOpen}>
        One plan rate limit, full width: what it is, when it turns over, how much is gone.
      </EntryHeader>

      <EntrySection
        title="Where it turns, and why it is late"
        note="65% of a weekly quota is a normal Wednesday. The context gauge turns at 40 and 70 instead, because filling a context window is what triggers a compaction. Two gauges, two honest answers — which is why the thresholds travel with this component rather than living on ProgressBar. The warning step is orange and was yellow: this app gives yellow to a PENDING state, and a gauge filling up is not a gauge waiting."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          <Specimen label="a normal week, a warning, and nearly out">
            <Card className="flex flex-col gap-4">
              <RateLimitBar label="Session" percent={22} resets="resets in 2h14" />
              <RateLimitBar label="Weekly" percent={71} resets="resets in 3d" />
              <RateLimitBar label="Opus weekly" percent={96} resets="resets in 18h05" />
            </Card>
          </Specimen>
          <Specimen label="no agent has reported one">
            <Card>
              <EmptyLine>No usage reported yet. Start an agent to see your plan limits.</EmptyLine>
            </Card>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The figure is <code>tabular-nums</code> so it does not jitter as it climbs: 8%
          and 88% have to occupy the same box, or the countdown beside it walks left and
          right every thirty seconds.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { RateLimitBar } from '@ds/desktop'

<RateLimitBar
  label={t('usage.session')}
  percent={accountUsage.fiveHourPercent}
  resets={resetLabel(accountUsage.fiveHourResetsAt)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
