'use client'

import { NoteCard } from '@ds/desktop'
import { Calculator, EyeOff, FileText, Info, Scissors, SlidersHorizontal } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'icon', type: 'IconComponent', required: true, description: 'The mark in front of the heading. Muted — it tells one tile from the next in a grid of six, it is not there to be read.' },
  { name: 'title', type: 'string', required: true, description: 'What it is about, in two or three words. Translated.' },
  {
    name: 'children',
    type: 'string',
    required: true,
    description:
      'The explanation. A string, for Text’s reason: a note that needed a link, a list or a second paragraph is a note that has outgrown a tile.',
  },
]

const NOTES = [
  { icon: FileText, title: 'What counts', body: 'Every skill’s name and description, as Claude Code injects them into the system prompt each turn.' },
  { icon: Calculator, title: 'The formula', body: 'context × 4 chars/token × 1% — a 1M window allows 40 000 characters, or 10 000 tokens.' },
  { icon: Scissors, title: 'The 1 024-char cap', body: 'Description and when_to_use combined. Text past it never reaches the model, so a long one costs the cap and not its length.' },
  { icon: EyeOff, title: 'Past the budget', body: 'Descriptions are dropped silently. The skill still exists; the model simply stops being told what it is for.' },
  { icon: SlidersHorizontal, title: 'Why it moves', body: 'The budget is derived from the window, so switching models rescales every gauge on the page.' },
  { icon: Info, title: 'Overriding it', body: 'skillListingBudgetFraction in settings.json, or SLASH_COMMAND_TOOL_CHAR_BUDGET for a fixed count.' },
]

export function NoteCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="NoteCard" uses={usesOf('notecard')} onOpen={onOpen}>
        One thing worth knowing, on a quiet plate: a mark, a heading, and a paragraph
        explaining it.
      </EntryHeader>

      <EntrySection
        title="A definition, not an alert"
        note="A Banner is there because something is true right now, and it goes away when that stops being true. A note is there whether or not anything is happening — it answers “how is this number arrived at”, “what happens past the cap”, “where do I change it”. Nothing about it is coloured, because nothing about it is urgent."
      >
        <Stage theme={theme}>
          <Specimen label="they come in grids: one note is a sentence somebody should have inlined">
            <div className="grid w-full grid-cols-2 gap-2">
              {NOTES.map((note) => (
                <NoteCard key={note.title} icon={note.icon} title={note.title}>
                  {note.body}
                </NoteCard>
              ))}
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          No outline, and that is what keeps a grid of these from reading as a grid of
          boxes. The tint already says where a tile ends; a hairline around it answers the
          same question twice, and six of them draw a table nobody asked for — the eye
          starts following the rules instead of reading the notes.{' '}
          <code>BudgetMeter</code> dropped its own for the same reason, so the two quiet
          plates in the folder agree: a tint is an edge, and nothing standing on{' '}
          <code>surface-subtle</code> needs a second one.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The grid is the CALLER’S. How many columns a set of notes wants depends on the
          column it is standing in, which this folder cannot know — so the card owns its
          plate, its padding and its type, and nothing about the arrangement.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { NoteCard } from '@ds/desktop'

<NoteCard icon={Calculator} title={t('skills.budget.card.formula.title')}>
  {t('skills.budget.card.formula.body', { context, percent, chars, tokens })}
</NoteCard>`}</Snippet>
      </EntrySection>
    </article>
  )
}
