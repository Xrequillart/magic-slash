'use client'

import { useState } from 'react'
import { UnCommittedChangesCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'label',
    type: 'string',
    required: true,
    description: 'The heading words, translated.',
  },
  {
    name: 'summary',
    type: 'string',
    description:
      'The count, to the right of the heading — “7 files” — composed and translated by the caller, because pluralising it is the caller’s job and the number is the caller’s unsliced total.',
  },
  {
    name: 'additions / deletions',
    type: 'number',
    required: true,
    description:
      'Git’s own numbers for the whole tree, given rather than summed from the rows: the list may be a slice of it, and a panel that added up what it could see would quietly report a different diff from the one git diff --stat prints.',
  },
  {
    name: 'files',
    type: 'UnCommittedChangesFile[]',
    required: true,
    description:
      'The rows to draw, in order. All of them: slice before you get here. Each carries a path (its key, its tooltip and what onOpenFile is handed), a name (what the row shows), and its own two counts.',
  },
  {
    name: 'emptyLabel',
    type: 'string',
    description:
      'One line, in place of the list, when the tree is clean. Translated, and free to claim more than this panel can see — the app’s says nothing is waiting for a commit either, which is why the app only mounts the panel at all when that is true. Its absence is also an answer: without it a clean panel draws its heading and nothing under it.',
  },
  {
    name: 'onOpenFile',
    type: '(path: string) => void',
    description:
      'One handler for the panel rather than one per row, since only the path differs between them. Absent, the rows are text.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and width. Not the plate, the radius or the gauge.',
  },
]

const FILES = [
  { path: 'desktop/src/renderer/components/agent-info-sidebar/RepositoryCard.tsx', additions: 31, deletions: 118 },
  { path: 'design-system/desktop/UnCommittedChangesCard.tsx', additions: 112, deletions: 0 },
  { path: 'design-system/desktop/FileModifiedLine.tsx', additions: 86, deletions: 0 },
  { path: 'design-system/desktop/DiffStat.tsx', additions: 91, deletions: 0 },
  { path: 'design-system/desktop/index.ts', additions: 6, deletions: 0 },
].map(file => ({ ...file, name: file.path.split('/').pop() ?? file.path }))

const TOTALS = FILES.reduce(
  (sum, file) => ({
    additions: sum.additions + file.additions,
    deletions: sum.deletions + file.deletions,
  }),
  { additions: 0, deletions: 0 },
)

/** The real thing, in the width it actually gets: the sidebar is 288px at its narrowest. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [opened, setOpened] = useState<string | null>(null)
  return (
    <Stage theme={theme}>
      <div className="max-w-[288px]">
        <UnCommittedChangesCard
          label="Uncommitted changes"
          summary={`${FILES.length} files`}
          additions={TOTALS.additions}
          deletions={TOTALS.deletions}
          files={FILES}
          onOpenFile={setOpened}
        />
      </div>
      <p className="mt-3 font-mono text-[10px] text-text-secondary">
        {opened ? `onOpenFile → ${opened}` : 'press a file'}
      </p>
    </Stage>
  )
}

export function UnCommittedChangesCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="UnCommittedChangesCard"
        uses={usesOf('uncommittedchangescard')}
        onOpen={onOpen}
      >
        What the working tree has that git does not: the files you are in the middle of. It
        is the <em>panel</em> and <code>FileModifiedLine</code> is the row — the heading is
        what turns five filenames into “seven files, mostly additions, none of it
        committed”.
      </EntryHeader>

      <EntrySection
        title="At the width it really gets"
        note="288px is the sidebar at its narrowest, which is what every measurement in here was chosen against: the basename rather than the path, six squares rather than a percentage, and the counts pinned to the right where they can be scanned down a column."
      >
        <Live theme={theme} />
      </EntrySection>

      <EntrySection
        title="Every block in the repository card is the header chip, grown"
        note="bg-ink/5 on a rounded-lg — ACTION_CHIP’s own two values, so the branch chips, this panel, CommitCard and the empty state are all one material at one radius. Ink rather than a surface: it is an overlay, so it composes with the card beneath into a visible step up, where surface on surface paints the same value twice and needs a rule around it to be seen at all."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <Specimen label="no summary, and a tree that is pure addition">
            <div className="max-w-[288px]">
              <UnCommittedChangesCard
                label="Uncommitted changes"
                additions={289}
                deletions={0}
                files={FILES.slice(1, 4)}
                onOpenFile={() => {}}
              />
            </div>
          </Specimen>
          <Specimen label="counted, but nothing listed — the heading still stands alone">
            <div className="max-w-[288px]">
              <UnCommittedChangesCard
                label="Uncommitted changes"
                summary="12 files"
                additions={64}
                deletions={310}
                files={[]}
              />
            </div>
          </Specimen>
          <Specimen label="a clean tree, which is a state and not an absence">
            <div className="max-w-[288px]">
              <UnCommittedChangesCard
                label="Uncommitted changes"
                additions={0}
                deletions={0}
                files={[]}
                emptyLabel="No file being modified or waiting to be committed"
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          One padding, on the card, around everything — nothing bleeds out of it. Measured
          at the sidebar’s own 288px: the heading’s text starts 12px in and its{' '}
          <code>DiffStat</code> ends 12px from the other edge, and every filename below
          starts and ends on those same two lines. The list carried a <code>-mx-3</code> for
          a measurement, cancelling the panel’s <code>p-3</code>, and each row then began
          12px to the left of the words above it.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          They sit on <code>space-y-0.5</code> and not the flush stack{' '}
          <code>CommitCard</code> uses: there is no rail to break here, and a hair of air is
          what keeps a dense list of filenames from reading as a paragraph.
        </p>
      </EntrySection>

      <EntrySection
        title="A clean tree is a state, not an absence"
        note="Handed an emptyLabel, the panel stays on screen with one line saying so instead of vanishing — because a card that disappears makes the reader work out why: nothing to commit, or the poll has not answered, or the repository was detached. It costs one row to say which."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It works that out rather than being told: no files, no additions, no deletions. The
          three cannot disagree — a rename with no content change is +0 −0 but still a{' '}
          <em>file</em>, so <code>files</code> is non-empty and this is not the clean case.
          What it is <em>not</em> is “the caller sliced the list”: the specimen above it has
          totals with no rows, which is a real state and keeps the heading it had.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The count and the <code>DiffStat</code> both drop out with it, and neither is a
          judgement call: “0 files” is a plural composed for a list that is not there, and
          “+0 −0” with a gauge is a bar drawn at nothing — two ways of writing the word the
          line below already says in full.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Whether the panel exists <em>at all</em> is still the caller’s. This one knows
          about a working tree and nothing else, so a sentence that also claims something
          about the <em>commits</em> — the app’s does — can only be true if whoever can see
          both decides to say it. The app drops the whole panel instead when the branch is
          ahead: the commit card below is already saying what is in flight, and a heading
          over an empty plate would be a second, quieter way of saying nothing.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { UnCommittedChangesCard } from '@ds/desktop'

<UnCommittedChangesCard
  label={t('agentInfo.uncommittedChanges')}
  summary={t(count > 1 ? 'agentInfo.files.other' : 'agentInfo.files.one', { count })}
  additions={stats.additions}
  deletions={stats.deletions}
  files={stats.files.map(file => ({
    path: file.path,
    name: file.path.split('/').pop() ?? file.path,
    additions: file.additions,
    deletions: file.deletions,
  }))}
  emptyLabel={t('agentInfo.noUncommittedChanges')}
  onOpenFile={path => openRepoReview(snapshot, path)}
/>

// …and the app only reaches that at all when there is something to say:
const showChanges = isGitRepo && (hasChanges || !hasCommits)`}</Snippet>
      </EntrySection>
    </article>
  )
}
