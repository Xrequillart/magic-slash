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
      'Every commit, in order — no slicing before you get here. more.shown decides how many stand at rest, and the rest are mounted behind the tail waiting to be revealed.',
  },
  {
    name: 'more',
    type: '{ shown: number; label: string; lessLabel?: string }',
    description:
      'There are more commits than the card shows at rest, and the tail line that opens them. shown is how many stand at rest and label is what the tail says — both the caller’s, as they always were. Absent means the list is whole: every row drawn, the rail stopped at the last tick, nothing to press. lessLabel absent leaves it one-way.',
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
function Live({ commits, shown }: { commits: CommitCardCommit[]; shown?: number }) {
  const [copied, setCopied] = useState<string | null>(null)
  const hidden = shown === undefined ? 0 : Math.max(0, commits.length - shown)
  return (
    <CommitCard
      label="Commits"
      summary={`${commits.length} ahead of main`}
      commits={commits}
      more={
        hidden > 0
          ? { shown: shown as number, label: `+${hidden} more commits`, lessLabel: 'Show fewer' }
          : undefined
      }
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
        title="The tail opens"
        note="It was a line of muted text saying how many rows were being withheld, which named a thing a reader could do nothing about. It is a control now: the hidden rows are always mounted, and a grid track travels from 0fr to 1fr to reveal them. That is the one way to transition to a height nobody knows in advance — height: auto is not interpolable, and a max-height guess either clips or eases across empty space. Press it."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className="max-w-md">
            <span className="mb-1 block font-mono text-[10px] text-text-secondary">
              three standing, two behind the tail
            </span>
            <Live commits={COMMITS} shown={3} />
          </div>
          <div className="max-w-md">
            <span className="mb-1 block font-mono text-[10px] text-text-secondary">
              one commit, no tail — the rail is just the tick
            </span>
            <Live commits={COMMITS.slice(0, 1)} />
          </div>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>more</code> is also what tells the rail where the list ends. Shut, the last
          standing row keeps its lower segment and the tail continues it past a rail with no
          tick — the trail saying there is more of this branch than the panel is showing.
          Open, the rail closes at the true last commit and the control below it draws none:
          it is no longer part of the list. The rows are <code>inert</code> while they are
          hidden, so Tab never lands on a copy button nobody can see.
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
  commits={commits.map((commit) => ({
    hash: commit.hash,
    shortHash: commit.shortHash,
    subject: commit.subject,
    relativeDate: formatRelativeDate(commit.relativeDate, t),
    copyLabel: \`Copy full hash: \${commit.hash}\`,
    openable: commit.isPushed && Boolean(gitHubUrl),
  }))}
  more={
    commits.length > SHOWN_COMMITS
      ? {
          shown: SHOWN_COMMITS,
          label: t('agentInfo.commitsMore', { count: commits.length - SHOWN_COMMITS }),
          lessLabel: t('agentInfo.commitsLess'),
        }
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
