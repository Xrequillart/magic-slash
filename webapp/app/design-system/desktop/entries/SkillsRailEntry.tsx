'use client'

import { useState } from 'react'
import { SkillsRail } from '@ds/desktop'
import { GitFork, PenTool, Sparkles } from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'overviewLabel', type: 'string', required: true, description: '“All skills”, the row above the groups. It is a destination of its own — the overview — so it sits in its own band rather than heading a group.' },
  { name: 'groups', type: 'SkillsRailGroup[]', required: true, description: 'Each with a label, rows and optionally an action. Set repoColor and the heading becomes a Label in that hue: a repository has a name on a plate instead of a glyph.' },
  { name: 'activeKey', type: 'string', required: true, description: 'The lit row. The overview’s key is overviewKey, “all” by default.' },
  { name: 'onSelect', type: '(key) => void', required: true, description: 'The row’s key, handed back. The rail knows nothing of routes; the app turns keys into its hash.' },
  { name: 'ariaLabel', type: 'string', required: true, description: 'The nav’s name.' },
]

export function SkillsRailEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [active, setActive] = useState('all')

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SkillsRail" uses={usesOf('skillsrail')} onOpen={onOpen}>
        The Skills page’s left rail: every skill the machine can reach, grouped by where it
        comes from, with the overview above them.
      </EntryHeader>

      <EntrySection
        title="Live — click a row"
        note="Every row is a MenuSidebarItem, the component the app’s own sidebar is built from. The group headings are the quiet 11px caps of a rail, not SectionHeader: under them the rows are the content."
      >
        <Stage theme={theme}>
          <Specimen label="three origins, and the custom group’s new-skill button">
            <div className="flex h-[420px] overflow-hidden rounded-xl border border-line">
              <SkillsRail
                overviewLabel="All skills"
                activeKey={active}
                onSelect={setActive}
                ariaLabel="All skills"
                groups={[
                  {
                    id: 'built-in',
                    label: 'Built-in',
                    icon: Sparkles,
                    rows: ['magic:plan', 'magic:start', 'magic:commit'].map((name) => ({ key: name, label: name, thumb: { src: null, alt: name } })),
                  },
                  {
                    id: 'custom',
                    label: 'Custom',
                    icon: PenTool,
                    rows: [{ key: 'deploy-preview', label: 'deploy-preview', thumb: { src: null, alt: 'deploy-preview' } }],
                    action: { title: 'New skill', onClick: () => undefined },
                  },
                  {
                    id: 'repo',
                    label: 'acme/checkout-api',
                    repoColor: PROJECT_COLORS[0],
                    rows: [{ key: 'db-migrate', label: 'db-migrate', icon: GitFork }],
                  },
                ]}
              />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SkillsRail } from '@ds/desktop'

<SkillsRail
  overviewLabel={t('skills.allSkills')}
  groups={railGroups}
  activeKey={activeKey}
  onSelect={(key) => { window.location.hash = hashForKey(key) }}
  ariaLabel={t('skills.allSkills')}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
