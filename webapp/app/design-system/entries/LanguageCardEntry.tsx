'use client'

import { useState } from 'react'
import { LanguageCard, type LanguageCardOption } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** Named in itself, always — see the entry. */
const LANGUAGES: LanguageCardOption[] = [
  { value: 'en', label: 'English', flag: 'en' },
  { value: 'fr', label: 'Français', flag: 'fr' },
]

const PROPS: PropRow[] = [
  {
    name: 'value · options · onChange',
    type: 'string · LanguageCardOption[] · (value: string) => void',
    required: true,
    description:
      '{ value, label, flag? } per language. The label is the language’s name IN ITSELF and never goes through a translator — a reader who has accidentally set the app to a language they cannot read has exactly one way back, and translating this list would write the way out in the language they are trying to escape. Which languages the product ships in is the product’s, so they arrive as data.',
  },
  {
    name: 'label · hint',
    type: 'string · string',
    required: true,
    description:
      'What the setting is called and what it changes, in the language currently showing. These two ARE translated: they are the app talking about itself, not the list of languages.',
  },
  {
    name: 'note',
    type: 'string',
    description:
      'The small print under the row: what this setting is NOT. Optional in the type and all but required in practice — the desktop has language settings per repository, which are the languages Claude WRITES in, and the two are confused constantly. Not SettingRow’s own note, which sits tight under the row and says what the current value means; this one holds true whichever language is picked.',
  },
  {
    name: 'width · disabled',
    type: 'number · boolean',
    description: 'The picker’s width, which is the settings column’s and the caller’s. disabled is the whole row.',
  },
]

export function LanguageCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [language, setLanguage] = useState('fr')

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="LanguageCard" uses={usesOf('languagecard')} onOpen={onOpen}>
        Which language the product speaks to you in — the one card that offers the choice.
      </EntryHeader>

      <EntrySection
        title="The names are not translated, and that is the whole trick"
        note="Every language is named in itself — English, Français — so the list reads correctly whatever the app is currently showing. A reader who has accidentally set the app to a language they cannot read has exactly one way back, and it is this list."
      >
        <Stage theme={theme}>
          <Specimen label="a flag, a name, and the line saying what this setting is not">
            <LanguageCard
              label="Interface language"
              hint="The language Magic Slash speaks to you in"
              note="This is the language you READ. What Claude writes — commits, pull requests, tickets — is set per repository, on the repository’s own tab."
              value={language}
              options={LANGUAGES}
              onChange={setLanguage}
              width={208}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Why it is a component and not a row in a card"
        note="Because “choose a language” is a shape with three parts that keep drifting apart, and the app had them in three files: a picker showing a flag beside each name, the names written in the language they name, and a line of small print separating this choice from the other language settings in the product. The last one is the reason the card exists at all."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The row itself is <code>SettingRow</code>, deliberately, and it is what keeps
          this card from being its own dialect: the interface language is a setting like
          any other, drawn at the same rung as the launch mode and the sidebar panels, and
          only the small print underneath is particular to it.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { LanguageCard } from '@ds/desktop'

<LanguageCard
  label={t('settings.language.label')}
  hint={t('settings.language.help')}
  note={t('settings.language.distinction')}
  value={active}
  options={LANGUAGES}
  onChange={(id) => choose(id as LanguageId)}
  width={SELECT_WIDTH}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>LANGUAGES</code> is the app’s own catalogue —{' '}
          <code>renderer/languages.ts</code> — read by this card, the quick-settings
          tiles and the repository rows. It was three copies of two words, each with the
          same paragraph above it explaining why they are not translated.
        </p>
      </EntrySection>
    </article>
  )
}
