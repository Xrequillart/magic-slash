'use client'

import { useState } from 'react'
import {
  BranchCard,
  CollapsibleLine,
  CommitCard,
  HeaderRepoCard,
  PullRequestCard,
  RepositoryCard,
  UnCommittedChangesCard,
} from '@ds/desktop'
import { CheckCircle2, Github, MessagesSquare, Play, VSCode } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'header',
    type: 'HeaderRepoCardProps',
    required: true,
    description:
      'The row that names it. The only required one: a card with no name on it is a plate, and every other block here is something this repository may simply not have yet.',
  },
  {
    name: 'activity',
    type: 'ReactNode',
    description:
      'Straight under the row that launched them: what is running right now. A node, and the reason is not shyness — a running script is a live process with a terminal behind it, not a shape this card could draw from four values.',
  },
  { name: 'branch', type: 'BranchCardProps', description: 'Where the work is.' },
  { name: 'changes', type: 'UnCommittedChangesCardProps', description: 'The working tree.' },
  { name: 'commits', type: 'CommitCardProps', description: 'What the branch has that its base does not.' },
  {
    name: 'emptyLabel',
    type: 'string',
    description:
      'What to say when the three above have nothing to say. Drawn only when all three are absent, and that test is here rather than at the call site because it is the same test every caller would write and the one they would get wrong: an empty state shown beside a branch row is a card contradicting itself. Absent rather than empty when the repository failed to read: a tree nobody could look at has an error to report, not a quiet “nothing to commit”.',
  },
  {
    name: 'pullRequest',
    type: 'ReactNode',
    description:
      'Last, and its own card: the pull request. A node for activity’s reason — the app’s watcher polls GitHub, holds its own state and writes into a terminal, while the site’s drawings pass PullRequestCard straight through.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and width. Not the ground, the padding or the order.',
  },
]

const REPO_COLOR = '#F43F5E'
const noop = () => undefined

const FILES = [
  { path: 'src/billing/vat.ts', name: 'vat.ts', additions: 31, deletions: 4 },
  { path: 'src/billing/invoice.tsx', name: 'invoice.tsx', additions: 12, deletions: 2 },
]

const COMMITS = [
  { hash: 'a3f1c92', subject: 'fix(billing): round the VAT once, on the total', age: '2m' },
  { hash: '7b40e18', subject: 'test(billing): cover the two-line invoice', age: '9m' },
  { hash: 'c1d8a05', subject: 'refactor(billing): lift applyVat out of the PDF', age: '14m' },
]

const HEADER = {
  name: 'magic-pay',
  color: REPO_COLOR,
  scripts: { icon: Play, title: 'Run a script', groups: [], onSelect: noop, emptyLabel: 'No scripts' },
  editor: { icon: VSCode, title: 'Open in the editor', onClick: noop },
  remote: { icon: Github, title: 'Open on GitHub', onClick: noop },
  remove: { title: 'Remove this repository', onClick: noop },
}

const BRANCH = {
  branch: 'feature/pay-318-invoice-vat',
  base: 'main',
  copy: { label: 'Copy branch name', onCopy: noop },
}

const CHANGES = {
  label: 'Uncommitted changes',
  summary: '2 files',
  additions: 43,
  deletions: 6,
  files: FILES,
  onOpenFile: noop,
}

const COMMIT_CARD = {
  label: 'Commits',
  summary: '3 ahead of main',
  commits: COMMITS.map(c => ({
    hash: c.hash,
    shortHash: c.hash,
    subject: c.subject,
    relativeDate: c.age,
    copyLabel: c.hash,
  })),
  onCopyHash: noop,
}

/** The whole card, every slot filled — which is the state it is least often in. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [open, setOpen] = useState<string | null>('checks')
  const fold = (key: string) => ({ open: open === key, onToggle: () => setOpen(open === key ? null : key) })

  return (
    <Stage theme={theme}>
      <div className="max-w-[340px]">
        <RepositoryCard
          header={HEADER}
          branch={BRANCH}
          changes={CHANGES}
          commits={COMMIT_CARD}
          pullRequest={
            <PullRequestCard
              state="open"
              title="PR #481"
              subtitle="Xrequillart/magic-pay"
              badge={{ label: 'Changes requested', tone: 'red' }}
              open={{ label: 'View pull request', onOpen: noop }}
              footer={{ label: 'Checked 2 min ago', refresh: { label: 'Refresh', onRefresh: noop } }}
            >
              <CollapsibleLine
                icon={MessagesSquare}
                tone="blue"
                label="Comments"
                muted
                detail={<span className="text-[10px] tabular-nums text-text-secondary/60">3 comments</span>}
                toggle={fold('comments')}
              />
              <CollapsibleLine
                icon={CheckCircle2}
                tone="green"
                label="Checks"
                muted
                detail={<span className="text-[10px] tabular-nums text-text-secondary/60">12/12 passed</span>}
                toggle={fold('checks')}
              >
                <ul className="space-y-1">
                  {['lint', 'test', 'typecheck'].map(name => (
                    <li key={name} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-green" />
                      <span className="min-w-0 truncate text-[10px] text-text-secondary/70">{name}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleLine>
              <CollapsibleLine icon={CheckCircle2} tone="green" label="No conflicts" muted />
            </PullRequestCard>
          }
        />
      </div>
    </Stage>
  )
}

export function RepositoryCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="RepositoryCard"
        uses={usesOf('repositorycard')}
        onOpen={onOpen}
      >
        One repository, as an agent’s sidebar shows it: what it is called, where the work
        is, what has changed, what has been committed, and what is open on GitHub. It
        <em>draws</em> those blocks — they were <code>ReactNode</code> slots once, and that
        posted a style decision out to the call site where no drawing of this card could
        reach it.
      </EntryHeader>

      <EntrySection
        title="The order is the meaning"
        note="It runs from what this repository is down to what is happening to it: the name, then whatever is running right now, then the branch, then the working tree, then what is already committed, then the pull request. A reader scanning four of these down a column finds the same thing in the same place in each. Named props rather than children for exactly that — a caller cannot put the branch under the commits, because the order is not the caller’s to decide."
      >
        <Live theme={theme} />
      </EntrySection>

      <EntrySection
        title="A gap, and not a margin per block"
        note="This was a mb-2 on every block, which belongs to whichever one happens to be last and stacks on top of the card’s own padding — the card had 12px of padding above its header and 20px under its last row. A gap sits between children only, and it also skips the slots that render nothing, which margins could not."
      >
        <Stage theme={theme} className="grid gap-6 sm:grid-cols-2">
          <Specimen label="a fresh checkout — a name and nothing else yet">
            <div className="max-w-[320px]">
              <RepositoryCard
                header={HEADER}
                emptyLabel="No uncommitted changes"
              />
            </div>
          </Specimen>
          <Specimen label="mid-task — no PR yet">
            <div className="max-w-[320px]">
              <RepositoryCard
                header={HEADER}
                branch={BRANCH}
                changes={CHANGES}
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>emptyLabel</code> is drawn <em>only</em> when <code>branch</code>,{' '}
          <code>changes</code> and <code>commits</code> are all absent, and that test is in
          the component rather than at the call site because it is the same test every
          caller would write and the one they would get wrong: an empty state shown beside
          a branch row is a card contradicting itself.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { RepositoryCard } from '@ds/desktop'

<RepositoryCard
  header={{ name: repoName, color, scripts, editor, remote, remove }}
  activity={<RunningScripts repoPath={repoPath} agentId={agentId} />}
  branch={gitData?.branch ? { branch, base, copy } : undefined}
  changes={hasChanges ? { label, summary, additions, deletions, files, onOpenFile } : undefined}
  commits={hasCommits ? { label, summary, commits, onCopyHash, open } : undefined}
  emptyLabel={t('agentInfo.noUncommittedChanges')}
  pullRequest={prUrl && <PRWatchCard prUrl={prUrl} … />}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
