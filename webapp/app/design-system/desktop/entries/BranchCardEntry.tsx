'use client'

import { useState } from 'react'
import { BranchCard } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'branch',
    type: 'string',
    required: true,
    description:
      'The branch the work is on. Green, because it is where you are — a reader scanning four repository cards down a sidebar picks their branch out by colour before reading a name.',
  },
  {
    name: 'base',
    type: 'string',
    description:
      'The branch this one goes back to. Omit it when there is none, or when it is the same branch: main → main spends a whole row saying one word twice. Which of those you are in is the caller’s question — this one draws what it is handed.',
  },
  {
    name: 'copy',
    type: '{ label: string; copied?: boolean; onCopy: () => void }',
    description:
      'The copy control, or nothing at all. An object and not three props, for the reason Label’s avatar is one: the handler and the name it needs cannot be given separately without letting a caller supply half of them.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and width. Not the grounds, the radius or either colour.',
  },
]

/** The real thing, clipboard and all — the tick is what the app shows for two seconds. */
function Live({ base }: { base?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <BranchCard
      branch="feat/loader-foundation"
      base={base}
      copy={{
        label: 'Copy the branch name',
        copied,
        onCopy: () => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        },
      }}
    />
  )
}

export function BranchCardEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="BranchCard"
        uses={usesOf('branchcard')}
        onOpen={onOpen}
      >
        Where the work is: the branch you are on, and the one it will go back to. Either chip
        alone is a name on a plate — something <code>Label</code> already does. What this draws
        is the <em>relation</em>.
      </EntryHeader>

      <EntrySection
        title="The arrow is the component"
        note="main → feat/loader says at a glance that there is a branch beneath this one and a merge ahead, which is the question anybody looking at an agent's repository card is actually asking. Press the copy button — it is live."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="max-w-sm">
            <Live base="main" />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            with a base — the common case
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Without a base"
        note="A branch with no parent worth naming is one chip, not one chip and a dangling arrow pointing at nothing. Being on the base branch counts as having none: the caller resolves that before it gets here."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="max-w-sm">
            <Live />
          </div>
          <div className="max-w-sm">
            <BranchCard branch="main" />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            and with no copy control at all — the name simply fills the chip
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Both names truncate"
        note="A branch name is as long as whoever typed it, and the sidebar it lives in is 288px at its narrowest. The current branch takes the room left over, so a long name gives way on the base chip first — the one you are on is the one worth reading. The title carries the whole thing either way."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="max-w-[288px]">
            <BranchCard
              branch="feat/extract-the-branch-card-into-the-design-system"
              base="release/2026-09-autumn"
              copy={{ label: 'Copy the branch name', onCopy: () => undefined }}
            />
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            288px — the sidebar at its narrowest. Hover either name.
          </span>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { BranchCard } from '@ds/desktop'

<BranchCard
  branch={gitData.branch}
  base={resolvedBaseBranch}
  copy={{
    label: t('agentInfo.copyBranch'),
    copied: copiedBranch === gitData.branch,
    onCopy: () => onCopyBranchName(gitData.branch),
  }}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The copy control is a <code>ButtonIcon</code> at <code>ghost</code> and{' '}
          <code>xs</code>, and both of those exist because of this row. A neutral button
          inside the chip would be <code>bg-ink/5</code> over <code>bg-ink/5</code> — a square
          visible at all times inside a plate that is already one — and the 24px rung would be
          24 of this row’s 32. Neither is a quieter default: they are what a button nested in
          something else needs, and they belong nowhere near a control standing on its own.
        </p>
      </EntrySection>
    </article>
  )
}
