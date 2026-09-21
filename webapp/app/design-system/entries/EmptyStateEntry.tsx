'use client'

import { Card, EmptyLine, EmptyState } from '@ds/desktop'
import { FolderInput, ListTodo, Plus, SearchX } from '@ds/desktop/icons'
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
    name: 'icon',
    type: 'IconComponent',
    description:
      'A mark above the sentence, saying what KIND of absence this is. It earns its place only where a page has more than one of these and they mean different things — a search that matched nothing and a repository nobody configured read almost identically in words, and only one is the reader’s own doing. Drawn at 2xl, the rung past a line of text: an absence is scanned before it is read.',
  },
  {
    name: 'hint',
    type: 'string',
    description:
      'One quiet line under the sentence, for the absence whose cure is NOT a button. It looks like it contradicts children’s rule and it is its complement: where there are no buttons — because the fix is a setting on another page, and a different one per repository — the instruction has nowhere else to go.',
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
        title="A mark, and a line the buttons cannot carry"
        note="The Tasks board is the case both were added for: two of these sit one under the other in the same code, and only the mark tells them apart before the sentence is read. The hint is for the second, whose cure is a per-repository setting on another page — there is no button for it, so the instruction has nowhere else to go."
      >
        <Stage theme={theme}>
          <Specimen label="a search that matched nothing, and a board nobody has configured">
            <div className="flex w-full flex-col gap-3">
              <EmptyState
                icon={SearchX}
                actions={[{ id: 'clear', label: 'Clear the filters', onClick: () => undefined }]}
              >
                No ticket matches what you are looking for
              </EmptyState>
              <EmptyState
                icon={ListTodo}
                hint="Set an issues address on a repository, or a Jira project key, in its settings."
              >
                No repository has readable coordinates
              </EmptyState>
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

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
