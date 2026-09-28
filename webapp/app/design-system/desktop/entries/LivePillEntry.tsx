'use client'

import { LivePill } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Stage, Specimen, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'label', type: 'string', required: true, description: 'The word, translated: “Live”, “Active now”.' },
  { name: 'tone', type: "'live' | 'waiting'", fallback: "'live'", description: 'Green with a pulsing dot, or yellow with a still one while the thing is on its way back. Only live pulses: a dot that pulses while waiting would say “working” about something that is not.' },
  { name: 'title', type: 'string', description: 'A longer sentence for the tooltip.' },
]

export function LivePillEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="LivePill" uses={usesOf('livepill')} onOpen={onOpen}>
        Something is happening right now, or is on its way back.
      </EntryHeader>
      <EntrySection
        title="One green for “now”"
        note="Lifted from the plan modal’s header, where it was drawn by hand, the day Security & Access needed to mark the session in use with the same pill."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-6">
          <Specimen label="the plan modal, connected">
            <LivePill label="Live" />
          </Specimen>
          <Specimen label="the plan modal, reconnecting">
            <LivePill label="Reconnecting…" tone="waiting" />
          </Specimen>
          <Specimen label="Security & Access, this device">
            <LivePill label="Active now" />
          </Specimen>
        </Stage>
      </EntrySection>
      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
      </EntrySection>
    </article>
  )
}
