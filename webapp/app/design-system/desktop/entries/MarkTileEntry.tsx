'use client'

import { MarkTile } from '@ds/desktop'
import { Github, Jira, JIRA_CHIP_GROUND, Slack, SquareTerminal } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** The MarkTile entry: the three places it is drawn, then the plates it takes. */

const PROPS: PropRow[] = [
  { name: 'glyph', type: 'IconComponent', required: true, description: 'A logo from brand.tsx or a Lucide glyph. A mark that paints itself keeps its colours; one drawn in currentColor takes ink.' },
  { name: 'size', type: 'AvatarSize', fallback: "'lg'", description: 'A rung of Avatar’s ladder: the tile is that box, the mark that rung’s glyph, so a tile and a face of one rung are one size.' },
  { name: 'shape', type: "'square' | 'round'", fallback: "'square'", description: 'Square where it stands alone, since logos are drawn on a square grid. Round where it stacks like faces.' },
  { name: 'tint', type: 'string', description: 'The plate, as a CSS colour: a brand’s ground or a fixed paper. Absent, the theme’s surface-strong.' },
  { name: 'ink', type: 'string', description: 'What a currentColor mark is drawn in, as a CSS colour. Absent, the theme’s ink.' },
  { name: 'title', type: 'string', description: 'The accessible name and tooltip when the mark is content. Absent, the tile is decoration and hidden.' },
  { name: 'className', type: 'string', fallback: "''", description: 'Layout only.' },
]

export function MarkTileEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="MarkTile" uses={usesOf('marktile')} onOpen={onOpen}>
        A mark on its own plate, where a person would get a face: AccountCard’s service
        tile, SettingRow’s device tile and the chat’s tool discs are all this one tile.
      </EntryHeader>

      <EntrySection
        title="Square alone, round in a stack"
        note="lg is the service tile, on Avatar’s 44px rung so a card about Jira is as tall as a card about a person. sm round is the tool disc."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-8">
          <Specimen label="lg, theme plate">
            <MarkTile glyph={Slack} title="Slack" />
          </Specimen>
          <Specimen label="lg, Jira’s tint">
            <MarkTile glyph={Jira} tint={JIRA_CHIP_GROUND} title="Jira" />
          </Specimen>
          <Specimen label="lg, GitHub in the theme’s ink">
            <MarkTile glyph={Github} title="GitHub" />
          </Specimen>
          <Specimen label="sm round, fixed grey and ink">
            <MarkTile glyph={SquareTerminal} size="sm" shape="round" tint="#E4E4E7" ink="rgb(10 10 11)" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { MarkTile } from '@ds/desktop'
import { Jira, JIRA_CHIP_GROUND } from '@ds/desktop/icons'

<MarkTile glyph={Jira} tint={JIRA_CHIP_GROUND} title="Jira" />`}</Snippet>
      </EntrySection>
    </article>
  )
}
