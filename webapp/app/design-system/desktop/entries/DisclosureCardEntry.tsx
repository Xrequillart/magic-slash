'use client'

import { useState } from 'react'
import { DisclosureCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const COLLECTED = {
  title: 'Collected',
  items: [
    'Agent activity: tickets, commits, PRs, reviews',
    'Which magic- skills ran, how long they took, how they ended',
    'Session length and the model in use',
    'Ticket id and title, and the repositories you work in',
  ],
}

const EXCLUDED = {
  title: 'Never collected',
  items: [
    'Your prompts and Claude’s answers',
    'Your code, your diffs, your file contents',
    'Terminal output and command history',
    'Your tokens, keys and credentials',
  ],
}

const AGENTS_NOTE =
  'Agents you have shared with a team keep reporting their status whatever this says — that is what makes a shared agent shared.'

const PROPS: PropRow[] = [
  {
    name: 'row',
    type: 'SettingRowProps',
    required: true,
    description:
      'The switch, as SettingRow’s own props — which is exactly what the app’s useToggleRow hands back, so the optimistic write under every switch comes along unchanged.',
  },
  {
    name: 'collected · excluded',
    type: 'DisclosureColumn',
    description:
      'The two columns: a title and short lines, written as things rather than sentences. Both or neither — one column of a comparison is not a comparison. Dropping them draws the row alone, which is what the app does when the switch is off: what is being collected has no answer while nothing is.',
  },
  {
    name: 'note',
    type: 'string | string[]',
    description:
      'The small print under everything: who can read what was recorded, and what carries on regardless of this switch. A list is several paragraphs, in order — the app keeps the second one in both states, because it is truest for the person who just switched this off.',
  },
]

export function DisclosureCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [on, setOn] = useState(true)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="DisclosureCard" uses={usesOf('disclosurecard')} onOpen={onOpen}>
        What a feature records and what it never touches — the switch, and the two lists
        that let someone decide whether to leave it on.
      </EntryHeader>

      <EntrySection
        title="The lists are the component"
        note="Because the honest answer to “what am I sharing?” is two columns and never a paragraph. The app had the paragraph first; nobody read it, and the people who most wanted to know — the ones about to switch the thing off — were the ones it served worst. Side by side, ticked against crossed, the answer is readable in the two seconds someone actually spends on it."
      >
        <Stage theme={theme}>
          <Specimen label="switch it off: the breakdown goes with the sharing, the caveat stays">
            <DisclosureCard
              row={{
                label: 'Share my activity with my team',
                hint: 'What your agents did, so a team lead can see where the work went',
                control: { kind: 'switch', checked: on, onChange: setOn, label: 'Share my activity' },
              }}
              collected={on ? COLLECTED : undefined}
              excluded={on ? EXCLUDED : undefined}
              note={
                on
                  ? ['Only the people in your organisation can read it, and only in aggregate.', AGENTS_NOTE]
                  : AGENTS_NOTE
              }
            />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The shape carries the promise, which is what makes this a component rather than
          a card with a list in it: an app that can only draw this arrangement cannot
          quietly grow a version with the right-hand column missing.
        </p>
      </EntrySection>

      <EntrySection
        title="It is drawn twice and was written twice"
        note="The desktop’s Application tab and the webapp’s feature settings both carry this block, and the desktop’s copy had a comment asking the next person to keep the two diffable by hand. They had already drifted — a 10px heading against an 11px one, text-muted against text-text-secondary/50 — which is the whole argument for the shape living here instead: two surfaces making the same promise about the same data cannot be left to agree by hand."
      >
        <PropsTable rows={PROPS} />
        <Snippet>{`import { DisclosureCard } from '@ds/desktop'

<DisclosureCard
  row={usageLogsRow}
  collected={enabled ? { title: t('...collected'), items: COLLECTED.map(t) } : undefined}
  excluded={enabled ? { title: t('...excluded'), items: EXCLUDED.map(t) } : undefined}
  note={enabled ? [t('...footnote'), t('...footnote.agents')] : t('...footnote.agents')}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
