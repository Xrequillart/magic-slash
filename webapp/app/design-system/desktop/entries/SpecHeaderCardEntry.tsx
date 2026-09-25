'use client'

import { SpecHeaderCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'repository', type: '{ name: string; path?: string }', description: 'The repository the spec was planned in, and its path on that machine.' },
  { name: 'tracker', type: "{ name: string; tone: 'github' | 'jira' | 'neutral' }", description: 'Where the tickets go, as a Label in its product’s tone.' },
  { name: 'created', type: 'string', description: 'The day it was written, already formatted for the reader.' },
  {
    name: 'status',
    type: '{ label: string; tone: SpecStatusTone }',
    description: 'One of the skill’s four statuses, each with its colour and mark: drafting, awaiting, created, abandoned. unknown draws a word the skill does not write in neutral.',
  },
  { name: 'labels', type: '{ repository; tracker; created; status }', required: true, description: 'Already translated: the caption over each cell.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins and placement.' },
]

const LABELS = { repository: 'Repository', tracker: 'Tracker', created: 'Created', status: 'Status' }

const BASE = {
  repository: { name: 'magic-slash', path: '/Users/me/Documents/magic-slash' },
  tracker: { name: 'github.com/Xrequillart/magic-slash', tone: 'github' as const },
  created: 'September 11, 2026',
  labels: LABELS,
}

export function SpecHeaderCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SpecHeaderCard" uses={usesOf('specheadercard')} onOpen={onOpen}>
        Where a spec lives and where it stands: the four bullets a <code>/magic:plan</code> spec
        opens with, as one card of four cells. All of it is data, and none of it is a line to
        comment on.
      </EntryHeader>

      <EntrySection title="The four statuses" note="Each status the skill writes has its colour and mark, so where a plan stands reads before its words do.">
        <Stage theme={theme} className="flex flex-col gap-3">
          <Specimen label="created">
            <div className="max-w-[616px]"><SpecHeaderCard {...BASE} status={{ label: 'Tickets created', tone: 'created' }} /></div>
          </Specimen>
          <Specimen label="drafting">
            <div className="max-w-[616px]"><SpecHeaderCard {...BASE} status={{ label: 'Drafting', tone: 'drafting' }} /></div>
          </Specimen>
          <Specimen label="awaiting">
            <div className="max-w-[616px]"><SpecHeaderCard {...BASE} status={{ label: 'Awaiting approval', tone: 'awaiting' }} /></div>
          </Specimen>
          <Specimen label="abandoned">
            <div className="max-w-[616px]"><SpecHeaderCard {...BASE} status={{ label: 'Abandoned', tone: 'abandoned' }} /></div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SpecHeaderCard } from '@ds/desktop'

<SpecHeaderCard
  repository={{ name: 'magic-slash', path: '/Users/me/Documents/magic-slash' }}
  tracker={{ name: 'github.com/Xrequillart/magic-slash', tone: 'github' }}
  created="September 11, 2026"
  status={{ label: t('plans.specHeader.statuses.created'), tone: 'created' }}
  labels={{ repository: t('plans.specHeader.repository'), … }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
