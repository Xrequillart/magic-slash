'use client'

import { TrackerBadge, TrackerTile } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const BADGE_PROPS: PropRow[] = [
  { name: 'tracker', type: "'github' | 'jira'", required: true, description: 'Which of the two the ticket came from. It decides the tone, the mark and the word in the tooltip — nothing else about the chip differs.' },
  { name: 'ticketId', type: 'string', required: true, description: 'PER-1234 or #234, printed exactly as given. It does not truncate: a ticket id cut to PER-12… is not an id.' },
  { name: 'size', type: 'LabelSize', fallback: "'sm'", description: 'Label’s ladder, so a badge and a label on one line agree on their height.' },
  { name: 'title', type: 'string', description: 'Replaces the default “Jira · PER-1234” tooltip, for a badge that fills a button — the pointer then has to be told what pressing it does.' },
]

const TILE_PROPS: PropRow[] = [
  { name: 'tracker', type: "'github' | 'jira'", required: true, description: 'Jira keeps its brand blue, GitHub takes the theme’s ink on a neutral surface — its mark is currentColor, so it stays legible on the dark themes.' },
  { name: 'size', type: "'xs' | 'sm' | 'md' | 'lg'", fallback: "'md'", description: '24 / 32 / 40 / 48. md is the repository tile’s own size, which is the whole point: a tracker and a repository drawn side by side are the same object at the same scale.' },
  { name: 'title', type: 'string', description: 'The accessible name and the tooltip. The mark inside stays hidden from the tree, or a screen reader reads the tracker twice.' },
]

export function TrackerBadgeEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="TrackerBadge" uses={usesOf('trackerbadge')} onOpen={onOpen}>
        Which of the two trackers a ticket came from — as a chip carrying its id, and as
        a tile carrying nothing else.
      </EntryHeader>

      <EntrySection
        title="The chip"
        note="A Label in the tracker’s own tone. The ground, the mark and the geometry are the label’s; what is here is the one thing that is not — which tone a tracker takes, and the tooltip that names it."
      >
        <Stage theme={theme}>
          <Specimen label="the two trackers, at three rungs">
            <div className="flex flex-wrap items-center gap-3">
              <TrackerBadge tracker="jira" ticketId="PER-1234" size="xs" />
              <TrackerBadge tracker="jira" ticketId="PER-1234" />
              <TrackerBadge tracker="jira" ticketId="PER-1234" size="md" />
              <TrackerBadge tracker="github" ticketId="#412" size="xs" />
              <TrackerBadge tracker="github" ticketId="#412" />
              <TrackerBadge tracker="github" ticketId="#412" size="md" />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          One coloured thing per chip. Jira’s ground is Atlassian’s blue at 14% and the
          mark keeps its own two blues inside its SVG; a brand hue at full saturation on
          its own tint is not a legible pair on every theme, and the ground already says
          whose chip it is.
        </p>
      </EntrySection>

      <EntrySection
        title="The tile"
        note="The repository tile’s shape, applied to the two trackers. A bare glyph beside a ticket read as a smaller, flatter kind of thing on the pages that show both."
      >
        <Stage theme={theme}>
          <Specimen label="xs / sm / md / lg">
            <div className="flex items-center gap-3">
              <TrackerTile tracker="jira" size="xs" title="Jira" />
              <TrackerTile tracker="jira" size="sm" title="Jira" />
              <TrackerTile tracker="jira" title="Jira" />
              <TrackerTile tracker="jira" size="lg" title="Jira" />
              <TrackerTile tracker="github" size="xs" title="GitHub" />
              <TrackerTile tracker="github" size="sm" title="GitHub" />
              <TrackerTile tracker="github" title="GitHub" />
              <TrackerTile tracker="github" size="lg" title="GitHub" />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={BADGE_PROPS} />
        <p className="max-w-2xl pt-6 text-xs leading-relaxed text-muted">TrackerTile:</p>
        <PropsTable rows={TILE_PROPS} />
        <Snippet>{`import { TrackerBadge } from '@ds/desktop'

<TrackerBadge
  tracker={card.tracker}
  ticketId={card.tracker === 'jira' ? card.issue.key : \`#\${card.issue.number}\`}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
