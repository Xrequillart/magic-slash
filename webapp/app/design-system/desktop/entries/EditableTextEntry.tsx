'use client'

import { useState } from 'react'
import { EditableText, type EditableTextVariant } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'value', type: 'string', required: true, description: 'What is saved. Empty draws the placeholder in its place, in italic.' },
  { name: 'placeholder', type: 'string', required: true, description: 'What to show when there is nothing — “Add a title”. Translated.' },
  { name: 'editPlaceholder', type: 'string', description: 'The ghost inside the field while editing. Translated.' },
  {
    name: 'editing',
    type: 'boolean',
    required: true,
    description:
      'Whether the field is open. The caller’s, and not state this holds: a field can be open while the agent behind it is switched, and only the caller knows that happened.',
  },
  { name: 'draft', type: 'string', required: true, description: 'The working copy. Separate from value, so Escape has something to throw away.' },
  { name: 'onDraftChange', type: '(value: string) => void', required: true, description: 'Every keystroke.' },
  { name: 'onStartEditing', type: '() => void', required: true, description: 'A click, or Enter / Space from the keyboard.' },
  { name: 'onSave', type: '() => void', required: true, description: 'Enter, and blur. Blur saving is what makes losing a Save button safe.' },
  { name: 'onCancel', type: '() => void', required: true, description: 'Escape.' },
  {
    name: 'variant',
    type: "'title' | 'body'",
    fallback: "'body'",
    description:
      'A name, or the paragraph under it. Each carries the typography and the right padding that matches it, because those two are the same decision.',
  },
  {
    name: 'multiline',
    type: 'boolean',
    fallback: 'false',
    description:
      'Shift+Enter puts in a newline instead of saving, and the box grows to its content. Enter still saves: a description in a card is a line or two, not a document.',
  },
  { name: 'hint', type: 'string', description: 'A quiet line under the open field — the keyboard rule, in words. Translated.' },
  {
    name: 'as',
    type: "'div' | 'h2' | 'h3'",
    fallback: "'div'",
    description:
      'What the reading state is. A heading level is the page’s business and not this component’s, which is why it is a prop and not a consequence of the variant.',
  },
  { name: 'className', type: 'string', fallback: "''", description: 'Margins. Not the ground, the padding, the radius or the typography.' },
]

/** A field that actually works: click it, type, press Enter or Escape. */
function Field({
  variant = 'body',
  multiline,
  initial,
  placeholder,
  hint,
  as,
}: {
  variant?: EditableTextVariant
  multiline?: boolean
  initial: string
  placeholder: string
  hint?: string
  as?: 'div' | 'h2'
}) {
  const [value, setValue] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial)

  return (
    <EditableText
      as={as}
      variant={variant}
      multiline={multiline}
      value={value}
      placeholder={placeholder}
      editPlaceholder={placeholder}
      hint={hint}
      editing={editing}
      draft={draft}
      onDraftChange={setDraft}
      onStartEditing={() => {
        setDraft(value)
        setEditing(true)
      }}
      onSave={() => {
        setValue(draft.trim())
        setEditing(false)
      }}
      onCancel={() => setEditing(false)}
    />
  )
}

/** The card the two fields actually live in, so the ground is the real one. */
function Panel({ children }: { children: React.ReactNode }) {
  return <div className="w-[288px] rounded-xl bg-surface p-4">{children}</div>
}

export function EditableTextEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="EditableText" uses={usesOf('editabletext')} onOpen={onOpen}>
        Text you can click into and change. It is <em>not</em> a form field: there is no border
        in either state, because these are not inputs sitting in a form — they are the thing
        itself, read far more often than written, and a box drawn permanently around each one
        turns a card into a settings panel.
      </EntryHeader>

      <EntrySection
        title="The pair it was built for"
        note="An agent's title and its description, in the card they live in. Click either one: the ground appears on hover and stays for the edit, so the field shows up under the pointer and then simply stays put when the caret arrives. Enter saves, Escape cancels, clicking away saves — which is what made losing the old Save button safe."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <Panel>
            <Field
              as="h2"
              variant="title"
              initial="Rework the invite flow"
              placeholder="Add a title"
            />
            <div className="mt-1">
              <Field
                multiline
                initial={'The wizard asks for the repository twice.\nSecond ask is on the clone step.'}
                placeholder="Add a description"
                hint="Enter to save · Shift+Enter for a new line"
              />
            </div>
          </Panel>
          <span className="font-mono text-[10px] text-text-secondary">
            288px — the sidebar’s own card
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Nothing moves when it opens"
        note="The hardest part of this component, and the reason it is one. Type size, leading, padding and the column the pencil reserves are identical in both states, so the words land on exactly the same pixels before and after the click. Multi-line grows the box to its content rather than taking a fixed rows — a textarea at rows={3} is a second, shorter box dropped over a ten-line description, and everything below it jumps up the card."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <Panel>
            <Field
              multiline
              initial={
                'A long one, on purpose.\nIt runs to several lines so the box has something to grow to.\nClick it: the words do not move and the box keeps its height.'
              }
              placeholder="Add a description"
              hint="Enter to save · Shift+Enter for a new line"
            />
          </Panel>
          <span className="font-mono text-[10px] text-text-secondary">
            click it: the words stay on their pixel and the box keeps its height. The hint
            under it is the one thing that does appear — a line the field did not have
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Empty is an invitation"
        note="Italic and quiet, so a field with nothing in it reads as something to fill rather than as a value somebody typed. The pencil is always in the flow — it is what reserves the column the text wraps against — but only painted under the pointer, so a card at rest is the agent's own words and nothing else."
      >
        <Stage theme={theme} className="flex flex-wrap items-start gap-8">
          <Panel>
            <Field as="h2" variant="title" initial="" placeholder="Add a title" />
            <div className="mt-1">
              <Field
                multiline
                initial=""
                placeholder="Add a description"
                hint="Enter to save · Shift+Enter for a new line"
              />
            </div>
          </Panel>
          <span className="font-mono text-[10px] text-text-secondary">
            hover the card to see the pencils
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { EditableText } from '@ds/desktop'

<EditableText
  as="h2"
  variant="title"
  value={metadata.title ?? ''}
  placeholder={t('agentInfo.addTitle')}
  editPlaceholder={t('agentInfo.titlePlaceholder')}
  editing={isEditingTitle}
  draft={editTitle}
  onDraftChange={setEditTitle}
  onStartEditing={startEditingTitle}
  onSave={saveTitle}
  onCancel={() => setIsEditingTitle(false)}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <strong className="font-semibold text-ink">It focuses itself.</strong> The app held a
          ref per field and a <code>setTimeout(focus, 0)</code> per field, because on the frame
          the click lands the input does not exist yet. The component owns the input, so it is
          the only thing that can focus it — a layout effect does what the timer did, and both
          refs are gone from the sidebar.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The reading state is a <code>div</code> with <code>role=&quot;button&quot;</code> and
          not a real <code>&lt;button&gt;</code>, for the reason <code>PlanRow</code> gives: a
          button may only contain phrasing content, and this holds an <code>h2</code> or a block
          of pre-wrapped text. The keyboard half is therefore ours to write — which is a gain
          rather than a cost, because these fields were mouse-only before and could not be
          opened from the keyboard at all.
        </p>
      </EntrySection>
    </article>
  )
}
