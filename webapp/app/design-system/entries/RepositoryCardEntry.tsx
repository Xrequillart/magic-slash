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

const PROPS: PropRow[] = [
  {
    name: 'header',
    type: 'ReactNode',
    required: true,
    description:
      'The row that names it — HeaderRepoCard. The only required slot: a card with no name on it is a plate, and every other block here is something this repository may simply not have yet.',
  },
  {
    name: 'activity',
    type: 'ReactNode',
    description:
      'Straight under the row that launched them: what is running right now. Absent when nothing is.',
  },
  { name: 'branch', type: 'ReactNode', description: 'Where the work is — BranchCard.' },
  { name: 'changes', type: 'ReactNode', description: 'The working tree — UnCommittedChangesCard.' },
  { name: 'commits', type: 'ReactNode', description: 'What the branch has that its base does not — CommitCard.' },
  {
    name: 'empty',
    type: 'ReactNode',
    description:
      'What to say when the three above have nothing to say. Drawn only when all three are absent, and that test is here rather than at the call site because it is the same test every caller would write and the one they would get wrong: an empty state shown beside a branch row is a card contradicting itself.',
  },
  { name: 'pullRequest', type: 'ReactNode', description: 'Last, and its own card — PullRequestCard.' },
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

function Header() {
  return (
    <HeaderRepoCard
      name="magic-pay"
      color={REPO_COLOR}
      scripts={{ icon: Play, title: 'Run a script', groups: [], onSelect: noop, emptyLabel: 'No scripts' }}
      editor={{ icon: VSCode, title: 'Open in the editor', onClick: noop }}
      remote={{ icon: Github, title: 'Open on GitHub', onClick: noop }}
      remove={{ title: 'Remove this repository', onClick: noop }}
    />
  )
}

function Changes() {
  return (
    <UnCommittedChangesCard
      label="Uncommitted changes"
      summary="2 files"
      additions={43}
      deletions={6}
      files={FILES}
      onOpenFile={noop}
    />
  )
}

function Commits() {
  return (
    <CommitCard
      label="Commits"
      summary="3 ahead of main"
      commits={COMMITS.map(c => ({
        hash: c.hash,
        shortHash: c.hash,
        subject: c.subject,
        relativeDate: c.age,
        copyLabel: c.hash,
      }))}
      onCopyHash={noop}
    />
  )
}

/** The whole card, every slot filled — which is the state it is least often in. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [open, setOpen] = useState<string | null>('checks')
  const fold = (key: string) => ({ open: open === key, onToggle: () => setOpen(open === key ? null : key) })

  return (
    <Stage theme={theme}>
      <div className="max-w-[340px]">
        <RepositoryCard
          header={<Header />}
          branch={<BranchCard branch="feature/pay-318-invoice-vat" base="main" copy={{ label: 'Copy branch name', onCopy: noop }} />}
          changes={<Changes />}
          commits={<Commits />}
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
        uses={[
          { id: 'card', label: 'Card' },
          { id: 'headerrepocard', label: 'HeaderRepoCard' },
          { id: 'branchcard', label: 'BranchCard' },
          { id: 'uncommittedchangescard', label: 'UnCommittedChangesCard' },
          { id: 'commitcard', label: 'CommitCard' },
          { id: 'pullrequestcard', label: 'PullRequestCard' },
        ]}
        onOpen={onOpen}
      >
        One repository, as an agent’s sidebar shows it: what it is called, where the work
        is, what has changed, what has been committed, and what is open on GitHub. It is
        the <em>arrangement</em> — every block it holds already draws itself.
      </EntryHeader>

      <EntrySection
        title="The order is the meaning"
        note="It runs from what this repository is down to what is happening to it: the name, then whatever is running right now, then the branch, then the working tree, then what is already committed, then the pull request. A reader scanning four of these down a column finds the same thing in the same place in each. Named slots rather than children for exactly that — a caller cannot put the branch under the commits, because the order is not the caller’s to decide."
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
                header={<Header />}
                empty={
                  <div className="rounded-lg bg-ink/5 p-2">
                    <span className="text-xs italic text-text-secondary/40">No uncommitted changes</span>
                  </div>
                }
              />
            </div>
          </Specimen>
          <Specimen label="mid-task — no PR yet">
            <div className="max-w-[320px]">
              <RepositoryCard
                header={<Header />}
                branch={<BranchCard branch="feature/pay-318-invoice-vat" base="main" copy={{ label: 'Copy branch name', onCopy: noop }} />}
                changes={<Changes />}
              />
            </div>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <code>empty</code> is drawn <em>only</em> when <code>branch</code>,{' '}
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
  header={<HeaderRepoCard name={repoName} … />}
  activity={<RunningScripts repoPath={repoPath} agentId={agentId} />}
  branch={gitData?.branch && <BranchCard … />}
  changes={hasChanges && <UnCommittedChangesCard … />}
  commits={hasCommits && <CommitCard … />}
  empty={<span>No uncommitted changes</span>}
  pullRequest={prUrl && <PRWatchCard prUrl={prUrl} … />}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
