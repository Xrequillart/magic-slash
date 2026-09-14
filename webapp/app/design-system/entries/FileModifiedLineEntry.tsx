'use client'

import { useState } from 'react'
import { FileModifiedLine } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  {
    name: 'name',
    type: 'string',
    required: true,
    description:
      'What the row shows. The app hands it the basename and keeps the whole path in title — “which part of a path is worth reading” is a question about a sidebar’s width rather than about a file, so the caller answers it.',
  },
  {
    name: 'title',
    type: 'string',
    description:
      'The native tooltip — the whole path, since the name is usually a truncation of it. Falls back to the name.',
  },
  {
    name: 'additions / deletions',
    type: 'number',
    required: true,
    description:
      'Handed straight to DiffStat, without the gauge: a summary of one file is just the two numbers again in a shape that is harder to read.',
  },
  {
    name: 'onOpen',
    type: '() => void',
    description:
      'Opening the file, or nothing at all. Its presence is what makes the row interactive — the hover, the pointer and the button element all arrive with it, because a row that looks pressable and does nothing is worse than a row that looks like text.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the hover, the radius or either number’s colour.',
  },
]

const FILES = [
  { path: 'desktop/src/renderer/components/agent-info-sidebar/RepositoryCard.tsx', additions: 31, deletions: 118 },
  { path: 'design-system/desktop/UnCommittedChangesCard.tsx', additions: 112, deletions: 0 },
  { path: 'design-system/desktop/index.ts', additions: 6, deletions: 0 },
  { path: 'desktop/src/renderer/theme/themes.ts', additions: 0, deletions: 9 },
]

/** The real thing: press a row and it reports which path it handed back. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [opened, setOpened] = useState<string | null>(null)
  return (
    <Stage theme={theme}>
      <div className="max-w-md space-y-0.5">
        {FILES.map(file => (
          <FileModifiedLine
            key={file.path}
            name={file.path.split('/').pop() ?? file.path}
            title={file.path}
            additions={file.additions}
            deletions={file.deletions}
            onOpen={() => setOpened(file.path)}
          />
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] text-text-secondary">
        {opened ? `onOpen → ${opened}` : 'press a row'}
      </p>
    </Stage>
  )
}

export function FileModifiedLineEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="FileModifiedLine"
        uses={[
          { id: 'diffstat', label: 'DiffStat' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        One file that has changed, and by how much: a name and a <code>DiffStat</code>, and
        that really is all of it. It is the <em>row</em>; <code>UnCommittedChangesCard</code>{' '}
        is the panel that stacks these and says what a working tree of them means — the
        same split as <code>CommitLine</code> and <code>CommitCard</code>.
      </EntryHeader>

      <EntrySection
        title="The row, live"
        note="The name takes the room left over and truncates, with the whole path on the tooltip. The two numbers never give way: they are the shortest thing in the row and the reason anyone scans the list."
      >
        <Live theme={theme} />
      </EntrySection>

      <EntrySection
        title="onOpen is what makes it a button"
        note="With a handler it renders a real <button> — keyboard focus, Enter and Space and a name in the accessibility tree all come free with the element, and would each have to be rebuilt by hand on the div with an onClick that this used to be. Without one it is a plain row, with nothing lifting under the pointer and no promise of something that will not happen."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <Specimen label="interactive — hover it">
            <div className="max-w-md">
              <FileModifiedLine name="store.ts" title="desktop/src/renderer/store.ts" additions={18} deletions={2} onOpen={() => {}} />
            </div>
          </Specimen>
          <Specimen label="inert — the same row, as text">
            <div className="max-w-md">
              <FileModifiedLine name="store.ts" title="desktop/src/renderer/store.ts" additions={18} deletions={2} />
            </div>
          </Specimen>
          <Specimen label="a file whose diff is all removal">
            <div className="max-w-md">
              <FileModifiedLine name="legacy-config.ts" title="desktop/src/main/legacy-config.ts" additions={0} deletions={204} onOpen={() => {}} />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          No side padding and no negative margin: the row is exactly as wide as the box it
          is put in, and the panel’s own padding insets it, so the filename starts on the
          heading’s own left edge. The <code>w-full</code> is load-bearing and not obvious,
          though — a <code>&lt;button&gt;</code> is shrink-to-fit even as a block-level flex
          container, so without it three rows in a 264px list came out 179, 227 and 161px
          wide, each stopping wherever its filename did.
        </p>
      </EntrySection>

      <EntrySection
        title="The hover is the text, and only the text"
        note="A plate behind every row of a list this dense is a great deal of ink spent saying “your pointer is here”. The filename coming up from text-secondary/60 to full text-ink says it with nothing drawn at all — and the DiffStat does not follow, because its green and red are its own."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>text-ink</code> and not a white: this folder names a <em>role</em> and never
          a value. Ink is the reader’s own colour in each of the eight themes — it reads
          white on the dark ones, and a literal white would be white-on-white on the light
          ones.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { FileModifiedLine } from '@ds/desktop'

<FileModifiedLine
  name={file.path.split('/').pop() ?? file.path}
  title={file.path}
  additions={file.additions}
  deletions={file.deletions}
  onOpen={() => openRepoReview(snapshot, file.path)}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
