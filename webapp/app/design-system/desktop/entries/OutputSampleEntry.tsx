'use client'

import { OutputSample } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'label', type: 'string', required: true, description: 'What this is a sample OF — “Example”. Already translated: it is the app talking, not the sample.' },
  { name: 'children', type: 'string', required: true, description: 'The sample, verbatim, with its line breaks preserved: a multi-line commit message is a subject, a blank line and a body, and collapsing that collapses the one thing the multi-line style means.' },
]

export function OutputSampleEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="OutputSample" uses={usesOf('outputsample')} onOpen={onOpen}>
        What the settings above will actually produce — a commit message in the format
        just picked, spelled out.
      </EntryHeader>

      <EntrySection
        title="The thing a form of dropdowns cannot say on its own"
        note="“Angular” and “single-line” are the names of shapes, and a reader who has not met them learns nothing from picking one. The sample is the same answer in a form anybody can check against what they wanted."
      >
        <Stage theme={theme}>
          <Specimen label="one line, and the same settings with a body">
            <div className="flex w-full flex-col gap-3">
              <OutputSample label="Example">feat(auth): add user authentication [PROJ-123]</OutputSample>
              <OutputSample label="Example">
                {'feat(auth): add user authentication\n\nImplement login flow with session management'}
              </OutputSample>
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="It is not a CommandChip"
        note="Same sunken plate, same monospace, and the opposite meaning. A chip holds something the reader is meant to TYPE; this holds something the app will WRITE."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Which is why this one has a label and no copy button: copying a sample would put
          a made-up commit message on the clipboard, and the label is what stops the block
          reading as a value that is already in force somewhere.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The sample is never translated, and that is the caller’s problem — worth stating
          because it looks like a bug every time somebody meets it. What goes in illustrates
          what a <em>skill</em> will write, and a skill writes in the repository’s own
          configured language rather than in the interface’s. A French sample over a
          repository that commits in English would be the form contradicting itself.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { OutputSample } from '@ds/desktop'

<OutputSample label={t('repo.example')}>{commitPreview}</OutputSample>`}</Snippet>
      </EntrySection>
    </article>
  )
}
