'use client'

import { useState } from 'react'
import { SkillBudget } from '@ds/desktop'
import { Calculator, FileText, Scissors } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'title / help', type: 'string', required: true, description: 'The heading and the line under it.' },
  { name: 'window', type: 'SkillBudgetWindow', required: true, description: 'The segmented switch — Auto, 200K, 1M — and the hint under it saying where the window came from. A switch and not a select: every gauge below reads against the active one, so all three stay visible.' },
  { name: 'meters', type: 'BudgetMeterProps[]', required: true, description: 'Characters, then tokens, two to a row.' },
  { name: 'banners', type: 'SkillBudgetBanner[]', description: 'Facts about the meters for as long as they are true: over budget, descriptions cut.' },
  { name: 'how', type: '{ label, notes }', required: true, description: 'The “how is this computed” disclosure and its cards. Collapsed at rest: a question you ask once, but answerable in place.' },
  { name: 'breakdown', type: '{ label, rows }', description: 'Per-skill rows in a BreakdownList. No rows draws no disclosure.' },
]

export function SkillBudgetEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [windowKey, setWindowKey] = useState('auto')
  const max = windowKey === '200000' ? 8_000 : 40_000

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SkillBudget" uses={usesOf('skillbudget')} onOpen={onOpen}>
        What the skill listing spends of the share of the context window Claude Code gives
        it, with the window it is scaled to beside it.
      </EntryHeader>

      <EntrySection
        title="Live — switch the window"
        note="Only the drawing lives here. The arithmetic — 1% of the window, the per-skill cap, which window the running agent reports — is the app’s, and arrives as meters already worked out."
      >
        <Stage theme={theme}>
          <Specimen label="the same library on a 1M window, then a 200K one">
            <div className="w-full">
              <SkillBudget
                title="Skills Budget"
                help="What your skill descriptions cost in every single message."
                window={{
                  label: 'Context window',
                  items: [{ key: 'auto', label: 'Auto · 1M' }, { key: '200000', label: '200K tokens' }, { key: '1000000', label: '1M tokens' }],
                  activeKey: windowKey,
                  onSelect: setWindowKey,
                  hint: windowKey === 'auto' ? 'Detected from the running agent.' : 'Forced, whatever is running.',
                }}
                meters={[
                  { label: 'Characters (enforced)', value: 9_200, max, unit: 'chars', locale: 'en-US', tone: 'accent' },
                  { label: 'Tokens (estimate)', value: 2_300, max: max / 4, unit: 'tokens', locale: 'en-US', tone: 'warning' },
                ]}
                banners={max < 9_200 ? [{ id: 'over', variant: 'danger', text: 'Over budget by 1,200 characters: Claude Code drops descriptions until it fits.' }] : [{ id: 'cut', variant: 'warning', icon: Scissors, text: '1 description is longer than 1,536 characters and is cut.' }]}
                how={{
                  label: 'How this is computed',
                  notes: [
                    { id: 'scope', icon: FileText, title: 'What counts', body: 'Each skill’s name and description, listed once per turn.' },
                    { id: 'formula', icon: Calculator, title: 'The formula', body: 'Window × 4 characters per token × 1%.' },
                  ],
                }}
                breakdown={{ label: 'Details by skill', rows: [{ id: 'a', name: 'magic-plan', detail: '384 tok' }, { id: 'b', name: 'deploy-preview', detail: '212 tok' }] }}
              />
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SkillBudget } from '@ds/desktop'

<SkillBudget {...useSkillBudget(skills, repoSkills)} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
