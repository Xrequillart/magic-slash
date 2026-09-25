'use client'

import { SkillsOverview } from '@ds/desktop'
import { FolderInput, GitFork, PenTool, Plus, Sparkles, Wand2 } from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const ACCENT = 'rgb(var(--c-accent, 99 102 241))'
const noop = () => undefined

const PROPS: PropRow[] = [
  { name: 'warnings', type: '{ title, notices }', description: 'NoticeCards under one heading. No notices draws no band at all.' },
  { name: 'budget', type: 'SkillBudgetProps', description: 'The gauge. Absent on a machine with no skill to count.' },
  { name: 'sections', type: 'SkillSectionProps[]', required: true, description: 'A heading and its cards, three to a row — or, for the repositories, one block per repository headed by its name on a plate. empty and loading replace the cards, never the heading.' },
  { name: 'loading', type: 'boolean', description: 'The whole page is still being read: one spinner and nothing else.' },
]

export function SkillsOverviewEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SkillsOverview" uses={usesOf('skillsoverview')} onOpen={onOpen}>
        The Skills page’s “All skills” destination: what is wrong, what the listing costs,
        and every skill as a card.
      </EntryHeader>

      <EntrySection
        title="Warnings, then the cards"
        note="The column, the gaps and the order of the bands are this component’s; what a duplicate is, or which skill is built in, arrives as data. The budget is left out of this specimen — it has an entry of its own."
      >
        <Stage theme={theme}>
          <Specimen label="a warning, built-in, custom with its two verbs, a repository">
            <div className="w-full">
              <SkillsOverview
                warnings={{
                  title: 'Warnings',
                  notices: [{
                    id: 'long',
                    variant: 'warning',
                    actions: [{ label: 'Fix with agent', icon: Wand2, onClick: noop, primary: true }],
                    rows: [{ id: 'deploy-preview', name: 'deploy-preview', detail: '184 words' }],
                    children: '1 skill with a description longer than 110 words.',
                  }],
                }}
                sections={[
                  {
                    id: 'built-in',
                    icon: Sparkles,
                    title: 'Built-in',
                    hint: 'Magic Slash core skills',
                    cards: [
                      { key: 'plan', name: 'magic:plan', description: 'Turns an idea into tickets', badge: { label: 'built-in', color: ACCENT }, onClick: noop },
                      { key: 'start', name: 'magic:start', description: 'Starts a task from a ticket', badge: { label: 'built-in', color: ACCENT }, onClick: noop },
                    ],
                  },
                  {
                    id: 'custom',
                    icon: PenTool,
                    title: 'Custom',
                    hint: 'User-level skills',
                    actions: [
                      { id: 'import', label: 'Import', icon: FolderInput, onClick: noop },
                      { id: 'new', label: 'New skill', icon: Plus, onClick: noop },
                    ],
                    cards: [{ key: 'deploy', name: 'deploy-preview', description: 'Ships the branch to a preview', imageUrl: null, onClick: noop }],
                  },
                  {
                    id: 'repos',
                    icon: GitFork,
                    title: 'Repository Skills',
                    repos: [{ id: 'acme', name: 'acme/checkout-api', color: PROJECT_COLORS[0], cards: [{ key: 'db', name: 'db-migrate', description: 'Writes the migration', onClick: noop }] }],
                  },
                ]}
              />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SkillsOverview } from '@ds/desktop'

<SkillsOverview
  loading={loading}
  warnings={{ title: t('skills.warnings'), notices }}
  budget={budget}
  sections={sections}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
