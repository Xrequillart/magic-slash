'use client'

import { useState } from 'react'
import { ChipInput } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'items', type: 'string[]', required: true, description: 'The words, in the order they were added. Duplicates are refused on the way in.' },
  { name: 'onChange', type: '(items: string[]) => void', required: true, description: 'Called with the WHOLE new list, on every add and every removal. A chip is a complete value, so there is no half-typed state a Save button would be protecting.' },
  { name: 'placeholder', type: 'string', required: true, description: 'The empty field’s prompt, translated.' },
  { name: 'addLabel', type: 'string', required: true, description: 'The word on the add button, translated.' },
  { name: 'removeLabel', type: 'string', required: true, description: 'The cross’s accessible name, the same on every chip.' },
  { name: 'id', type: 'string', description: 'The field’s id, so a label elsewhere can point at it. A prop precisely so two of these can coexist on one page without colliding — which the repository settings page does, twice over.' },
  { name: 'disabled', type: 'boolean', fallback: 'false', description: 'Read-only: the crosses and the add button both refuse.' },
]

function Demo({ initial, id }: { initial: string[]; id: string }) {
  const [items, setItems] = useState(initial)
  return (
    <ChipInput
      items={items}
      onChange={setItems}
      placeholder="auth"
      addLabel="Add"
      removeLabel="Remove"
      id={id}
    />
  )
}

export function ChipInputEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="ChipInput" uses={usesOf('chipinput')} onOpen={onOpen}>
        A list of short strings the reader builds: each one a chip that can be taken back
        off, and a field under them that adds the next.
      </EntryHeader>

      <EntrySection
        title="Type one, press Enter"
        note="A repository’s keywords, the labels a plan puts on every ticket, the files a worktree copies over. All of them are the same object — a set of words, unordered, each whole — and the app drew it twice: once in the desktop settings and once on the marketing site’s form."
      >
        <Stage theme={theme}>
          <Specimen label="with words, and empty">
            <div className="flex w-full flex-col gap-6">
              <Demo initial={['auth', 'session', 'oauth']} id="ds-chips-a" />
              <Demo initial={[]} id="ds-chips-b" />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Enter adds, and so does the button beside it. Both, because they answer different
          hands: Enter is what somebody typing three keywords in a row will use, and the
          button is what somebody who has typed one and looked away needs in order to know
          the word has not been taken yet.
        </p>
      </EntrySection>

      <EntrySection
        title="A chip is not a Label"
        note="It wears Label’s geometry to the pixel — the same 24px box, the same bg-ink/5, the same radius — because on screen it is one, and a chip standing a rung apart from the labels elsewhere would be a second vocabulary for one shape."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          What it cannot be is that component. <code>Label.onClick</code> makes the{' '}
          <em>whole plate</em> a button, and the pressable part here is the cross alone. A
          label that opened something when you meant to remove a word is the failure that
          prop exists to prevent, not one to reproduce.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SettingsCard } from '@ds/desktop'

<SettingsCard rows={[{
  id: 'keywords',
  label: t('repo.general.keywords'),
  hint: t('repo.general.keywordsHelp'),
  layout: 'stacked',
  control: {
    kind: 'chips',
    items: repo.keywords ?? [],
    onChange: saveKeywords,
    placeholder: 'auth',
    addLabel: t('common.add'),
    removeLabel: t('common.remove'),
  },
}]} />`}</Snippet>
      </EntrySection>
    </article>
  )
}
