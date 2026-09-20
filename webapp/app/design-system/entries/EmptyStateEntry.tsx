'use client'

import { Card, EmptyLine, EmptyState } from '@ds/desktop'
import { FolderInput, Plus } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'children',
    type: 'string',
    required: true,
    description:
      'What is missing, in one sentence, translated. It names the ABSENCE and not the cure — “no custom skills yet”, not “click create below”. The buttons say what can be done, and a sentence that also says it is out of date the moment a third verb is added.',
  },
  {
    name: 'actions',
    type: 'EmptyStateAction[]',
    description:
      'What ends the emptiness — { id, label, icon?, busy?, disabled?, onClick }. Empty draws the sentence alone, which is the right shape for an absence nobody can act on from here.',
  },
]

export function EmptyStateEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="EmptyState" uses={usesOf('emptystate')} onOpen={onOpen}>
        A section with nothing in it yet, and the ways to put something there.
      </EntryHeader>

      <EntrySection
        title="A sentence with no verbs is an EmptyLine"
        note="That one is a centred sentence where a card’s rows would be — a fact, with nothing to do about it, because the thing it reports on is read off disk and will fill itself in. This is a section of a page whose content the reader CREATES, so the emptiness comes with the verbs that end it."
      >
        <Stage theme={theme}>
          <Specimen label="two verbs, and the same absence with none">
            <div className="flex w-full flex-col gap-3">
              <EmptyState
                actions={[
                  { id: 'create', label: 'Create a skill', icon: Plus, onClick: () => undefined },
                  { id: 'import', label: 'Import a folder', icon: FolderInput, onClick: () => undefined },
                ]}
              >
                You have not written any skills yet
              </EmptyState>
              <EmptyState>No repository in your config exposes a skills folder</EmptyState>
            </div>
          </Specimen>
          <Specimen label="EmptyLine, for comparison: inside a card, where rows would be">
            <Card>
              <EmptyLine>No rate limit has been reported yet</EmptyLine>
            </Card>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          No dashed outline. It had one — <code>border border-dashed border-border/50</code>{' '}
          — which is the convention for a drop target, and this is not one: nothing can be
          dragged into it, and an edge that promises a gesture the surface does not accept
          is worse than no edge.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { EmptyState } from '@ds/desktop'

<EmptyState actions={emptyActions}>{t('skills.customEmpty')}</EmptyState>`}</Snippet>
      </EntrySection>
    </article>
  )
}
