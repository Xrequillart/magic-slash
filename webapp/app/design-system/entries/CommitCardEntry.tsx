'use client'

import { useState } from 'react'
import { CommitCard, type CommitCardCommit } from '@ds/desktop'
import { Github } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'label',
    type: 'string',
    required: true,
    description: 'The heading word, translated.',
  },
  {
    name: 'summary',
    type: 'string',
    description:
      'The count, to the right of the heading — “3 ahead of main”. Composed and translated by the caller, because both halves of it are: the number is the caller’s unsliced total and the base branch is its own.',
  },
  {
    name: 'commits',
    type: 'CommitCardCommit[]',
    required: true,
    description:
      'The rows to draw, in order. All of them — slice before you get here. The version this came from took the whole list and sliced five off it, which put the number five inside the component and let the tail line disagree with the slice.',
  },
  {
    name: 'moreLabel',
    type: 'string',
    description:
      'The tail line when the caller is showing fewer commits than exist — “+2 more commits”, already composed. It also changes the rail: present, the last drawn row keeps its lower segment and this line continues it past a rail with no tick.',
  },
  {
    name: 'copiedHash',
    type: 'string | null',
    description: 'Which hash is on the clipboard right now. Drives the tick on that row and no other.',
  },
  {
    name: 'onCopyHash',
    type: '(hash: string) => void',
    required: true,
    description: 'Handed the full hash, since that is what anyone pasting it wants.',
  },
  {
    name: 'open',
    type: '{ label: string; icon: IconComponent; onOpen: (hash: string) => void }',
    description:
      'Opening a commit somewhere else. One object for the whole card rather than one per row: the mark and the words are the same on every line, and only the hash differs. A row opts in with openable.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and width. Not the ground, the radius or the rail.',
  },
]

const COMMITS: CommitCardCommit[] = [
  {
    hash: 'd84c475a1f',
    shortHash: 'd84c475a',
    subject: 'feat(desktop): add a liquid glass variant to the switch',
    relativeDate: '2h',
    copyLabel: 'Copy full hash: d84c475a1f',
    openable: true,
  },
  {
    hash: '74ce56250b',
    shortHash: '74ce5625',
    subject: 'refactor(landing): draw the switch with the real component',
    relativeDate: '5h',
    copyLabel: 'Copy full hash: 74ce56250b',
    openable: true,
  },
  {
    hash: '94b91fcc3d',
    shortHash: '94b91fcc',
    subject: 'feat(desktop): move the switch to the design system',
    relativeDate: '6h',
    copyLabel: 'Copy full hash: 94b91fcc3d',
  },
]

/** The real thing, clipboard and all. */
function Live({ commits, moreLabel }: { commits: CommitCardCommit[]; moreLabel?: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  return (
    <CommitCard
      label="Commits"
      summary={`${commits.length + (moreLabel ? 2 : 0)} ahead of main`}
      commits={commits}
      moreLabel={moreLabel}
      copiedHash={copied}
      onCopyHash={(hash) => {
        setCopied(hash)
        setTimeout(() => setCopied(null), 2000)
      }}
      open={{ label: 'View on GitHub', icon: Github, onOpen: () => {} }}
    />
  )
}

export function CommitCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="CommitCard"
        uses={usesOf('commitcard')}
        onOpen={onOpen}
      >
        What this branch has that its base does not: the commits, in order, on one rail. It is
        the panel, and <code>CommitLine</code> is the row — one component draws a fact, another
        arranges several and says what the arrangement means.
      </EntryHeader>

      <EntrySection
        title="The heading is what makes it a card"
        note="A stack of subjects is five lines. The same stack under “Commits — 3 ahead of main” is a branch with a distance to its base, which is the question anybody looking at an agent’s repository card is actually asking. Press a hash: it is live."
      >
        <Stage theme={theme}>
          <div className="max-w-md">
            <Live commits={COMMITS} />
          </div>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The ground is <code>bg-ink/5</code> on a <code>rounded-lg</code>, which is{' '}
          <code>ACTION_CHIP</code>’s own two values and therefore the shape every other block in
          the repository card wears. Ink rather than a surface: it is an overlay, so it composes
          with the card beneath into a visible step up, where surface on surface paints the same
          value twice and needs a rule around it to be seen at all.
        </p>
      </EntrySection>

      <EntrySection
        title="It draws every commit it is handed"
        note="A deliberate refusal. The version this came from sliced five off the list itself, which put the number five inside the design system — a caller wanting ten rows would have had to change this file, and the tail line could disagree with the slice. The caller slices and writes its own tail; this arranges what it is given."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className="max-w-md">
            <span className="mb-1 block font-mono text-[10px] text-text-secondary">
              with a tail — the rail runs past the last tick
            </span>
            <Live commits={COMMITS} moreLabel="+2 more commits" />
          </div>
          <div className="max-w-md">
            <span className="mb-1 block font-mono text-[10px] text-text-secondary">
              one commit, no tail — the rail is just the tick
            </span>
            <Live commits={COMMITS.slice(0, 1)} />
          </div>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>moreLabel</code> is the only thing that tells the rail where the list ends.
          Present, the last drawn row keeps its lower segment and the tail line continues it
          past a rail with no tick — the trail saying there is more of this branch than the
          panel is showing. Absent, the rail stops at the last tick.
        </p>
      </EntrySection>

      <EntrySection
        title="Props"
        note="CommitCardCommit carries hash and shortHash both, because they do different jobs: the short one is what the chip shows, the long one is what the clipboard gets and what identifies the row. openable is the row’s opt-in to the open control — in the app it means pushed, in a repository with a known address."
      >
        <PropsTable rows={PROPS} />
        <Snippet>{`import { CommitCard } from '@ds/desktop'
import { Github } from '@ds/desktop/icons'

const SHOWN_COMMITS = 5

<CommitCard
  label={t('agentInfo.commits')}
  summary={\`\${commits.length} ahead of \${baseBranch}\`}
  commits={commits.slice(0, SHOWN_COMMITS).map((commit) => ({
    hash: commit.hash,
    shortHash: commit.shortHash,
    subject: commit.subject,
    relativeDate: formatRelativeDate(commit.relativeDate, t),
    copyLabel: \`Copy full hash: \${commit.hash}\`,
    openable: commit.isPushed && Boolean(gitHubUrl),
  }))}
  moreLabel={
    commits.length > SHOWN_COMMITS
      ? \`+\${commits.length - SHOWN_COMMITS} more commits\`
      : undefined
  }
  copiedHash={copiedCommitHash}
  onCopyHash={onCopyCommitHash}
  open={{
    label: t('agentInfo.viewOnGitHub'),
    icon: Github,
    onOpen: (hash) => shell.openExternal(\`\${gitHubUrl}/commit/\${hash}\`),
  }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
